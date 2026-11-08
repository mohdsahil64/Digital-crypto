import { useEffect, useState, useCallback } from "react";
import { Gift, ArrowDownToLine, Inbox, BadgeCheck } from "lucide-react";
import AppLayout from "../components/AppLayout.jsx";
import Spinner from "../components/Spinner.jsx";
import Pagination from "../components/Pagination.jsx";
import { api } from "../lib/api.js";
import { useSession } from "../lib/session.jsx";

const BSCSCAN_TX = "https://bscscan.com/tx/";
const PAGE_SIZE = 20;

const TABS = [
  { id: "rewards", label: "Rewards", icon: Gift },
  { id: "withdrawals", label: "Withdrawals", icon: ArrowDownToLine },
];

function fmtDate(d) {
  try {
    return new Date(d).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function History() {
  const { address } = useSession();
  const [tab, setTab] = useState("rewards");
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const [rw, wd] = await Promise.all([
        api.getRewards(address).catch(() => ({ history: [] })),
        api.getWithdrawals(address).catch(() => ({ history: [] })),
      ]);
      setRewards(rw?.history || []);
      setWithdrawals(wd?.history || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { load(); }, [load]);

  return (
    <AppLayout title="History">
      {/* Tabs */}
      <div className="inline-flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setPage(0); }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              tab === t.id ? "bg-accent-500/20 text-accent-300" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400"><Spinner className="h-6 w-6" /></div>
      ) : (
        <div className="mt-3 rounded-2xl border border-white/10 bg-navy-900/70 p-3 backdrop-blur sm:p-4">
          {tab === "rewards" ? (
            rewards.length === 0 ? (
              <Empty text="No reward credits yet." />
            ) : (
              <>
              <ul className="divide-y divide-white/5">
                {rewards.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((r, i) => (
                  <li key={i} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
                      <Gift className="h-4 w-4 text-emerald-400" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-slate-200">
                        {r.note || `Level ${r.level} reward`}
                      </p>
                      <p className="text-[11px] text-slate-500">{fmtDate(r.createdAt)}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-emerald-300">
                      +{r.amountUsd.toFixed(2)} USDT
                    </span>
                  </li>
                ))}
              </ul>
              <Pagination page={page} pageSize={PAGE_SIZE} total={rewards.length} onChange={setPage} />
              </>
            )
          ) : withdrawals.length === 0 ? (
            <Empty text="No withdrawals yet." />
          ) : (
            <>
            <ul className="divide-y divide-white/5">
              {withdrawals.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((w, i) => (
                <li key={i} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-500/15">
                    <ArrowDownToLine className="h-4 w-4 text-accent-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-slate-200">
                      {w.amountUsd.toFixed(2)} USDT
                    </p>
                    <p className="text-[11px] text-slate-500">{fmtDate(w.createdAt)}</p>
                    {w.txHash && (
                      <a
                        href={`${BSCSCAN_TX}${w.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 block truncate font-mono text-[10px] text-slate-500 hover:text-accent-300"
                        title={w.txHash}
                      >
                        {w.txHash}
                      </a>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge status={w.status} />
                    {w.status === "completed" && w.txHash && (
                      <a
                        href={`${BSCSCAN_TX}${w.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-medium text-emerald-300 transition hover:bg-emerald-500/25"
                      >
                        <BadgeCheck className="h-2.5 w-2.5" /> Verified
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <Pagination page={page} pageSize={PAGE_SIZE} total={withdrawals.length} onChange={setPage} />
            </>
          )}
        </div>
      )}
    </AppLayout>
  );
}

function Empty({ text }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <Inbox className="h-8 w-8 text-slate-600" />
      <p className="mt-2 text-sm text-slate-500">{text}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    completed: "bg-emerald-500/15 text-emerald-300",
    failed: "bg-red-500/15 text-red-300",
    pending: "bg-amber-500/15 text-amber-300",
  };
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
        map[status] || "bg-white/10 text-slate-400"
      }`}
    >
      {status}
    </span>
  );
}
