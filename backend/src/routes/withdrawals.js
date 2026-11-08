import { Router } from "express";
import { query } from "../db/pool.js";
import { normalizeAddress } from "../utils.js";
import { getMinWithdrawal, isMaintenanceMode } from "../settings.js";
import { payoutUsdt } from "../adminChain.js";
import { config } from "../config.js";

export const withdrawalsRouter = Router();

/** GET /api/withdrawals/:address — withdrawal history. */
withdrawalsRouter.get("/:address", async (req, res) => {
  const address = normalizeAddress(req.params.address);
  if (!address) return res.status(400).json({ error: "invalid address" });

  try {
    const { rows } = await query(
      "SELECT amount_usd, status, tx_hash, created_at FROM withdrawals WHERE wallet_address = $1 ORDER BY created_at DESC LIMIT 100",
      [address]
    );
    return res.json({
      minWithdrawal: await getMinWithdrawal(),
      history: rows.map((r) => ({
        amountUsd: Number(r.amount_usd),
        status: r.status,
        txHash: r.tx_hash,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error("withdrawals get error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

/**
 * POST /api/withdrawals/:address
 * Requests a withdrawal and pays it out INSTANTLY. Flow:
 *   1. Validate min amount + available balance.
 *   2. Record a row (pending) so the balance is reserved.
 *   3. Send USDT from the ADMIN wallet to the user's address on-chain (admin pays gas).
 *   4. On success -> mark completed + save tx hash (returned to the user for history).
 *      On failure -> mark failed and return an error (balance is freed).
 * Body: { amountUsd }
 */
withdrawalsRouter.post("/:address", async (req, res) => {
  const address = normalizeAddress(req.params.address);
  if (!address) return res.status(400).json({ error: "invalid address" });

  // Block withdrawals during maintenance.
  try {
    if (await isMaintenanceMode()) {
      return res.status(503).json({ error: "maintenance", maintenance: true });
    }
  } catch {
    /* if settings unavailable, don't block */
  }

  const amountUsd = Number(req.body.amountUsd);
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return res.status(400).json({ error: "invalid amount" });
  }
  const minWithdrawal = await getMinWithdrawal();
  if (amountUsd < minWithdrawal) {
    return res.status(400).json({ error: `minimum withdrawal is $${minWithdrawal}` });
  }

  try {
    // Compute available balance (all rewards minus everything completed/pending).
    const rewardRow = await query(
      "SELECT COALESCE(SUM(amount_usd), 0) AS total FROM rewards WHERE wallet_address = $1",
      [address]
    );
    const withdrawnRow = await query(
      "SELECT COALESCE(SUM(amount_usd), 0) AS total FROM withdrawals WHERE wallet_address = $1 AND status IN ('completed','pending')",
      [address]
    );
    const available = Number(rewardRow.rows[0].total) - Number(withdrawnRow.rows[0].total);

    if (amountUsd > available) {
      return res.status(400).json({ error: "insufficient balance", available });
    }

    // Reserve the balance immediately with a pending row.
    const insert = await query(
      "INSERT INTO withdrawals (wallet_address, amount_usd, status) VALUES ($1, $2, 'pending') RETURNING id",
      [address, amountUsd]
    );
    const id = insert.rows[0].id;

    // Pay out instantly from the admin wallet (admin pays gas). The USDT amount equals
    // amountUsd * usdtPerUsd (1:1 by default).
    let txHash;
    try {
      const usdtAmount = amountUsd * config.usdtPerUsd;
      txHash = await payoutUsdt(address, usdtAmount);
    } catch (chainErr) {
      // Payout failed on-chain — free the reserved balance and report the error.
      await query("UPDATE withdrawals SET status = 'failed' WHERE id = $1", [id]);
      console.error("instant payout error:", chainErr);
      return res.status(502).json({
        error: chainErr.shortMessage || chainErr.message || "payout failed, please try again",
      });
    }

    // Success — mark completed and store the tx hash.
    await query(
      "UPDATE withdrawals SET status = 'completed', tx_hash = $1 WHERE id = $2",
      [txHash, id]
    );

    // Record in the unified transaction history.
    await query(
      `INSERT INTO transactions
         (wallet_address, type, amount_usd, tx_hash, status, description, meta)
       VALUES ($1, 'withdrawal', $2, $3, 'completed',
               $4,
               $5)`,
      [
        address,
        amountUsd,
        txHash,
        `Withdrawal of $${amountUsd} USDT sent to wallet`,
        JSON.stringify({ withdrawalId: id }),
      ]
    ).catch((e) => console.error("tx history insert (withdrawal) error:", e));

    return res.json({
      id,
      status: "completed",
      txHash,
      message: "Withdrawal sent to your wallet.",
    });
  } catch (err) {
    console.error("withdrawal request error:", err);
    return res.status(500).json({ error: "server error" });
  }
});
