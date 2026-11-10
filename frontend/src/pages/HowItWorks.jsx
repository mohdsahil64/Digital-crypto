import { Link } from "react-router-dom";
import {
  Globe,
  Wallet,
  Zap,
  Users,
  TrendingUp,
  Gift,
  Banknote,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Star,
  Layers,
  UserPlus,
  Clock,
  Lock,
  ChevronRight,
  CircleDollarSign,
  Network,
  Smartphone,
} from "lucide-react";
import Footer from "../components/Footer.jsx";
import Seo from "../components/Seo.jsx";

// ── Reward levels table ───────────────────────────────────────────────────────
const LEVELS = [
  { level: 1,  directBusiness: 20,   team: 10,      dailyReward: 0.25  },
  { level: 2,  directBusiness: 30,   team: 25,      dailyReward: 0.5   },
  { level: 3,  directBusiness: 50,   team: 100,     dailyReward: 1     },
  { level: 4,  directBusiness: 75,   team: 250,     dailyReward: 3     },
  { level: 5,  directBusiness: 100,  team: 750,     dailyReward: 5     },
  { level: 6,  directBusiness: 150,  team: 2000,    dailyReward: 15    },
  { level: 7,  directBusiness: 200,  team: 5000,    dailyReward: 25    },
  { level: 8,  directBusiness: 250,  team: 15000,   dailyReward: 50    },
  { level: 9,  directBusiness: 300,  team: 25000,   dailyReward: 100   },
  { level: 10, directBusiness: 400,  team: 50000,   dailyReward: 250   },
  { level: 11, directBusiness: 500,  team: 100000,  dailyReward: 500   },
  { level: 12, directBusiness: 600,  team: 200000,  dailyReward: 1000  },
  { level: 13, directBusiness: 700,  team: 300000,  dailyReward: 2000  },
  { level: 14, directBusiness: 800,  team: 500000,  dailyReward: 4000  },
  { level: 15, directBusiness: 900,  team: 750000,  dailyReward: 7000  },
  { level: 16, directBusiness: 1000, team: 1000000, dailyReward: 10000 },
];

// ── Supported wallets ─────────────────────────────────────────────────────────
const WALLETS = [
  { name: "Trust Wallet",  icon: "https://trustwallet.com/assets/images/media/assets/trust_platform.svg",  color: "from-blue-500/20" },
  { name: "MetaMask",      icon: "https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/SVG_MetaMask_Icon_Color.svg", color: "from-orange-500/20" },
  { name: "Binance Web3",  icon: "https://public.bnbstatic.com/image/cms/blog/20230214/f65d5b56-a0a6-45c5-9ffd-9c7a09b3c53e.png", color: "from-yellow-500/20" },
  { name: "OKX Wallet",    icon: "https://static.okx.com/cdn/assets/imgs/221/7B9E56E4B94AAC17.png", color: "from-slate-500/20" },
  { name: "TokenPocket",   icon: "https://www.tokenpocket.pro/favicon.ico", color: "from-blue-400/20" },
  { name: "SafePal",       icon: "https://safepal.com/favicon.ico", color: "from-indigo-500/20" },
];

