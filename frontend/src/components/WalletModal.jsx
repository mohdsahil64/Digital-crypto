import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useConnect, useAccount, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { bsc } from "wagmi/chains";
import {
  Wallet,
  X,
  Loader2,
  AlertTriangle,
  QrCode,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Network,
} from "lucide-react";

const WalletModalContext = createContext(null);

export function WalletModalProvider({ children }) {
  const [open, setOpen] = useState(false);
  const openConnectModal = useCallback(() => setOpen(true), []);
  const closeConnectModal = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ openConnectModal, closeConnectModal }),
    [openConnectModal, closeConnectModal]
  );

  return (
    <WalletModalContext.Provider value={value}>
      {children}
      {open && <WalletPicker onClose={closeConnectModal} />}
    </WalletModalContext.Provider>
  );
}

export function useWalletModal() {
  const ctx = useContext(WalletModalContext);
  if (!ctx) throw new Error("useWalletModal must be used within WalletModalProvider");
  return ctx;
}

// ─── Mobile wallet deep-link registry ────────────────────────────────────────
// Each entry: { name, icon (emoji fallback), deepLink(url), universalLink(url) }
// deepLink    → opens the wallet app directly (custom scheme)
// universalLink → HTTPS fallback (works on iOS where custom schemes are blocked)
const MOBILE_WALLETS = [
  {
    id: "trust",
    name: "Trust Wallet",
    icon: "https://trustwallet.com/assets/images/media/assets/trust_platform.svg",
    deepLink: (url) => `trust://open_url?coin_id=20000714&url=${encodeURIComponent(url)}`,
    universalLink: (url) => `https://link.trustwallet.com/open_url?coin_id=20000714&url=${encodeURIComponent(url)}`,
    installUrl: "https://trustwallet.com/download",
  },
  {
    id: "metamask",
    name: "MetaMask",
    icon: "https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/SVG_MetaMask_Icon_Color.svg",
    deepLink: (url) => `metamask://dapp/${url.replace(/^https?:\/\//, "")}`,
    universalLink: (url) => `https://metamask.app.link/dapp/${url.replace(/^https?:\/\//, "")}`,
    installUrl: "https://metamask.io/download/",
  },
  {
    id: "binance",
    name: "Binance Web3",
    icon: "https://public.bnbstatic.com/image/cms/blog/20230214/f65d5b56-a0a6-45c5-9ffd-9c7a09b3c53e.png",
    deepLink: (url) => `bnc://app.binance.com/mp/app?appId=binanceweb3wallet&startPagePath=dapp&startPageQuery=url%3D${encodeURIComponent(url)}`,
    universalLink: (url) => `https://app.binance.com/mp/app?appId=binanceweb3wallet&startPagePath=dapp&startPageQuery=url%3D${encodeURIComponent(url)}`,
    installUrl: "https://www.binance.com/en/download",
  },
  {
    id: "okx",
    name: "OKX Wallet",
    icon: "https://static.okx.com/cdn/assets/imgs/221/7B9E56E4B94AAC17.png",
    deepLink: (url) => `okx://main/dapp/url?dappUrl=${encodeURIComponent(url)}`,
    universalLink: (url) => `https://www.okx.com/download?deeplink=${encodeURIComponent(`okx://main/dapp/url?dappUrl=${encodeURIComponent(url)}`)}`,
    installUrl: "https://www.okx.com/web3",
  },
  {
    id: "tokenpocket",
    name: "TokenPocket",
    icon: "https://www.tokenpocket.pro/favicon.ico",
    deepLink: (url) => `tpdapp://open?params=${encodeURIComponent(JSON.stringify({ url, chain: "BSC" }))}`,
    universalLink: (url) => `https://tokenpocket.pro/dapp?url=${encodeURIComponent(url)}`,
    installUrl: "https://www.tokenpocket.pro/en/download/app",
  },
  {
    id: "safepal",
    name: "SafePal",
    icon: "https://safepal.com/favicon.ico",
    deepLink: (url) => `safepal://dapp?url=${encodeURIComponent(url)}`,
    universalLink: (url) => `https://safepal.com/dapp?url=${encodeURIComponent(url)}`,
    installUrl: "https://safepal.com/download",
  },
];

