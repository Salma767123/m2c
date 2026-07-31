'use client';

import Image from 'next/image';
import { Smartphone } from 'lucide-react';
import Reveal from '@/components/WebSite/Shared/Reveal';

// A single phone mockup with our real mobile storefront screenshot inside.
function Phone({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`rounded-[2.2rem] bg-[#1a1a1a] p-1.5 shadow-[0_28px_60px_-18px_rgba(0,0,0,0.55)] ring-1 ring-black/10 ${className || ''}`}>
      <div className="relative overflow-hidden rounded-[1.8rem] bg-white aspect-[1290/2796]">
        {/* notch */}
        <div className="absolute top-0 left-1/2 z-20 h-4 w-20 -translate-x-1/2 rounded-b-xl bg-[#1a1a1a]" />
        <Image src={src} alt={alt} fill sizes="240px" className="object-cover object-top" />
      </div>
    </div>
  );
}

// Monochrome store badges — clean and on-brand (no rainbow logo).
function AppStoreBadge() {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      aria-label="Download on the App Store"
      className="group inline-flex items-center gap-3 rounded-xl bg-[#1a1a1a] px-5 py-2.5 text-white shadow-md transition-all duration-300 hover:bg-black hover:-translate-y-0.5 hover:shadow-lg"
    >
      <svg viewBox="0 0 384 512" className="h-7 w-7 shrink-0" fill="currentColor" aria-hidden="true">
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
      </svg>
      <span className="flex flex-col text-left leading-tight">
        <span className="text-[10px] font-medium opacity-80">Download on the</span>
        <span className="-mt-0.5 text-lg font-semibold tracking-tight">App Store</span>
      </span>
    </a>
  );
}

function GooglePlayBadge() {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      aria-label="Get it on Google Play"
      className="group inline-flex items-center gap-3 rounded-xl bg-[#1a1a1a] px-5 py-2.5 text-white shadow-md transition-all duration-300 hover:bg-black hover:-translate-y-0.5 hover:shadow-lg"
    >
      <svg viewBox="0 0 512 512" className="h-6 w-6 shrink-0" fill="currentColor" aria-hidden="true">
        <path d="M325.3 234.3 104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l220.7-221.3 60.1 60.1L104.6 499z" />
      </svg>
      <span className="flex flex-col text-left leading-tight">
        <span className="text-[10px] font-medium opacity-80">GET IT ON</span>
        <span className="-mt-0.5 text-lg font-semibold tracking-tight">Google Play</span>
      </span>
    </a>
  );
}

export default function DownloadApp() {
  return (
    <section id="download-app" className="relative overflow-hidden bg-linear-to-br from-[#fdf6f6] via-[#fff5f5] to-[#faf9f7] py-12 sm:py-16 lg:py-20 font-sans scroll-mt-24">
      {/* soft brand glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#e01a1b]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-[#e01a1b]/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-10 lg:flex-row lg:gap-16">
          {/* ── Phones ── */}
          <Reveal className="w-full lg:flex-1">
            <div className="relative mx-auto h-[420px] w-[300px] sm:h-[480px] sm:w-[340px]">
              {/* back phone — products screen */}
              <Phone
                src="/assets/app/screen-products.png"
                alt="M2C MarkDowns products on mobile"
                className="absolute right-0 top-10 w-[186px] rotate-[8deg] opacity-95 sm:w-[210px] animate-float-slower"
              />
              {/* front phone — home screen */}
              <Phone
                src="/assets/app/screen-home.png"
                alt="M2C MarkDowns storefront on mobile"
                className="absolute left-0 top-0 z-10 w-[208px] -rotate-[3deg] sm:w-[232px] animate-float-slow"
              />
              {/* brand badge on top */}
              <div className="absolute -top-3 left-1/2 z-20 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-[#e01a1b] shadow-[0_10px_25px_rgba(224,26,27,0.45)] ring-4 ring-white">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
            </div>
          </Reveal>

          {/* ── Copy + badges ── */}
          <Reveal delay={120} className="w-full text-center lg:flex-1 lg:text-left">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e01a1b] mb-3">
              <span className="h-px w-6 bg-[#e01a1b]" />
              Mobile App
            </span>
            <h2 className="font-playfair text-3xl sm:text-4xl xl:text-5xl font-semibold text-[#1a1a1a] tracking-tight mb-3">
              Download The App For <span className="text-[#e01a1b]">FREE!</span>
            </h2>
            <p className="mx-auto lg:mx-0 max-w-xl text-base sm:text-lg text-gray-600 leading-relaxed mb-7">
              Make your online shopping experience easier and faster. Browse, wishlist and order your favourite
              home textiles on the go — get the M2C MarkDowns app now.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 lg:justify-start">
              <AppStoreBadge />
              <GooglePlayBadge />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
