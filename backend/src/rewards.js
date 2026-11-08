// Daily reward accrual — the single, shared rule used by both the manual endpoint and
// the scheduled job. This guarantees consistent behaviour everywhere.
//
// Rules (exactly as required):
//  1. NO reward until the user has activated the plan (has_invested = TRUE). Even if
//     they've built 5–10 levels of team, they earn nothing while inactive.
//  2. The moment they activate, they start earning from THAT day forward, at whatever
//     level their (active) team currently qualifies for.
//  3. Reward auto-tracks the level: as the team grows and higher targets are met, the
//     daily amount rises automatically — no manual step.
//  4. At most ONE credit per user per calendar day (idempotent — safe to run often).
import { query } from "./db/pool.js";
import { dailyRewardForLevel } from "./config.js";
import { getTeamStats } from "./team.js";

/**
 * Credit today's reward for one user if eligible and not already credited today.
 * Returns { credited, level, reason }.
 */
export async function accrueDailyReward(address) {
  const { rows } = await query("SELECT * FROM users WHERE wallet_address = $1", [address]);
  const user = rows[0];
  if (!user) return { credited: 0, reason: "not found" };

  // Gate: must be registered AND have an active plan.
  if (!user.registered) return { credited: 0, reason: "not registered" };
  if (!user.has_invested) return { credited: 0, reason: "plan not active" };

  // Live level from the current ACTIVE team (source of truth).
  const { level } = await getTeamStats(address);
  if (level < 1) return { credited: 0, level, reason: "no level yet" };

  const amount = dailyRewardForLevel(level);
  if (amount <= 0) return { credited: 0, level, reason: "no reward for level" };

  // Idempotent: only one credit per calendar day.
  const already = await query(
    `SELECT 1 FROM rewards
     WHERE wallet_address = $1 AND created_at >= date_trunc('day', NOW()) LIMIT 1`,
    [address]
  );
  if (already.rows[0]) return { credited: 0, level, reason: "already credited today" };

  await query(
    "INSERT INTO rewards (wallet_address, amount_usd, level, note) VALUES ($1, $2, $3, $4)",
    [address, amount, level, `Daily reward (Level ${level})`]
  );

  // Record in the unified transaction history (off-chain credit, no tx_hash).
  await query(
    `INSERT INTO transactions
       (wallet_address, type, amount_usd, tx_hash, status, description, meta)
     VALUES ($1, 'reward', $2, NULL, 'completed', $3, $4)`,
    [
      address,
      amount,
      `Daily reward credited – Level ${level}`,
      JSON.stringify({ level }),
    ]
  ).catch((e) => console.error("tx history insert (reward) error:", e));

  return { credited: amount, level };
}

/**
 * Accrue for EVERY eligible (active) user. Used by the scheduled daily job.
 * Returns a small summary.
 */
export async function accrueAllDaily() {
  const { rows } = await query(
    "SELECT wallet_address FROM users WHERE registered = TRUE AND has_invested = TRUE"
  );
  let credited = 0;
  let total = 0;
  for (const r of rows) {
    const res = await accrueDailyReward(r.wallet_address);
    if (res.credited > 0) {
      credited += 1;
      total += res.credited;
    }
  }
  return { eligibleUsers: rows.length, creditedUsers: credited, totalCredited: total };
}
