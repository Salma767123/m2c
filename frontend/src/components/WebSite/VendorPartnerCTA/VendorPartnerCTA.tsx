'use client';

import Link from 'next/link';
import { Store, TrendingUp, BadgeIndianRupee, ArrowRight } from 'lucide-react';

/**
 * "Become a Vendor Partner" advertisement band. Brand-level messaging (no dynamic
 * data), M2C red theme, layered background and lightweight, reduced-motion-safe
 * animations — links to the vendor onboarding.
 */
const PERKS = [
  { icon: Store, label: 'Sell direct — no middlemen' },
  { icon: TrendingUp, label: 'Reach more customers' },
  { icon: BadgeIndianRupee, label: 'Fast, transparent payouts' },
];

export default function VendorPartnerCTA() {
  return (
    <section className="bg-white font-sans py-6 sm:py-8">
      <div className="max-w-420 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="group relative overflow-hidden rounded-3xl text-white shadow-[0_22px_60px_-24px_rgba(224,26,27,0.6)] transition-shadow duration-500 hover:shadow-[0_28px_72px_-22px_rgba(224,26,27,0.72)]">
          {/* Layered background */}
          <div className="absolute inset-0 bg-linear-to-br from-[#c41617] via-[#e01a1b] to-[#ff6a3d]" />
          <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(255,255,255,0.25)_0%,transparent_45%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(90%_120%_at_0%_100%,rgba(0,0,0,0.28)_0%,transparent_52%)]" />
          <div className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,0.7)_1px,transparent_1px)] [background-size:22px_22px]" />
          <span className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/15 blur-3xl animate-pulse motion-reduce:animate-none" />
          <span className="pointer-events-none absolute -left-16 -bottom-20 h-60 w-60 rounded-full bg-[#ff8a4c]/30 blur-3xl animate-pulse [animation-delay:1.2s] motion-reduce:animate-none" />
          <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-12 bg-linear-to-r from-transparent via-white/15 to-transparent transition-transform duration-[1500ms] ease-out group-hover:translate-x-full motion-reduce:hidden" />

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 p-6 sm:p-9 lg:p-11">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85">
                <span className="h-px w-6 bg-white/60" /> Sell on M2C
              </span>
              <h2 className="mt-2.5 font-playfair text-2xl sm:text-3xl lg:text-4xl font-semibold leading-[1.08] tracking-tight">
                Become a Vendor Partner
              </h2>
              <p className="mt-2 max-w-xl text-sm sm:text-base text-white/90 leading-relaxed">
                Take your textiles straight to customers on India&apos;s manufacturer-first
                marketplace. Onboard in minutes and start selling.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {PERKS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <span key={p.label} className="inline-flex items-center gap-1.5 rounded-full bg-white/12 ring-1 ring-white/20 backdrop-blur-sm px-3 py-1.5 text-[12px] font-semibold">
                      <Icon className="w-3.5 h-3.5" /> {p.label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/vendor"
                className="group/btn relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white text-[#e01a1b] px-7 py-3.5 font-bold text-sm shadow-[0_10px_30px_-8px_rgba(0,0,0,0.4)] transition-all duration-300 hover:px-8 hover:shadow-[0_16px_42px_-10px_rgba(0,0,0,0.5)] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
              >
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-[#e01a1b]/10 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full motion-reduce:hidden" />
                Start Selling
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
              </Link>
              <Link
                href="/vendor"
                className="inline-flex items-center rounded-full ring-1 ring-white/50 px-6 py-3 font-semibold text-sm text-white transition-colors duration-300 hover:bg-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
              >
                Learn more
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
