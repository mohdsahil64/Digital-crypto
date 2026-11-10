import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  UserPlus,
  Network,
  Trophy,
  Lock,
  Check,
  Gift,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
} from "lucide-react";
import AppLayout from "../components/AppLayout.jsx";
import Spinner from "../components/Spinner.jsx";
import { api } from "../lib/api.js";
import { useSession } from "../lib/session.jsx";

export default function Team() {
  const { address, user } = useSession();
  const [loading, setLoading] = useState(true);
  const [levels, setLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [rewards, setRewards] = useState(null);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const [lv, rw] = await Promise.all([
        api.getLevels().catch(() => ({ levels: [] })),
        api.getRewards(address).catch(() => null),
      ]);
      setLevels(lv.levels || []);
      setCurrentLevel(rw?.level ?? 0);
      setRewards(rw);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <AppLayout title="My team">
        <div className="flex justify-center py-24 text-slate-400"><Spinner className="h-6 w-6" /></div>
      </AppLayout>
    );
  }

  const directCount = rewards?.directTeam ?? user?.directCount ?? 0;
  const teamCount = rewards?.totalTeam ?? user?.teamCount ?? 0;
  // Direct business = active directs × plan price ($5 each).
  const directBusiness = directCount * 5;

  return (
    <AppLayout title="My team">
      {/* ---------- Totals — Direct / My Team ---------- */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatTile icon={UserPlus} tone="text-amber-400" label="Direct team" value={directCount} sub="Directly referred" />
        <StatTile icon={Users} tone="text-fuchsia-400" label="My team" value={teamCount} sub="Direct + indirect" />
      </div>

      {/* ---------- Rewards roadmap (card slider) ---------- */}
      <h2 className="mt-6 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-slate-400">
        <Sparkles className="h-4 w-4 text-accent-400" /> Rewards roadmap
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        See what each level unlocks. Tap next to preview higher levels.
      </p>

      <LevelSlider
        levels={levels}
        currentLevel={currentLevel}
        directBusiness={directBusiness}
        teamCount={teamCount}
      />

      {/* ---------- View team tree ---------- */}
      <Link
        to="/team/tree"
        className="group mt-6 flex items-center gap-3 rounded-2xl border border-accent-500/30 bg-accent-500/[0.07] px-4 py-4 transition hover:border-accent-500/50 hover:bg-accent-500/10"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400">
          <Network className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-100">View your team tree</span>
          <span className="block text-xs text-slate-400">
            See your full downline — who joined under whom
          </span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-accent-400 transition group-hover:translate-x-0.5" />
      </Link>
    </AppLayout>
  );
}

/**
 * A one-card-at-a-time level viewer. Starts on the user's current level. "Next level"
 * slides in the card to the right; "Back" returns to the previous card. Locked levels
 * show a lock; the achieved current level shows a check.
 */
function LevelSlider({ levels, currentLevel, directBusiness, teamCount }) {
  // Index into levels[]. Default to the current level (or L1 if none yet).
  const startIdx = Math.max(
    0,
    levels.findIndex((l) => l.level === (currentLevel || 1))
  );
  const [idx, setIdx] = useState(startIdx === -1 ? 0 : startIdx);
  const [dir, setDir] = useState("right"); // slide-in direction

  useEffect(() => {
    setIdx(startIdx === -1 ? 0 : startIdx);
  }, [startIdx]);

  if (!levels.length) return null;

  const l = levels[idx];
  const achieved = currentLevel >= l.level;
  const isCurrent = currentLevel === l.level;
  const canPrev = idx > 0;
  const canNext = idx < levels.length - 1;

  function go(nextIdx, direction) {
    setDir(direction);
    setIdx(nextIdx);
  }

  return (
    <div className="mt-3">
      {/* Card viewport */}
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

            {/* Reward */}
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
                : "Unlock by hitting the targets below"}
            </p>

            {/* Requirements */}
            <div className="mt-4 space-y-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <Requirement
                label="Direct business"
                have={directBusiness}
                need={l.directBusiness}
                achieved={achieved}
                prefix="$"
              />
              <Requirement
                label="Total team"
                have={teamCount}
                need={l.team}
                achieved={achieved}
              />
            </div>

            {/* Status pill */}
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
          {canNext ? (
            <>
              Next level <ChevronRight className="h-4 w-4" />
            </>
          ) : (
            "Top level"
          )}
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
                i === idx
                  ? "w-5 bg-accent-400"
                  : done
                  ? "w-1.5 bg-emerald-500/60"
                  : "w-1.5 bg-white/15"
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

function StatTile({ icon: Icon, label, value, sub, tone = "text-accent-400" }) {
  return (
    <div className="rounded-xl border border-white/10 bg-navy-900/70 p-3 backdrop-blur transition hover:border-white/20">
      <div className="flex items-center gap-1.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5">
          {Icon && <Icon className={`h-3.5 w-3.5 ${tone}`} />}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </span>
      </div>
      <p className="mt-2 font-display text-xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-500">{sub}</p>}
    </div>
  );
}
