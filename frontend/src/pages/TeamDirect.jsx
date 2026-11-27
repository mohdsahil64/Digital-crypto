import { useEffect, useState, useCallback } from "react";
import { UserPlus } from "lucide-react";
import AppLayout from "../components/AppLayout.jsx";
import Spinner from "../components/Spinner.jsx";
import MemberRow from "../components/team/MemberRow.jsx";
import { api } from "../lib/api.js";
import { useSession } from "../lib/session.jsx";

export default function TeamDirect() {
  const { address } = useSession();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const tm = await api.getTeam(address);
      setMembers(tm?.directReferrals ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { load(); }, [load]);

  const active   = members.filter((m) => m.hasInvested).length;
  const inactive = members.length - active;

  return (
    <AppLayout title="Direct referrals">
      <p className="-mt-2 mb-4 text-sm text-slate-400">
        People who joined using your referral code or link.
      </p>

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
          No direct referrals yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {members.map((m) => <MemberRow key={m.walletAddress} member={m} />)}
        </ul>
      )}

    </AppLayout>
  );
}
