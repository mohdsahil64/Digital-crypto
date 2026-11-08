import { Router } from "express";
import { query } from "../db/pool.js";
import { normalizeAddress } from "../utils.js";
import { dailyRewardForLevel, LEVELS } from "../config.js";
import { getTeamStats } from "../team.js";
import { accrueDailyReward } from "../rewards.js";

export const rewardsRouter = Router();

/** GET /api/rewards/levels — the full level table (shared with frontend). */
rewardsRouter.get("/levels", (_req, res) => {
  res.json({ levels: LEVELS });
});

/**
 * GET /api/rewards/:address
 * Reward summary: current level, daily reward, total accrued, total withdrawn,
 * available balance, and reward history.
 */
rewardsRouter.get("/:address", async (req, res) => {
  const address = normalizeAddress(req.params.address);
  if (!address) return res.status(400).json({ error: "invalid address" });

  try {
    const u = await query("SELECT * FROM users WHERE wallet_address = $1", [address]);
    if (!u.rows[0]) return res.status(404).json({ error: "not found" });
    const user = u.rows[0];

    // Live team stats + level (source of truth). Level is based on the ACTIVE team.
    const stats = await getTeamStats(address);
    const level = stats.level;
    // Daily reward only applies once the plan is active; show 0 for inactive users.
    const dailyReward = user.has_invested ? dailyRewardForLevel(level) : 0;

    const totalRewardRow = await query(
      "SELECT COALESCE(SUM(amount_usd), 0) AS total FROM rewards WHERE wallet_address = $1",
      [address]
    );
    const todayRewardRow = await query(
      `SELECT COALESCE(SUM(amount_usd), 0) AS total
       FROM rewards
       WHERE wallet_address = $1 AND created_at >= date_trunc('day', NOW())`,
      [address]
    );
    const totalWithdrawnRow = await query(
      "SELECT COALESCE(SUM(amount_usd), 0) AS total FROM withdrawals WHERE wallet_address = $1 AND status = 'completed'",
      [address]
    );

    const totalRewards = Number(totalRewardRow.rows[0].total);
    const todayEarnings = Number(todayRewardRow.rows[0].total);
    const totalWithdrawn = Number(totalWithdrawnRow.rows[0].total);

    // Team figures from the live graph (reliable). "active" = bought the plan.
    // - directTeam : members this user referred directly.
    // - totalTeam  : this user's full downline (direct + indirect) = "My Team".
    const totalTeam = stats.teamTotal;
    const activeTeam = stats.teamActive;
    const inactiveTeam = Math.max(totalTeam - activeTeam, 0);
    const directTeam = stats.directTotal;
    // directBusiness = active directs × plan price (same calc as computeLevel).
    const directBusiness = stats.directBusiness ?? (stats.directActive * config.planPriceUsd);

    // Global team = the entire platform's network (all registered members).
    const globalRow = await query(
      "SELECT COUNT(*)::int AS n FROM users WHERE registered = TRUE"
    );
    const globalTeam = Number(globalRow.rows[0]?.n || 0);

    const history = await query(
      "SELECT amount_usd, level, note, created_at FROM rewards WHERE wallet_address = $1 ORDER BY created_at DESC LIMIT 100",
      [address]
    );

    return res.json({
      level,
      dailyReward,
      totalRewards,
      todayEarnings,
      totalWithdrawn,
      activeTeam,
      inactiveTeam,
      totalTeam,
      directTeam,
      directBusiness,
      globalTeam,
      availableBalance: Math.max(totalRewards - totalWithdrawn, 0),
      history: history.rows.map((r) => ({
        amountUsd: Number(r.amount_usd),
        level: r.level,
        note: r.note,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error("rewards error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

/**
 * POST /api/rewards/:address/accrue
 * Credits the user's daily reward for their current level. In a real system this
 * would be a scheduled job; for the demo it can be triggered to show accrual.
 */
rewardsRouter.post("/:address/accrue", async (req, res) => {
  const address = normalizeAddress(req.params.address);
  if (!address) return res.status(400).json({ error: "invalid address" });

  try {
    const result = await accrueDailyReward(address);
    if (result.credited > 0) {
      return res.json({ credited: result.credited, level: result.level });
    }
    // Friendly messages for the common not-eligible reasons.
    const reasonMsg = {
      "not registered": "Register first to start earning.",
      "plan not active": "Activate the plan to start earning.",
      "no level yet": "Grow your team to reach Level 1 and start earning.",
      "already credited today": "Today's reward is already credited.",
    };
    return res.json({
      credited: 0,
      level: result.level ?? 0,
      message: reasonMsg[result.reason] || "No reward available right now.",
    });
  } catch (err) {
    console.error("accrue error:", err);
    return res.status(500).json({ error: "server error" });
  }
});
