import { useAccount, useDisconnect } from "wagmi";
import { Globe, LogOut } from "lucide-react";
import { Link } from "react-router-dom";

function short(addr) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";
}

export default function Navbar() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <Globe className="h-6 w-6 text-accent-400" />
          <span className="font-display text-lg font-semibold tracking-tight">
            Decentralized World
          </span>
        </Link>

        {/* Only show an account chip once connected. No "Connect Wallet" button —
            connecting happens through the Join flow. */}
        {isConnected && (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="font-mono text-xs text-slate-300">{short(address)}</span>
            <button
              onClick={() => disconnect()}
              className="ml-1 text-slate-400 hover:text-white"
              title="Disconnect"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
