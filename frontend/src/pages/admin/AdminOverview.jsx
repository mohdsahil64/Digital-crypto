import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Users, UserPlus, Zap, UserX } from "lucide-react";
import AdminLayout from "./AdminLayout.jsx";
import Spinner from "../../components/Spinner.jsx";
import { adminApi, adminAuth } from "../../lib/adminApi.js";

export default function AdminOverview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!adminAuth.isLoggedIn()) navigate("/admin/login");
  }, [navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      setStats(await adminApi.getStats());
    } catch (e) {
      if (e.message.includes("log in")) navigate("/admin/login");
      else setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const cards = stats
    ? [
        { icon: Users, label: "Total users", value: stats.totalUsers, tone: "text-accent-400", sub: "Registered" },
        { icon: UserPlus, label: "Today registered", value: stats.todayRegistered, tone: "text-sky-400", sub: "Joined today" },
        { icon: Zap, label: "Plan active", value: stats.activeUsers, tone: "text-emerald-400", sub: "Bought the plan" },
        { icon: UserX, label: "Inactive", value: stats.inactiveUsers, tone: "text-slate-300", sub: "Not activated" },
      ]
    : [];

  return (
    <AdminLayout title="Overview" msg={msg}>
      <div className="mb-3 flex justify-end">
        <button onClick={load} className="btn-ghost px-3 py-2 text-sm">
          <RefreshCw className="h-4 w-4" /> <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Spinner className="h-6 w-6" /></div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="card">
              <div className="flex items-center gap-2">
                <c.icon className={`h-4 w-4 ${c.tone}`} />
                <span className="stat-label">{c.label}</span>
              </div>
              <p className="mt-2 font-display text-2xl font-bold">{c.value}</p>
              {c.sub && <p className="mt-0.5 text-[11px] text-slate-500">{c.sub}</p>}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
