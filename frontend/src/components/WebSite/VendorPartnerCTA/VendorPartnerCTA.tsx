'use client';

import Link from 'next/link';

/**
 * "Sell on M2C" advertisement band. Renders the designed seller banner artwork
 * (m2cseller.png — its own headline, perks, badge and CTA) as one clickable
 * card linking to vendor onboarding. Brand-level messaging, no dynamic data.
 */
export default function VendorPartnerCTA() {
  return (
    <section className="bg-white font-sans py-5 sm:py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/vendor"
          aria-label="Sell on M2C — become a vendor partner"
          className="group relative block overflow-hidden rounded-3xl shadow-[0_22px_60px_-28px_rgba(0,0,0,0.45)] transition-all duration-500 hover:shadow-[0_28px_72px_-24px_rgba(0,0,0,0.55)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#e01a1b]/40"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/images/banner/m2cseller.png"
            alt="Sell on M2C — become a vendor partner. Zero charges to sell, transparent earnings, 24x7 support."
            loading="lazy"
            className="w-full h-auto object-cover transition-transform duration-700 ease-out group-hover:scale-[1.015]"
          />
        </Link>
      </div>
    </section>
  );
}
