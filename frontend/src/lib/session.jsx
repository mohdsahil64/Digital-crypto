import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAccount, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { bsc } from "wagmi/chains";
import { api } from "./api.js";
import {
  readSessionCache,
  writeSessionCache,
  clearSessionCache,
  hasFreshSession,
} from "./sessionCache.js";

// The only chain this app operates on.
export const REQUIRED_CHAIN_ID = bsc.id; // 56

/**
 * Session state machine for the wallet-gated user app.
 *
 * KEY RULES (per product requirements):
 *  - NO auto wallet-connect. Nothing happens until the user explicitly connects a
 *    wallet from the connect modal. On a page refresh the wallet is NOT auto-reconnected
 *    (WagmiProvider reconnectOnMount={false}), so the app returns to the public state.
 *  - On the public hero, any stale cached session is cleared, so login/register always
 *    starts a fresh session.
 *  - Wrong network: if the connected wallet isn't on BSC, we ask to switch (with a
 *    prompt) and block until it's switched.
 *  - Returning (registered) users are NOT logged in silently. They first see a
 *    confirmation screen with their wallet address: "Continue" logs in; "Use another"
 *    disconnects + clears the session and restarts from the connect modal.
 *
 * WALLET POPUPS — kept to a minimum (at most 2 total for a new user):
 *  1. Connecting the wallet (address fetch) — used to route new vs returning users.
 *  2. The on-chain approval a NEW user signs on the register page.
 * There is NO separate "sign this message" ownership popup. A wallet is proven real by
 * the register approval tx itself (backend checks it's a real on-chain tx sent BY this
 * address). Returning users just look up their address — no popup at all.
 *
 * Statuses:
 *  - idle:           no wallet connected — show the public hero / connect screen.
 *  - checking:       looking up the address / loading profile (full screen).
 *  - confirm-login:  connected + registered before; ask the user to continue
 *                    with this wallet or pick another.
 *  - wrong-chain:    connected but not on BSC.
 *  - blocked:        account blocked by an admin.
 *  - error:          something went wrong.
 *  - ready:          connected; `user` is populated.
 */
