import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import "./index.css";

import { wagmiConfig } from "./lib/wagmi.js";
import { SessionProvider } from "./lib/session.jsx";
import { WalletModalProvider } from "./components/WalletModal.jsx";
import { hasFreshSession, clearSessionCache } from "./lib/sessionCache.js";
import { isMobileDevice } from "./lib/walletEnv.js";
import App from "./App.jsx";

// Desktop: WalletConnect saves the chosen wallet's link (WALLETCONNECT_DEEPLINK_CHOICE)
// and opens it on EVERY wallet request (e.g. a network switch on reload). On a laptop
// that sends the user to the wallet's download site (e.g. Bitget). The phone gets the
// request over WalletConnect anyway, so on desktop never keep that link.
if (typeof window !== "undefined" && !isMobileDevice()) {
  const DEEPLINK_KEY = "WALLETCONNECT_DEEPLINK_CHOICE";
  try {
    window.localStorage.removeItem(DEEPLINK_KEY);
    const origSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (this === window.localStorage && key === DEEPLINK_KEY) return;
      return origSetItem.call(this, key, value);
    };
  } catch { /* storage unavailable: nothing to clean */ }
}

const queryClient = new QueryClient();

// Only auto-reconnect the wallet on load when there's a FRESH logged-in session. This
// keeps an active user signed in across reloads, but does NOT auto-connect out of the
// blue (avoids the unwanted popup / auto-login). A stale session is wiped so the user
// starts clean on the public hero.
const freshSession = hasFreshSession();
if (!freshSession) clearSessionCache();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig} reconnectOnMount={freshSession}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <WalletModalProvider>
            <SessionProvider>
              <App />
            </SessionProvider>
          </WalletModalProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
