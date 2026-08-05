'use client';

import Link from 'next/link';
import { Truck, ShieldCheck, BadgeCheck, ArrowRight } from 'lucide-react';
import Reveal from '@/components/WebSite/Shared/Reveal';

/**
 * Brand-promotion band shown between the home-page product rails. Brand-level
 * messaging only (no product data), a crisp vector "Maker → Home" illustration,
 * and lightweight, GPU-friendly animations that respect reduced-motion.
 */
const HIGHLIGHTS = [
  { icon: BadgeCheck, title: 'Factory Direct', desc: 'Straight from the makers' },
  { icon: ShieldCheck, title: 'Quality Checked', desc: 'Inspected before dispatch' },
  { icon: Truck, title: 'Fast Shipping', desc: 'Delivered across the country' },
];

export default function BrandPromo() {
  return (
    <section className="bg-white font-sans py-6 sm:py-8 lg:py-10">
      <style jsx>{`
        .bp-float { animation: bpFloat 6s ease-in-out infinite; will-change: transform; }
        @keyframes bpFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @media (prefers-reduced-motion: reduce) { .bp-float { animation: none; } }
      `}</style>

      <div className="max-w-7xl xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <Reveal>
          <div className="group relative overflow-hidden rounded-3xl text-white shadow-[0_22px_60px_-24px_rgba(224,26,27,0.6)] transition-shadow duration-500 hover:shadow-[0_28px_72px_-22px_rgba(224,26,27,0.72)]">
            {/* Layered background */}
            <div className="absolute inset-0 bg-linear-to-br from-[#c41617] via-[#e01a1b] to-[#ff6a3d]" />
            <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(255,255,255,0.25)_0%,transparent_45%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(90%_120%_at_0%_100%,rgba(0,0,0,0.28)_0%,transparent_52%)]" />
            <div className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,0.7)_1px,transparent_1px)] [background-size:24px_24px]" />
            <span className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/15 blur-3xl animate-pulse motion-reduce:animate-none" />
            <span className="pointer-events-none absolute -left-20 -bottom-24 h-72 w-72 rounded-full bg-[#ff8a4c]/30 blur-3xl animate-pulse [animation-delay:1.2s] motion-reduce:animate-none" />
            <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-12 bg-linear-to-r from-transparent via-white/15 to-transparent transition-transform duration-[1500ms] ease-out group-hover:translate-x-full motion-reduce:hidden" />

            <div className="relative grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6 lg:gap-10 px-7 py-4 sm:px-10 sm:py-4 lg:px-14 lg:py-5 items-center">
              {/* Left — brand copy + CTA */}
              <div>
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85">
                  <span className="h-px w-6 bg-white/60" /> Manufacturer to Customer
                </span>
                <h2 className="mt-1.5 font-playfair text-2xl sm:text-3xl lg:text-[2.5rem] font-semibold leading-[1.08] tracking-tight">
                  Premium textiles, straight from the makers.
                </h2>
                <p className="mt-2 max-w-2xl text-sm sm:text-[15px] text-white/90 leading-relaxed">
                  We cut out the middlemen so you get honest factory pricing on quality-checked
                  home textiles — woven, inspected, and shipped by the people who make them.
                </p>

                {/* Highlights */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {HIGHLIGHTS.map((h) => {
                    const Icon = h.icon;
                    return (
                      <div key={h.title} className="flex items-center gap-2.5 rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm px-3 py-2 transition-transform duration-300 hover:-translate-y-0.5">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 shrink-0"><Icon className="w-4 h-4" /></span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold leading-tight">{h.title}</p>
                          <p className="text-[11px] text-white/80 leading-tight">{h.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link
                    href="/products"
                    className="group/btn relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white text-[#e01a1b] px-7 py-3 font-bold text-sm shadow-[0_10px_30px_-8px_rgba(0,0,0,0.4)] transition-all duration-300 hover:px-8 hover:shadow-[0_16px_42px_-10px_rgba(0,0,0,0.5)] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
                  >
                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-[#e01a1b]/10 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full motion-reduce:hidden" />
                    Shop the Collection
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </Link>
                  <Link
                    href="/vendor"
                    className="inline-flex items-center gap-2 rounded-full ring-1 ring-white/50 px-6 py-3 font-semibold text-sm text-white transition-colors duration-300 hover:bg-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
                  >
                    Sell on M2C
                  </Link>
                </div>
              </div>

              {/* Right — real category photos (premium composition); SVG fallback */}
              <div className="relative hidden lg:flex items-center justify-center min-h-[160px]" aria-hidden="true">
                <span className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 h-56 w-72 rounded-full bg-white/10 blur-2xl" />
                <div className="bp-float relative">
                  {/* Full image, no card frame — shown complete (object-contain) and larger. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/assets/images/categories/cs5.jpg"
                    alt="Premium quality-checked home textiles"
                    loading="lazy"
                    className="w-[20rem] xl:w-[24rem] h-auto object-contain drop-shadow-[0_28px_60px_-18px_rgba(0,0,0,0.55)] transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
