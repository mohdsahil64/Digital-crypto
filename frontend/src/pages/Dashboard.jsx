import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Coins,
  Gift,
  CheckCircle2,
  Circle,
  ArrowRight,
  Wallet,
  Banknote,
  Sparkles,
  UserPlus,
  Trophy,
  Lock,
  Check,
  ChevronRight,
  ChevronLeft,
  BadgeCheck,
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
  const [levels, setLevels] = useState([]);
  const [planPrice, setPlanPrice] = useState(5);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const [u, rw, lv, h] = await Promise.all([
        api.getUser(address),
        api.getRewards(address).catch(() => null),
        api.getLevels().catch(() => ({ levels: [] })),
        api.health().catch(() => null),
      ]);
      setUser(u.user);
      setRewards(rw);
      setLevels(lv.levels || []);
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

  const invested       = user?.hasInvested;
  const directBusiness = rewards?.directBusiness ?? 0;
  const level          = rewards?.level ?? 0;
  const balance        = rewards?.availableBalance ?? 0;
  const daily          = rewards?.dailyReward ?? 0;
  const activeTeam     = rewards?.activeTeam ?? 0;

  return (
    <AppLayout title="Dashboard" showBack={false}>

      {/* ── Balance hero card ── */}
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
              <CheckCircle2 className="h-3 w-3" /> Plan Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/20 px-2.5 py-1 text-[11px] font-medium text-slate-300">
              <Circle className="h-3 w-3" /> Plan Inactive
            </span>
          )}
        </div>

        <p className="mt-4 text-[11px] uppercase tracking-wide text-slate-400">
          Available balance
        </p>
        <p className="mt-1 font-display text-3xl font-bold sm:text-4xl">
          {balance.toFixed(2)}{" "}
          <span className="text-lg font-semibold text-slate-400">USDT</span>
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-500/15 px-2 py-0.5 text-[11px] font-medium text-accent-300">
            <TrendingUp className="h-3 w-3" /> Level {level}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-300">
            <Gift className="h-3 w-3 text-accent-400" /> {daily} USDT/day
          </span>
        </div>

        {/* Primary actions */}
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

      {/* ── Activate plan banner ── */}
      {!invested && (
        <Link
          to="/invest"
          className="group mt-4 flex items-center gap-3 rounded-2xl border border-accent-500/30 bg-accent-500/[0.07] px-4 py-3.5 transition hover:border-accent-500/50 hover:bg-accent-500/10"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400">
            <Gift className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-100">
              Activate plan — {planPrice} USDT
            </span>
            <span className="block truncate text-xs text-slate-400">
              Unlock daily rewards &amp; referral income
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-accent-500 px-3 py-2 text-xs font-semibold text-white transition group-hover:bg-accent-400">
            Join <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      )}

      {/* ── Claim reward ── */}
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
                {daily} USDT — Level {level}
              </span>
            </span>
          </span>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </button>
      )}
      {msg && <p className="mt-2 text-xs text-slate-400">{msg}</p>}

      {/* ── Your status: today + total earnings only ── */}
      <h2 className="mt-6 font-display text-sm font-semibold uppercase tracking-wide text-slate-400">
        Your status
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
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
      </div>

      {/* ── Levels slider ── */}
      <h2 className="mt-6 font-display text-base font-bold text-slate-100">
        Rewards Roadmap
      </h2>
      <ul className="mt-2 space-y-1">
        {[
          "Active plan members only count toward level targets",
          "More active team = higher daily USDT reward",
          "Level upgrades automatically as your team grows",
        ].map((t) => (
          <li key={t} className="flex items-center gap-2 text-xs text-slate-400">
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            {t}
          </li>
        ))}
      </ul>
      <LevelSlider
        levels={levels}
        currentLevel={level}
        directBusiness={directBusiness}
        teamCount={activeTeam}
      />
    </AppLayout>
  );
}

