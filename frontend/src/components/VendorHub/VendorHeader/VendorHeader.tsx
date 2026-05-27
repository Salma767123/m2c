"use client";

import { Phone, Mail } from 'lucide-react';
import CompanyLogo from '@/components/Shared/CompanyLogo';

const VendorHeader = () => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-(--z-sticky-header)">
      {/* Thin brand-red accent line — single visible cue that this is an
          official M2C portal without dominating the chrome. */}
      <div className="h-1 bg-brand-500" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
        {/* Brand — uses the shared CompanyLogo (admin-uploaded logo with
            session-cached fetch + bundled fallback + skeleton). */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
            <CompanyLogo
              className="w-full h-full object-contain p-1"
              skeletonClassName="w-full h-full bg-slate-100"
              fallbackWidth={56}
              fallbackHeight={56}
              priority
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-sans font-bold text-slate-900 text-base sm:text-lg leading-tight truncate">
              M2C MarkDowns
            </h1>
            <p className="font-sans text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] text-brand-500 truncate mt-0.5">
              Vendor Registration Portal
            </p>
          </div>
        </div>

        {/* Support — branded card on the right. Email is a low-emphasis link,
            phone is the primary CTA (most vendors call when they get stuck). */}
        <div className="hidden md:flex items-center gap-2">
          <a
            href="mailto:support@btooc.com"
            className="hidden lg:inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 rounded px-2 py-1"
            title="Email support"
          >
            <Mail className="w-3.5 h-3.5" />
            support@btooc.com
          </a>
          <a
            href="tel:+919876543210"
            className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-full px-3.5 py-2 transition-colors duration-150 shadow-sm shadow-brand-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2"
            title="Call support"
          >
            <Phone className="w-3.5 h-3.5" />
            +91 98765 43210
          </a>
        </div>

        {/* Mobile — single icon-only CTA so we don't bloat the header on
            small screens but still expose the most-used help action. */}
        <a
          href="tel:+919876543210"
          aria-label="Call support"
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-500 hover:bg-brand-600 text-white transition-colors duration-150 shadow-sm shadow-brand-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2"
        >
          <Phone className="w-4 h-4" />
        </a>
      </div>
    </header>
  );
};

export default VendorHeader;
