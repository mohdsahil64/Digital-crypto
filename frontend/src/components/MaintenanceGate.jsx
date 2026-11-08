import { useEffect, useState } from "react";
import { Wrench, Globe } from "lucide-react";
import { api } from "../lib/api.js";

export default function MaintenanceGate({ children }) {
  const [state, setState] = useState({ loading: true, maintenance: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const h = await api.health();
        if (!cancelled) setState({ loading: false, maintenance: Boolean(h.maintenanceMode) });
      } catch {
        // If health can't be reached, don't hard-block the UI.
        if (!cancelled) setState({ loading: false, maintenance: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.loading) {
    return <div className="min-h-screen bg-navy-950" />;
  }

  if (state.maintenance) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-accent-500/40 bg-accent-500/10">
          <Wrench className="h-8 w-8 text-accent-400" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold sm:text-3xl">
          We'll be right back
        </h1>
        <p className="mt-3 max-w-sm text-sm text-slate-400">
          Decentralized World is under maintenance. Please check back shortly.
        </p>
        <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
          <Globe className="h-3.5 w-3.5 text-accent-400" /> Decentralized World
        </div>
      </div>
    );
  }

  return children;
}
