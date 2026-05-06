'use client';

import Link from "next/link";
import { companyInfoService } from "@/services/companyInfoService";

const BottomBar = () => {
  const companyName = companyInfoService.getCachedCompanyInfo().companyName;

  return (
    <div className="bg-[#000000] text-white border-t border-gray-800">
      <div className="max-w-7xl 2xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-5 md:py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 md:gap-6">
          <p className="text-gray-400 text-xs sm:text-sm md:text-base text-center sm:text-left order-2 sm:order-1">
            Copyright © {new Date().getFullYear()} {companyName}. All Rights Reserved
          </p>
          <div className="flex flex-wrap justify-center sm:justify-end gap-3 sm:gap-4 md:gap-6 order-1 sm:order-2">
            <Link
              href="/terms"
              className="text-gray-400 hover:text-white text-xs sm:text-sm md:text-base transition-colors whitespace-nowrap"
            >
              Terms & Conditions
            </Link>
            <Link
              href="/privacy"
              className="text-gray-400 hover:text-white text-xs sm:text-sm md:text-base transition-colors whitespace-nowrap"
            >
              Privacy Policy
            </Link>
            <Link
              href="/returns"
              className="text-gray-400 hover:text-white text-xs sm:text-sm md:text-base transition-colors whitespace-nowrap"
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