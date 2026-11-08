import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, RefreshCw } from "lucide-react";
import AdminLayout from "./AdminLayout.jsx";
import Spinner from "../../components/Spinner.jsx";
import CopyButton from "../../components/CopyButton.jsx";
import Pagination from "../../components/Pagination.jsx";
import { adminApi, adminAuth } from "../../lib/adminApi.js";

const BSCSCAN_TX = "https://bscscan.com/tx/";
const PAGE_SIZE = 20;

function short(a) {
  return a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "-";
}

function StatusBadge({ status }) {
  const map = {
    completed: "bg-emerald-500/15 text-emerald-300",
    failed: "bg-red-500/15 text-red-300",
    pending: "bg-amber-500/15 text-amber-300",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] capitalize ${map[status] || "bg-white/10 text-slate-400"}`}>
      {status}
    </span>
  );
}

const FILTERS = ["all", "completed", "failed"];

export default function AdminWithdrawals() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [msg, setMsg] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!adminAuth.isLoggedIn()) navigate("/admin/login");
  }, [navigate]);

  const load = useCallback(async (status) => {
    setLoading(true);
    try {
      const res = await adminApi.getWithdrawals(status);
      setRows(res.withdrawals);
      setPage(0);
    } catch (e) {
      if (e.message.includes("log in")) navigate("/admin/login");
      else setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(filter); }, [load, filter]);

  return (
    <AdminLayout title="Withdrawals" msg={msg}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                filter === f ? "bg-accent-500/20 text-accent-300" : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button onClick={() => load(filter)} className="btn-ghost shrink-0 px-3 py-2 text-sm">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <p className="mb-3 text-[11px] text-slate-500">
        Withdrawals are paid out to users instantly & automatically. This is a read-only record.
      </p>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Spinner className="h-6 w-6" /></div>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-slate-500">
          No {filter === "all" ? "" : filter} withdrawals.
        </p>
      ) : (
        <div className="space-y-2.5">
          {rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((w) => (
            <div key={w.id} className="card">
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-semibold">{w.amountUsd.toFixed(2)} USDT</span>
                <StatusBadge status={w.status} />
              </div>
              <div className="mt-2 flex items-center gap-1">
                <span className="font-mono text-xs text-slate-400">{short(w.walletAddress)}</span>
                <CopyButton value={w.walletAddress} variant="icon" />
              </div>
              {w.txHash && (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <a
                    href={`${BSCSCAN_TX}${w.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate font-mono text-[10px] text-slate-500 hover:text-accent-300"
                    title={w.txHash}
                  >
                    {short(w.txHash)}
                  </a>
                  {w.status === "completed" && (
                    <a
                      href={`${BSCSCAN_TX}${w.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-medium text-emerald-300 hover:bg-emerald-500/25"
                    >
                      <BadgeCheck className="h-2.5 w-2.5" /> Verified
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
          <Pagination page={page} pageSize={PAGE_SIZE} total={rows.length} onChange={setPage} />
        </div>
      )}
    </AdminLayout>
  );
}
