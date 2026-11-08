import { X } from "lucide-react";

export default function Popup({ open, onClose, title, children, icon: Icon }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-navy-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-accent-400" />}
            <h3 className="font-display text-lg font-semibold">{title}</h3>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="text-sm text-slate-300">{children}</div>
      </div>
    </div>
  );
}