const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const { address, isConnected, status: wagmiStatus } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChainAsync, isPending: switchingChain } = useSwitchChain();

  const wrongChain = isConnected && chainId != null && chainId !== REQUIRED_CHAIN_ID;

  const [status, setStatus] = useState("idle");
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [blockReason, setBlockReason] = useState("");

  // The address currently handled by the state machine, so we don't re-run for it.
  const handledFor = useRef(null);
  const loggingOut = useRef(false);
  // Stashed /connect result for a returning user, reused by "Continue".
  const pendingConnect = useRef(null);

  const clearCache = useCallback(() => clearSessionCache(), []);
  const writeCache = useCallback((addr, u) => writeSessionCache(addr, u), []);

  const reset = useCallback(() => {
    setStatus("idle");
    setUser(null);
    setError("");
    setBlockReason("");
    handledFor.current = null;
  }, []);

  // Ask the wallet to switch to BSC. Returns true on success.
  const switchToRequiredChain = useCallback(async () => {
    try {
      await switchChainAsync({ chainId: REQUIRED_CHAIN_ID });
      return true;
    } catch {
      return false;
    }
  }, [switchChainAsync]);

  const refresh = useCallback(async () => {
    if (!address) return;
    try {
      const { user: u } = await api.getUser(address);
      setUser(u);
      writeCache(address, u);
      return u;
    } catch { /* ignore */ }
  }, [address, writeCache]);

  /**
   * Finish signing in. No wallet popup here — a returning user is just looked up by
   * address; a new user is routed to /register where the single on-chain approval both
   * activates the account and proves the wallet is real. An optional pre-fetched
   * /connect result avoids a second network call.
   */
  const authenticate = useCallback(async (preRes = null) => {
    if (!address) return;
    setStatus("checking");
    setError("");
    try {
      let res = preRes;
      if (!res) {
        try {
          res = await api.connect(address);
        } catch (connErr) {
          if (connErr?.status === 403 && connErr?.data?.blocked) {
            clearCache();
            setUser(null);
            setBlockReason(connErr.data.blockReason || "Your account has been blocked.");
            setStatus("blocked");
            return;
          }
          throw connErr;
        }
      }

      if (res.registered && res.user) {
        setUser(res.user);
        writeCache(address, res.user);
      } else {
        // New wallet — not registered yet. Minimal user so AuthGate routes to /register.
        setUser(res.user || { walletAddress: address, registered: false });
      }
      setStatus("ready");
    } catch (e) {
      setError(e?.message || "Something went wrong. Please try again.");
      setStatus("error");
    }
  }, [address, writeCache, clearCache]);

  // Called from the confirm-login screen when the user chooses to continue with the
  // connected wallet.
  const continueLogin = useCallback(() => {
    const pre = pendingConnect.current;
    pendingConnect.current = null;
    authenticate(pre);
  }, [authenticate]);

  // Drive the state machine off the wallet connection. Because reconnectOnMount is
  // false, `isConnected` is only true after the user explicitly connects — so this
  // never fires on its own after a refresh.
  useEffect(() => {
    if (loggingOut.current) return;

    // During a page reload wagmi briefly reports "connecting"/"reconnecting" before the
    // wallet is restored. If we have a fresh cached session, hold the logged-in view
    // instead of flashing the public "Sign in" screen.
    if (wagmiStatus === "connecting" || wagmiStatus === "reconnecting") {
      const cached = readSessionCache();
      if (cached && hasFreshSession()) {
        setUser(cached.user);
        setStatus("ready");
      }
      return;
    }

    // Not connected: public state. Do NOT auto-connect.
    if (!isConnected || !address) {
      reset();
      return;
    }

    // Wrong network — block until they switch to BSC.
    // This runs FIRST before anything else so user can never proceed on wrong chain.
    if (wrongChain) {
      handledFor.current = null; // reset so we re-check after switch
      setStatus("wrong-chain");
      setError("");
      return;
    }

    // Already handled this address on this connection — leave the current state alone.
    if (handledFor.current === address) return;
    handledFor.current = address;

    // RELOAD RESTORE: if the wallet auto-reconnected on load AND there's a fresh cached
    // session for THIS address, restore it silently (no confirm screen, no popup). This
    // keeps an actively-used session logged in across reloads. We still re-validate in
    // the background (and pick up a block) without kicking the user out.
    const cached = readSessionCache();
    if (cached && cached.address === address.toLowerCase() && hasFreshSession()) {
      setUser(cached.user);
      setStatus("ready");
      // Background re-validate (don't block the UI; keep them in on transient errors).
      (async () => {
        try {
          const res = await api.connect(address);
          if (res?.registered && res.user) {
            setUser(res.user);
            writeCache(address, res.user);
          }
        } catch (e) {
          if (e?.status === 403 && e?.data?.blocked) {
            clearCache();
            setUser(null);
            setBlockReason(e.data.blockReason || "Your account has been blocked.");
            setStatus("blocked");
          }
          /* transient errors: keep the restored session */
        }
      })();
      return;
    }

    // Decide the first screen based on whether this wallet is a REGISTERED (returning)
    // user or brand new:
    //   - registered  -> show a confirmation screen first (don't log in silently).
    //   - new wallet   -> go straight into verify, which routes to /register.
    let cancelled = false;
    setStatus("checking");
    setError("");
    (async () => {
      try {
        const res = await api.connect(address);
        if (cancelled) return;

        if (res.registered) {
          // Returning user — confirm before logging in. Stash the /connect result so
          // "Continue" doesn't need a second call.
          pendingConnect.current = res;
          setUser(res.user || null);
          setStatus("confirm-login");
        } else {
          // New wallet — clear any stale cache and verify straight away.
          clearCache();
          setUser(null);
          pendingConnect.current = null;
          authenticate(res);
        }
      } catch (connErr) {
        if (cancelled) return;
        if (connErr?.status === 403 && connErr?.data?.blocked) {
          clearCache();
          setUser(null);
          setBlockReason(connErr.data.blockReason || "Your account has been blocked.");
          setStatus("blocked");
          return;
        }
        setError(connErr?.message || "Something went wrong. Please try again.");
        setStatus("error");
      }
    })();

    return () => { cancelled = true; };
  }, [isConnected, address, wagmiStatus, wrongChain, reset, clearCache, writeCache, authenticate]);

  // ── CHAIN GUARD: whenever chain changes to wrong network, immediately block ──
  // This fires even after the main effect has already run (e.g. user switches chain
  // mid-session or wallet connects on wrong chain).
  useEffect(() => {
    if (!isConnected || !address) return;
    if (wrongChain) {
      handledFor.current = null; // force re-auth after switch
      setStatus("wrong-chain");
      setError("");
    }
  }, [wrongChain, isConnected, address]);

  // Keep the session "fresh" while the user is actively using the site, so an active
  // session doesn't expire mid-use. Bumps verifiedAt on activity + periodically.
  useEffect(() => {
    if (status !== "ready" || !address || !user) return;
    const bump = () => writeCache(address, user);
    window.addEventListener("click", bump);
    window.addEventListener("keydown", bump);
    const interval = setInterval(bump, 5 * 60 * 1000);
    return () => {
      window.removeEventListener("click", bump);
      window.removeEventListener("keydown", bump);
      clearInterval(interval);
    };
  }, [status, address, user, writeCache]);

  function hardCleanAndDisconnect() {
    loggingOut.current = true;
    clearCache();
    reset();
    try {
      disconnect();
    } finally {
      setTimeout(() => { loggingOut.current = false; }, 0);
    }
  }

  // Manual logout: hard-clean everything and disconnect the wallet.
  function logout() {
    hardCleanAndDisconnect();
  }

  // "Use another wallet" from the confirm screen: wipe + disconnect so they restart
  // from the connect modal.
  function useAnotherWallet() {
    hardCleanAndDisconnect();
  }

  // Clear any stale cached session. Called by the public hero so login/register always
  // starts fresh.
  const clearSession = useCallback(() => {
    if (isConnected) return; // don't wipe an active in-progress session
    clearCache();
  }, [isConnected, clearCache]);

  const value = {
    address,
    isConnected,
    status,
    user,
    error,
    blockReason,
    chainId,
    wrongChain,
    switchingChain,
    switchToRequiredChain,
    refresh,
    retry: () => authenticate(),
    continueLogin,
    useAnotherWallet,
    clearSession,
    logout,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
