import crypto from "crypto";

/** Generate a short, human-friendly referral code. */
export function generateReferralCode() {
  return "DW" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

/** Basic 0x address validation + normalization to lowercase. */
export function normalizeAddress(addr) {
  if (typeof addr !== "string") return null;
  const a = addr.trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(a)) return null;
  return a;
}
