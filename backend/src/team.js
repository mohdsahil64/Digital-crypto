// Single source of truth for a user's team counts + level.
//
// We ALWAYS derive direct/team counts live from the referrer graph instead of trusting
// the (easily de-synced) users.direct_count / team_count columns. This makes referral
// tracking reliable: a member always counts the moment they register under someone.
//
// "direct"  = users whose referrer_address is exactly this wallet.
// "team"    = the entire downline (recursive), bounded to a sane depth.
import { query } from "./db/pool.js";
import { computeLevel, config as appConfig } from "./config.js";

// Only ACTIVE members (bought the plan) count toward level targets — this matches the
// payout rule that rewards depend on a real, paying team.
export async function getTeamStats(address) {
  const directRow = await query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE has_invested)::int AS active
     FROM users WHERE referrer_address = $1`,
    [address]
  );

  const downRow = await query(
    `WITH RECURSIVE downline AS (
       SELECT wallet_address, has_invested, 1 AS depth
       FROM users WHERE referrer_address = $1
       UNION ALL
       SELECT u.wallet_address, u.has_invested, d.depth + 1
       FROM users u
       JOIN downline d ON u.referrer_address = d.wallet_address
       WHERE d.depth < 16
     )
     SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE has_invested)::int AS active
     FROM downline`,
    [address]
  );

  const directTotal  = Number(directRow.rows[0]?.total  || 0);
  const directActive = Number(directRow.rows[0]?.active || 0);
  const teamTotal    = Number(downRow.rows[0]?.total    || 0);
  const teamActive   = Number(downRow.rows[0]?.active   || 0);

  // Direct business = total USDT invested by active direct referrals.
  // Each active member paid planPriceUsd (default $5).
  const planPrice = appConfig?.planPriceUsd ?? 5;
  const directBusiness = directActive * planPrice;

  // Level is earned on ACTIVE direct business + ACTIVE team size.
  const level = computeLevel(directBusiness, teamActive);

  return { directTotal, directActive, directBusiness, teamTotal, teamActive, level };
}

/**
 * Recompute and persist a user's cached counts + level from the live graph. Called
 * whenever their downline changes (a new member registers / activates). Keeps the DB
 * columns in sync so admin lists and quick reads stay correct, but the live query
 * above remains the real source of truth.
 */
export async function syncUserStats(address) {
  const s = await getTeamStats(address);
  await query(
    `UPDATE users SET direct_count = $1, team_count = $2, level = $3, updated_at = NOW()
     WHERE wallet_address = $4`,
    [s.directActive, s.teamActive, s.level, address]
  );
  return s;
}

/**
 * Walk up the referrer chain from a member and re-sync every upline's stats. Run this
 * after a member registers or activates so counts/levels update reliably up the tree.
 */
export async function resyncUplineFrom(memberAddress) {
  let current = memberAddress;
  for (let i = 0; i < 20; i++) {
    const { rows } = await query(
      "SELECT referrer_address FROM users WHERE wallet_address = $1",
      [current]
    );
    const referrer = rows[0]?.referrer_address;
    if (!referrer) break;
    await syncUserStats(referrer);
    current = referrer;
  }
}
