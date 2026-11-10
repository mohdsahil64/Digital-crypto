import { Link } from "react-router-dom";
import {
  Globe,
  Wallet,
  Zap,
  TrendingUp,
  Banknote,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Star,
  UserPlus,
  Clock,
  Lock,
  ChevronRight,
  CircleDollarSign,
  Network,
  Smartphone,
  Trophy,
  Rocket,
} from "lucide-react";
import Footer from "../components/Footer.jsx";
import Seo from "../components/Seo.jsx";

const LEVELS = [
  { level: 1,  direct: 20,   team: 10,      daily: 0.25  },
  { level: 2,  direct: 30,   team: 25,      daily: 0.5   },
  { level: 3,  direct: 50,   team: 100,     daily: 1     },
  { level: 4,  direct: 75,   team: 250,     daily: 3     },
  { level: 5,  direct: 100,  team: 750,     daily: 5     },
  { level: 6,  direct: 150,  team: 2000,    daily: 15    },
  { level: 7,  direct: 200,  team: 5000,    daily: 25    },
  { level: 8,  direct: 250,  team: 15000,   daily: 50    },
  { level: 9,  direct: 300,  team: 25000,   daily: 100   },
  { level: 10, direct: 400,  team: 50000,   daily: 250   },
  { level: 11, direct: 500,  team: 100000,  daily: 500   },
  { level: 12, direct: 600,  team: 200000,  daily: 1000  },
  { level: 13, direct: 700,  team: 300000,  daily: 2000  },
  { level: 14, direct: 800,  team: 500000,  daily: 4000  },
  { level: 15, direct: 900,  team: 750000,  daily: 7000  },
  { level: 16, direct: 1000, team: 1000000, daily: 10000 },
];

