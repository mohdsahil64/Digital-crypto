import { Link } from "react-router-dom";
import { Globe, ArrowLeft } from "lucide-react";
import Footer from "../../components/Footer.jsx";
import Seo from "../../components/Seo.jsx";

/**
 * Public, wallet-free shell for legal pages. Mobile-first: comfortable reading width,
 * compact header, footer with the other legal links.
 */
export default function LegalLayout({ title, updated, children }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950">
      <Seo
        title={title}
        description={`${title} for Decentralized World — read our policies and terms.`}
      />
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-accent-400" />
            <span className="font-display text-base font-semibold tracking-tight">
              Decentralized World
            </span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-10">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {updated && <p className="mt-1 text-xs text-slate-500">Last updated: {updated}</p>}
        <div className="legal-body mt-6 space-y-5 text-sm leading-relaxed text-slate-300">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}
