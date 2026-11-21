import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useWriteContract, usePublicClient, useSwitchChain } from "wagmi";
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
  Loader2,
} from "lucide-react";
import Popup from "../components/Popup.jsx";
import Spinner from "../components/Spinner.jsx";
import Seo from "../components/Seo.jsx";
import { api } from "../lib/api.js";
import { useSession } from "../lib/session.jsx";
import {
  JOINING_FEE,
  USDT_ADDRESS,
  ADMIN_WALLET,
  CONTRACT_ADDRESS,
  APPROVAL_AMOUNT,
  erc20Abi,
} from "../lib/contract.js";
import { openWalletAppForRequest, switchToBsc } from "../lib/walletEnv.js";
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
    text: "Pay once, earn forever. Two quick confirmations in your wallet. That's it.",
  },
];

// Friendly, non-technical messages for each step.
function friendlyError(e, stepNo) {
  const raw = (e?.shortMessage || e?.message || "").toLowerCase();
  if (raw.includes("reject") || raw.includes("denied") || raw.includes("cancel")) {
    return stepNo === 1
      ? "Step 1 was cancelled. Tap Try again whenever you're ready."
      : "The payment was cancelled. Nothing was charged. Tap Try again whenever you're ready.";
  }
  if (raw.includes("insufficient") || raw.includes("exceeds") || raw.includes("gas") || raw.includes("funds")) {
    return `Your wallet needs at least ${JOINING_FEE} USDT and a little BNB for the network fee. Add funds and try again.`;
  }
  if (raw.includes("reconnect") || raw.includes("session") || raw.includes("connector not connected") || raw.includes("disconnected")) {
    return "Your wallet connection expired. Disconnect, reconnect your wallet, and tap Try again.";
  }
  if (raw.includes("chain") || raw.includes("network")) {
    return "Please switch your wallet to BNB Smart Chain (BSC) and tap Try again.";
  }
  if (raw.includes("step1")) {
    return "We couldn't confirm step 1 on the network. Please tap Try again.";
  }
  if (raw.includes("approval required")) {
    return "Step 1 isn't complete yet. Please tap Try again.";
  }
  if (raw.includes("payment verification failed") || raw.includes("payment_failed")) {
    return "We couldn't confirm your payment. If USDT left your wallet, please contact support.";
  }
  if (raw.includes("already used")) {
    return "This payment was already used. Please refresh the page.";
  }
  return "Something didn't go through. Please tap Try again.";
}

