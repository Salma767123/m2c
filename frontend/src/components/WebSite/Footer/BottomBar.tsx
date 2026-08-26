'use client';

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useSamePageTop } from "@/components/WebSite/Shared/useSamePageTop";
import { companyInfoService } from "@/services/companyInfoService";

const DEFAULT_COMPANY_NAME = 'M2C Markdowns Pvt Ltd';

function getCompanyName() {
  return companyInfoService.getCachedCompanyInfo().companyName || DEFAULT_COMPANY_NAME;
}
function getServerCompanyName() { return DEFAULT_COMPANY_NAME; }
const subscribe = () => () => {};

const BottomBar = () => {
  // Terms / Privacy / Returns all link to pages this bar itself sits on, so
  // this is the row where a dead same-page click is most likely to be met.
  const samePageTop = useSamePageTop();

  const companyName = useSyncExternalStore(subscribe, getCompanyName, getServerCompanyName);

  const legal = [
    { href: "/terms", label: "Terms & Conditions" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/returns", label: "Returns & FAQ" },
  ];

  // No ground of its own. The linen gradient runs down from the <footer>
  // wrapper and this bar is simply the deepest part of it — see Footer.tsx.
  // The centred M2C monogram that used to sit above this row is gone: the
  // wordmark ending the section above says the same thing at fifteen times the
  // size, and two brand marks stacked read as indecision.
  return (
    <div className="text-[#6b625b]">
      <div className="mx-auto max-w-7xl xl:max-w-420 px-4 sm:px-6 lg:px-8">
        {/* Copyright + legal — hairline above so it separates from the columns
            now that the ground is one continuous gradient. Warm rather than
            neutral, matching the rules the section above uses. */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#e6dbcc] py-5 sm:flex-row sm:gap-6">
          <p className="order-2 text-center text-[13px] text-[#7d736c] sm:order-1 sm:text-left">
            © {new Date().getFullYear()} {companyName}. All Rights Reserved
            <span className="mx-1.5 text-[#b3a99f]" aria-hidden>·</span>
            Developed by{" "}
            <a
              href="https://mntfuture.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#3f3a35] underline-offset-2 transition-colors hover:text-[#c41617] hover:underline"
            >
              MnT Future
            </a>
          </p>
          <div className="order-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:order-2 sm:justify-end">
            {legal.map((l, i) => (
              <span key={l.href} className="flex items-center gap-4">
                {i > 0 && <span className="h-3 w-px bg-[#ded3c6]" aria-hidden />}
                <Link
                  href={l.href}
                  onClick={samePageTop(l.href)}
                  className="group relative whitespace-nowrap text-[13px] text-[#6b625b] transition-colors duration-200 hover:text-[#1a1a1a]"
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
