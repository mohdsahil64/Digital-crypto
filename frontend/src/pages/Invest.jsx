import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { parseUnits, getAddress } from "viem";
import {
  Rocket,
  Check,
  TrendingUp,
  Wallet,
  ArrowRight,
  PartyPopper,
  Users,
  Gift,
  Coins,
  ShieldCheck,
  Zap,
  ArrowLeft,
} from "lucide-react";
import Popup from "../components/Popup.jsx";
import Spinner from "../components/Spinner.jsx";
import Seo from "../components/Seo.jsx";
import { api } from "../lib/api.js";
import { useSession } from "../lib/session.jsx";
import { JOINING_FEE, USDT_ADDRESS, ADMIN_WALLET, erc20Abi } from "../lib/contract.js";
import { REQUIRED_CHAIN_ID } from "../lib/session.jsx";
// Headline benefits — each shows WHY it matters, not just what it is.
const BENEFITS = [
  {
    icon: Gift,
    title: "Referral income unlocked",
    text: "Start earning from every member you invite — income you can't access on the free tier.",
  },
  {
    icon: TrendingUp,
    title: "All 16 reward levels",
    text: "Climb from Level 1 to 16. Daily rewards grow from a few cents up to 10,000 USDT/day at the top.",
  },
  {
    icon: Users,
    title: "Daily team rewards",
    text: "Your whole downline pays you daily. The bigger your team, the more you earn — automatically.",
  },
  {
    icon: Coins,
    title: "Withdraw anytime",
    text: "Cash out your rewards whenever you like, from just 5 USDT. Your earnings, your call.",
  },
  {
    icon: Zap,
    title: "One simple payment",
    text: "Pay once, earn forever. Just confirm the 5 USDT payment — that's all you do.",
  },
];

