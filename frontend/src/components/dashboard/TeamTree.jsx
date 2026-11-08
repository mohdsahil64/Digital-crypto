import { Users } from "lucide-react";

function short(addr) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";
}

function TreeNode({ node, depth = 0 }) {
  return (
    <div className={depth > 0 ? "ml-4 border-l border-white/10 pl-4" : ""}>
      <div className="flex items-center gap-2 py-1 text-sm">
        <Users className="h-3.5 w-3.5 text-accent-400" />
        <span className="font-mono text-slate-300">{short(node.address)}</span>
      </div>
      {node.children?.map((c, i) => (
        <TreeNode key={i} node={c} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function TeamTree({ tree, directReferrals }) {
  return (
    <div className="card">
      <h3 className="font-display text-lg font-semibold">Team / Tree view</h3>
      <p className="mt-1 text-sm text-slate-400">
        {directReferrals.length} direct referral{directReferrals.length === 1 ? "" : "s"}
      </p>
      <div className="mt-4 overflow-x-auto">
        {tree ? <TreeNode node={tree} /> : <p className="text-sm text-slate-500">No team yet.</p>}
      </div>
    </div>
  );
}