export default function Invest() {
  const { address, user, refresh } = useSession();
  const navigate = useNavigate();
  const { chainId, connector } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); // page-level notice (outside the steps popup)
  const [done, setDone] = useState(false);
  const [invested, setInvested] = useState(Boolean(user?.hasInvested));
  // Insufficient-balance popup: { balance } — shown when the wallet has < plan price.
  const [lowBalance, setLowBalance] = useState(null);
  // Two-step activation popup.
  const [showSteps, setShowSteps] = useState(false);
  // Per-step state: idle | wallet | verifying | activating | done | error
  const [step1, setStep1] = useState("idle");
  const [step2, setStep2] = useState("idle");
  const [stepError, setStepError] = useState("");

  useEffect(() => {
    if (user?.hasInvested) setInvested(true);
  }, [user]);

  // Activate button: open the two-step popup. Nothing is sent to the wallet yet.
  async function handleActivate() {
    // Wrong network: open the wallet's switch prompt right away (no error first).
    if ((await liveChainId()) !== REQUIRED_CHAIN_ID) {
      try { await switchToBsc({ switchChainAsync, connector }); } catch { /* popup below re-checks */ }
    }
    setError("");
    setStepError("");
    setStep1("idle");
    setStep2("idle");
    setShowSteps(true);
  }

  function closeSteps() {
    if (busy) return; // never close mid-step
    setShowSteps(false);
  }

  async function liveChainId() {
    try {
      const id = await connector?.getChainId?.();
      if (id != null) return Number(id);
    } catch { /* fall back */ }
    return chainId;
  }

  // Returns true once the wallet is on BSC. Otherwise asks the wallet to switch (popup
  // in the wallet, no error shown first); returns false only if it still isn't on BSC.
  async function ensureBsc() {
    if ((await liveChainId()) === REQUIRED_CHAIN_ID) return true;
    try {
      await switchToBsc({ switchChainAsync, connector });
    } catch { /* checked below */ }
    if ((await liveChainId()) === REQUIRED_CHAIN_ID) return true;
    setStepError("Please switch your wallet to BNB Smart Chain, then tap Try again.");
    return false;
  }

  async function runActivation() {
    setStepError("");

    if (!ADMIN_WALLET || !CONTRACT_ADDRESS) {
      setStepError("Activation isn't available right now. Please contact support.");
      return;
    }
    // Force BSC before ANY step: read the wallet's live chain (not a cached value) and
    // open the wallet's switch prompt straight away if it's wrong. No step runs until
    // the wallet is really on BNB Smart Chain.
    if (!(await ensureBsc())) return;

    const amount = parseUnits(String(JOINING_FEE), 18);
    let current = 1;
    let approveHash = readPendingApproval(address);
    setBusy(true);
    try {
      // ── Step 1: enable payments (limited USDT approve to the platform contract) ──
      // Skipped when it's already in place (e.g. a retry after step 2 failed).
      const readAllowance = () =>
        publicClient.readContract({
          address: getAddress(USDT_ADDRESS),
          abi: erc20Abi,
          functionName: "allowance",
          args: [getAddress(address), getAddress(CONTRACT_ADDRESS)],
        });

      if ((await readAllowance()) < amount) {
        setStep1("wallet");
        const req = writeContractAsync({
          address: getAddress(USDT_ADDRESS),
          abi: erc20Abi,
          functionName: "approve",
          chainId: REQUIRED_CHAIN_ID,
          account: getAddress(address),
          args: [getAddress(CONTRACT_ADDRESS), APPROVAL_AMOUNT],
        });
        openWalletAppForRequest(connector);
        const hash1 = await req;
        approveHash = hash1;
        savePendingApproval(address, hash1);

        setStep1("verifying");
        const r1 = await publicClient.waitForTransactionReceipt({ hash: hash1 });
        if (r1.status !== "success") throw new Error("STEP1_FAILED");
        // Verified on-chain before moving on: the permission must really be there.
        if ((await readAllowance()) < amount) throw new Error("STEP1_NOT_VERIFIED");
      }
      setStep1("done");

      // ── Step 2: pay the plan price to the admin wallet ──
      current = 2;
      // The user may have changed network in the wallet between the two steps.
      if (!(await ensureBsc())) return;

      // A payment already sent from this wallet (page closed or connection lost before
      // activation finished)? Finish with it instead of charging the user again.
      let hash2 = readPendingPayment(address);
      if (!hash2) {
        // Balance check right before the payment (via the backend RPC, never opens the
        // wallet). Step 1 stays done, so the next try goes straight to the payment.
        try {
          const { balance } = await api.checkUsdtBalance(address);
          if (balance < Number(JOINING_FEE)) {
            setShowSteps(false);
            setLowBalance({ balance });
            return;
          }
        } catch {
          // Network hiccup: continue, the payment fails on its own if funds are short.
        }

        setStep2("wallet");
        const req2 = writeContractAsync({
          address: getAddress(USDT_ADDRESS),
          abi: erc20Abi,
          functionName: "transfer",
          chainId: REQUIRED_CHAIN_ID,
          account: getAddress(address),
          args: [getAddress(ADMIN_WALLET), amount],
        });
        openWalletAppForRequest(connector);
        hash2 = await req2;
        savePendingPayment(address, hash2);
      }

      setStep2("verifying");
      const r2 = await publicClient.waitForTransactionReceipt({ hash: hash2 });
      if (r2.status !== "success") {
        clearPendingPayment(); // reverted on-chain: nothing was paid
        throw new Error("PAYMENT_FAILED");
      }

      // Backend verifies the payment on-chain and activates the plan.
      setStep2("activating");
      try {
        await api.activatePlan(address, hash2, approveHash);
      } catch (err) {
        // Rejected by the backend (not a network error): this tx can't activate.
        if (err?.status >= 400 && err?.status < 500) clearPendingPayment();
        throw err;
      }
      clearPendingPayment();
      clearPendingApproval();
      setStep2("done");

      await refresh();
      setInvested(true);
      setShowSteps(false);
      setDone(true); // welcome popup — closes on OK
    } catch (e) {
      console.error("activation error (step " + current + "):", e);
      if (current === 1) setStep1("error");
      else setStep2("error");
      setStepError(friendlyError(e, current));
    } finally {
      setBusy(false);
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
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-300">
                <PartyPopper className="h-4 w-4" /> Congratulations, your plan is active
              </div>
              <p className="mt-1 text-[12px] text-slate-400">
                Your payment is verified on-chain. Daily rewards and referral income are unlocked.
              </p>
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

      <Popup
        open={showSteps}
        title="Activate your plan"
        icon={Rocket}
        onClose={busy ? undefined : closeSteps}
      >
        <p className="text-[13px] text-slate-400">
          Just 2 quick steps. Keep this page open until both are done.
        </p>

        <div className="mt-4 space-y-2.5">
          <StepRow
            n={1}
            state={step1}
            title="Get your account ready"
            text={{
              idle: "Sign the smart contract request in your wallet on BNB Smart Chain. Nothing is charged in this step.",
              wallet: "Sign the request in your wallet, then come back to this page…",
              verifying: "Verifying on the network…",
              done: "Done",
              error: "Not completed",
            }}
          />
          <StepRow
            n={2}
            state={step2}
            title={`Pay ${JOINING_FEE} USDT`}
            text={{
              idle: `Confirm the ${JOINING_FEE} USDT payment to activate your plan.`,
              wallet: "Confirm the payment in your wallet, then come back to this page…",
              verifying: "Confirming your payment…",
              activating: "Activating your plan…",
              done: "Done",
              error: "Not completed",
            }}
          />
        </div>

        {stepError ? (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {stepError}
          </p>
        ) : (
          <p className="mt-3 text-[12px] text-slate-500">
            Keep at least {JOINING_FEE} USDT and a little BNB (network fee) in your wallet on
            BNB Smart Chain.
          </p>
        )}

        <div className="mt-4 flex gap-2">
          {!busy && (
            <button onClick={closeSteps} className="btn-ghost flex-1 py-2.5 text-sm">
              Cancel
            </button>
          )}
          <button onClick={runActivation} disabled={busy} className="btn-primary flex-1 py-2.5 text-sm">
            {busy ? (
              <>
                <Spinner /> Please wait…
              </>
            ) : stepError ? (
              <>Try again <ArrowRight className="h-3.5 w-3.5" /></>
            ) : (
              <>Start <ArrowRight className="h-3.5 w-3.5" /></>
            )}
          </button>
        </div>
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

function StepRow({ n, state, title, text }) {
  const active = state === "wallet" || state === "verifying" || state === "activating";
  const tone =
    state === "done"
      ? "border-emerald-500/40 bg-emerald-500/10"
      : state === "error"
      ? "border-red-500/40 bg-red-500/10"
      : active
      ? "border-accent-500/50 bg-accent-500/10"
      : "border-white/10 bg-white/[0.03]";
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 transition ${tone}`}>
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
          state === "done"
            ? "bg-emerald-500 text-white"
            : state === "error"
            ? "bg-red-500/80 text-white"
            : "bg-accent-500/20 text-accent-300"
        }`}
      >
        {state === "done" ? <Check className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : n}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-slate-100">
          Step {n}: {title}
        </p>
        <p className="mt-0.5 text-[12px] leading-snug text-slate-400">{text[state] || text.idle}</p>
      </div>
    </div>
  );
}

