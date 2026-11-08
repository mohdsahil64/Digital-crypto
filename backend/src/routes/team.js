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
    // Full downline tree (all members, active + inactive), bounded depth to match the
    // reward chain. Each node carries basic info so the UI can badge active/inactive.
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