export default function Invest() {
  const { address, user, refresh } = useSession();
  const navigate = useNavigate();
  const { chainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(""); // small progress hint under the button
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [invested, setInvested] = useState(Boolean(user?.hasInvested));
  // Insufficient-balance popup: { balance } — shown when the wallet has < plan price.
  const [lowBalance, setLowBalance] = useState(null);

  useEffect(() => {
    if (user?.hasInvested) setInvested(true);
  }, [user]);

  async function handleActivate() {
    setError("");

    // Guardrails before we prompt the wallet.
    if (!ADMIN_WALLET) {
      setError("Payment isn't configured. Please contact support.");
      return;
    }
    if (chainId && chainId !== REQUIRED_CHAIN_ID) {
      setError("Please switch your wallet to the BNB Smart Chain (BSC) and try again.");
      return;
    }

    const amount = parseUnits(String(JOINING_FEE), 18);

    setBusy(true);
    try {
      // 0) Check USDT balance via backend RPC — never touches the user's wallet so it
      //    can't trigger an extra popup. If balance is too low, stop right here.
      setStatus("Checking your USDT balance…");
      try {
        const { balance } = await api.checkUsdtBalance(address);
        if (balance < Number(JOINING_FEE)) {
          setLowBalance({ balance });
          setBusy(false);
          setStatus("");
          return;
        }
      } catch {
        // If the check fails (network issue), proceed anyway — the transfer will fail
        // naturally if there really aren't enough funds.
      }

      // 1) User sends the plan price in USDT directly to the admin wallet from their
      //    own connected wallet. They confirm in their wallet and pay the gas.
      setStatus("Confirm the payment in your wallet…");
      const hash = await writeContractAsync({
        address: getAddress(USDT_ADDRESS),
        abi: erc20Abi,
        functionName: "transfer",
        args: [getAddress(ADMIN_WALLET), amount],
      });

      // 2) Wait for the transfer to be mined and confirmed on-chain.
      setStatus("Confirming your payment on-chain…");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error("PAYMENT_FAILED");
      }

      // 3) Backend verifies the on-chain payment (real transfer to admin) and activates.
      setStatus("Activating your plan…");
      await api.activatePlan(address, hash);

      await refresh();
      setInvested(true);
      setDone(true); // welcome popup — closes on OK
    } catch (e) {
      const raw = (e?.shortMessage || e?.message || "").toLowerCase();
      if (raw.includes("reject") || raw.includes("denied") || raw.includes("cancel")) {
        setError("Payment cancelled. Your plan was not activated.");
      } else if (raw.includes("insufficient") || raw.includes("balance") || raw.includes("exceeds")) {
        setError(`Not enough funds. Keep at least ${JOINING_FEE} USDT plus a little BNB for gas.`);
      } else if (raw.includes("payment verification failed") || raw.includes("payment_failed")) {
        setError("We couldn't confirm your payment. If USDT was deducted, contact support with your transaction hash.");
      } else if (raw.includes("already used")) {
        setError("This payment was already used. Please refresh the page.");
      } else {
        setError("Couldn't activate the plan right now. Please try again.");
      }
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  function closeWelcome() {
    setDone(false);
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950">
      <Seo
        title="Activate your plan"
        description="Activate your plan on Decentralized World and start earning daily rewards."
        noindex
      />

      <main className="mx-auto w-full max-w-md px-4 pb-24 pt-6 sm:pt-10">
        {/* Back */}
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 transition hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500/15 ring-1 ring-accent-500/30">
            <Rocket className="h-5 w-5 text-accent-400" />
          </div>
          <h1 className="mt-3 font-display text-xl font-bold sm:text-2xl">
            Activate &amp; start earning
          </h1>
          <p className="mx-auto mt-1.5 max-w-xs text-xs text-slate-400 sm:text-sm">
            One small one-time activation turns on your full income engine. Here's what
            you unlock.
          </p>
        </div>

        {/* Plan card */}
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-accent-500/40 bg-gradient-to-b from-navy-800 to-navy-900 p-4 sm:p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-accent-500/20 blur-3xl" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-accent-400">
              <Rocket className="h-4 w-4" />
              <span className="font-display text-xs font-semibold uppercase tracking-wide">
                Power Plan
              </span>
            </div>
            <span className="rounded-full border border-accent-500/40 bg-accent-500/10 px-2 py-0.5 text-[10px] font-semibold text-accent-300">
              One-time
            </span>
          </div>

          <div className="mt-3 flex items-end gap-1.5">
            <span className="font-display text-4xl font-bold leading-none">{JOINING_FEE}</span>
            <span className="mb-1 text-xs text-slate-400">USDT</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Pay once. Earn every day after.</p>

          {/* Benefits */}
          <ul className="mt-4 space-y-2.5">
            {BENEFITS.map((b) => (
              <li key={b.title} className="flex gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-500/15">
                  <b.icon className="h-3.5 w-3.5 text-accent-400" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-100">{b.title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{b.text}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* Earning potential strip */}
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-center">
            <div>
              <p className="font-display text-sm font-bold text-white">16</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Levels</p>
            </div>
            <div>
              <p className="font-display text-sm font-bold text-white">Daily</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Payouts</p>
            </div>
            <div>
              <p className="font-display text-sm font-bold text-white">5+</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">USDT min</p>
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          {invested && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-xs font-medium text-emerald-300">
              <Check className="h-3.5 w-3.5" /> Your plan is active
            </div>
          )}

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
            <ShieldCheck className="h-3 w-3 text-emerald-400" /> Secure · paid from your
            wallet on BSC
          </div>
        </div>
      </main>

      {/* Sticky action bar — always reachable on mobile */}
      {!invested && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-950/90 px-4 py-2.5 backdrop-blur">
          <div className="mx-auto max-w-md">
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                <p className="font-display text-base font-bold leading-none">{JOINING_FEE} USDT</p>
                <p className="text-[10px] text-slate-500">one-time</p>
              </div>
              <button
                onClick={handleActivate}
                disabled={busy}
                className="btn-primary flex-1 py-2.5 text-sm"
              >
                {busy ? (
                  <>
                    <Spinner /> Processing...
                  </>
                ) : (
                  <>
                    Pay {JOINING_FEE} USDT &amp; activate <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
            {busy && status && (
              <p className="mt-1.5 text-center text-[11px] text-slate-400">{status}</p>
            )}
           
          </div>
        </div>
      )}

      {invested && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-950/90 px-4 py-3 backdrop-blur">
          <button
            onClick={() => navigate("/dashboard")}
            className="btn-primary mx-auto flex w-full max-w-md py-2.5 text-sm"
          >
            Go to dashboard <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <Popup
        open={Boolean(lowBalance)}
        title="Not enough USDT"
        icon={Wallet}
        onClose={() => setLowBalance(null)}
      >
        <p>
          Activating the plan needs{" "}
          <span className="font-semibold text-slate-100">{JOINING_FEE} USDT</span> in your
          wallet on BNB Smart Chain (BSC).
        </p>
        <p className="mt-2 text-[13px] text-slate-400">
          Your wallet currently has{" "}
          <span className="font-semibold text-slate-200">
            {Number(lowBalance?.balance || 0).toFixed(2)} USDT
          </span>
          . Please add USDT and try again.
        </p>
        <button
          onClick={() => setLowBalance(null)}
          className="btn-primary mt-4 w-full py-2.5 text-sm"
        >
          OK
        </button>
      </Popup>

      <Popup open={done} title="Welcome aboard! 🎉" icon={PartyPopper} onClose={closeWelcome}>
        <p>
          Your plan is now active. You've unlocked daily rewards and referral income —
          welcome to Decentralized World!
        </p>
        <button
          onClick={closeWelcome}
          className="btn-primary mt-4 w-full py-2.5 text-sm"
        >
          OK
        </button>
      </Popup>
    </div>
  );
}
