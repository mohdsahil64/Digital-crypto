import { Link } from "react-router-dom";
import { Globe } from "lucide-react";

export const LEGAL_LINKS = [
  { to: "/legal/privacy", label: "Privacy Policy" },
  { to: "/legal/terms", label: "Terms of Service" },
  { to: "/legal/risk", label: "Risk Disclaimer" },
  { to: "/legal/refund", label: "USDT & Refund Policy" },
];

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-10 border-t border-white/10 bg-navy-950/60">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-accent-400" />
          <span className="font-display text-sm font-semibold">Decentralized World</span>
        </div>

        {/* Legal links — wrap/stack cleanly on mobile */}
        <nav className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
          {LEGAL_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-xs text-slate-400 transition hover:text-slate-200"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="mt-4 text-[11px] leading-relaxed text-slate-600">
          © {year} Decentralized World. Digital assets carry risk. Nothing here is
          financial advice, and no earnings are guaranteed.
        </p>
      </div>
    </footer>
  );
}
