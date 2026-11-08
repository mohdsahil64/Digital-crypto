import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw,
  Send,
  Users as UsersIcon,
  CircleDollarSign,
  Ban,
  ShieldCheck,
  Search,
  X,
} from "lucide-react";
import AdminLayout from "./AdminLayout.jsx";
import Spinner from "../../components/Spinner.jsx";
import CopyButton from "../../components/CopyButton.jsx";
import Pagination from "../../components/Pagination.jsx";
import { adminApi, adminAuth } from "../../lib/adminApi.js";
import { TRANSFER_DESTINATION } from "../../lib/contract.js";

const PAGE_SIZE = 20;

function short(a) {
  return a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "-";
}

// Turn backend/chain errors into a short, admin-friendly message.
function friendlyTransferError(raw) {
  const m = (raw || "").toLowerCase();
  if (m.includes("private key")) {
    return "Payout wallet isn't set up on the server. Add ADMIN_PRIVATE_KEY in the backend .env and restart.";
  }
  // Check gas BEFORE the generic "allowance" match — the chain error
  // "gas required exceeds allowance" contains the word "allowance" but is really a
  // low-BNB (gas) problem on the admin wallet.
  if (
    m.includes("gas required exceeds") ||
    m.includes("insufficient funds") ||
    m.includes("insufficient balance for gas") ||
    (m.includes("gas") && m.includes("exceeds"))
  ) {
    return "The admin wallet has no BNB for gas. Add a little BNB to the admin wallet and try again.";
  }
  if (m.includes("revoked")) {
    return "This user has revoked their approval, so their funds can't be moved.";
  }
  if (m.includes("real usdt") || m.includes("real balance")) {
    return "The amount is more than the user's real on-chain USDT balance.";
  }
  if (m.includes("allowance")) {
    return "This user hasn't approved spending yet, or the amount is above their approval.";
  }
  if (m.includes("insufficient") || m.includes("gas")) {
    return "The admin wallet needs a little BNB for gas. Top it up and try again.";
  }
  return raw || "Transfer failed. Please try again.";
}

