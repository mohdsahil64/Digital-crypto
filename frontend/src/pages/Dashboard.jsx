import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Coins,
  Users,
  UserPlus,
  Gift,
  CheckCircle2,
  Circle,
  ArrowRight,
  Wallet,
  Banknote,
  Sparkles,
  UserCheck,
} from "lucide-react";
import AppLayout from "../components/AppLayout.jsx";
import Spinner from "../components/Spinner.jsx";
import { api } from "../lib/api.js";
import { useSession } from "../lib/session.jsx";

export default function Dashboard() {
  const { address, user: sessionUser } = useSession();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(sessionUser);
  const [rewards, setRewards] = useState(null);
  const [planPrice, setPlanPrice] = useState(5);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const [u, rw, h] = await Promise.all([
        api.getUser(address),
        api.getRewards(address).catch(() => null),
        api.health().catch(() => null),
      ]);
      setUser(u.user);
      setRewards(rw);
      if (h?.planPriceUsd) setPlanPrice(h.planPriceUsd);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { load(); }, [load]);

  async function handleAccrue() {
    setMsg("");
    try {
      await api.accrue(address);
      await load();
    } catch (e) {
      setMsg(e.message || "Could not claim reward");
    }
  }

  if (loading) {
    return (
      <AppLayout title="Dashboard" showBack={false}>
        <div className="flex justify-center py-24 text-slate-400">
          <Spinner className="h-6 w-6" />
        </div>
      </AppLayout>
    );
  }

  const invested = user?.hasInvested;
  const level = rewards?.level ?? 0;
  const balance = rewards?.availableBalance ?? 0;
  const daily = rewards?.dailyReward ?? 0;

  return (
    <AppLayout title="Dashboard" showBack={false}>
      {/* ---------- Balance hero card ---------- */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-accent-500/15 via-navy-800 to-navy-900 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-accent-500/20 blur-3xl" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Wallet className="h-3.5 w-3.5 text-accent-400" />
            <span className="font-mono">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""}
            </span>
          </div>
          {invested ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
              <CheckCircle2 className="h-3 w-3" />Plan Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/20 px-2.5 py-1 text-[11px] font-medium text-slate-300">
              <Circle className="h-3 w-3" />Plan Inactive
            </span>
          )}
        </div>

        <p className="mt-4 text-[11px] uppercase tracking-wide text-slate-400">
          Available balance
        </p>
        <p className="mt-1 font-display text-3xl font-bold sm:text-4xl">
          {balance.toFixed(2)} <span className="text-lg font-semibold text-slate-400">USDT</span>
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-500/15 px-2 py-0.5 text-[11px] font-medium text-accent-300">
            <TrendingUp className="h-3 w-3" /> Level {level}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-300">
            <Gift className="h-3 w-3 text-accent-400" /> {daily} USDT/day
          </span>
        </div>

        {/* Primary actions — compact */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            to="/withdraw"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-accent-400"
          >
            <Banknote className="h-4 w-4" /> Withdraw
          </Link>
          <Link
            to="/refer"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-100 transition hover:bg-white/10"
          >
            <UserPlus className="h-4 w-4 text-accent-400" /> Invite
          </Link>
        </div>
      </div>

      {/* ---------- Invest banner (only when NOT invested) ---------- */}
      {!invested && (
        <Link
          to="/invest"
          className="group mt-4 flex items-center gap-3 rounded-2xl border border-accent-500/30 bg-accent-500/[0.07] px-4 py-3.5 transition hover:border-accent-500/50 hover:bg-accent-500/10"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-100">
              Activate the {planPrice} USDT
            </span>
            <span className="block truncate text-xs text-slate-400">
              Unlock referral income &amp; daily rewards
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-accent-500 px-3 py-2 text-xs font-semibold text-white transition group-hover:bg-accent-400">
            Activate <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      )}

      {/* ---------- Claim reward (only when active) ---------- */}
      {invested && (
        <button
          onClick={handleAccrue}
          className="mt-4 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-left transition hover:border-accent-500/40 hover:bg-white/[0.06]"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400">
              <Gift className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-100">
                Claim today's reward
              </span>
              <span className="block text-xs text-slate-400">
                {daily} USDT waiting based on Level {level}
              </span>
            </span>
          </span>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </button>
      )}
      {msg && <p className="mt-2 text-xs text-slate-400">{msg}</p>}

      {/* ---------- Analytics ---------- */}
      <h2 className="mt-6 font-display text-sm font-semibold uppercase tracking-wide text-slate-400">
        Your stats
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={Gift}
          tone="text-emerald-400"
          label="Today's earnings"
          value={(rewards?.todayEarnings ?? 0).toFixed(2)}
          unit="USDT"
          sub="Earned today"
        />
        <StatTile
          icon={Coins}
          tone="text-accent-400"
          label="Total earnings"
          value={(rewards?.totalRewards ?? 0).toFixed(2)}
          unit="USDT"
          sub="All-time"
        />
        <StatTile
          icon={UserPlus}
          tone="text-amber-400"
          label="Direct team"
          value={rewards?.directTeam ?? user?.directCount ?? 0}
          sub="Directly referred"
        />
        <StatTile
          icon={Users}
          tone="text-fuchsia-400"
          label="My team"
          value={rewards?.totalTeam ?? user?.teamCount ?? 0}
          sub="Direct + indirect"
        />
      </div>

      {/* Active members — full width row */}
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={UserCheck}
          tone="text-emerald-400"
          label="Active member"
          value={rewards?.activeTeam ?? 0}
          sub="Bought the plan"
        />
      </div>
    </AppLayout>
  );
}

// Polished stat tile with a colored icon chip. `unit` (e.g. "USDT") renders smaller
// and muted next to the value.
function StatTile({ icon: Icon, label, value, sub, unit, tone = "text-accent-400" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-4 backdrop-blur transition hover:border-white/20">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
          {Icon && <Icon className={`h-4 w-4 ${tone}`} />}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-bold">
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-slate-400">{unit}</span>}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}
