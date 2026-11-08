import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Network,
  ChevronDown,
  ChevronRight,
  CircleUser,
  CheckCircle2,
  Circle,
  ArrowLeft,
} from "lucide-react";
import AppLayout from "../components/AppLayout.jsx";
import Spinner from "../components/Spinner.jsx";
import CopyButton from "../components/CopyButton.jsx";
import { api } from "../lib/api.js";
import { useSession } from "../lib/session.jsx";

function short(a) {
  return a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "-";
}

export default function TeamTree() {
  const { address } = useSession();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState(null);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const tm = await api.getTeam(address);
      setTree(tm.tree);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { load(); }, [load]);

  return (
    <AppLayout title="Team tree" showBack={false}>
      {/* Back */}
      <button
        onClick={() => navigate("/team")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 transition hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" /> Back to team
      </button>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Active member
        </span>
        <span className="inline-flex items-center gap-1">
          <Circle className="h-3.5 w-3.5 text-slate-500" /> Inactive member
        </span>
      </div>

      {/* Tree */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-navy-900/70 p-3 backdrop-blur sm:p-4">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-accent-400" />
          <h3 className="font-display text-sm font-semibold">Your downline</h3>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          Tap a row to expand who joined under it. Use the copy icon to copy the full
          address.
        </p>

        {loading ? (
          <div className="flex justify-center py-16 text-slate-400">
            <Spinner className="h-6 w-6" />
          </div>
        ) : tree ? (
          <div className="mt-3">
            <TreeNode node={tree} isRoot depth={0} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No team yet. Invite people to grow your tree.</p>
        )}
      </div>
    </AppLayout>
  );
}

function TreeNode({ node, isRoot = false, depth = 0 }) {
  const hasKids = node.children && node.children.length > 0;
  const [open, setOpen] = useState(depth < 1); // auto-expand only the first level

  return (
    <div className={depth > 0 ? "ml-2 border-l border-white/10 pl-2" : ""}>
      {/* Row — full width, tap anywhere to expand */}
      <div
        onClick={() => hasKids && setOpen((o) => !o)}
        className={`my-1 flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
          hasKids ? "cursor-pointer" : ""
        } ${
          isRoot
            ? "border-accent-500/40 bg-accent-500/15"
            : node.invested
            ? "border-emerald-500/25 bg-emerald-500/[0.06]"
            : "border-white/10 bg-white/[0.03]"
        }`}
      >
        {/* Expand chevron */}
        {hasKids ? (
          open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          )
        ) : (
          <span className="h-3.5 w-3.5 shrink-0" />
        )}

        {/* Avatar dot */}
        <CircleUser
          className={`h-4 w-4 shrink-0 ${
            isRoot ? "text-accent-300" : node.invested ? "text-emerald-400" : "text-slate-500"
          }`}
        />

        {/* Address (truncates on small screens) */}
        <span
          className={`min-w-0 flex-1 truncate font-mono text-[11px] ${
            isRoot ? "text-accent-200" : "text-slate-200"
          }`}
        >
          {isRoot ? "You" : short(node.address)}
        </span>

        {/* Status dot (compact — full label only ≥ sm) */}
        {!isRoot && (
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
              node.invested
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-slate-500/15 text-slate-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                node.invested ? "bg-emerald-400" : "bg-slate-500"
              }`}
            />
            <span className="hidden sm:inline">{node.invested ? "Active" : "Inactive"}</span>
          </span>
        )}

        {/* Child count */}
        {hasKids && (
          <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-slate-400">
            {node.children.length}
          </span>
        )}

        {/* Copy (stops row toggle) */}
        {!isRoot && (
          <span onClick={(e) => e.stopPropagation()} className="shrink-0">
            <CopyButton value={node.address} variant="icon" />
          </span>
        )}
      </div>

      {/* Children */}
      {hasKids && open && (
        <div>
          {node.children.map((c, i) => (
            <TreeNode key={c.address || i} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