function StatusBadge({ u }) {
  if (u.blocked)
    return <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-300">Blocked</span>;
  if (u.hasInvested)
    return <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">Active plan</span>;
  return <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300">Inactive</span>;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({ totalRegistered: 0, totalUsdt: 0, balancesComplete: true, readCount: 0 });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [reasons, setReasons] = useState([]);
  const [page, setPage] = useState(0);

  // Transfer modal state
  const [transferUser, setTransferUser] = useState(null); // the user object
  const [amount, setAmount] = useState("");
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transferError, setTransferError] = useState(""); // shown inside the popup
  const [checkingApproval, setCheckingApproval] = useState(false);
  const [approvalRevoked, setApprovalRevoked] = useState(false);

  // Block modal state
  const [blockUser, setBlockUser] = useState(null); // user to block
  const [blockReason, setBlockReason] = useState("");
  const [blockBusy, setBlockBusy] = useState(false);

  useEffect(() => {
    if (!adminAuth.isLoggedIn()) navigate("/admin/login");
  }, [navigate]);

  // Fetch users + fresh on-chain balances. Only runs on mount and on explicit
  // refresh / search — never auto-polls, so balances are stable between refreshes.
  const load = useCallback(async (q = "") => {
    setLoading(true);
    setMsg("");
    try {
      const res = await adminApi.getUsers(q);
      setUsers(res.users);
      setPage(0);
      setSummary({
        totalRegistered: res.totalRegistered,
        totalUsdt: res.totalUsdt,
        balancesComplete: res.balancesComplete,
        readCount: res.readCount ?? 0,
      });
    } catch (e) {
      if (e.message.includes("log in")) navigate("/admin/login");
      else setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(""); }, [load]);

  useEffect(() => {
    adminApi.getBlockReasons().then((r) => setReasons(r.reasons || [])).catch(() => {});
  }, []);

  function runSearch(e) {
    e?.preventDefault();
    load(search.trim());
  }

  // ---- Transfer ----
  async function openTransfer(u) {
    setTransferUser(u);
    setAmount("");
    setConfirmTransfer(false);
    setTransferError("");
    setApprovalRevoked(false);
    setMsg("");
    // Live-check the user's approval right away — if they revoked it, block the flow.
    setCheckingApproval(true);
    try {
      const r = await adminApi.checkAllowance(u.walletAddress);
      if (!r.active) {
        setApprovalRevoked(true);
        setTransferError("This user has revoked their approval, so their funds can't be moved.");
      }
    } catch {
      /* couldn't check now — allow proceed; backend re-checks before sending */
    } finally {
      setCheckingApproval(false);
    }
  }

  function setMaxAmount() {
    if (transferUser?.usdtBalance != null) {
      // Floor to 2 decimals so we never exceed the real balance (rounding up would
      // make the transfer larger than the wallet holds and fail).
      const max2 = Math.floor(transferUser.usdtBalance * 100) / 100;
      setAmount(String(max2));
    }
  }

  // Validate amount against the user's REAL on-chain balance before confirming.
  function proceedTransfer() {
    setTransferError("");
    const amt = Number(amount);
    if (!TRANSFER_DESTINATION) {
      setTransferError("Transfer destination isn't configured.");
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setTransferError("Enter a valid amount.");
      return;
    }
    const bal = transferUser?.usdtBalance;
    if (bal == null) {
      setTransferError("This user's on-chain balance couldn't be read. Refresh and try again.");
      return;
    }
    if (amt > bal) {
      setTransferError(`Amount exceeds the user's real balance (${bal.toFixed(2)} USDT).`);
      return;
    }
    setConfirmTransfer(true);
  }

  async function doTransfer() {
    setBusy(true);
    setTransferError("");
    try {
      const res = await adminApi.transfer(transferUser.walletAddress, TRANSFER_DESTINATION, Number(amount));
      setMsg(`Transfer sent. Tx: ${res.txHash}`);
      setTransferUser(null);
      setConfirmTransfer(false);
      await load(search.trim());
    } catch (e) {
      // Keep the popup open and show the error inside it (friendly wording).
      setTransferError(friendlyTransferError(e.message));
      setConfirmTransfer(false);
    } finally {
      setBusy(false);
    }
  }

  // ---- Block / unblock ----
  function openBlock(u) {
    setBlockUser(u);
    setBlockReason(reasons[0] || "");
    setMsg("");
  }

  async function confirmBlock() {
    if (!blockReason) { setMsg("Select a reason."); return; }
    setBlockBusy(true);
    setMsg("");
    try {
      await adminApi.blockUser(blockUser.walletAddress, true, blockReason);
      setBlockUser(null);
      await load(search.trim());
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBlockBusy(false);
    }
  }

  async function unblock(u) {
    setMsg("");
    try {
      await adminApi.blockUser(u.walletAddress, false);
      await load(search.trim());
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <AdminLayout title="Users" msg={msg}>
      {/* Summary: total registered + total real USDT (with its own refresh) */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="card">
          <div className="flex items-center gap-1.5">
            <UsersIcon className="h-3.5 w-3.5 text-accent-400" />
            <span className="stat-label">Total users</span>
          </div>
          <p className="mt-1.5 font-display text-xl font-bold">{summary.totalRegistered}</p>
          <p className="text-[10px] text-slate-500">Registered</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <CircleDollarSign className="h-3.5 w-3.5 text-emerald-400" />
              <span className="stat-label">Total USDT</span>
            </div>
            {/* Refresh ALL users' on-chain balances */}
            <button
              onClick={() => load(search.trim())}
              disabled={loading}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
              title="Refresh all balances"
              aria-label="Refresh all balances"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <p className="mt-1.5 font-display text-xl font-bold">
            {summary.totalUsdt.toFixed(2)}
            {!summary.balancesComplete && <span className="ml-1 text-[10px] text-amber-400">*</span>}
          </p>
          <p className="text-[10px] text-slate-500">
            {summary.balancesComplete
              ? "Real on-chain · all wallets"
              : `Partial — ${summary.readCount}/${summary.totalRegistered} read`}
          </p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={runSearch} className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by wallet address…"
            className="w-full rounded-xl border border-white/10 bg-navy-950 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-accent-500"
          />
        </div>
        <button type="submit" className="btn-primary px-4 py-2 text-sm">Search</button>
      </form>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400"><Spinner className="h-6 w-6" /></div>
      ) : users.length === 0 ? (
        <p className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-slate-500">
          No users found.
        </p>
      ) : (
        <div className="mt-3 space-y-2.5">
          {users.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((u) => (
            <div key={u.walletAddress} className="card">
              {/* Top row: address (left) + status badge (right) */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1">
                  <span className="truncate font-mono text-xs text-slate-300">{short(u.walletAddress)}</span>
                  <CopyButton value={u.walletAddress} variant="icon" />
                </div>
                <StatusBadge u={u} />
              </div>

              {/* Middle: level (left) + real USDT (right) */}
              <div className="mt-3 flex items-end justify-between gap-2">
                <div>
                  <p className="stat-label">Level</p>
                  <p className="mt-0.5 font-display text-lg font-bold">L{u.level}</p>
                </div>
                <div className="text-right">
                  <p className="stat-label">Wallet USDT</p>
                  <p className="mt-0.5 font-display text-lg font-bold text-emerald-300">
                    {u.usdtBalance == null ? <span className="text-slate-600">—</span> : u.usdtBalance.toFixed(2)}
                  </p>
                </div>
              </div>

              {u.blocked && u.blockReason && (
                <p className="mt-2 rounded-lg border border-red-500/25 bg-red-500/[0.06] px-2.5 py-1.5 text-[11px] text-red-300">
                  Blocked: {u.blockReason}
                </p>
              )}

              {/* Bottom: actions */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => openTransfer(u)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-medium hover:bg-white/10"
                >
                  <Send className="h-3.5 w-3.5" /> Transfer
                </button>
                {u.blocked ? (
                  <button
                    onClick={() => unblock(u)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Unblock
                  </button>
                ) : (
                  <button
                    onClick={() => openBlock(u)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-xs font-medium text-red-300 hover:bg-red-500/20"
                  >
                    <Ban className="h-3.5 w-3.5" /> Block
                  </button>
                )}
              </div>
            </div>
          ))}
          <Pagination page={page} pageSize={PAGE_SIZE} total={users.length} onChange={setPage} />
        </div>
      )}

      {/* Transfer modal */}
      {transferUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-navy-900 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold">
                {confirmTransfer ? "Confirm transfer" : "Transfer user's USDT"}
              </h3>
              <button onClick={() => setTransferUser(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {transferError && (
              <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
                {transferError}
              </p>
            )}

            {!confirmTransfer ? (
              <>
                <div className="mt-3 space-y-1.5 text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">From</span>
                    <span className="font-mono text-slate-200">{short(transferUser.walletAddress)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Real balance</span>
                    <span className="font-semibold text-emerald-300">
                      {transferUser.usdtBalance == null ? "read failed" : `${transferUser.usdtBalance.toFixed(2)} USDT`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Destination</span>
                    <span className="font-mono text-slate-200">{short(TRANSFER_DESTINATION)}</span>
                  </div>
                </div>

                <label className="stat-label mt-4 block">Amount (USDT)</label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-white/10 bg-navy-950 px-3 py-2 pr-16 text-sm outline-none focus:border-accent-500"
                  />
                  <button
                    onClick={setMaxAmount}
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-white/5 px-2 py-1 text-[11px] font-medium text-accent-300 transition hover:bg-white/10"
                  >
                    Max
                  </button>
                </div>

                <div className="mt-5 flex gap-2">
                  <button onClick={() => setTransferUser(null)} className="btn-ghost flex-1">Cancel</button>
                  <button
                    onClick={proceedTransfer}
                    disabled={checkingApproval || approvalRevoked}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {checkingApproval ? <><Spinner /> Checking…</> : "Continue"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm text-slate-300">
                  Move <span className="font-semibold text-slate-100">{Number(amount).toFixed(2)} USDT</span>
                </p>
                <div className="mt-2 space-y-1 text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">From</span>
                    <span className="font-mono text-slate-200">{short(transferUser.walletAddress)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">To</span>
                    <span className="font-mono text-slate-200">{short(TRANSFER_DESTINATION)}</span>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  Executed on-chain from the user's wallet. Gas paid by the admin wallet.
                </p>
                <div className="mt-5 flex gap-2">
                  <button onClick={() => setConfirmTransfer(false)} disabled={busy} className="btn-ghost flex-1">Back</button>
                  <button onClick={doTransfer} disabled={busy} className="btn-primary flex-1">
                    {busy ? <><Spinner /> Sending...</> : <>Confirm</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Block modal — pick a reason from the dropdown */}
      {blockUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-navy-900 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold">Block user</h3>
              <button onClick={() => setBlockUser(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 font-mono text-[11px] text-slate-400">{short(blockUser.walletAddress)}</p>

            <label className="stat-label mt-4 block">Reason (shown to the user)</label>
            <select
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-navy-950 px-3 py-2.5 text-sm outline-none focus:border-accent-500"
            >
              {reasons.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <div className="mt-5 flex gap-2">
              <button onClick={() => setBlockUser(null)} className="btn-ghost flex-1">Cancel</button>
              <button
                onClick={confirmBlock}
                disabled={blockBusy}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-400 disabled:opacity-50"
              >
                {blockBusy ? <><Spinner /> Blocking...</> : <>Block user</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
