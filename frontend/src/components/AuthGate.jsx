import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Wallet, ShieldAlert, Loader2, RefreshCw, LogOut, Network, Ban } from "lucide-react";
import { useSession } from "../lib/session.jsx";
import { useWalletModal } from "./WalletModal.jsx";
import ConfirmLogin from "./ConfirmLogin.jsx";

/**
 * Guards the whole user app. Nobody reaches /dashboard, /register, /invest, /refer,
 * /team, /withdraw or /history unless a wallet is connected AND verified real.
 *
 * `require` controls the DB state a route needs:
 *  - "verified": any verified wallet (used by /register, /invest)
 *  - "registered": wallet must already be registered (used by dashboard pages)
 */
export default function AuthGate({ children, require = "verified" }) {
  const {
    status,
    user,
    error,
    blockReason,
    address,
    retry,
    logout,
    isConnected,
    continueLogin,
    useAnotherWallet,
    switchToRequiredChain,
    switchingChain,
  } = useSession();
  const { openConnectModal } = useWalletModal();
  const navigate = useNavigate();
  const location = useLocation();

  // Route based on DB state once the wallet is ready.
  useEffect(() => {
    if (status !== "ready" || !user) return;
    const path = location.pathname;

    if (!user.registered) {
      if (path !== "/register") navigate("/register", { replace: true });
      return;
    }
    // Registered users shouldn't sit on /register.
    if (path === "/register") {
      navigate("/dashboard", { replace: true });
    }
  }, [status, user, location.pathname, navigate]);

  // Not connected / no session (e.g. session expired, or a reload with no fresh
  // session): send the user back to the public hero to sign in — don't show a bare
  // "Sign in" screen sitting on a protected URL.
  useEffect(() => {
    if ((!isConnected || status === "idle") && location.pathname !== "/") {
      navigate("/", { replace: true });
    }
  }, [isConnected, status, location.pathname, navigate]);

  // --- Not connected: hold briefly while redirecting to the hero. ---
  if (!isConnected || status === "idle") {
    return <Screen icon={Loader2} spin title="Loading" text="One moment..." />;
  }

  // --- Account blocked by an admin: deny access, show the saved reason. ---
  if (status === "blocked") {
    return (
      <Screen
        icon={Ban}
        tone="danger"
        title="Account blocked"
        text={
          blockReason
            ? `Your account has been blocked. Reason: ${blockReason}`
            : "Your account has been blocked. Please contact support."
        }
        action={
          <button onClick={logout} className="btn-ghost mt-6">
            <LogOut className="h-4 w-4" /> Use another wallet
          </button>
        }
      />
    );
  }

  // --- Wrong network: must be on BNB Smart Chain (BSC). Block until switched. ---
  if (status === "wrong-chain") {
    return (
      <Screen
        icon={Network}
        tone="danger"
        title="Switch to BNB Smart Chain"
        text="This app runs only on BNB Smart Chain (BSC). Switch your network to continue."
        action={
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button onClick={switchToRequiredChain} disabled={switchingChain} className="btn-primary">
              {switchingChain ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Switching...
                </>
              ) : (
                <>
                  <Network className="h-4 w-4" /> Switch to BSC
                </>
              )}
            </button>
            <button onClick={logout} className="btn-ghost">
              <LogOut className="h-4 w-4" /> Use another
            </button>
          </div>
        }
      />
    );
  }

  // --- Connected: confirm which wallet before logging in (returning users). ---
  if (status === "confirm-login") {
    return (
      <ConfirmLogin
        address={address}
        onContinue={continueLogin}
        onUseAnother={useAnotherWallet}
      />
    );
  }

  // --- Connecting / signing / loading profile. ---
  if (status === "checking") {
    return (
      <Screen
        icon={Loader2}
        spin
        title="Setting things up"
        text="Approve the request in your wallet to continue — it's free and moves no funds."
      />
    );
  }

  // --- Needs the ownership approval (rejected earlier). ---
  if (status === "needs-verify") {
    return (
      <Screen
        icon={ShieldAlert}
        title="One quick step"
        text={error || "Approve the request in your wallet to continue."}
        action={
          <div className="mt-6 flex gap-2">
            <button onClick={retry} className="btn-primary">
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
            <button onClick={logout} className="btn-ghost">
              <LogOut className="h-4 w-4" /> Use another
            </button>
          </div>
        }
      />
    );
  }

  // --- Verification failed (fake wallet / no on-chain activity / backend). ---
  if (status === "error") {
    return (
      <Screen
        icon={ShieldAlert}
        tone="danger"
        title="We couldn't sign you in"
        text={error || "Something went wrong. Please try again."}
        action={
          <div className="mt-6 flex gap-2">
            <button onClick={retry} className="btn-primary">
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
            <button onClick={logout} className="btn-ghost">
              <LogOut className="h-4 w-4" /> Use another
            </button>
          </div>
        }
      />
    );
  }

  // --- Ready but a registration-only route while not yet registered: hold. ---
  if (status === "ready" && require === "registered" && user && !user.registered) {
    return (
      <Screen icon={Loader2} spin title="Setting up" text="Taking you to registration..." />
    );
  }

  if (status === "ready" && user) {
    return children;
  }

  // Fallback while state settles.
  return <Screen icon={Loader2} spin title="Loading" text="One moment..." />;
}

function short(a) {
  return a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "";
}

function Screen({ icon: Icon, title, text, action, spin = false, tone }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 px-6 text-center">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-2xl border ${
          tone === "danger"
            ? "border-red-500/40 bg-red-500/10"
            : "border-accent-500/40 bg-accent-500/10"
        }`}
      >
        <Icon
          className={`h-7 w-7 ${tone === "danger" ? "text-red-400" : "text-accent-400"} ${
            spin ? "animate-spin" : ""
          }`}
        />
      </div>
      <h1 className="mt-6 font-display text-xl font-bold sm:text-2xl">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-400">{text}</p>
      {action}
    </div>
  );
}
