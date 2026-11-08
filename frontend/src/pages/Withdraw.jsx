import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownToLine,
  Info,
  Wallet,
  History as HistoryIcon,
  CheckCircle2,
} from "lucide-react";
import AppLayout from "../components/AppLayout.jsx";
import Spinner from "../components/Spinner.jsx";
import Popup from "../components/Popup.jsx";
import { api } from "../lib/api.js";
import { useSession } from "../lib/session.jsx";

// Show roughly half the address so the user can recognise it — keep the leading and
// trailing quarters visible with an ellipsis in the middle.
function halfAddr(a) {
  if (!a) return "";
  const q = Math.max(6, Math.floor(a.length / 4)); // ~quarter each side (~half total)
  return `${a.slice(0, q)}xxxx${a.slice(-q)}`;
}

const BSCSCAN_TX = "https://bscscan.com/tx/";

export default function Withdraw() {
  const { address } = useSession();
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState(null);
  const [minWithdrawal, setMinWithdrawal] = useState(5);
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false); // classic confirm popup
  const [success, setSuccess] = useState(null); // { amount, txHash } after payout

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const [rw, wd] = await Promise.all([
        api.getRewards(address).catch(() => null),
        api.getWithdrawals(address).catch(() => null),
      ]);
      setRewards(rw);
      if (wd?.minWithdrawal) setMinWithdrawal(wd.minWithdrawal);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { load(); }, [load]);

  const available = rewards?.availableBalance ?? 0;
  const amt = Number(amount) || 0;

  // Validate first, then open the confirmation popup.
  function requestWithdraw() {
    setMsg("");
    if (!amt || amt < minWithdrawal) {
      setMsg(`Minimum withdrawal is ${minWithdrawal} USDT.`);
      return;
    }
    if (amt > available) {
      setMsg("Amount is more than your available balance.");
      return;
    }
    setConfirmOpen(true);
  }

  // Confirmed — send the withdrawal (paid out instantly from the admin wallet).
  async function confirmWithdraw() {
    setConfirmOpen(false);
    setMsg("");
    setBusy(true);
    try {
      const res = await api.requestWithdrawal(address, amt);
      setSuccess({ amount: amt, txHash: res?.txHash || "" });
      setAmount("");
      await load();
    } catch (e) {
      setMsg(e.message || "Withdrawal failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Withdraw">
        <div className="flex justify-center py-24 text-slate-400"><Spinner className="h-6 w-6" /></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Withdraw">
      {/* Balance — classic compact card */}
      <div className="rounded-xl border border-white/10 bg-navy-900/70 px-4 py-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wide text-slate-400">
            Available balance
          </span>
          <span className="text-[11px] text-slate-500">Min {minWithdrawal} USDT</span>
        </div>
        <p className="mt-1 font-display text-2xl font-bold">
          {available.toFixed(2)} <span className="text-base font-semibold text-slate-400">USDT</span>
        </p>
      </div>

      {/* Request form — classic */}
      <div className="mt-3 rounded-xl border border-white/10 bg-navy-900/70 p-4">
        <div className="flex items-center gap-2">
          <ArrowDownToLine className="h-4 w-4 text-accent-400" />
          <h3 className="text-sm font-semibold">Withdraw funds</h3>
        </div>

        {/* Amount */}
        <label className="mt-3 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Amount (USDT)
        </label>
        <div className="relative mt-1.5">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={String(minWithdrawal)}
            className="w-full rounded-lg border border-white/10 bg-navy-950 py-2.5 pl-3 pr-24 text-sm outline-none focus:border-accent-500"
          />
          <span className="pointer-events-none absolute right-14 top-1/2 -translate-y-1/2 text-xs text-slate-500">
            USDT
          </span>
          <button
            onClick={() => setAmount(String(available))}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-white/5 px-2 py-1 text-[11px] font-medium text-accent-300 transition hover:bg-white/10"
          >
            Max
          </button>
        </div>

        <button onClick={requestWithdraw} disabled={busy} className="btn-primary mt-3 w-full py-2.5 text-sm">
          {busy ? <><Spinner /> Sending...</> : <>Withdraw</>}
        </button>

        {msg && (
          <p className="mt-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-300">
            {msg}
          </p>
        )}

        {/* Note: sent to the registered address */}
        <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-400">
          <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-400" />
          <span>
            USDT will be received on your registered address
            {address ? (
              <>
                {" "}
                <span className="break-all font-mono text-slate-300">{halfAddr(address)}</span>
              </>
            ) : null}
            .
          </span>
        </div>

        {/* Note: instant, on-chain */}
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2 text-[11px] text-slate-300">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
          Paid instantly on-chain to your wallet — you'll get a transaction ID.
        </div>
      </div>

      {/* Quick link to history */}
      <Link
        to="/history"
        className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-accent-500/40 hover:bg-white/[0.06]"
      >
        <HistoryIcon className="h-4 w-4 text-accent-400" /> Withdrawal history
      </Link>

      {/* Classic confirmation popup */}
      <Popup
        open={confirmOpen}
        title="Confirm withdrawal"
        icon={ArrowDownToLine}
        onClose={() => setConfirmOpen(false)}
      >
        <p>
          Withdraw <span className="font-semibold text-slate-100">{amt.toFixed(2)} USDT</span> to
          your wallet?
        </p>
        <p className="mt-1 text-[12px] text-slate-400">
          It's sent instantly on-chain to{" "}
          <span className="break-all font-mono text-slate-300">{halfAddr(address)}</span>.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setConfirmOpen(false)} className="btn-ghost text-sm">
            Cancel
          </button>
          <button onClick={confirmWithdraw} className="btn-primary px-4 py-2 text-sm">
            Confirm
          </button>
        </div>
      </Popup>

      {/* Success popup with the transaction ID */}
      <Popup
        open={Boolean(success)}
        title="Withdrawal sent"
        icon={CheckCircle2}
        onClose={() => setSuccess(null)}
      >
        <p>
          <span className="font-semibold text-slate-100">
            {Number(success?.amount || 0).toFixed(2)} USDT
          </span>{" "}
          has been sent to your wallet.
        </p>
        {success?.txHash && (
          <div className="mt-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Transaction ID</p>
            <a
              href={`${BSCSCAN_TX}${success.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block break-all font-mono text-[12px] text-accent-300 hover:underline"
            >
              {success.txHash}
            </a>
          </div>
        )}
        <button onClick={() => setSuccess(null)} className="btn-primary mt-4 w-full py-2.5 text-sm">
          OK
        </button>
      </Popup>
    </AppLayout>
  );
}
