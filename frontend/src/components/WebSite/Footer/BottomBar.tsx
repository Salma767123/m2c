'use client';

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { companyInfoService } from "@/services/companyInfoService";

const DEFAULT_COMPANY_NAME = 'M2C MarkDowns Private Limited';

function getCompanyName() {
  return companyInfoService.getCachedCompanyInfo().companyName || DEFAULT_COMPANY_NAME;
}

function getServerCompanyName() {
  return DEFAULT_COMPANY_NAME;
}

// No-op subscribe — company name doesn't change during the session
const subscribe = () => () => {};

const BottomBar = () => {
  const companyName = useSyncExternalStore(subscribe, getCompanyName, getServerCompanyName);

  return (
    <div className="bg-[#1a0405] text-white border-t border-white/10">
      <div className="max-w-7xl 2xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-5 md:py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 md:gap-6">
          <p className="text-white/50 text-xs sm:text-sm md:text-base text-center sm:text-left order-2 sm:order-1">
            Copyright © {new Date().getFullYear()} {companyName}. All Rights Reserved
          </p>
          <div className="flex flex-wrap justify-center sm:justify-end gap-4 sm:gap-5 md:gap-7 order-1 sm:order-2">
            <Link
              href="/terms"
              className="link-underline text-white/60 hover:text-white text-xs sm:text-sm md:text-base transition-colors duration-300 whitespace-nowrap"
            >
              Terms & Conditions
            </Link>
            <Link
              href="/privacy"
              className="link-underline text-white/60 hover:text-white text-xs sm:text-sm md:text-base transition-colors duration-300 whitespace-nowrap"
            >
              Privacy Policy
            </Link>
            <Link
              href="/returns"
              className="link-underline text-white/60 hover:text-white text-xs sm:text-sm md:text-base transition-colors duration-300 whitespace-nowrap"
            >
              Returns & FAQ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BottomBar;