// ─── Detect environment ───────────────────────────────────────────────────────

/** Is this a mobile device (phone/tablet)? */
function isMobile() {
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

/** Is the page already running inside a wallet's in-app browser? */
function isInsideWalletBrowser() {
  const ua = navigator.userAgent.toLowerCase();
  return (
    Boolean(window.ethereum) ||
    ua.includes("trust") ||
    ua.includes("metamask") ||
    ua.includes("tokenpocket") ||
    ua.includes("imtoken") ||
    ua.includes("okex") ||
    ua.includes("safepal") ||
    ua.includes("binanceweb3")
  );
}

/** Open a deep link, fall back to universal link after a short delay if app didn't open */
function openWalletDeepLink(wallet) {
  const currentUrl = window.location.href;
  const deepLink = wallet.deepLink(currentUrl);
  const universalLink = wallet.universalLink(currentUrl);

  // Try deep link first
  window.location.href = deepLink;

  // If app not installed, deep link silently fails — after 1.5s redirect to
  // universal link (which usually shows the app store or opens the wallet web)
  setTimeout(() => {
    // If user is still here (app didn't open), go universal
    window.location.href = universalLink;
  }, 1500);
}

// ─── Main component ───────────────────────────────────────────────────────────

const CONNECT_TIMEOUT_MS = 20000;
const BSC_CHAIN_ID = bsc.id; // 56

function WalletPicker({ onClose }) {
  const { connectors, connectAsync } = useConnect();
  const { isConnected } = useAccount();
  const { disconnectAsync } = useDisconnect();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const [pendingUid, setPendingUid] = useState(null);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");

  const mobile = isMobile();
  const insideWallet = isInsideWalletBrowser();

  // Desktop: EIP-6963 discovered wallets
  const injectedList = dedupeConnectors(
    connectors.filter((c) => isInjected(c))
  );
  const walletConnectConnector = connectors.find((c) => c.id === "walletConnect");

  async function handleConnect(connector) {
    setError("");
    const uid = connector.uid || connector.id;
    setPendingUid(uid);
    try {
      if (isConnected) {
        try { await disconnectAsync(); } catch { /* ignore */ }
      }
      const result = await connectWithFallback(connector, connectAsync);

      // After connect — read chain from the connector's provider directly
      // because wagmi's useChainId hook may not have updated yet.
      let connectedChainId = null;
      try {
        const provider = await connector.getProvider?.();
        if (provider?.request) {
          const hexChainId = await provider.request({ method: "eth_chainId" });
          connectedChainId = parseInt(hexChainId, 16);
        }
      } catch { /* ignore */ }

      // Fallback to wagmi hook value
      if (!connectedChainId) connectedChainId = chainId;

      if (connectedChainId && connectedChainId !== BSC_CHAIN_ID) {
        setSwitching(true);
        try {
          await switchChainAsync({ chainId: BSC_CHAIN_ID });
        } catch {
          setError("Please switch to BNB Smart Chain (BSC) to continue.");
          setSwitching(false);
          setPendingUid(null);
          return;
        }
        setSwitching(false);
      }

      onClose();
    } catch (e) {
      setSwitching(false);
      const raw = (e?.shortMessage || e?.message || "").toLowerCase();
      if (raw.includes("already connected")) { onClose(); return; }
      setError(readableError(e, connector));
    } finally {
      setPendingUid(null);
    }
  }

  const anyPending = pendingUid !== null || switching;

  // ── Mobile + NOT inside wallet browser → show deep link list ──
  if (mobile && !insideWallet) {
    return (
      <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
        <div className="relative w-full max-w-xs rounded-t-2xl border border-white/10 bg-navy-900 p-4 shadow-2xl sm:max-w-sm sm:rounded-2xl sm:p-5">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-slate-300 transition hover:bg-white/15 hover:text-white"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500/15 ring-1 ring-accent-500/30">
              <Smartphone className="h-5 w-5 text-accent-400" />
            </div>
            <h3 className="mt-3 font-display text-lg font-bold">Choose your wallet</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Tap a wallet to open it and connect
            </p>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-2 text-[11px] text-red-300">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Mobile wallet list */}
          <div className="mt-4 space-y-2">
            {MOBILE_WALLETS.map((w) => (
              <button
                key={w.id}
                onClick={() => openWalletDeepLink(w)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left transition hover:border-accent-500/40 hover:bg-white/[0.06] active:scale-[0.98]"
              >
                <img
                  src={w.icon}
                  alt={w.name}
                  className="h-9 w-9 rounded-xl object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextSibling.style.display = "flex";
                  }}
                />
                <span
                  className="hidden h-9 w-9 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400"
                >
                  <Wallet className="h-4 w-4" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-slate-100">
                    {w.name}
                  </span>
                  <span className="block text-[11px] text-slate-400">
                    Tap to open app
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            ))}
          </div>

          {/* WalletConnect fallback for mobile too */}
          {walletConnectConnector && (
            <button
              onClick={() => handleConnect(walletConnectConnector)}
              disabled={anyPending}
              className="mt-3 flex w-full items-center gap-2.5 rounded-xl border border-accent-500/30 bg-accent-500/10 px-3 py-2.5 text-left transition hover:bg-accent-500/15 disabled:opacity-60"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/20">
                {switching ? (
                  <Loader2 className="h-4 w-4 animate-spin text-accent-400" />
                ) : pendingUid === (walletConnectConnector.uid || walletConnectConnector.id) ? (
                  <Loader2 className="h-4 w-4 animate-spin text-accent-400" />
                ) : (
                  <QrCode className="h-4 w-4 text-accent-400" />
                )}
              </span>
              <span className="flex-1 text-sm font-medium text-slate-100">
                {switching ? "Switching to BSC..." : "Other wallet (WalletConnect)"}
              </span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          )}

          {/* Info */}
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <p className="text-[11px] leading-snug text-slate-400">
              You'll be taken to your wallet app to approve the connection. No funds
              will be moved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Desktop / inside wallet browser → existing EIP-6963 flow ──
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="relative w-full max-w-xs rounded-t-2xl border border-white/10 bg-navy-900 p-4 shadow-2xl sm:max-w-sm sm:rounded-2xl sm:p-5">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-slate-300 transition hover:bg-white/15 hover:text-white"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500/15 ring-1 ring-accent-500/30">
            <Wallet className="h-5 w-5 text-accent-400" />
          </div>
          <h3 className="mt-3 font-display text-lg font-bold">Join & Start Earning</h3>
          <p className="mt-0.5 text-xs text-slate-400">Connect your wallet to get started</p>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-2 text-[11px] text-red-300">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* WalletConnect — primary CTA */}
        {walletConnectConnector && (
          <button
            onClick={() => handleConnect(walletConnectConnector)}
            disabled={anyPending}
            className="mt-4 flex w-full items-center gap-2.5 rounded-xl bg-accent-500 px-3 py-3 text-left transition hover:bg-accent-400 disabled:opacity-60"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              {switching ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : pendingUid === (walletConnectConnector.uid || walletConnectConnector.id) ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <QrCode className="h-4 w-4 text-white" />
              )}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-white">
                {switching ? "Switching to BSC..." : "Start Now & Register Now"}
              </span>
              <span className="block text-[11px] text-white/80">
                {switching ? "Please approve in your wallet" : "Quick setup via QR"}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-white/90" />
          </button>
        )}

        {/* Detected browser extensions */}
        <p className="mb-1.5 mt-4 text-[11px] font-medium text-slate-400">Detected apps:</p>
        <div className="space-y-2">
          {injectedList.map((c) => {
            const uid = c.uid || c.id;
            const isThisPending = pendingUid === uid;
            return (
              <button
                key={uid}
                onClick={() => handleConnect(c)}
                disabled={anyPending}
                className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-accent-500/40 hover:bg-white/[0.06] disabled:opacity-60"
              >
                <WalletIcon connector={c} />
                <span className="flex-1 text-sm font-semibold text-slate-100">
                  {friendlyName(c)}
                </span>
                {isThisPending && !switching ? (
                  <Loader2 className="h-4 w-4 animate-spin text-accent-400" />
                ) : isThisPending && switching ? (
                  <span className="flex items-center gap-1 text-[10px] text-amber-300">
                    <Network className="h-3 w-3" /> Switching to BSC...
                  </span>
                ) : (
                  <span className="rounded-full border border-emerald-500/40 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                    Ready
                  </span>
                )}
              </button>
            );
          })}

          {injectedList.length === 0 && (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-slate-400">
              No wallet extension detected. Install MetaMask or Trust Wallet, or use the
              QR option above from your phone.
            </p>
          )}
        </div>

        {/* Trust banners */}
        <div className="mt-4 space-y-2">
          <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <p className="text-[11px] leading-snug text-slate-400">
              Your data is encrypted and secure. We follow industry-standard security protocols.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function connectWithFallback(connector, connectAsync) {
  try {
    await withTimeout(connectAsync({ connector }), CONNECT_TIMEOUT_MS);
    return;
  } catch (firstErr) {
    const raw = (firstErr?.shortMessage || firstErr?.message || "").toLowerCase();
    const userRejected =
      raw.includes("reject") || raw.includes("denied") || raw.includes("cancel");
    if (userRejected || !isInjected(connector)) throw firstErr;

    const provider = await safeGetProvider(connector);
    if (!provider?.request) throw firstErr;

    await withTimeout(
      provider.request({ method: "eth_requestAccounts" }),
      CONNECT_TIMEOUT_MS
    );
    await withTimeout(connectAsync({ connector }), CONNECT_TIMEOUT_MS);
  }
}

async function safeGetProvider(connector) {
  try { return await connector.getProvider?.(); } catch { return null; }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timed out — the wallet didn't respond")), ms)
    ),
  ]);
}

