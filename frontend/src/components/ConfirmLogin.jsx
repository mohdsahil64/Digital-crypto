import { Fingerprint, ShieldCheck, LogIn, ArrowRight, LogOut } from "lucide-react";
import Spinner from "./Spinner.jsx";
import Seo from "./Seo.jsx";

/**
 * Confirmation screen shown to a RETURNING (registered) user before logging in.
 * Mirrors the "Create your account" (Register) design so login and register feel like
 * one family. Fully mobile responsive.
 *
 * Props:
 *  - address:      the connected wallet address
 *  - onContinue:   () => void   — log in with this wallet
 *  - onUseAnother: () => void   — disconnect + clear + restart from connect
 *  - busy:         boolean      — while logging in
 */
export default function ConfirmLogin({ address, onContinue, onUseAnother, busy = false }) {
  const shortish = address ? `${address.slice(0, 8)}...${address.slice(-6)}` : "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950">
      <Seo title="Welcome back" description="Continue to your Decentralized World account." noindex />

      <main className="mx-auto max-w-md px-4 py-12 sm:py-14">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-accent-500/20" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-accent-500/40 bg-accent-500/10">
              <Fingerprint className="h-8 w-8 text-accent-400" />
            </div>
          </div>
        </div>

        <h1 className="text-center font-display text-2xl font-bold">Welcome back</h1>
        <p className="mx-auto mt-2 max-w-xs text-center text-sm text-slate-400">
          Continue with this wallet to open your dashboard, or switch to a different one.
        </p>

        {/* Connected wallet address */}
        {address && (
          <div className="mx-auto mt-4 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="font-mono text-xs text-slate-300">{shortish}</span>
          </div>
        )}

        {/* Reassurance points — same style as Register */}
        <div className="mt-6 space-y-3">
          <Point icon={ShieldCheck} title="Secure sign-in" text="Your wallet is your identity — no password needed." />
          <Point icon={LogIn} title="Instant access" text="Pick up right where you left off." />
        </div>

        {/* Continue */}
        <button
          onClick={onContinue}
          disabled={busy}
          className="btn-primary mt-6 w-full py-3.5 text-base"
        >
          {busy ? (
            <><Spinner /> Signing you in...</>
          ) : (
            <>Continue <ArrowRight className="h-4 w-4" /></>
          )}
        </button>

        {/* Use another wallet */}
        <button
          onClick={onUseAnother}
          disabled={busy}
          className="mx-auto mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-slate-200 disabled:opacity-50"
        >
          <LogOut className="h-3.5 w-3.5" /> Use another wallet
        </button>
      </main>
    </div>
  );
}

function Point({ icon: Icon, title, text }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
      <Icon className="mt-0.5 h-5 w-5 text-accent-400" />
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-slate-400">{text}</p>
      </div>
    </div>
  );
}
