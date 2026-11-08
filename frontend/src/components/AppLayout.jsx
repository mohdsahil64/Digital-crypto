import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Globe,
  Menu,
  X,
  LayoutDashboard,
  Share2,
  Users,
  ArrowDownToLine,
  History,
  LogOut,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { useSession } from "../lib/session.jsx";
import Footer, { LEGAL_LINKS } from "./Footer.jsx";
import Seo from "./Seo.jsx";
import ApprovalGuard from "./ApprovalGuard.jsx";

// Per-page descriptions for the logged-in app. Keyed by the AppLayout `title`.
const PAGE_DESCRIPTIONS = {
  Dashboard: "Your Decentralized World dashboard — rewards, level, and team at a glance.",
  "Refer & earn": "Share your referral link and grow your team on Decentralized World.",
  "My team": "View your direct referrals, team size, and level progress.",
  "Team tree": "Explore your full downline tree — active and inactive members.",
  Withdraw: "Request a withdrawal of your earned rewards.",
  History: "Your rewards and withdrawal history on Decentralized World.",
  Invest: "Activate your plan and start earning daily rewards.",
};

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/refer", label: "Refer", icon: Share2 },
  { to: "/team", label: "Team", icon: Users },
  { to: "/withdraw", label: "Withdraw", icon: ArrowDownToLine },
  { to: "/history", label: "History", icon: History },
];

function short(a) {
  return a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "";
}

export default function AppLayout({ children, title, showBack = true, backTo }) {
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const { address, logout } = useSession();
  const navigate = useNavigate();

  function doLogout() {
    logout();
    setConfirmLogout(false);
    navigate("/", { replace: true });
  }

  function goBack() {
    if (backTo) navigate(backTo);
    else if (window.history.length > 1) navigate(-1);
    else navigate("/dashboard");
  }

  return (
    <ApprovalGuard>
    <div className="min-h-screen bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950">
      <Seo
        title={title || "Dashboard"}
        description={
          PAGE_DESCRIPTIONS[title] ||
          "Your wallet-based Web3 account on Decentralized World."
        }
        noindex
      />

      {/* Header — no logout here (moved into nav). */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-accent-400" />
            <span className="font-display text-base font-semibold tracking-tight">
              Decentralized World
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="font-mono text-xs text-slate-300">{short(address)}</span>
            </span>
            {/* Hamburger — mobile + tablet */}
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl">
        {/* Desktop sidebar */}
        <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-56 shrink-0 flex-col border-r border-white/10 px-3 py-4 lg:flex">
          <nav className="flex-1 space-y-1">
            {NAV.map((n) => (
              <SideLink key={n.to} {...n} />
            ))}
          </nav>
          <button
            onClick={() => setConfirmLogout(true)}
            className="mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </aside>

        {/* Main content + footer */}
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 px-4 py-5 sm:py-6">
            {showBack && (
              <button
                onClick={goBack}
                className="mb-3 inline-flex items-center gap-1 text-sm text-slate-400 transition hover:text-slate-200"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            )}
            {title && <h1 className="mb-4 font-display text-xl font-bold sm:text-2xl">{title}</h1>}
            {children}
          </main>
          <Footer />
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-72 max-w-[80%] flex-col border-l border-white/10 bg-navy-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-accent-400" />
                <span className="font-display text-sm font-semibold">Menu</span>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-white/10 px-4 py-3">
              <p className="stat-label">Wallet</p>
              <p className="mt-0.5 font-mono text-xs text-slate-300">{short(address)}</p>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {NAV.map((n) => (
                <DrawerLink key={n.to} {...n} onClick={() => setOpen(false)} />
              ))}

              {/* Legal links */}
              <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Legal
              </p>
              {LEGAL_LINKS.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                      isActive ? "bg-accent-500/15 text-accent-300" : "text-slate-400 hover:bg-white/5"
                    }`
                  }
                >
                  <FileText className="h-4 w-4" /> {l.label}
                </NavLink>
              ))}
            </nav>

            {/* Logout pinned to the bottom of the mobile nav */}
            <div className="border-t border-white/10 p-3">
              <button
                onClick={() => { setOpen(false); setConfirmLogout(true); }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout confirmation popup — simple, minimal */}
      {confirmLogout && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xs rounded-xl border border-white/10 bg-navy-900 p-5">
            <h3 className="font-display text-base font-semibold">Log out?</h3>
            <p className="mt-1 text-sm text-slate-400">
              You'll need to reconnect your wallet to sign back in.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirmLogout(false)} className="btn-ghost text-sm">
                Cancel
              </button>
              <button
                onClick={doLogout}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/15"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ApprovalGuard>
  );
}

function SideLink({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
          isActive
            ? "bg-accent-500/15 text-accent-300"
            : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
        }`
      }
    >
      <Icon className="h-4 w-4" /> {label}
    </NavLink>
  );
}

function DrawerLink({ to, label, icon: Icon, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
          isActive
            ? "bg-accent-500/15 text-accent-300"
            : "text-slate-300 hover:bg-white/5"
        }`
      }
    >
      <Icon className="h-4.5 w-4.5" /> {label}
    </NavLink>
  );
}
