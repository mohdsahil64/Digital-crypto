import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Menu,
  X,
  LayoutDashboard,
  Users,
  ArrowDownToLine,
  ArrowLeftRight,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import { adminAuth } from "../../lib/adminApi.js";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/transfers", label: "Transfers", icon: ArrowLeftRight },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: ArrowDownToLine },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

export default function AdminLayout({ children, title, msg }) {
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const navigate = useNavigate();

  function doLogout() {
    adminAuth.clear();
    setConfirmLogout(false);
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent-400" />
            <span className="font-display text-base font-semibold">Admin Panel</span>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl">
        {/* Desktop sidebar */}
        <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-56 shrink-0 flex-col border-r border-white/10 px-3 py-4 lg:flex">
          <nav className="flex-1 space-y-1">
            {NAV.map((n) => <SideLink key={n.to} {...n} />)}
          </nav>
          <button
            onClick={() => setConfirmLogout(true)}
            className="mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 px-4 py-5 sm:py-6">
          {title && <h1 className="mb-4 font-display text-xl font-bold sm:text-2xl">{title}</h1>}
          {msg && (
            <p className="mb-4 break-all rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
              {msg}
            </p>
          )}
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-72 max-w-[80%] flex-col border-l border-white/10 bg-navy-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-accent-400" />
                <span className="font-display text-sm font-semibold">Admin</span>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {NAV.map((n) => <DrawerLink key={n.to} {...n} onClick={() => setOpen(false)} />)}
            </nav>
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

      {/* Logout confirm */}
      {confirmLogout && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-navy-900 p-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
              <LogOut className="h-6 w-6 text-red-400" />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold">Log out?</h3>
            <p className="mt-1 text-sm text-slate-400">You'll need to sign in again to access the panel.</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setConfirmLogout(false)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={doLogout} className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-400">
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SideLink({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
          isActive ? "bg-accent-500/15 text-accent-300" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
        }`
      }
    >
      <Icon className="h-4 w-4" /> {label}
    </NavLink>
  );
}

function DrawerLink({ to, label, icon: Icon, end, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
          isActive ? "bg-accent-500/15 text-accent-300" : "text-slate-300 hover:bg-white/5"
        }`
      }
    >
      <Icon className="h-4.5 w-4.5" /> {label}
    </NavLink>
  );
}
