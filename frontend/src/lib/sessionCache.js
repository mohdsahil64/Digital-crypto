// Small shared helper for the logged-in session cache.
//
// We persist { address, user, verifiedAt } in localStorage. A session is considered
// "fresh" (still logged in) for MAX_SESSION_AGE_MS since the last activity. While it's
// fresh, a page reload keeps the user logged in (wallet auto-reconnects + we restore
// from cache with no popup). Once it goes stale (e.g. reopened much later), we clear it
// and send the user back to the public hero to sign in again.

export const LS_KEY = "dw_session";

// How long a session stays valid without activity. After this, a reload logs out.
export const MAX_SESSION_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

export function readSessionCache() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.address || !data.user || !data.verifiedAt) return null;
    return data;
  } catch {
    return null;
  }
}

// A cached session is "fresh" if it exists and isn't older than MAX_SESSION_AGE_MS.
export function hasFreshSession() {
  const data = readSessionCache();
  if (!data) return false;
  return Date.now() - data.verifiedAt <= MAX_SESSION_AGE_MS;
}

export function writeSessionCache(address, user) {
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ address: address.toLowerCase(), user, verifiedAt: Date.now() })
    );
  } catch {
    /* ignore */
  }
}

export function clearSessionCache() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}
