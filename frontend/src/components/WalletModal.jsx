import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
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
  Network,
} from "lucide-react";
import {
  isMobileDevice,
  releaseScrollLock,
  openWalletAppForRequest,
  chainSwitchGuard,
} from "../lib/walletEnv.js";

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

// ─── Main component ───────────────────────────────────────────────────────────

const CONNECT_TIMEOUT_MS = 60000;
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
  const isMobile = useMemo(() => isMobileDevice(), []);
  // Synchronous lock: blocks a second tap before React re-renders the disabled button.
  const connectLock = useRef(false);

  // Clear any stale error when modal opens fresh; always release a leftover
  // WalletConnect scroll lock when this modal goes away.
  useEffect(() => {
    setError("");
    setSwitching(false);
    return () => releaseScrollLock();
  }, []);

  // Desktop: EIP-6963 discovered wallets
  const injectedList = dedupeConnectors(
    connectors.filter((c) => isInjected(c))
  );
  const walletConnectConnector = connectors.find((c) => c.id === "walletConnect");

  async function handleConnect(connector) {
    if (connectLock.current) return;
    connectLock.current = true;
    setError("");
    const uid = connector.uid || connector.id;
    setPendingUid(uid);
    try {
      // Only disconnect when no connect request is waiting in the wallet; otherwise
      // keep it so we don't end up sending a second one.
      if (isConnected && !inFlightConnect.has(uid)) {
        try { await disconnectAsync(); } catch { /* ignore */ }
      }
      await connectOnce(connector, connectAsync);

      // Always read chain directly from provider after connect —
      // wagmi's useChainId hook lags behind and must not be trusted here.
      let connectedChainId = null;
      try {
        const provider = await connector.getProvider?.();
        if (provider?.request) {
          const hexChainId = await provider.request({ method: "eth_chainId" });
          connectedChainId = parseInt(hexChainId, 16);
        }
      } catch { /* ignore */ }

      // If provider didn't respond, assume wrong chain and force switch.
      // Never skip the switch just because we couldn't read the chain id.
      const needsSwitch = !connectedChainId || connectedChainId !== BSC_CHAIN_ID;

      if (needsSwitch) {
        setSwitching(true);
        chainSwitchGuard.set(true);
        // Tell the session's auto-switch this chain was already asked about, so it
        // doesn't send the wallet a second switch request.
        chainSwitchGuard.markAttempted(connectedChainId);
        try {
          // Ask the wallet to switch to BSC right away (wagmi adds the BSC network
          // to the wallet first if it doesn't have it). On mobile WalletConnect,
          // bring the wallet app to the front so the user can approve it.
          const switchPromise = switchChainAsync({ chainId: BSC_CHAIN_ID });
          openWalletAppForRequest(connector);
          await switchPromise;
        } catch (switchErr) {
          // Some wallets (e.g. MetaMask mobile) throw even on success —
          // re-read the chain to confirm before giving up.
          let chainAfterAttempt = null;
          try {
            const provider = await connector.getProvider?.();
            if (provider?.request) {
              const hex = await provider.request({ method: "eth_chainId" });
              chainAfterAttempt = parseInt(hex, 16);
            }
          } catch { /* ignore */ }

          if (chainAfterAttempt !== BSC_CHAIN_ID) {
            setError(
              "We couldn't finish setting things up. Please try again."
            );
            setSwitching(false);
            setPendingUid(null);
            return;
          }
          // Switch actually succeeded despite the thrown error — continue.
        } finally {
          chainSwitchGuard.set(false);
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
      connectLock.current = false;
      setPendingUid(null);
      releaseScrollLock();
    }
  }

  // Mobile shows ONE button. In a normal mobile browser it opens the WalletConnect
  // wallet list (user picks a wallet, which gets a connect request — the site is not
  // reopened inside the wallet). If the site is already open inside a wallet's own
  // browser, the same button connects that wallet directly.
  const mobilePrimary = isMobile ? injectedList[0] || walletConnectConnector : walletConnectConnector;

  const anyPending = pendingUid !== null || switching;

  // ── Unified UI for all devices ──
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-xs overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-navy-900 p-4 shadow-2xl sm:max-w-sm sm:p-5">
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
          <p className="mt-0.5 text-xs text-slate-400">Join in seconds and start earning</p>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-2 text-[11px] text-red-300">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Primary CTA — WalletConnect (or the in-wallet browser's wallet on mobile) */}
        {mobilePrimary && (
          <button
            onClick={() => handleConnect(mobilePrimary)}
            disabled={anyPending}
            className="mt-4 flex w-full items-center gap-2.5 rounded-xl bg-accent-500 px-3 py-3 text-left transition hover:bg-accent-400 disabled:opacity-60"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              {switching || pendingUid === (mobilePrimary.uid || mobilePrimary.id) ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <QrCode className="h-4 w-4 text-white" />
              )}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-white">
                {switching ? "Getting things ready..." : "Get Started"}
              </span>
              <span className="block text-[11px] text-white/80">
                {switching ? "Just a moment, please confirm to continue" : "Tap to begin"}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-white/90" />
          </button>
        )}

        {isMobile && !mobilePrimary && (
          <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-slate-400">
            We can't get you started right now. Please try again in a moment.
          </p>
        )}

        {/* Detected browser extensions — desktop only */}
        {!isMobile && (<>
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
                    <Network className="h-3 w-3" /> Getting ready...
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
              No wallet detected. Use the Get Started button above to scan a QR code with your phone.
            </p>
          )}
        </div>
        </>)}

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

// One connect request per wallet. If the user taps again (or reopens the modal) while
// the wallet still shows the earlier request, we wait on that same request instead of
// sending a new one. No automatic retries: every extra request shows up as another
// popup in the wallet.
const inFlightConnect = new Map();

async function connectOnce(connector, connectAsync) {
  const uid = connector.uid || connector.id;
  let request = inFlightConnect.get(uid);
  if (!request) {
    request = connectAsync({ connector }).finally(() => inFlightConnect.delete(uid));
    inFlightConnect.set(uid, request);
  }
  // The timeout only frees the UI. The wallet request stays open and is reused on the
  // next tap, so it never turns into a duplicate.
  await withTimeout(request, CONNECT_TIMEOUT_MS);
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
  // Friendly, non-technical messages only — never show raw wallet/SDK errors.
  void connector;
  if (raw.includes("reject") || raw.includes("denied") || raw.includes("cancel"))
    return "No problem! Tap Get Started whenever you're ready.";
  if (raw.includes("already") && raw.includes("pending"))
    return "You have a step waiting to be finished. Please complete it, then try again.";
  if (raw.includes("timed out"))
    return "Please open your wallet and confirm the request that's waiting there.";
  if (raw.includes("chain") || raw.includes("network"))
    return "Almost there! Please try again to continue.";
  return "Something didn't go through. Please try again.";
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
