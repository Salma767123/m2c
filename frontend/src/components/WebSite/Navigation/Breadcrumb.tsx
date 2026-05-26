'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const Breadcrumb = ({ items }: BreadcrumbProps) => {
  const lastIndex = items.length - 1;

  return (
    <div className='bg-white'>
      <div className="bg-white max-w-7xl xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 sm:gap-2 text-sm text-[#330b03] py-3 sm:py-4 overflow-x-auto scrollbar-hide whitespace-nowrap"
        >
          <Link href="/" aria-label="Home" className="flex items-center hover:text-[#5b2616] transition-colors shrink-0">
            <Home className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>

          {items.map((item, index) => {
            const isLast = index === lastIndex;
            return (
              <div key={index} className={`flex items-center gap-1.5 sm:gap-2 ${isLast ? 'min-w-0' : 'shrink-0'}`}>
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#330b03] shrink-0" />
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="text-[#3c2415] hover:text-[#5b2616] font-sans text-xs sm:text-sm md:text-base font-semibold sm:font-bold transition-colors shrink-0"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className="text-[#330b03] font-sans text-xs sm:text-sm md:text-base font-semibold sm:font-bold truncate max-w-[55vw] sm:max-w-none"
                    title={item.label}
                  >
                    {item.label}
                  </span>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Breadcrumb;
