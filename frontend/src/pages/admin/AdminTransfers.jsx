import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, RefreshCw, ArrowRight } from "lucide-react";
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

function fmtDate(d) {
  try {
    return new Date(d).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function StatusBadge({ status }) {
  const map = {
    completed: "bg-emerald-500/15 text-emerald-300",
    failed: "bg-red-500/15 text-red-300",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] capitalize ${map[status] || "bg-white/10 text-slate-400"}`}>
      {status}
    </span>
  );
}

const FILTERS = ["completed", "failed"];

export default function AdminTransfers() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("completed");

  useEffect(() => {
    if (!adminAuth.isLoggedIn()) navigate("/admin/login");
  }, [navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await adminApi.getTransfers();
      setRows(res.transfers);
      setPage(0);
    } catch (e) {
      if (e.message.includes("log in")) navigate("/admin/login");
      else setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  // Client-side status filter (backend returns all transfers).
  const filtered = filter === "all" ? rows : rows.filter((t) => t.status === filter);

  return (
    <AdminLayout title="Admin transfers" msg={msg}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(0); }}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                filter === f ? "bg-accent-500/20 text-accent-300" : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button onClick={load} className="btn-ghost shrink-0 px-3 py-2 text-sm">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Spinner className="h-6 w-6" /></div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-slate-500">
          No {filter === "all" ? "" : filter} transfers.
        </p>
      ) : (
        <div className="space-y-2.5">
          {filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((t) => (
            <div key={t.id} className="card">
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-semibold">{t.amountUsd.toFixed(2)} USDT</span>
                <StatusBadge status={t.status} />
              </div>

              <div className="mt-2 space-y-1 text-[11px]">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">From</span>
                  <span className="font-mono text-slate-300">{short(t.fromAddress)}</span>
                  <CopyButton value={t.fromAddress} variant="icon" />
                </div>
                <div className="flex items-center gap-1">
                  <ArrowRight className="h-3 w-3 text-slate-500" />
                  <span className="text-slate-500">To</span>
                  <span className="font-mono text-slate-300">{short(t.toAddress)}</span>
                  <CopyButton value={t.toAddress} variant="icon" />
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-500">{fmtDate(t.createdAt)}</span>
                {t.txHash && t.status === "completed" && (
                  <a
                    href={`${BSCSCAN_TX}${t.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-medium text-emerald-300 hover:bg-emerald-500/25"
                  >
                    <BadgeCheck className="h-2.5 w-2.5" /> Verified
                  </a>
                )}
              </div>
            </div>
          ))}
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
        </div>
      )}
    </AdminLayout>
  );
}
