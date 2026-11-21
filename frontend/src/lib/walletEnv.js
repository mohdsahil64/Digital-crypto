// Small browser/wallet helpers shared by the connect modal, session and register page.

/** True on phones/tablets (incl. iPadOS which reports itself as "Macintosh"). */
export function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(ua)) return true;
  return /Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1;
}

/**
 * True when the page is already running inside a wallet's own in-app browser (an
 * injected `window.ethereum` provider is present). Used to hide the "Open in <Wallet>"
 * buttons once the site is already open where it needs to be.
 */
export function isInsideWalletBrowser() {
  if (typeof window === "undefined") return false;
  const eth = window.ethereum;
  if (eth) return true;
  // Some wallets inject the provider a moment after page load, so also check the
  // user agent / wallet-specific globals.
  if (window.trustwallet || window.bitkeep || window.safepal || window.okxwallet || window.phantom?.ethereum) return true;
  const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
  return /MetaMaskMobile|Trust\/|TrustWallet|BitKeep|Bitget|SafePal|OKApp|TokenPocket|imToken|CoinbaseWallet|Binance/i.test(ua);
}

/** True while Reown AppKit's own modal is on screen. */
export function isAppKitModalOpen() {
  if (typeof document === "undefined") return false;
  const el = document.querySelector("w3m-modal");
  return Boolean(el && el.classList.contains("open"));
}

/**
 * Universal links that open a wallet app and load this site directly inside that
 * wallet's own in-app browser — on a plain mobile browser (Chrome/Safari) with the app
 * installed, tapping one of these hands the whole site over to the wallet's browser;
 * the connect step then uses the wallet's own injected provider (EIP-6963), no
 * WalletConnect needed. If the wallet app isn't installed, the link falls back to that
 * wallet's own store/landing page (standard behavior of these universal links).
 *
 * These are genuinely universal: any user who opens one of these exact links — from
 * this button, or pasted anywhere else (chat, notes, etc.) — gets the same redirect
 * into that wallet's app, on any mobile browser.
 */
export function walletDeepLinks(siteUrl) {
  const url = siteUrl || (typeof window !== "undefined" ? window.location.href : "");
  const encoded = encodeURIComponent(url);
  // Strip the scheme for links that want a bare host+path (e.g. metamask.app.link).
  const bare = url.replace(/^https?:\/\//i, "");
  return {
    metamask: `https://metamask.app.link/dapp/${bare}`,
    trust: `https://link.trustwallet.com/open_url?coin_id=20000714&url=${encoded}`,
    bitget: `https://bkcode.vip?action=dapp&url=${encoded}`,
    safepal: `https://link.safepal.io/opendapp?url=${encoded}`,
  };
}

/**
 * The WalletConnect (Reown AppKit) modal locks page scroll by injecting
 * <style data-w3m="scroll-lock"> into <head>. If the modal is opened more than once or
 * closed programmatically, that tag can be left behind and the page can't scroll.
 * This removes every leftover lock so the page always scrolls again.
 */
export function releaseScrollLock() {
  if (typeof document === "undefined") return;
  // Never touch the lock while AppKit's modal is open: that same style tag is what
  // makes the modal clickable (w3m-modal { pointer-events: auto }) and blocks the
  // page behind it. Removing it left the modal un-clickable and the page scrollable.
  if (isAppKitModalOpen()) return;
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
  // Already inside a wallet's in-app browser (injected provider): never navigate away,
  // the request shows up in the wallet by itself.
  if (typeof window !== "undefined" && window.ethereum) return;
  try {
    const provider = await connector.getProvider?.();
    const native = provider?.session?.peer?.metadata?.redirect?.native;
    if (!native) return;
    // Only open real app schemes (trust://, metamask://). Never an http(s) URL, which
    // would navigate this tab away from the site.
    const href = native.includes("://") ? native : `${native}://`;
    if (/^https?:/i.test(href)) return;
    const a = document.createElement("a");
    a.href = href;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1000);
  } catch {
    /* ignore — the user can open the wallet app manually */
  }
}

// Guard so the connect modal and the session's auto-switch never fire two
// wallet_switchEthereumChain requests at the same time (wallets reject the second one).
let chainSwitchInFlight = false;
// Chain the connect modal already asked the wallet to switch away from, and when.
let lastAttempt = { chainId: undefined, at: 0 };
const ATTEMPT_WINDOW_MS = 30000;
export const chainSwitchGuard = {
  get active() {
    return chainSwitchInFlight;
  },
  set(v) {
    chainSwitchInFlight = Boolean(v);
  },
  markAttempted(chainId) {
    lastAttempt = { chainId: chainId ?? null, at: Date.now() };
  },
  // True if the modal asked to switch away from this chain moments ago. An unknown
  // chain id (null) counts as a match for any chain.
  recentlyAttempted(chainId) {
    if (Date.now() - lastAttempt.at > ATTEMPT_WINDOW_MS) return false;
    return lastAttempt.chainId === null || lastAttempt.chainId === chainId;
  },
};

