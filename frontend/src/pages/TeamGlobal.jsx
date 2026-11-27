import { useEffect, useState, useCallback } from "react";
import { Globe, Copy, CheckCheck } from "lucide-react";
import AppLayout from "../components/AppLayout.jsx";
import Spinner from "../components/Spinner.jsx";
import MemberRow from "../components/team/MemberRow.jsx";
import { api } from "../lib/api.js";
import { useSession } from "../lib/session.jsx";

export default function TeamGlobal() {
  const { address } = useSession();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [root, setRoot] = useState(null);
  const [copied, setCopied] = useState(false);

  function copyRoot() {
    if (!root) return;
    navigator.clipboard.writeText(root).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const data = await api.getTeamGlobal(address);
      setMembers(data?.members ?? []);
      setRoot(data?.root ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { load(); }, [load]);

  const active   = members.filter((m) => m.hasInvested).length;
  const inactive = members.length - active;

  const rootShort = root
    ? `${root.slice(0, 6)}…${root.slice(-4)}`
    : null;

  return (
    <AppLayout title="Global team">
      <p className="-mt-2 mb-4 text-sm text-slate-400">
        Everyone in your organization line — from the founding member down.
      </p>

      {/* Root info */}
      {rootShort && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-sky-500/20 bg-sky-500/[0.07] px-3.5 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-medium text-sky-400 shrink-0">Line head</span>
            <span className="font-mono text-xs text-slate-200 truncate">{rootShort}</span>
          </div>
          <button
            onClick={copyRoot}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
            title="Copy address"
          >
            {copied
              ? <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
              : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}

      {/* Summary pills */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
          Total <strong className="text-slate-100">{members.length}</strong>
        </span>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
          Active <strong>{active}</strong>
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
          Inactive <strong>{inactive}</strong>
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Spinner className="h-6 w-6" /></div>
      ) : members.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-slate-500">
          No members in your organization line yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {members.map((m) => <MemberRow key={m.walletAddress} member={m} />)}
        </ul>
      )}

    </AppLayout>
  );
}