// ── Steps ─────────────────────────────────────────────────────────────────────
const STEPS = [
  {
    number: "01",
    icon: Smartphone,
    title: "Install a Crypto Wallet",
    color: "from-blue-500/20 to-transparent",
    iconColor: "text-blue-400",
    borderColor: "border-blue-500/30",
    points: [
      "Download Trust Wallet, MetaMask, or any BNB Smart Chain wallet",
      "Create a new wallet — save your seed phrase safely offline",
      "Add BNB Smart Chain (BSC) network if not already added",
      "Get 5 USDT + small BNB for gas fees into your wallet",
    ],
  },
  {
    number: "02",
    icon: Wallet,
    title: "Connect & Register",
    color: "from-accent-500/20 to-transparent",
    iconColor: "text-accent-400",
    borderColor: "border-accent-500/30",
    points: [
      "Open decentralizeed.site in your wallet's built-in browser",
      "Tap 'Join Now' — your wallet will ask for one approval signature",
      "This approval is FREE — no USDT is charged at this step",
      "Enter your referrer's invite code to link with your upline",
    ],
  },
  {
    number: "03",
    icon: Zap,
    title: "Activate Your Plan ($5 USDT)",
    color: "from-emerald-500/20 to-transparent",
    iconColor: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    points: [
      "Pay a one-time 5 USDT plan activation fee",
      "This is a one-time payment — no monthly or yearly charges",
      "Payment goes directly to the platform's admin wallet on-chain",
      "Your account becomes ACTIVE instantly after the transaction confirms",
    ],
  },
  {
    number: "04",
    icon: UserPlus,
    title: "Build Your Team",
    color: "from-fuchsia-500/20 to-transparent",
    iconColor: "text-fuchsia-400",
    borderColor: "border-fuchsia-500/30",
    points: [
      "Share your unique referral link with friends and family",
      "You can refer up to 15 direct members",
      "Your team grows when your direct members also refer others",
      "Only active members (who paid $5) count toward your business",
    ],
  },
  {
    number: "05",
    icon: TrendingUp,
    title: "Unlock Reward Levels",
    color: "from-amber-500/20 to-transparent",
    iconColor: "text-amber-400",
    borderColor: "border-amber-500/30",
    points: [
      "Levels are unlocked automatically as your team grows",
      "Two conditions per level: Direct Business ($) + Total Team size",
      "Higher levels = higher daily USDT rewards",
      "16 levels total — from $0.25/day up to $10,000/day",
    ],
  },
  {
    number: "06",
    icon: Banknote,
    title: "Earn & Withdraw Daily",
    color: "from-green-500/20 to-transparent",
    iconColor: "text-green-400",
    borderColor: "border-green-500/30",
    points: [
      "Daily rewards are credited to your balance every 24 hours",
      "Withdraw anytime — minimum withdrawal is 5 USDT",
      "USDT is sent directly to your wallet — no delays",
      "No approval needed for withdrawal — instant on-chain transfer",
    ],
  },
];

