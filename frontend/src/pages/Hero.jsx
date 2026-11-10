import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useWalletModal } from "../components/WalletModal.jsx";
import {
  Globe,
  Rocket,
  TrendingUp,
  Users,
  Gift,
  Zap,
  ArrowRight,
  ShieldCheck,
  X,
  Wallet,
  Loader2,
  ShieldAlert,
  RefreshCw,
  LogOut,
  Network,
  Ban,
} from "lucide-react";
import Spinner from "../components/Spinner.jsx";
import Footer from "../components/Footer.jsx";
import Seo from "../components/Seo.jsx";
import ConfirmLogin from "../components/ConfirmLogin.jsx";
import { useSession } from "../lib/session.jsx";
import { captureReferralFromUrl } from "../lib/referral.js";

// "How to earn" advertisement blocks — built to attract & convert.
const EARN_STEPS = [
  {
    icon: Rocket,
    tag: "Step 1",
    title: "Activate in seconds",
    text: "One-time activation and your income engine goes live. No paperwork, no waiting.",
    glow: "from-accent-500/20 to-transparent",
  },
  {
    icon: Users,
    tag: "Step 2",
    title: "Grow your team",
    text: "Invite up to 15 directs and watch your network expand into a powerful earning tree.",
    glow: "from-emerald-500/20 to-transparent",
  },
  {
    icon: TrendingUp,
    tag: "Step 3",
    title: "Earn every single day",
    text: "Unlock level rewards that pay out daily as your team keeps growing beneath you.",
    glow: "from-fuchsia-500/20 to-transparent",
  },
  {
    icon: Gift,
    tag: "Bonus",
    title: "Stack referral rewards",
    text: "Every active member you bring adds to your rewards. The bigger the world, the bigger you earn.",
    glow: "from-amber-500/20 to-transparent",
  },
];

const HIGHLIGHTS = [
  { icon: Zap, label: "Instant activation" },
  { icon: TrendingUp, label: "Daily payouts" },
  { icon: ShieldCheck, label: "100% on-chain" },
  { icon: Gift, label: "Referral rewards" },
];

// Stats shown below the Join button. `to` counts up on load; `suffix`/`prefix`
// decorate the animated number. `static` values (like "24/7") don't animate.
const STATS = [
  { to: 10, suffix: "K+", label: "Members" },
  { static: "24/7", label: "On-chain live" },
  { to: 100, suffix: "%", label: "Wallet secured" },
];

/**
 * Counts from 0 up to `to` when it first scrolls/loads into view. Re-runs on every
 * page load/reload (fresh mount). Uses requestAnimationFrame for a smooth ramp.
 */
function CountUp({ to, prefix = "", suffix = "", duration = 3200 }) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    let start = null;
    const from = 0;
    const step = (ts) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      // easeOutCubic for a lively slow-down at the end.
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [to, duration]);

  return (
    <span>
      {prefix}
      {value}
      {suffix}
    </span>
  );
}

