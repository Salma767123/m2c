'use client';

import Link from 'next/link';
import { useState } from 'react';
import Reveal from '@/components/WebSite/Shared/Reveal';
import VendorApplicationModal from '@/components/WebSite/Shared/VendorApplicationModal';

/**
 * Brand-promotion band shown between the home-page product rails. Two brand
 * artwork panels:
 *   • m2cbuyer  — links to the full product catalogue.
 *   • m2cseller — opens the vendor application modal (same form as Contact page).
 */
export default function BrandPromo() {
  const [showVendorModal, setShowVendorModal] = useState(false);

  return (
    <section className="bg-white font-sans py-6 sm:py-8 lg:py-10">
      <div className="max-w-7xl xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
            {/* Buyer — navigate to all products */}
            <Link
              href="/products"
              aria-label="Shop all products"
              className="group relative block overflow-hidden rounded-3xl shadow-[0_18px_50px_-24px_rgba(0,0,0,0.45)] transition-all duration-500 hover:shadow-[0_26px_66px_-22px_rgba(0,0,0,0.55)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#e01a1b]/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/images/banner/m2cbuyer.png"
                alt="Shop premium textiles — straight from the makers"
                loading="lazy"
                className="w-full h-40 sm:h-44 lg:h-52 object-cover object-center scale-x-[1.06] transition-transform duration-500 group-hover:scale-x-[1.09] group-hover:scale-y-[1.03]"
              />
            </Link>

            {/* Seller — open vendor application modal */}
            <button
              type="button"
              onClick={() => setShowVendorModal(true)}
              aria-label="Join us as a vendor"
              className="group relative block w-full overflow-hidden rounded-3xl shadow-[0_18px_50px_-24px_rgba(0,0,0,0.45)] transition-all duration-500 hover:shadow-[0_26px_66px_-22px_rgba(0,0,0,0.55)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#e01a1b]/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/images/banner/m2cseller.png"
                alt="Sell on M2C — join us as a vendor"
                loading="lazy"
                className="w-full h-40 sm:h-44 lg:h-52 object-cover object-center scale-x-[1.06] transition-transform duration-500 group-hover:scale-x-[1.09] group-hover:scale-y-[1.03]"
              />
            </button>
          </div>
        </Reveal>
      </div>

      <VendorApplicationModal open={showVendorModal} onClose={() => setShowVendorModal(false)} />
    </section>
  );
}
