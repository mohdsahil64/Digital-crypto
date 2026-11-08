import { useState } from "react";
import { Copy, Check } from "lucide-react";

/**
 * Small inline copy control. `variant="icon"` renders just the icon (used next to
 * wallet addresses); default renders an icon + label button.
 */
export default function CopyButton({ value, label = "Copy", variant = "button", className = "" }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  if (variant === "icon") {
    return (
      <button
        onClick={copy}
        aria-label="Copy"
        className={`inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200 ${className}`}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    );
  }

  return (
    <button onClick={copy} className={`btn-ghost text-sm ${className}`}>
      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied" : label}
    </button>
  );
}
