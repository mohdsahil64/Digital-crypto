import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { bsc } from "@reown/appkit/networks";
import { coinbaseWallet } from "wagmi/connectors";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "";
const hasWalletConnect = Boolean(projectId) && projectId !== "demo_project_id";

/**
 * Wallet connection via Reown AppKit (formerly WalletConnect / Web3Modal).
 *
 * This is deliberately a thin wrapper: AppKit's own modal is what gives mobile users a
 * real "pick MetaMask / Trust Wallet / etc. from a list, tap one, get deep-linked
 * straight into that app" experience — a plain mobile browser (Chrome/Safari) can never
 * detect installed wallet apps itself (no EIP-6963 injection outside a wallet's own
 * in-app browser or a desktop extension), so WalletConnect's protocol + AppKit's picker
 * UI is the only way to offer that flow. `components/WalletModal.jsx` just opens/closes
 * that modal; this file configures it.
 *
 * `@reown/appkit-adapter-wagmi` still produces a normal wagmi v2 `Config` object
 * (`wagmiAdapter.wagmiConfig`), so every other wagmi hook/call in the app (useAccount,
 * useWriteContract, usePublicClient, etc.) keeps working exactly as before.
 */
const SITE_ORIGIN = typeof window !== "undefined" ? window.location.origin : "";
const APP_ICON = `${SITE_ORIGIN}/icon-512.png`;

const metadata = {
  name: "Decentralized World",
  description: "Wallet-based on-chain community",
  url: SITE_ORIGIN,
  icons: [APP_ICON],
};

// BSC mainnet only — this app never operates on any other chain.
const networks = [bsc];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId: hasWalletConnect ? projectId : undefined,
  ssr: false,
  // Coinbase Wallet keeps its own dedicated connector (as before) on top of AppKit's
  // built-in WalletConnect + injected (EIP-6963) connectors.
  connectors: [coinbaseWallet({ appName: "Decentralized World", appLogoUrl: APP_ICON })],
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

// Must be called once, outside any React component (per Reown's docs), before the app
// renders — createAppKit() wires the modal up to the wagmi adapter above.
if (hasWalletConnect) {
  createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata,
    // Don't show AppKit's "Switch Network" modal when the wallet is on a non-BSC chain.
    // Login/register work on any chain; BSC is enforced only on the signing steps.
    allowUnsupportedChain: true,
    // Mirrors the dark navy / accent-blue brand look (tailwind.config.js: navy-950,
    // accent-500). Approximate, not pixel-perfect — AppKit exposes a fixed set of CSS
    // variables, not full theme control.
    themeMode: "dark",
    themeVariables: {
      "--apkt-accent": "#0ea5e9", // accent-500
      "--apkt-border-radius-master": "12px",
    },
    features: {
      analytics: false,
      // No email/social login — wallet-connect-only app.
      email: false,
      socials: false,
    },
  });
}