function LevelSlider({ levels, currentLevel, directBusiness, teamCount }) {
  const startIdx = Math.max(
    0,
    levels.findIndex((l) => l.level === (currentLevel || 1))
  );
  const [idx, setIdx] = useState(startIdx === -1 ? 0 : startIdx);
  const [dir, setDir] = useState("right");

  useEffect(() => {
    setIdx(startIdx === -1 ? 0 : startIdx);
  }, [startIdx]);

  if (!levels.length) return null;

  const l       = levels[idx];
  const achieved  = currentLevel >= l.level;
  const isCurrent = currentLevel === l.level;
  const canPrev   = idx > 0;
  const canNext   = idx < levels.length - 1;

  function go(nextIdx, direction) {
    setDir(direction);
    setIdx(nextIdx);
  }

  return (
    <div className="mt-3">
      <div className="relative overflow-hidden">
        <div
          key={l.level}
          className={dir === "right" ? "animate-slide-in-right" : "animate-slide-in-left"}
        >
          <div
            className={`relative overflow-hidden rounded-3xl border p-5 sm:p-6 ${
              achieved
                ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-navy-800 to-navy-900"
                : "border-accent-500/40 bg-gradient-to-br from-accent-500/15 via-navy-800 to-navy-900"
            }`}
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent-500/20 blur-3xl" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-accent-400">
                <Trophy className="h-4 w-4" />
                <span className="font-display text-xs font-semibold uppercase tracking-wide">
                  Level {l.level} of {levels.length}
                </span>
              </div>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  achieved ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-slate-400"
                }`}
              >
                {achieved ? <Check className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              </span>
            </div>

            <div className="mt-4 flex items-end gap-1.5">
              <span className="font-display text-4xl font-bold leading-none sm:text-5xl">
                {l.dailyReward}
              </span>
              <span className="mb-1 text-sm text-slate-400">USDT / day</span>
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-300">
              <Gift className="h-3.5 w-3.5 text-accent-400" />
              {isCurrent
                ? "You're earning this right now"
                : achieved
                ? "Unlocked"
                : "Hit the targets below to unlock"}
            </p>

            {/* Requirements */}
            <div className="mt-4 space-y-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-[10px] text-slate-500 mb-1">
                Active plan holders only count toward these targets.
              </p>
              <Requirement
                label="Direct business (active × $5)"
                have={directBusiness}
                need={l.directBusiness}
                achieved={achieved}
                prefix="$"
              />
              <Requirement
                label="Total active team"
                have={teamCount}
                need={l.team}
                achieved={achieved}
              />
            </div>

            {isCurrent ? (
              <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-accent-500/20 px-3 py-1 text-[11px] font-medium text-accent-300">
                <Sparkles className="h-3 w-3" /> Current level
              </span>
            ) : achieved ? (
              <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-medium text-emerald-300">
                <Check className="h-3 w-3" /> Unlocked
              </span>
            ) : (
              <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-400">
                <Lock className="h-3 w-3" /> Locked
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => canPrev && go(idx - 1, "left")}
          disabled={!canPrev}
          className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <button
          onClick={() => canNext && go(idx + 1, "right")}
          disabled={!canNext}
          className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-40"
        >
          {canNext ? <>Next level <ChevronRight className="h-4 w-4" /></> : "Top level"}
        </button>
      </div>

      {/* Dots */}
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {levels.map((lv, i) => {
          const done = currentLevel >= lv.level;
          return (
            <button
              key={lv.level}
              onClick={() => go(i, i > idx ? "right" : "left")}
              aria-label={`Level ${lv.level}`}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-5 bg-accent-400" : done ? "w-1.5 bg-emerald-500/60" : "w-1.5 bg-white/15"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

function Requirement({ label, have, need, achieved, prefix = "" }) {
  const pct = Math.min(100, need ? (have / need) * 100 : 0);
  const met = achieved || have >= need;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-300">{label}</span>
        <span className={met ? "text-emerald-300" : "text-slate-400"}>
          {prefix}{have.toLocaleString()}/{prefix}{need.toLocaleString()}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${met ? "bg-emerald-500" : "bg-accent-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, sub, unit, tone = "text-accent-400" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
          {Icon && <Icon className={`h-4 w-4 ${tone}`} />}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      </div>
      <p className="mt-3 font-display text-2xl font-bold">
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-slate-400">{unit}</span>}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}
