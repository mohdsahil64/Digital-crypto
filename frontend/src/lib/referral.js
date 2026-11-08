// Referral-code capture + persistence.
//
// A referral code arrives in the URL as ?ref=CODE. We save it so it survives the
// wallet-connect round-trip (which can reload / redirect) and is available when the
// user finally reaches the register screen — where it shows up pre-filled.

const LS_KEY = "dw_referral";

/** Read ?ref= from the current URL, if present. */
export function readRefFromUrl() {
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    return ref ? ref.trim() : "";
  } catch {
    return "";
  }
}

/** Persist a referral code (localStorage survives tab close within the browser). */
export function saveReferral(code) {
  if (!code) return;
  try {
    localStorage.setItem(LS_KEY, code.trim());
  } catch {
    /* ignore */
  }
}

/** Get the saved referral code, if any. */
export function getReferral() {
  try {
    return localStorage.getItem(LS_KEY) || "";
  } catch {
    return "";
  }
}

/** Clear the saved referral (after it's been applied at registration). */
export function clearReferral() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Capture ?ref= from the URL into storage if present. Returns the code found (or "").
 * Safe to call on any page mount.
 */
export function captureReferralFromUrl() {
  const ref = readRefFromUrl();
  if (ref) saveReferral(ref);
  return ref;
}
