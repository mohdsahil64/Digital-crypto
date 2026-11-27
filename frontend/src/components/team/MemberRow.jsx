import { useState } from "react";
import { BadgeCheck, Lock, Copy, CheckCheck } from "lucide-react";

/**
 * Shared member row used across Direct / Indirect / Global team pages.
 * Shows wallet address, joined date, copy-address button, and active/inactive badge.
 */
export default function MemberRow({ member }) {
  const [copied, setCopied] = useState(false);

  const short = `${member.walletAddress.slice(0, 6)}…${member.walletAddress.slice(-4)}`;
  const joined = member.joinedAt
    ? new Date(member.joinedAt).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  function copy(e) {
    e.stopPropagation();
    navigator.clipboard.writeText(member.walletAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-navy-900/70 px-3.5 py-3">
      {/* Left: avatar + address */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            member.hasInvested
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-white/5 text-slate-500"
          }`}
        >
          {member.walletAddress.slice(2, 4).toUpperCase()}
        </span>
        <div className="min-w-0">
          <span className="block font-mono text-sm text-slate-200">{short}</span>
          {joined && (
            <span className="block text-[10px] text-slate-500">Joined {joined}</span>
          )}
        </div>
      </div>

      {/* Right: copy + badge */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={copy}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
          title="Copy address"
        >
          {copied
            ? <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
            : <Copy className="h-3.5 w-3.5" />}
        </button>

        {member.hasInvested ? (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
            <BadgeCheck className="h-3.5 w-3.5" /> Active
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-500">
            <Lock className="h-3 w-3" /> Inactive
          </span>
        )}
      </div>
    </li>
  );
}
