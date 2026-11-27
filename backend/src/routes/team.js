import { Router } from "express";
import { query } from "../db/pool.js";
import { normalizeAddress } from "../utils.js";

export const teamRouter = Router();

/**
 * GET /api/team/:address
 * Returns direct referrals + a bounded downline tree for the tree/team view.
 */
teamRouter.get("/:address", async (req, res) => {
  const address = normalizeAddress(req.params.address);
  if (!address) return res.status(400).json({ error: "invalid address" });

  try {
    const tree = await buildTree(address, 10, true);
    const directs = await query(
      "SELECT wallet_address, referral_code, level, direct_count, team_count, has_invested, created_at FROM users WHERE referrer_address = $1 ORDER BY created_at ASC",
      [address]
    );
    return res.json({
      root: address,
      directReferrals: directs.rows.map(mapMember),
      tree,
    });
  } catch (err) {
    console.error("team error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

/**
 * GET /api/team/:address/indirect
 * Full downline excluding direct members (depth 2+).
 */
teamRouter.get("/:address/indirect", async (req, res) => {
  const address = normalizeAddress(req.params.address);
  if (!address) return res.status(400).json({ error: "invalid address" });

  try {
    const { rows } = await query(
      `WITH RECURSIVE downline AS (
         SELECT wallet_address, has_invested, created_at, 1 AS depth
         FROM users WHERE referrer_address = $1
         UNION ALL
         SELECT u.wallet_address, u.has_invested, u.created_at, d.depth + 1
         FROM users u
         JOIN downline d ON u.referrer_address = d.wallet_address
         WHERE d.depth < 16
       )
       SELECT wallet_address, has_invested, created_at
       FROM downline
       WHERE depth >= 2
       ORDER BY created_at ASC`,
      [address]
    );
    return res.json({ members: rows.map(mapMemberFlat) });
  } catch (err) {
    console.error("indirect team error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

/**
 * GET /api/team/:address/global
 * Everyone in this user's "line" (organization) — from the root head down.
 */
teamRouter.get("/:address/global", async (req, res) => {
  const address = normalizeAddress(req.params.address);
  if (!address) return res.status(400).json({ error: "invalid address" });

  try {
    // Find the root (topmost referrer with no referrer of their own).
    const root = await findLineRoot(address);

    const { rows } = await query(
      `WITH RECURSIVE line AS (
         SELECT wallet_address, has_invested, created_at
         FROM users WHERE wallet_address = $1
         UNION ALL
         SELECT u.wallet_address, u.has_invested, u.created_at
         FROM users u
         JOIN line l ON u.referrer_address = l.wallet_address
       )
       SELECT wallet_address, has_invested, created_at FROM line
       ORDER BY created_at ASC`,
      [root]
    );
    return res.json({ root, members: rows.map(mapMemberFlat) });
  } catch (err) {
    console.error("global team error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

async function findLineRoot(address) {
  let current = address;
  for (let i = 0; i < 50; i++) {
    const { rows } = await query(
      "SELECT referrer_address FROM users WHERE wallet_address = $1",
      [current]
    );
    const referrer = rows[0]?.referrer_address;
    if (!referrer) return current;
    current = referrer;
  }
  return current;
}

async function buildTree(address, depth, isRoot = false) {
  const node = { address, children: [], invested: false, level: 0 };
  // Enrich the node with its own status (skip for root — that's "You").
  if (!isRoot) {
    const self = await query(
      "SELECT has_invested, level FROM users WHERE wallet_address = $1",
      [address]
    );
    if (self.rows[0]) {
      node.invested = self.rows[0].has_invested;
      node.level = self.rows[0].level;
    }
  }
  if (depth <= 0) return node;
  const { rows } = await query(
    "SELECT wallet_address FROM users WHERE referrer_address = $1 ORDER BY created_at ASC",
    [address]
  );
  for (const row of rows) {
    node.children.push(await buildTree(row.wallet_address, depth - 1));
  }
  return node;
}

function mapMember(m) {
  return {
    walletAddress: m.wallet_address,
    referralCode: m.referral_code,
    level: m.level,
    directCount: m.direct_count,
    teamCount: m.team_count,
    hasInvested: m.has_invested,
    joinedAt: m.created_at,
  };
}

function mapMemberFlat(m) {
  return {
    walletAddress: m.wallet_address,
    hasInvested: m.has_invested,
    joinedAt: m.created_at,
  };
}
