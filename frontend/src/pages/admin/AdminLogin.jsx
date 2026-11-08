import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Mail, Lock } from "lucide-react";
import Spinner from "../../components/Spinner.jsx";
import { adminApi } from "../../lib/adminApi.js";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await adminApi.login(email.trim(), password);
      navigate("/admin");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-500/40 bg-accent-500/10">
            <ShieldCheck className="h-7 w-7 text-accent-400" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">Admin Panel</h1>
          <p className="mt-1 text-sm text-slate-400">Decentralized World</p>
        </div>

        <form onSubmit={handleLogin} className="card space-y-4">
          <div>
            <label className="stat-label">Email</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-navy-950 px-3">
              <Mail className="h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@dw.com"
                className="w-full bg-transparent py-2.5 text-sm outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="stat-label">Password</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-navy-950 px-3">
              <Lock className="h-4 w-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent py-2.5 text-sm outline-none"
                required
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? <><Spinner /> Signing in...</> : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
