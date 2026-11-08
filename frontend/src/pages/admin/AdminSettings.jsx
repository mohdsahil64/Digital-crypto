import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Power, Wallet, Save } from "lucide-react";
import AdminLayout from "./AdminLayout.jsx";
import Spinner from "../../components/Spinner.jsx";
import { adminApi, adminAuth } from "../../lib/adminApi.js";

export default function AdminSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({ minWithdrawal: 5, maintenanceMode: false });
  const [minInput, setMinInput] = useState("5");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!adminAuth.isLoggedIn()) navigate("/admin/login");
  }, [navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await adminApi.getSettings();
      setSettings(s);
      setMinInput(String(s.minWithdrawal));
    } catch (e) {
      if (e.message.includes("log in")) navigate("/admin/login");
      else setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  async function toggleMaintenance() {
    setMsg("");
    try {
      const res = await adminApi.updateSettings({ maintenanceMode: !settings.maintenanceMode });
      setSettings(res);
      setMsg(res.maintenanceMode ? "Maintenance mode ON — user site is disabled." : "Maintenance mode OFF.");
    } catch (e) {
      setMsg(e.message);
    }
  }

  async function saveMinWithdrawal() {
    setMsg("");
    try {
      const res = await adminApi.updateSettings({ minWithdrawal: Number(minInput) });
      setSettings(res);
      setMsg(`Minimum withdrawal set to ${res.minWithdrawal} USDT.`);
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <AdminLayout title="Settings" msg={msg}>
      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Spinner className="h-6 w-6" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card">
            <div className="flex items-center gap-2">
              <Power className="h-4 w-4 text-accent-400" />
              <h3 className="font-display font-semibold">Site maintenance</h3>
            </div>
            <p className="mt-1 text-sm text-slate-400">When ON, the user site is disabled and shows a maintenance screen.</p>
            <button
              onClick={toggleMaintenance}
              className={`mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                settings.maintenanceMode ? "bg-red-500/20 text-red-300 hover:bg-red-500/30" : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${settings.maintenanceMode ? "bg-red-400" : "bg-emerald-400"}`} />
              {settings.maintenanceMode ? "Maintenance ON" : "Site Live"}
            </button>
          </div>

          <div className="card">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-accent-400" />
              <h3 className="font-display font-semibold">Minimum withdrawal</h3>
            </div>
            <p className="mt-1 text-sm text-slate-400">Users can't withdraw below this.</p>
            <div className="mt-3 flex gap-2">
              <input type="number" value={minInput} onChange={(e) => setMinInput(e.target.value)} className="w-full rounded-xl border border-white/10 bg-navy-950 px-3 py-2 text-sm outline-none focus:border-accent-500" />
              <button onClick={saveMinWithdrawal} className="btn-primary shrink-0"><Save className="h-4 w-4" /> Save</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
