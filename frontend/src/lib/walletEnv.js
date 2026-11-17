// Small browser/wallet helpers shared by the connect modal, session and register page.

/** True on phones/tablets (incl. iPadOS which reports itself as "Macintosh"). */
export function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(ua)) return true;
  return /Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1;
}

/**
 * The WalletConnect (Reown AppKit) modal locks page scroll by injecting
 * <style data-w3m="scroll-lock"> into <head>. If the modal is opened more than once or
 * closed programmatically, that tag can be left behind and the page can't scroll.
 * This removes every leftover lock so the page always scrolls again.
 */
export function releaseScrollLock() {
  if (typeof document === "undefined") return;
  document.head
    .querySelectorAll('style[data-w3m="scroll-lock"]')
    .forEach((el) => el.remove());
  const body = document.body;
  if (body) {
    body.style.removeProperty("overflow");
    body.style.removeProperty("touch-action");
    body.style.removeProperty("overscroll-behavior");
  }
}

/**
 * On mobile with WalletConnect, a request (approve, switch chain) is sent to the wallet
 * app but the phone stays in the browser. This brings the user's wallet app to the
 * front using its native app scheme from the WalletConnect session, so they can approve.
 * Only the native scheme is used (e.g. trust://, metamask://) so the website itself is
 * never redirected or reopened inside the wallet's browser.
 */
export async function openWalletAppForRequest(connector) {
  if (!isMobileDevice() || connector?.id !== "walletConnect") return;
  try {
    const provider = await connector.getProvider?.();
    const native = provider?.session?.peer?.metadata?.redirect?.native;
    if (!native) return;
    const href = native.includes("://") ? native : `${native}://`;
    window.location.href = href;
  } catch {
    /* ignore — the user can open the wallet app manually */
  }
}

// Guard so the connect modal and the session's auto-switch never fire two
// wallet_switchEthereumChain requests at the same time (wallets reject the second one).
let chainSwitchInFlight = false;
export const chainSwitchGuard = {
  get active() {
    return chainSwitchInFlight;
  },
  set(v) {
    chainSwitchInFlight = Boolean(v);
  },
};