// Wallet icons — using reliable CDN / data URIs as fallback
const WALLETS = [
  {
    name: "Trust Wallet",
    bg: "bg-blue-500/15",
    border: "border-blue-500/30",
    icon: (
      <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none">
        <path d="M24 4L8 10v14c0 10 7 19 16 22 9-3 16-12 16-22V10L24 4z" fill="#3375BB"/>
        <path d="M24 4L8 10v14c0 10 7 19 16 22V4z" fill="#3375BB"/>
        <path d="M24 4L8 10v14c0 10 7 19 16 22 9-3 16-12 16-22V10L24 4z" fill="url(#tw)" fillOpacity="0.3"/>
        <defs><linearGradient id="tw" x1="8" y1="4" x2="40" y2="46" gradientUnits="userSpaceOnUse"><stop stopColor="#fff"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></linearGradient></defs>
      </svg>
    ),
  },
  {
    name: "MetaMask",
    bg: "bg-orange-500/15",
    border: "border-orange-500/30",
    icon: (
      <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none">
        <path d="M42 6L27 17.5l2.8-6.6L42 6z" fill="#E2761B" stroke="#E2761B" strokeWidth="0.5"/>
        <path d="M6 6l14.8 11.6-2.6-6.7L6 6z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5"/>
        <path d="M36.5 32.5l-4 6.1 8.5 2.4 2.5-8.3-7-.2zM4.5 32.7l2.4 8.3 8.5-2.4-4-6.1-6.9.2z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5"/>
        <path d="M14.9 21l-2.4 3.6 8.5.4-.3-9.1L14.9 21zm18.2 0-5.9-5.2-.4 9.2 8.5-.4L33.1 21z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5"/>
        <path d="M15.4 38.6l5.1-2.5-4.4-3.4-.7 5.9zm12.1-2.5 5.1 2.5-.8-5.9-4.3 3.4z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5"/>
        <circle cx="24" cy="22" r="10" fill="#E4761B" fillOpacity="0.2"/>
      </svg>
    ),
  },
  {
    name: "Binance Web3",
    bg: "bg-yellow-500/15",
    border: "border-yellow-500/30",
    icon: (
      <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none">
        <rect width="48" height="48" rx="12" fill="#F3BA2F" fillOpacity="0.15"/>
        <path d="M24 10l3.6 3.6-9.6 9.6-3.6-3.6L24 10zM14.4 19.6l3.6 3.6-3.6 3.6L10.8 23.2l3.6-3.6zM33.6 19.6l3.6 3.6-3.6 3.6-3.6-3.6 3.6-3.6zM24 29.2l3.6 3.6-9.6 9.6-3.6-3.6 9.6-9.6z" fill="#F3BA2F"/>
        <path d="M24 19.6l3.6 3.6-3.6 3.6-3.6-3.6L24 19.6z" fill="#F3BA2F"/>
      </svg>
    ),
  },
  {
    name: "OKX Wallet",
    bg: "bg-slate-500/15",
    border: "border-slate-500/30",
    icon: (
      <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none">
        <rect width="48" height="48" rx="12" fill="#fff" fillOpacity="0.08"/>
        <rect x="10" y="10" width="12" height="12" rx="2" fill="white"/>
        <rect x="26" y="10" width="12" height="12" rx="2" fill="white"/>
        <rect x="10" y="26" width="12" height="12" rx="2" fill="white"/>
        <rect x="26" y="26" width="12" height="12" rx="2" fill="white"/>
      </svg>
    ),
  },
  {
    name: "TokenPocket",
    bg: "bg-blue-400/15",
    border: "border-blue-400/30",
    icon: (
      <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none">
        <rect width="48" height="48" rx="12" fill="#2980FE" fillOpacity="0.15"/>
        <path d="M12 14h24v4H12zM12 22h16v4H12zM12 30h20v4H12z" fill="#2980FE"/>
        <circle cx="34" cy="32" r="6" fill="#2980FE"/>
        <path d="M32 32l1.5 1.5L36 30" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    name: "SafePal",
    bg: "bg-indigo-500/15",
    border: "border-indigo-500/30",
    icon: (
      <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none">
        <rect width="48" height="48" rx="12" fill="#1A56E8" fillOpacity="0.15"/>
        <path d="M24 8l-14 7v11c0 8 6 15 14 18 8-3 14-10 14-18V15L24 8z" fill="#1A56E8" fillOpacity="0.3" stroke="#1A56E8" strokeWidth="1.5"/>
        <path d="M19 24l3 3 7-7" stroke="#1A56E8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

const STEPS = [
  {
    num: "01", icon: Smartphone, color: "text-blue-400",
    bg: "bg-blue-500/10", border: "border-blue-500/20",
    title: "Install a Crypto Wallet",
    points: [
      "Download Trust Wallet, MetaMask, or any BSC-supported wallet",
      "Create a new wallet — save your seed phrase safely offline",
      "Get 5 USDT + small BNB for gas fees into your wallet",
    ],
  },
  {
    num: "02", icon: Wallet, color: "text-accent-400",
    bg: "bg-accent-500/10", border: "border-accent-500/20",
    title: "Connect & Register",
    points: [
      "Open decentralizeed.site in your wallet's built-in browser",
      "Tap 'Join Now' — approve a free signature (no USDT charged)",
      "Enter your referrer's invite code to link with your upline",
    ],
  },
  {
    num: "03", icon: Zap, color: "text-emerald-400",
    bg: "bg-emerald-500/10", border: "border-emerald-500/20",
    title: "Activate Your Plan ($5)",
    points: [
      "Pay a one-time 5 USDT plan activation fee",
      "No monthly or recurring charges — ever",
      "Account goes ACTIVE instantly after the transaction confirms",
    ],
  },
  {
    num: "04", icon: UserPlus, color: "text-fuchsia-400",
    bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/20",
    title: "Build Your Team",
    points: [
      "Share your unique referral link with friends & family",
      "You can directly refer up to 15 members",
      "Only active members (who paid $5) count toward your business",
    ],
  },
  {
    num: "05", icon: TrendingUp, color: "text-amber-400",
    bg: "bg-amber-500/10", border: "border-amber-500/20",
    title: "Unlock Reward Levels",
    points: [
      "Levels unlock automatically as your team grows",
      "Two conditions: Direct Business ($) + Total Team size",
      "16 levels total — from $0.25/day up to $10,000/day",
    ],
  },
  {
    num: "06", icon: Banknote, color: "text-green-400",
    bg: "bg-green-500/10", border: "border-green-500/20",
    title: "Earn & Withdraw Daily",
    points: [
      "Daily rewards credited to your balance every 24 hours",
      "Withdraw anytime — minimum 5 USDT",
      "USDT sent instantly to your wallet — no delays",
    ],
  },
];

const WHY = [
  { icon: Lock,             text: "100% on-chain — verifiable on BscScan" },
  { icon: ShieldCheck,      text: "No email or password needed" },
  { icon: Clock,            text: "Daily rewards — auto credited every 24h" },
  { icon: CircleDollarSign, text: "One-time $5 — no monthly fees" },
  { icon: Network,          text: "16 levels — up to $10,000/day" },
  { icon: Banknote,         text: "Instant withdrawals to your wallet" },
];

const FAQS = [
  { q: "What is Decentralized World?", a: "A wallet-based earning platform on BNB Smart Chain. Members join with a crypto wallet, build a referral team, and earn daily USDT rewards based on their team level. No email or password needed." },
  { q: "How much does it cost to join?", a: "A one-time 5 USDT activation fee. No monthly charges. You also need a small BNB (less than $1) for gas fees." },
  { q: "How are daily rewards calculated?", a: "Each level has a fixed daily USDT reward — from $0.25/day at Level 1 up to $10,000/day at Level 16. Your level depends on your team's direct business and total active members." },
  { q: "When can I withdraw?", a: "Anytime your balance reaches the minimum of 5 USDT. Withdrawals are instant — USDT goes directly to your wallet." },
  { q: "Is my money safe?", a: "All transactions are on BNB Smart Chain, publicly verifiable on BscScan. No one can move your funds without your initial one-time approval." },
  { q: "Which wallets are supported?", a: "Trust Wallet, MetaMask, Binance Web3, OKX Wallet, TokenPocket, SafePal, and any BSC-compatible wallet." },
];

export default function HowItWorks() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950">
      <Seo
        rawTitle
        title="How Decentralized World Works — Earn Daily USDT on BSC"
        description="Step-by-step guide to joining Decentralized World: activate your $5 plan, build a referral team, unlock 16 reward levels and earn up to $10,000 USDT daily on BNB Smart Chain."
      />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-accent-400" />
            <span className="font-display text-sm font-semibold tracking-tight sm:text-base">
              Decentralized World
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-accent-400"
          >
            Join Now <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:py-12">

        {/* ── Hero ── */}
        <section className="text-center">
          <span className="inline-flex items-center gap-1 rounded-full border border-accent-500/30 bg-accent-500/10 px-2.5 py-1 text-[11px] font-medium text-accent-300">
            <Star className="h-3 w-3" /> Complete Guide
          </span>
          <h1 className="mt-3 font-display text-2xl font-bold leading-tight sm:text-4xl">
            How{" "}
            <span className="bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent">
              Decentralized World
            </span>{" "}
            Works
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm">
            From zero to earning daily USDT in under 10 minutes. Follow the steps
            below — everything runs on BNB Smart Chain.
          </p>
          <div className="mx-auto mt-6 grid max-w-xs grid-cols-3 gap-2 sm:max-w-sm">
            {[
              { value: "$5", label: "One-time plan" },
              { value: "16", label: "Reward levels" },
              { value: "$10K", label: "Max/day" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-accent-500/20 bg-accent-500/[0.07] p-3">
                <div className="font-display text-xl font-bold text-accent-400 sm:text-2xl">{s.value}</div>
                <div className="mt-0.5 text-[10px] text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Supported Wallets ── */}
        <section className="mt-10">
          <h2 className="mb-1 text-center font-display text-base font-bold sm:text-xl">
            Supported <span className="bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent">Wallets</span>
          </h2>
          <p className="mb-4 text-center text-[11px] text-slate-400 sm:text-xs">Use any of these wallets to connect</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {WALLETS.map((w) => (
              <div
                key={w.name}
                className={`flex flex-col items-center gap-2 rounded-xl border ${w.border} ${w.bg} p-3 transition hover:border-white/20`}
              >
                {w.icon}
                <span className="text-center text-[10px] font-medium leading-tight text-slate-200 sm:text-[11px]">
                  {w.name}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── 6 Steps — single section ── */}
        <section className="mt-10">
          <h2 className="mb-1 text-center font-display text-base font-bold sm:text-xl">
            Step-by-Step <span className="bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent">Getting Started</span>
          </h2>
          <p className="mb-5 text-center text-[11px] text-slate-400 sm:text-xs">
            6 simple steps to start earning daily USDT
          </p>

          {/* Timeline layout */}
          <div className="relative">
            {/* vertical line — desktop only */}
            <div className="absolute left-[22px] top-0 hidden h-full w-px bg-white/5 sm:block" />

            <div className="space-y-3">
              {STEPS.map((s) => (
                <div key={s.num} className="flex gap-3 sm:gap-4">
                  {/* Step number + icon */}
                  <div className="flex shrink-0 flex-col items-center gap-1">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${s.border} ${s.bg}`}>
                      <s.icon className={`h-5 w-5 ${s.color}`} />
                    </div>
                    <span className={`font-display text-[10px] font-bold ${s.color} opacity-60`}>{s.num}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 rounded-xl border border-white/8 bg-navy-900/60 p-3 sm:p-4">
                    <h3 className={`font-display text-sm font-bold ${s.color} sm:text-base`}>
                      {s.title}
                    </h3>
                    <ul className="mt-2 space-y-1.5">
                      {s.points.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${s.color}`} />
                          <span className="text-xs leading-snug text-slate-300 sm:text-sm">{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 16 Reward Levels ── */}
        <section className="mt-10">
          <h2 className="mb-1 text-center font-display text-base font-bold sm:text-xl">
            16 Reward <span className="bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent">Levels</span>
          </h2>
          <p className="mb-4 text-center text-[11px] text-slate-400 sm:text-xs">
            Unlock higher levels as your team grows
          </p>

          {/* Compact grid for all 16 levels */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LEVELS.map((l) => (
              <div
                key={l.level}
                className="rounded-xl border border-white/8 bg-navy-900/60 p-2.5 sm:p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-accent-500/15 text-[10px] font-bold text-accent-400">
                    {l.level}
                  </span>
                  <span className="font-display text-sm font-bold text-accent-400 sm:text-base">
                    ${l.daily.toLocaleString()}
                    <span className="ml-0.5 text-[9px] font-normal text-slate-500">/d</span>
                  </span>
                </div>
                <div className="mt-1.5 flex gap-1.5">
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-slate-400">
                    ${l.direct} biz
                  </span>
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-slate-400">
                    {l.team >= 1000 ? `${l.team / 1000}k` : l.team} team
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] text-slate-500">
            Direct Business = active direct referrals × $5. Levels unlock automatically.
          </p>
        </section>

        {/* ── Why Join ── */}
        <section className="mt-10">
          <h2 className="mb-4 text-center font-display text-base font-bold sm:text-xl">
            Why Join <span className="bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent">Decentralized World?</span>
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {WHY.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-navy-900/60 p-3 transition hover:border-accent-500/30"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-500/10">
                  <p.icon className="h-4 w-4 text-accent-400" />
                </span>
                <span className="text-xs leading-snug text-slate-300 sm:text-sm">{p.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="mt-10">
          <h2 className="mb-4 text-center font-display text-base font-bold sm:text-xl">
            Frequently Asked <span className="bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent">Questions</span>
          </h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <details key={i} className="group rounded-xl border border-white/8 bg-navy-900/60">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 sm:px-4">
                  <span className="text-xs font-semibold text-slate-100 sm:text-sm">{faq.q}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
                </summary>
                <div className="border-t border-white/8 px-3 pb-3 pt-2 sm:px-4">
                  <p className="text-xs leading-relaxed text-slate-400 sm:text-sm">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="mt-10">
          <div className="relative overflow-hidden rounded-2xl border border-accent-500/30 bg-gradient-to-br from-accent-500/15 via-navy-800 to-navy-900 p-6 text-center sm:p-8">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-fuchsia-500/10 blur-3xl" />
            <div className="relative">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-accent-500/30 bg-accent-500/15">
                <Rocket className="h-6 w-6 text-accent-400" />
              </div>
              <h2 className="mt-3 font-display text-xl font-bold sm:text-2xl">
                Ready to Start Earning?
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-xs text-slate-300 sm:text-sm">
                One-time $5 activation. No monthly fees. Earn daily USDT. Withdraw anytime.
              </p>

              {/* Key points inline */}
              <div className="mx-auto mt-4 flex flex-wrap justify-center gap-2">
                {[
                  { icon: ShieldCheck, text: "100% On-chain" },
                  { icon: Clock,       text: "Daily Rewards" },
                  { icon: Banknote,    text: "Instant Withdraw" },
                  { icon: Trophy,      text: "16 Levels" },
                ].map((item) => (
                  <span
                    key={item.text}
                    className="inline-flex items-center gap-1 rounded-full border border-accent-500/20 bg-accent-500/10 px-2.5 py-1 text-[11px] font-medium text-accent-300"
                  >
                    <item.icon className="h-3 w-3" />
                    {item.text}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                <Link
                  to="/"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 transition hover:bg-accent-400 sm:w-auto"
                >
                  Join Now <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/legal/terms"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 sm:w-auto"
                >
                  Read Terms
                </Link>
              </div>
              <p className="mt-3 text-[11px] text-slate-500">
                No email · No password · Your wallet is your identity
              </p>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
