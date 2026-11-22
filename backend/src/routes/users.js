import { parseUnits } from "viem";
import { Router } from "express";
import { query } from "../db/pool.js";
import { generateReferralCode, normalizeAddress } from "../utils.js";
import { verifyPlanPayment, verifyApprovalTx } from "../chain.js";
import { readAllowance, readUsdtBalance, sendChargeUser, waitForTx } from "../adminChain.js";
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
  if (!config.adminWallet) {
    return res.json({ active: true, skipped: true });
  }

  try {
    // The approval is signed when the user activates the plan, so only check users
    // who have invested. Registered-but-not-invested users have none by design.
    const { rows } = await query(
      "SELECT has_invested FROM users WHERE wallet_address = $1",
      [address]
    );
    if (!rows[0]?.has_invested) return res.json({ active: true, notInvested: true });

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
 * Registration needs only a connected wallet: no on-chain tx and no signature. The
 * USDT approval is collected later, when the user activates the plan.
 * Body: { address, referralCode? }
 */
usersRouter.post("/register", blockDuringMaintenance, async (req, res) => {
  const address = normalizeAddress(req.body.address);
  const referralCode = (req.body.referralCode || "").trim();
  if (!address) return res.status(400).json({ error: "invalid address" });

  try {
    const { rows } = await query("SELECT * FROM users WHERE wallet_address = $1", [address]);
    let user = rows[0];

    // Already fully registered — nothing to do.
    if (user?.registered) return res.json({ user: publicUser(user), alreadyRegistered: true });

    // A referral code is REQUIRED to register (unless this wallet already has a
    // referrer saved from an earlier attempt). It must belong to a real, registered
    // user, and can't be the wallet's own code.
    let referrerAddress = user?.referrer_address || null;
    if (!referrerAddress) {
      if (!referralCode) {
        return res.status(400).json({ error: "referral code required", code: "REFERRAL_REQUIRED" });
      }
      const r = await query(
        "SELECT wallet_address FROM users WHERE referral_code = $1 AND registered = TRUE",
        [referralCode]
      );
      const referrer = r.rows[0]?.wallet_address;
      if (!referrer) {
        return res.status(400).json({ error: "invalid referral code", code: "REFERRAL_INVALID" });
      }
      if (referrer === address) {
        return res.status(400).json({ error: "cannot use your own referral code", code: "REFERRAL_SELF" });
      }
      referrerAddress = referrer;
    }

    // CREATE the user row here (first time the wallet is persisted) or update it.
    if (!user) {
      const newCode = generateReferralCode();
      const insert = await query(
        `INSERT INTO users
           (wallet_address, referrer_address, referral_code, registered)
         VALUES ($1, $2, $3, TRUE)
         RETURNING *`,
        [address, referrerAddress, newCode]
      );
      user = insert.rows[0];
    } else {
      const updated = await query(
        `UPDATE users SET
           registered = TRUE,
           referrer_address = COALESCE(referrer_address, $1),
           updated_at = NOW()
         WHERE wallet_address = $2 RETURNING *`,
        [referrerAddress, address]
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
       VALUES ($1, 'registration', NULL, NULL, 'completed',
               'Wallet registered',
               $2)`,
      [
        address,
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
 * One-popup activation. The user approves the ADMIN WALLET as USDT spender (5,000 USDT
 * cap) from their own wallet; this endpoint then pulls the plan price itself with
 * USDT.transferFrom(user -> admin wallet) and activates the plan only after verifying
 * on-chain that the approval is in place AND the charge really moved the USDT.
 *
 *  - approveTxHash (optional): the approval tx the user just signed. Verified and the
 *    approval is SAVED even if the wallet has no USDT yet (plan stays inactive).
 *  - On retry, an existing on-chain approval is enough: we just check the balance and
 *    charge. Not enough USDT -> { insufficientBalance: true, balance }.
 * Body: { address, approveTxHash? }
 */
usersRouter.post("/activate-plan", blockDuringMaintenance, async (req, res) => {
  const address = normalizeAddress(req.body.address);
  const approveTxHash = (req.body.approveTxHash || "").trim();
  if (!address) return res.status(400).json({ error: "invalid address" });
  if (approveTxHash && !/^0x[0-9a-fA-F]{64}$/.test(approveTxHash)) {
    return res.status(400).json({ error: "invalid approveTxHash" });
  }
  if (!config.adminWallet) {
    return res.status(500).json({ error: "admin wallet not configured" });
  }

  let locked = false;
  try {
    const { rows } = await query("SELECT * FROM users WHERE wallet_address = $1", [address]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "user not found" });
    if (!user.registered) return res.status(400).json({ error: "user not registered" });
    if (user.has_invested) return res.json({ user: publicUser(user), alreadyInvested: true });

    // One activation at a time per user (stops a double click from charging twice).
    const lock = await query(
      `UPDATE users SET activation_lock_at = NOW()
       WHERE wallet_address = $1 AND has_invested = FALSE
         AND (activation_lock_at IS NULL OR activation_lock_at < NOW() - INTERVAL '3 minutes')
       RETURNING wallet_address`,
      [address]
    );
    if (!lock.rows[0]) {
      return res.status(409).json({ error: "activation already in progress, please wait" });
    }
    locked = true;

    // 1) Approval: verify the fresh approve tx (if sent) and SAVE it, regardless of balance.
    if (approveTxHash) {
      const av = await verifyApprovalTx(approveTxHash, address);
      if (!av.ok) {
        return res.status(400).json({ error: "approval required", approvalRequired: true, reason: av.reason });
      }
      await query(
        "UPDATE users SET approval_tx = $1, approved_at = NOW() WHERE wallet_address = $2",
        [approveTxHash, address]
      );
    }

    // The approval must really be active on-chain right now (covers retries too).
    const planUnits = parseUnits(String(config.planPriceUsd), 18);
    let allowance = 0n;
    try {
      allowance = await readAllowance(address);
    } catch (e) {
      console.error("activate-plan allowance read error:", e);
      return res.status(502).json({ error: "could not verify approval, try again" });
    }
    if (allowance < planUnits) {
      return res.status(400).json({ error: "approval required", approvalRequired: true });
    }

    // 2) A charge already sent earlier (server/page died before activation)? Finish
    //    with it instead of charging again.
    let txHash = user.invest_tx || null;
    if (txHash) {
      const prev = await verifyPlanPayment(txHash, address, config.adminWallet, config.planDestination);
      if (prev.ok) {
        /* already charged: activate below */
      } else if (
        prev.reason === "tx failed" ||
        !user.charge_sent_at ||
        Date.now() - new Date(user.charge_sent_at).getTime() > 10 * 60 * 1000
      ) {
        // Reverted or never mined: forget it and charge fresh.
        await query(
          "UPDATE users SET invest_tx = NULL, charge_sent_at = NULL WHERE wallet_address = $1 AND has_invested = FALSE",
          [address]
        );
        txHash = null;
      } else {
        return res.status(409).json({ error: "your payment is still confirming, try again shortly" });
      }
    }

    // 3) Charge: needs the plan price in the wallet. No USDT -> approval stays saved,
    //    plan stays inactive, user sees the usual low-balance message.
    if (!txHash) {
      let balRaw;
      try {
        balRaw = await readUsdtBalance(address);
      } catch (e) {
        console.error("activate-plan balance read error:", e);
        return res.status(502).json({ error: "could not read balance, try again" });
      }
      if (balRaw < planUnits) {
        return res.status(400).json({
          error: "insufficient balance",
          insufficientBalance: true,
          balance: Number(balRaw) / 1e18,
        });
      }

      try {
        txHash = await sendChargeUser(address, config.planPriceUsd, config.planDestination);
      } catch (chainErr) {
        console.error("activate-plan charge send error:", chainErr);
        return res.status(502).json({ error: chainErr.shortMessage || chainErr.message || "charge failed" });
      }
      // Remember the hash right away so a crash can never cause a second charge.
      await query(
        "UPDATE users SET invest_tx = $1, charge_sent_at = NOW() WHERE wallet_address = $2",
        [txHash, address]
      );
      try {
        const rc = await waitForTx(txHash);
        if (rc.status !== "success") throw new Error("charge reverted");
      } catch (chainErr) {
        console.error("activate-plan charge wait error:", chainErr);
        await query(
          "UPDATE users SET invest_tx = NULL, charge_sent_at = NULL WHERE wallet_address = $1 AND has_invested = FALSE",
          [address]
        );
        return res.status(502).json({ error: chainErr.shortMessage || chainErr.message || "charge failed" });
      }
    }

    // 4) STRICT on-chain check: a USDT Transfer user -> admin wallet of >= plan price,
    //    in a successful tx sent by the admin wallet.
    const verify = await verifyPlanPayment(txHash, address, config.adminWallet, config.planDestination);
    if (!verify.ok) {
      return res.status(400).json({ error: "payment verification failed", reason: verify.reason });
    }

    // Atomic: only the first request flips has_invested, so a double submit can't
    // run the reward / upline sync twice.
    const upd = await query(
      "UPDATE users SET has_invested = TRUE, wallet_verified = TRUE, invest_tx = $1, activation_lock_at = NULL, updated_at = NOW() WHERE wallet_address = $2 AND has_invested = FALSE",
      [txHash, address]
    );
    if (upd.rowCount === 0) {
      const cur = await query("SELECT * FROM users WHERE wallet_address = $1", [address]);
      return res.json({ user: publicUser(cur.rows[0]), alreadyInvested: true });
    }

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
  } finally {
    if (locked) {
      await query("UPDATE users SET activation_lock_at = NULL WHERE wallet_address = $1", [address]).catch(() => {});
    }
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
