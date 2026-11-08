import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Link2, Hash, Download, Users, Gift } from "lucide-react";
import AppLayout from "../components/AppLayout.jsx";
import Spinner from "../components/Spinner.jsx";
import CopyButton from "../components/CopyButton.jsx";
import WhatsAppIcon from "../components/icons/WhatsAppIcon.jsx";
import { api } from "../lib/api.js";
import { useSession } from "../lib/session.jsx";

export default function Refer() {
  const { address, user: sessionUser } = useSession();
  const [user, setUser] = useState(sessionUser);
  const [qr, setQr] = useState("");
  const [loading, setLoading] = useState(!sessionUser);

  useEffect(() => {
    if (sessionUser) { setUser(sessionUser); return; }
    (async () => {
      try {
        const { user: u } = await api.getUser(address);
        setUser(u);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, [address, sessionUser]);

  const code = user?.referralCode || "";
  const link = code ? `${window.location.origin}/?ref=${code}` : "";

  // WhatsApp share deep link (opens WhatsApp with a prefilled marketing message + link).
  // Uses only widely-supported emoji (older Unicode, no variation selectors) so they
  // never show up as blank boxes on older phones/WhatsApp versions.
  const waMessage =
    `🔥 Join me on Decentralized World 🔥\n\n` +
    `A simple, fully wallet-based Web3 platform on BSC. Here's why you'll love it:\n\n` +
    `✅ One-time 5 USDT plan — low entry, big potential\n` +
    `💰 Daily rewards that grow as your team grows\n` +
    `👥 Referral income up to 15 levels deep\n` +
    `🔒 100% wallet-based — no email, no password\n` +
    `⭐ Fast withdrawals straight to your wallet\n\n` +
    `👇 Get started with my referral link:\n${link}`;
  // Encode as UTF-8 so every emoji is transmitted intact.
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(waMessage)}`;

  useEffect(() => {
    if (!link) return;
    QRCode.toDataURL(link, {
      width: 360,
      margin: 1,
      color: { dark: "#0a1128", light: "#ffffff" },
    })
      .then(setQr)
      .catch(() => setQr(""));
  }, [link]);

  function downloadQr() {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr;
    a.download = `dw-referral-${code}.png`;
    a.click();
  }

  if (loading) {
    return (
      <AppLayout title="Refer & earn">
        <div className="flex justify-center py-24 text-slate-400"><Spinner className="h-6 w-6" /></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Refer & earn">
      <p className="-mt-2 mb-5 text-sm text-slate-400">
        Invite others with your code or link. When someone joins and activates the plan
        under you, your team grows.
      </p>

      {/* One clean card: QR on top (mobile) / left (desktop), details beside it */}
      <div className="card overflow-hidden p-0">
        <div className="flex flex-col md:flex-row">
          {/* QR panel */}
          <div className="flex flex-col items-center justify-center gap-3 border-b border-white/10 bg-white/[0.03] p-5 md:w-64 md:shrink-0 md:border-b-0 md:border-r">
            {qr ? (
              <img
                src={qr}
                alt="Referral QR code"
                className="h-44 w-44 rounded-2xl border border-white/10 bg-white p-2.5 sm:h-52 sm:w-52"
              />
            ) : (
              <div className="flex h-44 w-44 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-500 sm:h-52 sm:w-52">
                <Spinner className="h-5 w-5" />
              </div>
            )}
            <button onClick={downloadQr} className="btn-ghost w-full justify-center text-sm">
              <Download className="h-4 w-4" /> Download QR
            </button>
          </div>

          {/* Details panel */}
          <div className="flex-1 p-5">
            {/* Referral code */}
            <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
              <Hash className="h-3.5 w-3.5 text-accent-400" /> Referral code
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-white/10 bg-navy-950 px-3 py-2.5">
              <span className="flex-1 truncate font-mono text-base font-semibold tracking-wide text-slate-100">
                {code}
              </span>
              <CopyButton value={code} variant="icon" />
            </div>

            {/* Referral link */}
            <label className="mt-4 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
              <Link2 className="h-3.5 w-3.5 text-accent-400" /> Referral link
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-white/10 bg-navy-950 px-3 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm text-slate-300">{link}</span>
              <CopyButton value={link} variant="icon" />
            </div>

            {/* Actions: share on WhatsApp + copy link */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#20bd5a] active:scale-[0.98]"
              >
                <WhatsAppIcon className="h-4 w-4" /> WhatsApp
              </a>
              <CopyButton value={link} label="Copy link" className="w-full justify-center" />
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="card flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-500/15 text-accent-400">
            <Users className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-100">Share your code</p>
            <p className="mt-0.5 text-xs text-slate-400">
              They enter it (or open your link) and connect a wallet to join.
            </p>
          </div>
        </div>
        <div className="card flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-500/15 text-accent-400">
            <Gift className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-100">Grow your team</p>
            <p className="mt-0.5 text-xs text-slate-400">
              Once they activate the plan, they count toward your direct and team totals.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
