export default function HistoryList({ title, items, empty, renderItem }) {
  return (
    <div className="card">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-white/5">
          {items.map((item, i) => (
            <li key={i} className="py-2.5">
              {renderItem(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
