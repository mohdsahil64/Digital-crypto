import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Fingerprint, Sparkles, ArrowRight, Gift, LogOut } from "lucide-react";
import Popup from "../components/Popup.jsx";
import Spinner from "../components/Spinner.jsx";
import Seo from "../components/Seo.jsx";
import { api } from "../lib/api.js";
import { useSession } from "../lib/session.jsx";
import { captureReferralFromUrl, getReferral, saveReferral, clearReferral } from "../lib/referral.js";
import { releaseScrollLock } from "../lib/walletEnv.js";

export default function Register() {
  const { address, refresh, wrongChain, switchToRequiredChain, useAnotherWallet } = useSession();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [referral, setReferral] = useState("");

  // Prefill the referral code: from the URL (?ref=) if present, else whatever was
  // saved when the user first arrived via an invite link. Editable + optional.
  useEffect(() => {
    const fromUrl = captureReferralFromUrl();
    setReferral(fromUrl || getReferral() || "");
    // The page must always scroll — clear any scroll lock left by the connect modal.
    releaseScrollLock();
  }, []);

  async function handleActivate() {
    setError("");

    // Wrong network: no account is created. The button only asks the wallet to switch
    // to BNB Smart Chain; once switched the user taps it again.
    if (wrongChain) {
      await switchToRequiredChain();
      return;
    }

    // A referral code is required — no direct/code-less registration.
    const code = referral.trim();
    if (!code) {
      setError("A referral code is required to create an account. Please enter one.");
      return;
    }

    setBusy(true);
    try {
      // No wallet popup here: the connected wallet is enough to create the account.
      // The USDT approval is collected later, when the user activates the plan.
      await api.register(address, code);
      clearReferral();
      await refresh();

      setDone(true);
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (e) {
      if (e?.data?.code === "REFERRAL_INVALID") {
        setError("That referral code doesn't match any account. Please check it and try again.");
      } else if (e?.data?.code === "REFERRAL_SELF") {
        setError("You can't use your own referral code.");
      } else if (e?.data?.code === "REFERRAL_REQUIRED") {
        setError("A referral code is required to create an account. Please enter one.");
      } else {
        setError("Something didn't go through. Please try again in a moment.");
      }
    } finally {
      setBusy(false);
      releaseScrollLock();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950">
      <Seo
        title="Create your account"
        description="Set up your Decentralized World account in one quick step. Enter a referral code if you have one and unlock your dashboard."
        noindex
      />
      <main className="mx-auto max-w-md px-4 pb-24 pt-14">
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-accent-500/20" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-accent-500/40 bg-accent-500/10">
              <Fingerprint className="h-8 w-8 text-accent-400" />
            </div>
          </div>
        </div>

        <h1 className="text-center font-display text-2xl font-bold">
          Welcome! Create your account
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-center text-sm text-slate-400">
          Your connected wallet is all you need. No signature and nothing is charged
          now.
        </p>

        {/* Connected wallet address */}
        {address && (
          <div className="mx-auto mt-4 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="font-mono text-xs text-slate-300">
              {`${address.slice(0, 8)}...${address.slice(-6)}`}
            </span>
          </div>
        )}

        <div className="mt-8 space-y-3">
          <Point icon={ShieldCheck} title="No signature needed" text="Your wallet connection creates your account." />
          <Point icon={Sparkles} title="Instant setup" text="Creates your profile and unlocks your dashboard." />
        </div>

        {/* Referral code — prefilled from an invite link, editable, and optional. */}
        <div className="mt-6">
          <label htmlFor="referral" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-300">
            <Gift className="h-4 w-4 text-accent-400" /> Referral code{" "}
            <span className="font-normal text-red-400">(required)</span>
          </label>
          <input
            id="referral"
            type="text"
            required
            value={referral}
            onChange={(e) => {
              const v = e.target.value.trim();
              setReferral(v);
              if (v) saveReferral(v);
            }}
            placeholder="Enter your referrer's code"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-accent-500/50 focus:bg-white/[0.07]"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Came from an invite link? Your referrer's code is filled in for you.
            Otherwise, ask whoever invited you for their code.
          </p>
        </div>

        {error && (
          <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          onClick={handleActivate}
          disabled={busy || (!wrongChain && !referral.trim())}
          className={`btn-primary mt-6 w-full py-3.5 text-base ${wrongChain ? "opacity-50" : ""}`}
        >
          {busy ? (
            <>
              <Spinner /> Setting up your account...
            </>
          ) : wrongChain ? (
            <>Switch to BNB Smart Chain</>
          ) : (
            <>
              Create account <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
        <p className="mt-3 text-center text-xs text-slate-500">
          No wallet confirmation needed.
        </p>

        {/* Use another wallet — clears the session and restarts from connect. */}
        <button
          onClick={useAnotherWallet}
          className="mx-auto mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-slate-200"
        >
          <LogOut className="h-3.5 w-3.5" /> Use another wallet
        </button>
      </main>

      <Popup open={done} title="Account created successfully" icon={Sparkles}>
        <p>Welcome aboard! Taking you to your dashboard...</p>
      </Popup>
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