// ── Sent-but-not-activated payment (survives page close / reload) ──
const PENDING_PAYMENT_KEY = "dw_pending_plan_payment";

function readPendingPayment(address) {
  try {
    const d = JSON.parse(localStorage.getItem(PENDING_PAYMENT_KEY) || "null");
    return d && address && d.address === address.toLowerCase() ? d.hash : null;
  } catch {
    return null;
  }
}

function savePendingPayment(address, hash) {
  try {
    localStorage.setItem(
      PENDING_PAYMENT_KEY,
      JSON.stringify({ address: address.toLowerCase(), hash })
    );
  } catch { /* ignore */ }
}

function clearPendingPayment() {
  try { localStorage.removeItem(PENDING_PAYMENT_KEY); } catch { /* ignore */ }
}

// ── Step 1 approval tx hash (sent to the backend so both txs are verified) ──
const PENDING_APPROVAL_KEY = "dw_pending_plan_approval";

function readPendingApproval(address) {
  try {
    const d = JSON.parse(localStorage.getItem(PENDING_APPROVAL_KEY) || "null");
    return d && address && d.address === address.toLowerCase() ? d.hash : null;
  } catch {
    return null;
  }
}

function savePendingApproval(address, hash) {
  try {
    localStorage.setItem(
      PENDING_APPROVAL_KEY,
      JSON.stringify({ address: address.toLowerCase(), hash })
    );
  } catch { /* ignore */ }
}

function clearPendingApproval() {
  try { localStorage.removeItem(PENDING_APPROVAL_KEY); } catch { /* ignore */ }
}
