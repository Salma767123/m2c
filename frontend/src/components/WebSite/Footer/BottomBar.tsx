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

  return (
    <div className="border-t border-[#eceae4] bg-[#f4f3ef] text-[#3f3f46]">
      <div className="mx-auto max-w-7xl xl:max-w-420 px-4 sm:px-6 lg:px-8">
        {/* Centre monogram mark */}
        <div className="flex items-center justify-center gap-3 py-5 sm:gap-4">
          <span className="hidden h-px max-w-[22rem] flex-1 bg-gradient-to-r from-transparent to-[#e01a1b]/25 sm:block" />
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e01a1b]/30 bg-white font-playfair text-[13px] font-semibold italic tracking-tight text-[#e01a1b] shadow-[0_1px_2px_rgba(224,26,27,0.08)]">
            M2C
          </span>
          <span className="hidden h-px max-w-[22rem] flex-1 bg-gradient-to-l from-transparent to-[#e01a1b]/25 sm:block" />
        </div>

        {/* Copyright + legal */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#eceae4] py-5 sm:flex-row sm:gap-6">
          <p className="order-2 text-center text-[13px] text-[#8a8a92] sm:order-1 sm:text-left">
            © {new Date().getFullYear()} {companyName}. All Rights Reserved
          </p>
          <div className="order-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:order-2 sm:justify-end">
            {legal.map((l, i) => (
              <span key={l.href} className="flex items-center gap-4">
                {i > 0 && <span className="h-3 w-px bg-[#d8d6ce]" aria-hidden />}
                <Link
                  href={l.href}
                  className="group relative whitespace-nowrap text-[13px] text-[#5b5b63] transition-colors duration-200 hover:text-[#e01a1b]"
                >
                  {l.label}
                  <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-[#e01a1b] transition-all duration-200 group-hover:w-full" />
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
