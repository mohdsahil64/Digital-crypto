import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useConnect, useAccount, useDisconnect } from "wagmi";
import { Wallet, X, Loader2, AlertTriangle, QrCode, ChevronRight, ShieldCheck, Fuel } from "lucide-react";

/**
 * Custom wallet connect modal (RainbowKit-free).
 *
 * Lists every EIP-6963 wallet wagmi auto-discovers from the browser plus WalletConnect
 * (QR / mobile). Connecting is made reliable with a two-step strategy in
 * `handleConnect`: try wagmi's connectAsync first, and if it stalls or throws for an
 * injected wallet, FORCE the wallet's own provider to prompt via eth_requestAccounts
 * and then complete through wagmi. This fixes extensions that occasionally don't pop.
 */
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

const CONNECT_TIMEOUT_MS = 20000;

function WalletPicker({ onClose }) {
  const { connectors, connectAsync } = useConnect();
  const { isConnected } = useAccount();
  const { disconnectAsync } = useDisconnect();
  const [pendingUid, setPendingUid] = useState(null);
  const [error, setError] = useState("");

  // Split: injected/extension wallets ("Detected apps") vs WalletConnect (QR).
  const injectedList = dedupeConnectors(
    connectors.filter((c) => isInjected(c))
  );
  const walletConnectConnector = connectors.find((c) => c.id === "walletConnect");

  async function handleConnect(connector) {
    setError("");
    const uid = connector.uid || connector.id;
    setPendingUid(uid);
    try {
      // If a wallet is already connected (e.g. a leftover session, or the user picked a
      // different wallet), disconnect first so the new choice connects cleanly. This
      // prevents the "Connector already connected" error.
      if (isConnected) {
        try { await disconnectAsync(); } catch { /* ignore */ }
      }
      await connectWithFallback(connector, connectAsync);
      onClose();
    } catch (e) {
      const raw = (e?.shortMessage || e?.message || "").toLowerCase();
      // "Already connected" is not a real failure — the wallet IS connected, so just
      // close and let the session flow take over.
      if (raw.includes("already connected")) {
        onClose();
        return;
      }
      setError(readableError(e, connector));
    } finally {
      setPendingUid(null);
    }
  }

  const anyPending = pendingUid !== null;

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

        {/* WalletConnect — primary highlighted action (QR / mobile) */}
        {walletConnectConnector && (
          <button
            onClick={() => handleConnect(walletConnectConnector)}
            disabled={anyPending}
            className="mt-4 flex w-full items-center gap-2.5 rounded-xl bg-accent-500 px-3 py-3 text-left transition hover:bg-accent-400 disabled:opacity-60"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              {pendingUid === (walletConnectConnector.uid || walletConnectConnector.id) ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <QrCode className="h-4 w-4 text-white" />
              )}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-white">
                Start Now & Register Now
              </span>
              <span className="block text-[11px] text-white/80">Quick setup via QR</span>
            </span>
            <ChevronRight className="h-4 w-4 text-white/90" />
          </button>
        )}

        {/* Detected apps */}
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
                {isThisPending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-accent-400" />
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

        {/* Trust / info banners */}
        <div className="mt-4 space-y-2">
          <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <p className="text-[11px] leading-snug text-slate-400">
              Your data is encrypted and secure. We follow industry-standard security
              protocols.
            </p>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
            <Fuel className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            <p className="text-[11px] leading-snug text-amber-200/90">
              A small one-time network fee is required to activate your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Connect reliably.
 * 1) Try wagmi's connectAsync (works for most wallets).
 * 2) If it fails/stalls for an injected wallet that exposes its own EIP-6963 provider,
 *    force the wallet popup via eth_requestAccounts, then finish through wagmi.
 * A timeout guards against a provider that never resolves.
 */
async function connectWithFallback(connector, connectAsync) {
  try {
    await withTimeout(connectAsync({ connector }), CONNECT_TIMEOUT_MS);
    return;
  } catch (firstErr) {
    // Only attempt the manual force path for injected/extension wallets. A user
    // rejection should surface immediately, not trigger a second prompt.
    const raw = (firstErr?.shortMessage || firstErr?.message || "").toLowerCase();
    const userRejected =
      raw.includes("reject") || raw.includes("denied") || raw.includes("cancel");
    if (userRejected || !isInjected(connector)) throw firstErr;

    const provider = await safeGetProvider(connector);
    if (!provider?.request) throw firstErr;

    // Force the wallet to prompt. This is the "always pop the extension" step.
    await withTimeout(
      provider.request({ method: "eth_requestAccounts" }),
      CONNECT_TIMEOUT_MS
    );

    // Accounts granted at the provider level — now let wagmi adopt the session.
    await withTimeout(connectAsync({ connector }), CONNECT_TIMEOUT_MS);
  }
}

async function safeGetProvider(connector) {
  try {
    return await connector.getProvider?.();
  } catch {
    return null;
  }
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
  // EIP-6963 discovered wallets have type "injected"; the generic one has id "injected".
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
        onError={(e) => {
          e.currentTarget.style.visibility = "hidden";
        }}
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
  if (raw.includes("reject") || raw.includes("denied") || raw.includes("cancel")) {
    return `Connection request was declined in ${connector?.name || "the wallet"}. Please try again and approve it.`;
  }
  if (raw.includes("already") && raw.includes("pending")) {
    return `A request is already open in ${name}. Open your wallet, finish or cancel it, then try again.`;
  }
  if (raw.includes("timed out")) {
    return `${name} didn't respond. Open the extension, unlock it, then try again.`;
  }
  if (raw.includes("not found") || raw.includes("no provider") || raw.includes("provider")) {
    return `Couldn't reach ${name}. Make sure it's installed and unlocked, then try again.`;
  }
  if (raw.includes("chain") || raw.includes("network")) {
    return `Please switch ${name} to BNB Smart Chain and try again.`;
  }
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
