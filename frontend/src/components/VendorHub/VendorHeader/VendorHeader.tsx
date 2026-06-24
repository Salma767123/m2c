"use client";

import CompanyLogo from '@/components/Shared/CompanyLogo';

const VendorHeader = () => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-(--z-sticky-header)">
      <div className="h-1 bg-brand-500" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
            <CompanyLogo
              className="w-full h-full object-contain p-1"
              skeletonClassName="w-full h-full bg-slate-100"
              fallbackWidth={56}
              fallbackHeight={56}
              priority
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-sans font-bold text-slate-900 text-base sm:text-lg leading-tight truncate">
              M2C MarkDowns
            </h1>
            <p className="font-sans text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] text-brand-500 truncate mt-0.5">
              Vendor Registration Portal
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default VendorHeader;
