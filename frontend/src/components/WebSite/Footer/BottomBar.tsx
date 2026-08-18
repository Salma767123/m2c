'use client';

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { companyInfoService } from "@/services/companyInfoService";

const DEFAULT_COMPANY_NAME = 'M2C MarkDowns Private Limited';

function getCompanyName() {
  return companyInfoService.getCachedCompanyInfo().companyName || DEFAULT_COMPANY_NAME;
}
function getServerCompanyName() { return DEFAULT_COMPANY_NAME; }
const subscribe = () => () => {};

const BottomBar = () => {
  const companyName = useSyncExternalStore(subscribe, getCompanyName, getServerCompanyName);

  const legal = [
    { href: "/terms", label: "Terms & Conditions" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/returns", label: "Returns & FAQ" },
  ];

  // The centred M2C monogram that used to sit above this row is gone — the
  // oversized wordmark ending the section above says the same thing at fifteen
  // times the size, and two brand marks stacked read as indecision. Ground
  // colour matches the loom so the footer stays one object.
  return (
    <div className="text-[#f4ded9]">
      <div className="mx-auto max-w-7xl xl:max-w-420 px-4 sm:px-6 lg:px-8">
        {/* Copyright + legal */}
        <div className="flex flex-col items-center justify-between gap-3 py-5 sm:flex-row sm:gap-6">
          <p className="order-2 text-center text-[13px] text-[#eecdc7] sm:order-1 sm:text-left">
            © {new Date().getFullYear()} {companyName}. All Rights Reserved
          </p>
          <div className="order-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:order-2 sm:justify-end">
            {legal.map((l, i) => (
              <span key={l.href} className="flex items-center gap-4">
                {i > 0 && <span className="h-3 w-px bg-white/25" aria-hidden />}
                <Link
                  href={l.href}
                  className="group relative whitespace-nowrap text-[13px] text-[#f4ded9] transition-colors duration-200 hover:text-white"
                >
                  {l.label}
                  <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-white transition-all duration-200 group-hover:w-full" />
                </Link>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BottomBar;