// ── Network switch to BSC with a raw-provider fallback (Trust Wallet) ──
const BSC_HEX = "0x38";
const BSC_PARAMS = {
  chainId: BSC_HEX,
  chainName: "BNB Smart Chain",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: ["https://bsc-dataseed.binance.org/"],
  blockExplorerUrls: ["https://bscscan.com"],
};

/** True when running inside Trust Wallet (its in-app browser or its injected provider). */
export function isTrustWallet(connector) {
  if (typeof window === "undefined") return false;
  const eth = window.ethereum;
  if (window.trustwallet || eth?.isTrust || eth?.isTrustWallet) return true;
  if (eth?.providers?.some?.((p) => p?.isTrust || p?.isTrustWallet)) return true;
  const name = `${connector?.id || ""} ${connector?.name || ""}`.toLowerCase();
  if (name.includes("trust")) return true;
  const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
  return /Trust\/|TrustWallet/i.test(ua);
}

// Last switch attempt, shown on the wrong-network screen so a screenshot tells us
// exactly what the wallet answered (Trust Wallet debugging).
export const switchDiag = { log: [] };
function diag(msg) {
  switchDiag.log.push(msg);
  if (switchDiag.log.length > 8) switchDiag.log.shift();
}

/** Every distinct EIP-1193 provider that could be the user's wallet. */
async function getRawProviders(connector) {
  const list = [];
  try {
    const p = await connector?.getProvider?.();
    if (p?.request) list.push(p);
  } catch { /* ignore */ }
  if (typeof window !== "undefined") {
    for (const p of [window.trustwallet, window.trustWallet?.ethereum, window.ethereum, ...(window.ethereum?.providers || [])]) {
      if (p?.request && !list.includes(p)) list.push(p);
    }
  }
  return list;
}

const isUserRejection = (e) =>
  e?.code === 4001 || e?.cause?.code === 4001 || /reject|denied|cancel/i.test(e?.shortMessage || e?.message || "");

const errText = (e) => `${e?.code ?? ""} ${e?.shortMessage || e?.message || e}`.trim().slice(0, 80);

async function readChain(provider) {
  try {
    return Number(await provider.request({ method: "eth_chainId" }));
  } catch {
    return null;
  }
}

/** Try switch → add chain → switch on one provider. Returns true once it reports BSC. */
async function trySwitchOn(provider) {
  if ((await readChain(provider)) === 56) return true;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BSC_HEX }] });
  } catch (e) {
    diag(`switch: ${errText(e)}`);
    if (isUserRejection(e)) throw e;
    try {
      await provider.request({ method: "wallet_addEthereumChain", params: [BSC_PARAMS] });
    } catch (e2) {
      diag(`add: ${errText(e2)}`);
      if (isUserRejection(e2)) throw e2;
    }
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BSC_HEX }] });
    } catch (e3) {
      diag(`switch2: ${errText(e3)}`);
      if (isUserRejection(e3)) throw e3;
    }
  }
  const now = await readChain(provider);
  diag(`chain now: ${now}`);
  return now === 56;
}

/**
 * Some wallets (Trust Wallet) switch but never fire `chainChanged`, so the app keeps
 * thinking it's on the old chain and looks stuck. Push the new chain into wagmi.
 */
function syncWagmiChain(connector) {
  try {
    connector?.onChainChanged?.(BSC_HEX);
    diag("synced app to 56");
  } catch { /* ignore */ }
}

/** Switch via every raw provider in turn until one ends up on BSC. */
async function rawSwitchToBsc(connector) {
  const providers = await getRawProviders(connector);
  diag(`providers: ${providers.length}`);
  if (!providers.length) throw new Error("no wallet provider");
  for (const p of providers) {
    if (await trySwitchOn(p)) {
      syncWagmiChain(connector);
      return;
    }
  }
  throw new Error("wallet did not switch to BNB Smart Chain");
}

const withTimeout = (p, ms) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("switch timeout")), ms))]);

/**
 * Ask the wallet to move to BSC. Trust Wallet goes straight to the raw providers
 * (switch → add chain → switch, then sync the app), because wagmi's/AppKit's switch
 * hangs there. Other wallets use wagmi first and fall back to the raw path on any
 * non-rejection error or a hang.
 */
export async function switchToBsc({ switchChainAsync, connector }) {
  if (isTrustWallet(connector)) {
    diag(`trust: ${connector?.id || "?"}`);
    await rawSwitchToBsc(connector);
    return;
  }
  try {
    await withTimeout(switchChainAsync({ chainId: 56 }), 20000);
  } catch (e) {
    if (isUserRejection(e)) throw e;
    await rawSwitchToBsc(connector);
  }
}

/**
 * Last resort for Trust Wallet: reopen this page inside Trust Wallet's browser with
 * BNB Smart Chain selected (coin_id 20000714 = BNB Smart Chain). Inside Trust's own
 * browser the app scheme is used; elsewhere the universal link.
 */
export function trustBscLink() {
  const url = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
  const q = `coin_id=20000714&url=${encodeURIComponent(url)}`;
  return isInsideWalletBrowser() ? `trust://open_url?${q}` : `https://link.trustwallet.com/open_url?${q}`;
}
