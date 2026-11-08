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
import App from "./App.jsx";

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