function isInjected(c) {
  return c.type === "injected" || c.id === "injected";
}

function WalletIcon({ connector }) {
  const icon = connector.icon;
  if (icon) {
    return (
      <img
        src={icon}
        alt=""
        className="h-7 w-7 rounded-lg"
        onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
      />
    );
  }
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-500/15">
      <Wallet className="h-3.5 w-3.5 text-accent-400" />
    </span>
  );
}

function friendlyName(c) {
  const name = c.name || c.id || "Wallet";
  if (c.id === "injected" && /injected/i.test(name)) return "Browser Wallet";
  return name;
}

function readableError(e, connector) {
  const raw = (e?.shortMessage || e?.message || "").toLowerCase();
  const name = connector?.name || "your wallet";
  if (raw.includes("reject") || raw.includes("denied") || raw.includes("cancel"))
    return `Connection request was declined in ${connector?.name || "the wallet"}. Please try again and approve it.`;
  if (raw.includes("already") && raw.includes("pending"))
    return `A request is already open in ${name}. Open your wallet, finish or cancel it, then try again.`;
  if (raw.includes("timed out"))
    return `${name} didn't respond. Open the extension, unlock it, then try again.`;
  if (raw.includes("not found") || raw.includes("no provider") || raw.includes("provider"))
    return `Couldn't reach ${name}. Make sure it's installed and unlocked, then try again.`;
  if (raw.includes("chain") || raw.includes("network"))
    return `Please switch ${name} to BNB Smart Chain and try again.`;
  return e?.shortMessage || e?.message || `Couldn't connect ${name}. Please try again.`;
}

function dedupeConnectors(connectors) {
  const seen = new Set();
  const out = [];
  const ordered = [...connectors].sort((a, b) => {
    const aGeneric = a.id === "injected" ? 1 : 0;
    const bGeneric = b.id === "injected" ? 1 : 0;
    return aGeneric - bGeneric;
  });
  for (const c of ordered) {
    const key = (c.name || c.id || "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}