// ── Why join points ───────────────────────────────────────────────────────────
const WHY_POINTS = [
  { icon: Lock,              text: "100% on-chain — all transactions verifiable on BscScan" },
  { icon: ShieldCheck,       text: "No email or password — your wallet IS your account" },
  { icon: Clock,             text: "Daily rewards — credited every 24 hours automatically" },
  { icon: CircleDollarSign,  text: "One-time $5 activation — no monthly fees ever" },
  { icon: Network,           text: "16 reward levels — earn up to $10,000 per day" },
  { icon: Banknote,          text: "Instant withdrawals — USDT direct to your wallet" },
];

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "What is Decentralized World?",
    a: "Decentralized World is a wallet-based earning platform on BNB Smart Chain (BSC). Members join with their crypto wallet, build a referral team, and earn daily USDT rewards based on their team level. No email or password is needed.",
  },
  {
    q: "How much does it cost to join?",
    a: "A one-time 5 USDT activation fee is required to start earning. There are no monthly or recurring charges. You also need a small amount of BNB (less than $1) to pay for blockchain gas fees.",
  },
  {
    q: "How are daily rewards calculated?",
    a: "Rewards are based on your current level. Each level has a fixed daily USDT reward — from $0.25/day at Level 1 up to $10,000/day at Level 16. Your level is determined by your team's direct business volume and total active members.",
  },
  {
    q: "When can I withdraw my earnings?",
    a: "You can withdraw anytime your balance reaches the minimum threshold of 5 USDT. Withdrawals are instant — USDT is sent directly from the platform to your connected wallet.",
  },
  {
    q: "Is my money safe?",
    a: "All transactions happen on BNB Smart Chain and are publicly verifiable on BscScan. The platform uses your wallet's existing approval — no one can move your funds without your initial one-time approval signature.",
  },
  {
    q: "Which wallets are supported?",
    a: "Trust Wallet, MetaMask, Binance Web3 Wallet, OKX Wallet, TokenPocket, SafePal, and any wallet that supports BNB Smart Chain (BSC) network.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function HowItWorks() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950">
      <Seo
        rawTitle
        title="How Decentralized World Works — Earn Daily USDT on BSC"
        description="Step-by-step guide: how to join Decentralized World, activate your $5 plan, build a referral team, unlock 16 reward levels and earn up to $10,000 USDT daily on BNB Smart Chain."
      />

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-accent-400" />
            <span className="font-display text-base font-semibold tracking-tight">
              Decentralized World
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-accent-400"
          >
            Join Now <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-14">

        {/* ── Hero section ── */}
        <section className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-500/30 bg-accent-500/10 px-3 py-1 text-xs font-medium text-accent-300">
            <Star className="h-3 w-3" /> Complete Guide
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-5xl">
            How{" "}
            <span className="bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent">
              Decentralized World
            </span>{" "}
            Works
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            A complete step-by-step guide to joining, activating your plan, building
            your team, and earning daily USDT rewards on BNB Smart Chain — from zero
            to earning in under 10 minutes.
          </p>

          {/* Quick stats */}
          <div className="mx-auto mt-8 grid max-w-2xl grid-cols-3 gap-3">
            {[
              { value: "$5", label: "One-time plan" },
              { value: "16", label: "Reward levels" },
              { value: "$10K", label: "Max daily reward" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-accent-500/20 bg-accent-500/[0.07] p-4"
              >
                <div className="font-display text-2xl font-bold text-accent-400 sm:text-3xl">
                  {s.value}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-400 sm:text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Supported Wallets ── */}
        <section className="mt-14">
          <div className="mb-6 text-center">
            <h2 className="font-display text-xl font-bold sm:text-2xl">
              Supported{" "}
              <span className="bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent">
                Wallets
              </span>
            </h2>
            <p className="mt-2 text-xs text-slate-400 sm:text-sm">
              Use any of these popular wallets to connect and start earning
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {WALLETS.map((w) => (
              <div
                key={w.name}
                className={`flex flex-col items-center gap-2.5 rounded-2xl border border-white/10 bg-gradient-to-br ${w.color} to-transparent p-4 backdrop-blur transition hover:border-white/20`}
              >
                <img
                  src={w.icon}
                  alt={w.name}
                  className="h-10 w-10 rounded-xl object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <span className="text-center text-[11px] font-medium leading-tight text-slate-200 sm:text-xs">
                  {w.name}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Step by step ── */}
        <section className="mt-14">
          <div className="mb-6 text-center">
            <h2 className="font-display text-xl font-bold sm:text-2xl">
              Step-by-Step{" "}
              <span className="bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent">
                Getting Started
              </span>
            </h2>
            <p className="mt-2 text-xs text-slate-400 sm:text-sm">
              Follow these 6 simple steps to start earning daily USDT
            </p>
          </div>

          <div className="space-y-4">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className={`relative overflow-hidden rounded-2xl border ${step.borderColor} bg-navy-900/70 p-5 backdrop-blur sm:p-6`}
              >
                <div
                  className={`pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-gradient-to-bl ${step.color} blur-2xl`}
                />
                <div className="relative">
                  {/* Step header */}
                  <div className="flex items-center gap-3">
                    <span className="font-display text-3xl font-bold text-white/10 sm:text-4xl">
                      {step.number}
                    </span>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border ${step.borderColor} bg-white/5`}
                    >
                      <step.icon className={`h-5 w-5 ${step.iconColor}`} />
                    </div>
                    <h3 className="font-display text-base font-bold sm:text-lg">
                      {step.title}
                    </h3>
                  </div>

                  {/* Points */}
                  <ul className="mt-4 space-y-2.5">
                    {step.points.map((point, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${step.iconColor}`} />
                        <span className="text-sm leading-snug text-slate-300">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Earning levels table ── */}
        <section className="mt-14">
          <div className="mb-6 text-center">
            <h2 className="font-display text-xl font-bold sm:text-2xl">
              16 Reward{" "}
              <span className="bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent">
                Levels
              </span>
            </h2>
            <p className="mt-2 text-xs text-slate-400 sm:text-sm">
              Unlock higher levels as your team grows — each level pays a fixed daily USDT reward
            </p>
          </div>

          {/* Mobile: cards */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {LEVELS.map((l) => (
              <div
                key={l.level}
                className="rounded-2xl border border-white/10 bg-navy-900/70 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-500/15 text-xs font-bold text-accent-400">
                      {l.level}
                    </span>
                    <span className="font-display text-sm font-semibold">Level {l.level}</span>
                  </div>
                  <span className="font-display text-lg font-bold text-accent-400">
                    ${l.dailyReward.toLocaleString()}<span className="text-xs font-normal text-slate-400">/day</span>
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white/5 px-2.5 py-2">
                    <div className="text-[10px] text-slate-400">Direct Business</div>
                    <div className="mt-0.5 text-sm font-semibold">${l.directBusiness}</div>
                  </div>
                  <div className="rounded-lg bg-white/5 px-2.5 py-2">
                    <div className="text-[10px] text-slate-400">Team Size</div>
                    <div className="mt-0.5 text-sm font-semibold">{l.team.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-2xl border border-white/10 sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-navy-800/80">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Level</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Direct Business</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Team Size</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Daily Reward</th>
                </tr>
              </thead>
              <tbody>
                {LEVELS.map((l, i) => (
                  <tr
                    key={l.level}
                    className={`border-b border-white/5 transition hover:bg-white/[0.03] ${
                      i % 2 === 0 ? "bg-navy-900/40" : "bg-navy-900/20"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent-500/15 text-xs font-bold text-accent-400">
                        {l.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-200">
                      ${l.directBusiness.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {l.team.toLocaleString()} members
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-display text-base font-bold text-accent-400">
                        ${l.dailyReward.toLocaleString()}
                      </span>
                      <span className="ml-1 text-xs text-slate-400">/day</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-center text-xs text-slate-500">
            * Direct Business = number of your active direct referrals × $5 plan price.
            Levels unlock automatically — no manual action needed.
          </p>
        </section>

        {/* ── Why join ── */}
        <section className="mt-14">
          <div className="mb-6 text-center">
            <h2 className="font-display text-xl font-bold sm:text-2xl">
              Why Join{" "}
              <span className="bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent">
                Decentralized World?
              </span>
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_POINTS.map((p, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-navy-900/70 p-4 backdrop-blur transition hover:border-accent-500/30"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-500/10">
                  <p.icon className="h-4 w-4 text-accent-400" />
                </span>
                <span className="text-sm leading-snug text-slate-300">{p.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="mt-14">
          <div className="mb-6 text-center">
            <h2 className="font-display text-xl font-bold sm:text-2xl">
              Frequently Asked{" "}
              <span className="bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent">
                Questions
              </span>
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-white/10 bg-navy-900/70 backdrop-blur"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4">
                  <span className="text-sm font-semibold text-slate-100 sm:text-base">
                    {faq.q}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
                </summary>
                <div className="border-t border-white/10 px-4 pb-4 pt-3">
                  <p className="text-sm leading-relaxed text-slate-400">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="mt-14">
          <div className="relative overflow-hidden rounded-3xl border border-accent-500/30 bg-gradient-to-br from-accent-500/15 via-navy-800 to-navy-900 p-8 text-center sm:p-12">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />
            <div className="relative">
              <Layers className="mx-auto h-10 w-10 text-accent-400" />
              <h2 className="mt-4 font-display text-2xl font-bold sm:text-3xl">
                Ready to Start Earning?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-slate-300 sm:text-base">
                Join thousands of members already earning daily USDT rewards on BNB Smart
                Chain. One-time $5 activation. No monthly fees. Withdraw anytime.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  to="/"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 transition hover:bg-accent-400 sm:w-auto"
                >
                  Join Now <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/legal/terms"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 sm:w-auto"
                >
                  Read Terms
                </Link>
              </div>
              <p className="mt-4 text-xs text-slate-500">
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
