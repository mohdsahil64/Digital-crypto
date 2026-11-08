/**
 * Daily reward accrual job.
 *
 * Credits every active (plan-activated) user their daily reward for the level their
 * current active team qualifies for. Safe to run repeatedly — it credits at most once
 * per user per calendar day.
 *
 * Run it once a day (e.g. via cron):
 *   0 0 * * *  cd /path/to/backend && node src/scripts/dailyAccrual.js
 */
import "dotenv/config";
import { pool } from "../db/pool.js";
import { accrueAllDaily } from "../rewards.js";

async function main() {
  const summary = await accrueAllDaily();
  console.log(
    `Daily accrual done — eligible: ${summary.eligibleUsers}, credited: ${summary.creditedUsers}, total: ${summary.totalCredited} USDT`
  );
}

main()
  .catch((err) => {
    console.error("daily accrual failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