export default function Hero() {
  const { openConnectModal } = useWalletModal();
  const {
    status,
    user,
    address,
    error,
    blockReason,
    isConnected,
    wrongChain,
    switchToRequiredChain,
    switchingChain,
    continueLogin,
    useAnotherWallet,
    retry,
    logout,
    clearSession,
  } = useSession();
  const navigate = useNavigate();
  const [refToast, setRefToast] = useState(false);

  // Public hero: clear any stale cached session so login/register always starts fresh.
  // (Only clears when no wallet is actively connected.)
  useEffect(() => {
    clearSession?.();
  }, [clearSession]);

  // Capture ?ref=CODE so new users carry it into registration. If someone lands here
  // from a referral link (not yet connected), nudge them to connect first.
  useEffect(() => {
    const ref = captureReferralFromUrl();
    if (ref) setRefToast(true);
  }, []);

  // Auto-dismiss the referral toast after a few seconds.
  useEffect(() => {
    if (!refToast) return;
    const t = setTimeout(() => setRefToast(false), 6000);
    return () => clearTimeout(t);
  }, [refToast]);

  // Once the wallet is verified, send them into the app based on DB state.
  useEffect(() => {
    if (status === "ready" && user) {
      navigate(user.registered ? "/dashboard" : "/register", { replace: true });
    }
  }, [status, user, navigate]);

  const connecting = status === "checking";

  // When a wallet is connected but the session isn't "ready" yet, show a focused
  // overlay so the user can complete the flow (confirm wallet, switch network, sign,
  // or see an error) right here — instead of the Join button appearing "stuck".
  const overlay =
    isConnected && status !== "ready" && status !== "idle" ? (
      <SessionOverlay
        status={status}
        address={address}
        error={error}
        blockReason={blockReason}
        wrongChain={wrongChain}
        switchingChain={switchingChain}
        switchToRequiredChain={switchToRequiredChain}
        continueLogin={continueLogin}
        useAnotherWallet={useAnotherWallet}
        retry={retry}
        logout={logout}
      />
    ) : null;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950">
      {overlay}
      <Seo
        rawTitle
        title="Decentralized World — Earn Daily USDT Rewards on BSC"
        description="Join Decentralized World and earn daily USDT rewards on BNB Smart Chain. Build your referral team, unlock 16 reward levels, and withdraw anytime. No email, no password — your wallet is your identity."
      />

      {/* Referral toast — shown when arriving from an invite link before connecting. */}
      {refToast && (
        <div className="fixed inset-x-0 top-3 z-50 flex justify-center px-4">
          <div className="flex w-full max-w-sm items-start gap-2.5 rounded-xl border border-accent-500/30 bg-navy-900/95 px-4 py-3 shadow-lg backdrop-blur">
            <Gift className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
            <p className="flex-1 text-xs text-slate-200 sm:text-sm">
              You've been invited! Please connect your wallet first to join with your
              referral.
            </p>
            <button
              onClick={() => setRefToast(false)}
              className="text-slate-400 transition hover:text-white"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Simple public header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-accent-400" />
            <span className="font-display text-sm font-semibold tracking-tight sm:text-base">
              Decentralized World
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4">
        {/* ---------------- HERO ---------------- */}
        <section className="flex flex-col items-center py-14 text-center sm:py-24">
          <h1 className="max-w-3xl font-display text-[28px] font-bold leading-tight sm:text-5xl">
            Build income in the{" "}
            <span className="bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent">
              Decentralized World
            </span>
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Join a fast-growing on-chain community, build your team, and unlock daily
            rewards. Simple to start, powerful as you grow.
          </p>

          {/* Quick highlight chips — same card styling as the stats banner below */}
          <div className="mt-7 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {HIGHLIGHTS.map((h) => (
              <div
                key={h.label}
                className="flex items-center gap-2.5 rounded-2xl border border-accent-500/30 bg-gradient-to-br from-accent-500/10 via-navy-900/40 to-navy-900/20 px-3 py-3 text-left backdrop-blur transition hover:border-accent-500/50 sm:flex-col sm:items-start sm:gap-2 sm:p-4"
              >
                <h.icon className="h-4 w-4 shrink-0 text-white sm:h-5 sm:w-5" strokeWidth={2} />
                <span className="text-[11px] font-medium leading-tight text-slate-100 sm:text-xs">
                  {h.label}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => openConnectModal?.()}
            disabled={connecting}
            className="btn-primary mt-8 w-full max-w-xs px-6 py-3.5 text-base shadow-lg shadow-accent-500/20 sm:w-auto"
          >
            {connecting ? (
              <>
                <Spinner /> Getting you in...
              </>
            ) : (
              <>
                Join Now <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
          <p className="mt-3 text-xs text-slate-500">
            No email, no password · Your wallet is your identity
          </p>
          <Link
            to="/how-it-works"
            className="mt-2 inline-flex items-center gap-1 text-xs text-accent-400 hover:text-accent-300 hover:underline"
          >
            How does it work? <ArrowRight className="h-3 w-3" />
          </Link>

          {/* Trust / stats banner — right below the Join button */}
          <div className="mt-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-accent-500/30 bg-gradient-to-r from-accent-500/15 via-navy-900/40 to-fuchsia-500/10 p-6 sm:p-8">
            <div className="grid grid-cols-3 gap-3 text-center">
              {STATS.map((st) => (
                <div key={st.label}>
                  <div className="font-display text-xl font-bold text-white sm:text-3xl">
                    {st.static ? (
                      st.static
                    ) : (
                      <CountUp to={st.to} prefix={st.prefix} suffix={st.suffix} />
                    )}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-400 sm:text-xs">
                    {st.label}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-center gap-2 border-t border-white/10 pt-4 text-center text-xs text-slate-300 sm:text-sm">
              <ShieldCheck className="h-4 w-4 shrink-0 text-accent-400" />
              Secured on-chain · Transparent rewards
            </div>
          </div>
        </section>

        {/* ---------------- HOW TO EARN ---------------- */}
        <section className="pb-20">
          <div className="mb-6 text-center sm:mb-8">
            <h2 className="font-display text-xl font-bold sm:text-3xl">
              How you{" "}
              <span className="bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent">
                earn
              </span>
            </h2>
            <p className="mx-auto mt-2 max-w-md text-xs text-slate-400 sm:text-sm">
              Four simple moves stand between you and daily on-chain income.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EARN_STEPS.map((s) => (
              <div
                key={s.title}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-navy-900/70 p-5 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-accent-500/40"
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${s.glow} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent-500/30 bg-accent-500/10">
                      <s.icon className="h-5 w-5 text-accent-400" />
                    </div>
                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      {s.tag}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400 sm:text-sm">
                    {s.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function shortAddr(a) {
  return a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "";
}

/**
 * Full-screen overlay shown on the hero while a connected wallet completes the login /
 * register flow: confirm the wallet, switch to BSC, sign, or handle an error. Keeps the
 * user unblocked instead of leaving the Join button looking stuck.
 */
function SessionOverlay({
  status,
  address,
  error,
  blockReason,
  wrongChain,
  switchingChain,
  switchToRequiredChain,
  continueLogin,
  useAnotherWallet,
  retry,
  logout,
}) {
  // Returning-user confirmation gets the full "Welcome back" screen (Register-styled).
  if (status === "confirm-login") {
    return (
      <div className="fixed inset-0 z-[80]">
        <ConfirmLogin
          address={address}
          onContinue={continueLogin}
          onUseAnother={useAnotherWallet}
        />
      </div>
    );
  }

  let content = null;

  if (status === "wrong-chain" || wrongChain) {
    content = {
      icon: Network,
      tone: "danger",
      title: "Switch to BNB Smart Chain",
      text: "This app runs only on BNB Smart Chain (BSC). Switch your wallet's network to continue.",
      action: (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button onClick={switchToRequiredChain} disabled={switchingChain} className="btn-primary">
            {switchingChain ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Switching...</>
            ) : (
              <><Network className="h-4 w-4" /> Switch to BSC</>
            )}
          </button>
          <button onClick={logout} className="btn-ghost">
            <LogOut className="h-4 w-4" /> Use another
          </button>
        </div>
      ),
    };
  } else if (status === "checking") {
    content = {
      icon: Loader2,
      spin: true,
      title: "Setting things up",
      text: "Approve the request in your wallet to continue — it's free and moves no funds.",
    };
  } else if (status === "needs-verify") {
    content = {
      icon: ShieldAlert,
      title: "One quick step",
      text: error || "Approve the request in your wallet to continue.",
      action: (
        <div className="mt-6 flex gap-2">
          <button onClick={retry} className="btn-primary">
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
          <button onClick={logout} className="btn-ghost">
            <LogOut className="h-4 w-4" /> Use another
          </button>
        </div>
      ),
    };
  } else if (status === "blocked") {
    content = {
      icon: Ban,
      tone: "danger",
      title: "Account blocked",
      text: blockReason
        ? `Your account has been blocked. Reason: ${blockReason}`
        : "Your account has been blocked. Please contact support.",
      action: (
        <button onClick={logout} className="btn-ghost mt-6">
          <LogOut className="h-4 w-4" /> Use another wallet
        </button>
      ),
    };
  } else if (status === "error") {
    content = {
      icon: ShieldAlert,
      tone: "danger",
      title: "We couldn't sign you in",
      text: error || "Something went wrong. Please try again.",
      action: (
        <div className="mt-6 flex gap-2">
          <button onClick={retry} className="btn-primary">
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
          <button onClick={logout} className="btn-ghost">
            <LogOut className="h-4 w-4" /> Use another
          </button>
        </div>
      ),
    };
  }

  if (!content) return null;
  const { icon: Icon, title, text, action, spin, tone } = content;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-navy-950/95 px-6 text-center backdrop-blur">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-2xl border ${
          tone === "danger" ? "border-red-500/40 bg-red-500/10" : "border-accent-500/40 bg-accent-500/10"
        }`}
      >
        <Icon className={`h-7 w-7 ${tone === "danger" ? "text-red-400" : "text-accent-400"} ${spin ? "animate-spin" : ""}`} />
      </div>
      <h2 className="mt-6 font-display text-xl font-bold sm:text-2xl">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-400">{text}</p>
      {action}
    </div>
  );
}
