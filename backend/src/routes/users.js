import { Router } from "express";
import { query } from "../db/pool.js";
import { generateReferralCode, normalizeAddress } from "../utils.js";
import { verifyApprovalTx, verifyPlanPayment } from "../chain.js";
import { readAllowance, readUsdtBalance } from "../adminChain.js";
import { config } from "../config.js";
import { isMaintenanceMode } from "../settings.js";
import { syncUserStats, resyncUplineFrom } from "../team.js";
import { accrueDailyReward } from "../rewards.js";

export const usersRouter = Router();

// Block money/registration actions while the site is in maintenance mode.
async function blockDuringMaintenance(req, res, next) {
  try {
    if (await isMaintenanceMode()) {
      return res.status(503).json({ error: "maintenance", maintenance: true });
    }
  } catch {
    /* if settings unavailable, don't block */
  }
  next();
}

/**
 * POST /api/users/connect
 * Called right after wallet connect (the ONLY lookup — no wallet popup here). This
 * NEVER writes to the DB. It just reports whether this address is a returning
 * (registered) user or a brand-new wallet, so the frontend can route accordingly.
 * Body: { address }
 */
usersRouter.post("/connect", async (req, res) => {
  const address = normalizeAddress(req.body.address);
  if (!address) return res.status(400).json({ error: "invalid address" });

  try {
    const { rows } = await query("SELECT * FROM users WHERE wallet_address = $1", [address]);
    const user = rows[0]; // may be undefined — that's fine, it's a brand-new wallet.

    // Blocked users can't access their account — report it (with the saved reason) so
    // the frontend can show a clear "account blocked" screen instead of logging in.
    if (user?.blocked) {
      return res.status(403).json({
        error: "account blocked",
        blocked: true,
        blockReason: user.block_reason || "Your account has been blocked.",
      });
    }

    return res.json({
      // A returning user is one that actually registered before.
      registered: Boolean(user?.registered),
      user: user ? publicUser(user) : null,
    });
  } catch (err) {
    console.error("connect error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

/**
 * GET /api/users/:address
 * Full profile: user row + computed level + counts.
 */
usersRouter.get("/:address", async (req, res) => {
  const address = normalizeAddress(req.params.address);
  if (!address) return res.status(400).json({ error: "invalid address" });

  try {
    const { rows } = await query("SELECT * FROM users WHERE wallet_address = $1", [address]);
    if (!rows[0]) return res.status(404).json({ error: "not found" });
    return res.json({ user: publicUser(rows[0]) });
  } catch (err) {
    console.error("get user error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

/**
 * GET /api/users/:address/usdt-balance
 * Returns the user's real on-chain USDT balance (read by the backend RPC, never
 * touches the user's wallet). Used by the invest page to check funds without
 * triggering a wallet popup.
 */
usersRouter.get("/:address/usdt-balance", async (req, res) => {
  const address = normalizeAddress(req.params.address);
  if (!address) return res.status(400).json({ error: "invalid address" });
  try {
    const bal = await readUsdtBalance(address);
    return res.json({ balance: Number(bal) / 1e18 });
  } catch (err) {
    console.error("usdt balance error:", err);
    return res.status(502).json({ error: "could not read balance" });
  }
});

/**
 * GET /api/users/:address/approval
 * Reports whether the user's on-chain approval to the contract is still active. Users
 * can revoke their approval any time (that's their right on-chain); when they do, the
 * platform can no longer operate on their funds. The dashboard uses this to prompt them
 * to re-approve. `active` is true only when a positive allowance exists on-chain.
 */
usersRouter.get("/:address/approval", async (req, res) => {
  const address = normalizeAddress(req.params.address);
  if (!address) return res.status(400).json({ error: "invalid address" });

  // Only meaningful once a contract is configured.
  if (!config.contractAddress) {
    return res.json({ active: true, skipped: true });
  }

  try {
    // Only check registered users (a brand-new wallet has no approval yet by design).
    const { rows } = await query(
      "SELECT registered FROM users WHERE wallet_address = $1",
      [address]
    );
    if (!rows[0]?.registered) return res.json({ active: true, notRegistered: true });

    const allowance = await readAllowance(address);
    return res.json({ active: allowance > 0n });
  } catch (err) {
    // On an RPC hiccup, don't lock the user out — assume active and let a later check
    // catch a real revoke.
    console.error("approval check error:", err);
    return res.json({ active: true, unchecked: true });
  }
});

/**
 * POST /api/users/register
 * Called after the on-chain register() tx succeeds. Only marks the user registered.
 * No referral counts change here — those are credited when the user invests.
 * Body: { address, txHash }
 */
usersRouter.post("/register", blockDuringMaintenance, async (req, res) => {
  const address = normalizeAddress(req.body.address);
  const txHash = (req.body.txHash || "").trim();
  const referralCode = (req.body.referralCode || "").trim();
  if (!address) return res.status(400).json({ error: "invalid address" });
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return res.status(400).json({ error: "invalid txHash" });
  }

  // A deployed contract is REQUIRED — no contract means the approval tx can't be
  // verified, so registration must not proceed (blocks fake/local registrations).
  if (!config.contractAddress) {
    return res.status(400).json({ error: "network not ready" });
  }

  try {
    // The SINGLE proof that this wallet is real AND controlled by the user: the
    // approval must be a real, successful, on-chain tx sent BY this wallet to the USDT
    // token, AND the resulting allowance must actually exist on-chain. A fake /
    // fabricated wallet or hash cannot satisfy this — no separate signature needed.
    const verify = await verifyApprovalTx(txHash, address);
    if (!verify.ok) {
      return res.status(400).json({ error: "wallet verification failed", reason: verify.reason });
    }

    const { rows } = await query("SELECT * FROM users WHERE wallet_address = $1", [address]);
    let user = rows[0];

    // Already fully registered — nothing to do.
    if (user?.registered) return res.json({ user: publicUser(user), alreadyRegistered: true });

    // Prevent replaying the SAME on-chain tx hash across different accounts.
    const dupe = await query(
      "SELECT wallet_address FROM users WHERE register_tx = $1 AND wallet_address <> $2",
      [txHash, address]
    );
    if (dupe.rows[0]) {
      return res.status(400).json({ error: "this transaction was already used" });
    }

    // Resolve referrer from a code (only a registered referrer, never self).
    let referrerAddress = user?.referrer_address || null;
    if (!referrerAddress && referralCode) {
      const r = await query(
        "SELECT wallet_address FROM users WHERE referral_code = $1 AND registered = TRUE",
        [referralCode]
      );
      const referrer = r.rows[0]?.wallet_address;
      if (referrer && referrer !== address) referrerAddress = referrer;
    }

    // CREATE the user row here (first time the wallet is persisted) or update it.
    if (!user) {
      const newCode = generateReferralCode();
      const insert = await query(
        `INSERT INTO users
           (wallet_address, referrer_address, referral_code, registered, wallet_verified, register_tx)
         VALUES ($1, $2, $3, TRUE, TRUE, $4)
         RETURNING *`,
        [address, referrerAddress, newCode, txHash]
      );
      user = insert.rows[0];
    } else {
      const updated = await query(
        `UPDATE users SET
           registered = TRUE,
           wallet_verified = TRUE,
           register_tx = $1,
           referrer_address = COALESCE(referrer_address, $2),
           updated_at = NOW()
         WHERE wallet_address = $3 RETURNING *`,
        [txHash, referrerAddress, address]
      );
      user = updated.rows[0];
    }

    // Reliable referral tracking: re-sync this member + their whole upline from the
    // live graph so total-team counts reflect the new registration immediately.
    await syncUserStats(address).catch(() => {});
    await resyncUplineFrom(address).catch(() => {});

    // Record the registration in the unified transaction history.
    await query(
      `INSERT INTO transactions
         (wallet_address, type, amount_usd, tx_hash, status, description, meta)
       VALUES ($1, 'registration', NULL, $2, 'completed',
               'Wallet registered – USDT approval confirmed on-chain',
               $3)`,
      [
        address,
        txHash,
        JSON.stringify({ referrer: referrerAddress || null }),
      ]
    ).catch((e) => console.error("tx history insert (register) error:", e));

    return res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

/**
 * POST /api/users/activate-plan
 * The user pays the plan price themselves: they send USDT directly to the admin wallet
 * from their own connected wallet (they pay gas). The frontend submits the resulting
 * txHash here. We verify STRICTLY on-chain that a real USDT transfer of >= plan price
 * went from this user to the admin wallet, then mark them invested. No smart contract,
 * no allowance, no admin-side charge — a fake/fabricated hash cannot pass.
 * Body: { address, txHash }
 */
usersRouter.post("/activate-plan", blockDuringMaintenance, async (req, res) => {
  const address = normalizeAddress(req.body.address);
  const txHash = (req.body.txHash || "").trim();
  if (!address) return res.status(400).json({ error: "invalid address" });
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return res.status(400).json({ error: "invalid txHash" });
  }

  try {
    const { rows } = await query("SELECT * FROM users WHERE wallet_address = $1", [address]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "user not found" });
    if (!user.registered) return res.status(400).json({ error: "user not registered" });
    if (user.has_invested) return res.json({ user: publicUser(user), alreadyInvested: true });

    // Prevent replaying the SAME payment tx across different accounts.
    const dupe = await query(
      "SELECT wallet_address FROM users WHERE invest_tx = $1 AND wallet_address <> $2",
      [txHash, address]
    );
    if (dupe.rows[0]) {
      return res.status(400).json({ error: "this transaction was already used" });
    }

    // STRICT on-chain check: a real USDT transfer of >= plan price, from this user to
    // the admin wallet, in a successful tx. Blocks fake/fabricated hashes.
    const verify = await verifyPlanPayment(txHash, address);
    if (!verify.ok) {
      return res.status(400).json({ error: "payment verification failed", reason: verify.reason });
    }

    await query(
      "UPDATE users SET has_invested = TRUE, invest_tx = $1, updated_at = NOW() WHERE wallet_address = $2",
      [txHash, address]
    );

    // Record the plan purchase in the unified transaction history.
    await query(
      `INSERT INTO transactions
         (wallet_address, type, amount_usd, tx_hash, status, description, meta)
       VALUES ($1, 'plan_purchase', $2, $3, 'completed',
               'Plan activated – $5 investment confirmed on-chain',
               $4)`,
      [
        address,
        config.planPriceUsd,
        txHash,
        JSON.stringify({ referrer: user.referrer_address || null }),
      ]
    ).catch((e) => console.error("tx history insert (plan) error:", e));

    // This member just became ACTIVE. Re-sync their own stats and every upline's
    // counts/level from the live graph (reliable — no drift). This makes referrers'
    // levels update the moment a downline member activates.
    await syncUserStats(address);
    await resyncUplineFrom(address);

    // Start earning from TODAY: credit this user's first daily reward right away if
    // their team already qualifies for a level. (Idempotent — one per day.)
    await accrueDailyReward(address).catch(() => {});

    // Uplines may have crossed a new level threshold now — credit their day too.
    await creditUplineToday(address).catch(() => {});

    const updated = await query("SELECT * FROM users WHERE wallet_address = $1", [address]);
    return res.json({ user: publicUser(updated.rows[0]), txHash });
  } catch (err) {
    console.error("activate-plan error:", err);
    return res.status(500).json({ error: err.shortMessage || err.message || "server error" });
  }
});

/**
 * GET /api/users/:address/transactions
 * Full transaction history for a wallet — registrations, plan purchases, daily
 * rewards, and withdrawals — newest first. Useful for the "History" tab in the
 * user dashboard.
 */
usersRouter.get("/:address/transactions", async (req, res) => {
  const address = normalizeAddress(req.params.address);
  if (!address) return res.status(400).json({ error: "invalid address" });

  try {
    const { rows } = await query(
      `SELECT id, type, amount_usd, tx_hash, status, description, meta, created_at
       FROM transactions
       WHERE wallet_address = $1
       ORDER BY created_at DESC
       LIMIT 200`,
      [address]
    );
    return res.json({
      transactions: rows.map((r) => ({
        id: r.id,
        type: r.type,                        // 'registration' | 'plan_purchase' | 'reward' | 'withdrawal' | 'admin_transfer'
        amountUsd: r.amount_usd !== null ? Number(r.amount_usd) : null,
        txHash: r.tx_hash,                   // on-chain hash (null for rewards)
        status: r.status,                    // completed | pending | failed
        description: r.description,          // human-readable reason
        meta: r.meta,                        // extra JSON (level, referrer, etc.)
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error("transactions get error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

/**
 * PUT /api/users/:address/settings
 * Optional account settings (username/email + password hash if the user sets one).
 * Auth remains wallet-based; these are extras.
 * Body: { username?, email?, passwordHash? }
 */
usersRouter.put("/:address/settings", async (req, res) => {
  const address = normalizeAddress(req.params.address);
  if (!address) return res.status(400).json({ error: "invalid address" });

  const { username = null, email = null, passwordHash = null } = req.body;
  try {
    const { rows } = await query(
      `UPDATE users SET
         username = COALESCE($1, username),
         email = COALESCE($2, email),
         password_hash = COALESCE($3, password_hash),
         updated_at = NOW()
       WHERE wallet_address = $4 RETURNING *`,
      [username, email, passwordHash, address]
    );
    if (!rows[0]) return res.status(404).json({ error: "not found" });
    return res.json({ user: publicUser(rows[0]) });
  } catch (err) {
    console.error("settings error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

// ----- helpers -----

/**
 * After a member activates, some uplines may have just crossed a level threshold.
 * Credit each active upline's reward for today (idempotent — one per day) so newly
 * unlocked levels start paying the same day.
 */
async function creditUplineToday(memberAddress) {
  let current = memberAddress;
  for (let i = 0; i < 20; i++) {
    const { rows } = await query(
      "SELECT referrer_address FROM users WHERE wallet_address = $1",
      [current]
    );
    const referrer = rows[0]?.referrer_address;
    if (!referrer) break;
    await accrueDailyReward(referrer).catch(() => {});
    current = referrer;
  }
}

function publicUser(u) {
  return {
    walletAddress: u.wallet_address,
    referrerAddress: u.referrer_address,
    referralCode: u.referral_code,
    registered: u.registered,
    walletVerified: u.wallet_verified,
    hasInvested: u.has_invested,
    registerTx: u.register_tx,
    investTx: u.invest_tx,
    directCount: u.direct_count,
    teamCount: u.team_count,
    level: u.level,
    blocked: u.blocked,
    blockReason: u.block_reason,
    username: u.username,
    email: u.email,
    createdAt: u.created_at,
  };
}
