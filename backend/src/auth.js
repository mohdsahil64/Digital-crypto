import crypto from "crypto";

// Password hashing with scrypt (salted). Format: scrypt$<salt>$<hash>
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password, stored) {
  try {
    const [scheme, salt, hash] = stored.split("$");
    if (scheme !== "scrypt") return false;
    const derived = crypto.scryptSync(password, salt, 64).toString("hex");
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(derived, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// Stateless signed token: base64(payload).hmac. Good enough for a demo admin panel.
function sign(data, secret) {
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

export function issueToken(payload, secret, ttlSeconds = 60 * 60 * 8) {
  const body = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const data = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = sign(data, secret);
  return `${data}.${sig}`;
}

export function verifyToken(token, secret) {
  if (!token || !token.includes(".")) return null;
  const [data, sig] = token.split(".");
  if (sign(data, secret) !== sig) return null;
  try {
    const body = JSON.parse(Buffer.from(data, "base64url").toString());
    if (body.exp && body.exp < Math.floor(Date.now() / 1000)) return null;
    return body;
  } catch {
    return null;
  }
}

/**
 * Stateless wallet-ownership nonce. We do NOT store anything in the DB for a wallet
 * until it actually registers, so the signing nonce must be self-contained: it's an
 * HMAC over the address + a timestamp. verifyNonce re-derives and checks the HMAC and
 * rejects anything older than the TTL. This lets /connect issue a challenge without
 * creating a DB row.
 */
export function issueNonce(address, secret, ttlSeconds = 60 * 10) {
  const addr = String(address).toLowerCase();
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const rand = crypto.randomBytes(8).toString("hex");
  const body = `${addr}.${exp}.${rand}`;
  const sig = crypto.createHmac("sha256", secret).update(body).digest("hex").slice(0, 32);
  // The client signs this whole string; we can validate it later with no DB.
  return `${body}.${sig}`;
}

export function verifyNonce(nonce, address, secret) {
  try {
    const parts = String(nonce).split(".");
    if (parts.length !== 4) return false;
    const [addr, exp, rand, sig] = parts;
    if (addr !== String(address).toLowerCase()) return false;
    if (Number(exp) < Math.floor(Date.now() / 1000)) return false;
    const body = `${addr}.${exp}.${rand}`;
    const expected = crypto.createHmac("sha256", secret).update(body).digest("hex").slice(0, 32);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
