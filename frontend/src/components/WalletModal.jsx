import { createContext, useContext, useCallback, useMemo, useEffect } from "react";
import { useAppKit, useAppKitState } from "@reown/appkit/react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { bsc } from "wagmi/chains";
import { chainSwitchGuard, openWalletAppForRequest, releaseScrollLock, switchToBsc, isTrustWallet } from "../lib/walletEnv.js";

const WalletModalContext = createContext(null);
const BSC_CHAIN_ID = bsc.id; // 56

/**
 * Thin wrapper around Reown AppKit's own modal (`useAppKit()` -> `open()`/`close()`).
 * AppKit renders the actual wallet-picker UI (installed wallets, "all wallets" grid,
 * QR, one-tap deep-link into the chosen wallet app) — see `lib/wagmi.js` for how it's
 * configured. This file only:
 *  - keeps the `useWalletModal()` / `openConnectModal()` API that the rest of the app
 *    (AuthGate.jsx, Hero.jsx) already calls, so those call sites needed zero changes.
 *  - after AppKit reports a successful connection, runs the same "force BSC" step the
 *    old custom modal used to run, since AppKit doesn't refuse other chains on its own.
 */
export function WalletModalProvider({ children }) {
  const { open, close } = useAppKit();
  const { open: appKitOpen } = useAppKitState();
  const { isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const openConnectModal = useCallback(() => open({ view: "Connect" }), [open]);
  const closeConnectModal = useCallback(() => close(), [close]);

  // Force BSC right after AppKit connects a wallet on the wrong chain. `session.jsx`
  // has its own auto-switch effect too (for reconnects / mid-session chain changes);
  // `chainSwitchGuard` stops the two from firing a duplicate wallet_switchEthereumChain
  // request at the same time.
  useEffect(() => {
    if (!isConnected || chainId === BSC_CHAIN_ID) return;
    if (chainSwitchGuard.active) return;
    chainSwitchGuard.set(true);
    chainSwitchGuard.markAttempted(chainId);
    // Trust Wallet: AppKit's own "Switch Network" popup doesn't work there, so close
    // it and rely on our own switch (raw provider) plus the "Almost there" screen.
    if (isTrustWallet(connector)) close();
    const switchPromise = switchToBsc({ switchChainAsync, connector });
    openWalletAppForRequest(connector);
    switchPromise
      .catch(() => {
        // The user can decline — AuthGate's "wrong-chain" screen keeps a manual retry.
      })
      .finally(() => chainSwitchGuard.set(false));
  }, [isConnected, chainId, connector, switchChainAsync, close]);

  // Trust Wallet: AppKit re-opens its "Switch Network" popup on every network change,
  // and that popup can't switch there. Keep it closed while on the wrong chain.
  useEffect(() => {
    if (appKitOpen && isConnected && chainId !== BSC_CHAIN_ID && isTrustWallet(connector)) close();
  }, [appKitOpen, isConnected, chainId, connector, close]);

  // AppKit's own modal manages its scroll lock; this just clears any stale leftover
  // (e.g. from an older cached session) so the page can always scroll.
  useEffect(() => {
    releaseScrollLock();
  }, []);

  const value = useMemo(
    () => ({ openConnectModal, closeConnectModal }),
    [openConnectModal, closeConnectModal]
  );

  return <WalletModalContext.Provider value={value}>{children}</WalletModalContext.Provider>;
}

export function useWalletModal() {
  const ctx = useContext(WalletModalContext);
  if (!ctx) throw new Error("useWalletModal must be used within WalletModalProvider");
  return ctx;
}
