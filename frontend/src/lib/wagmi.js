import { createConfig, http } from "wagmi";
import { bsc } from "wagmi/chains";
import { walletConnect, coinbaseWallet } from "wagmi/connectors";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "";
const hasWalletConnect = Boolean(projectId) && projectId !== "demo_project_id";

/**
 * Wallet connectors.
 *
 * We rely on EIP-6963 auto-discovery (multiInjectedProviderDiscovery below) as the
 * PRIMARY path. Every installed wallet (Trust, MetaMask, OKX, Binance, …) announces
 * itself and shows up as its own connector with its real name + icon, and connects
 * through its own dedicated provider. This is the reliable path — it avoids the
 * generic `window.ethereum` collision that happens when a hard-coded `injected()`
 * connector fights with multiple installed wallets and hangs the connection.
 *
 * On top of discovery we add:
 *  - coinbaseWallet: Coinbase has its own SDK connector (extension + mobile).
 *  - walletConnect: QR / mobile deep-link for wallets that aren't in the browser
 *    (only when a real WalletConnect project id is configured).
 */
const connectors = [coinbaseWallet({ appName: "Decentralized World" })];

if (hasWalletConnect) {
  connectors.push(
    walletConnect({
      projectId,
      showQrModal: true,
      metadata: {
        name: "Decentralized World",
        description: "Wallet-based on-chain community",
        url: typeof window !== "undefined" ? window.location.origin : "",
        icons: [],
      },
    })
  );
}

export const wagmiConfig = createConfig({
  connectors,
  chains: [bsc],
  transports: {
    [bsc.id]: http("https://bsc-dataseed.binance.org/"),
  },
  // PRIMARY: auto-detect every installed EIP-6963 wallet. wagmi turns each announced
  // wallet into its own connector, which is what the connect modal lists and uses.
  multiInjectedProviderDiscovery: true,
  ssr: false,
});
