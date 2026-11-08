export default function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-accent-400" />}
        <span className="stat-label">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}
