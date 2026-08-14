'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { getCountries } from '@/components/WebSite/CheckOut/CheckoutProcess/constants';

interface CountryCodeSelectProps {
  /** Current dial code, e.g. "+91". */
  value: string;
  /** Fired with the chosen country's dial code, e.g. "+971". */
  onChange: (dialCode: string) => void;
  disabled?: boolean;
  /** Overrides the trigger button's padding/rounding (defaults to a standalone pill). */
  buttonClassName?: string;
}

/**
 * Searchable country dial-code selector — flag + country name + code, matching
 * the address form's phone-code picker. Works off a dial-code string value
 * (the profile's storage format), showing the flag of the first country that
 * matches the current code.
 */
export default function CountryCodeSelect({
  value,
  onChange,
  disabled,
  buttonClassName,
}: CountryCodeSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const countries = useMemo(() => getCountries(), []);
  const selected = useMemo(() => countries.find((c) => c.phoneCode === value), [countries, value]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.isoCode.toLowerCase().includes(q) ||
        c.phoneCode.includes(q),
    );
  }, [countries, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setQuery(''); } };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-label="Select country code"
        className={`flex w-full items-center justify-between gap-1 border border-slate-300 bg-white text-sm text-slate-700 outline-none transition-colors hover:border-slate-400 focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/20 disabled:bg-slate-50 disabled:text-slate-500 ${buttonClassName || 'px-3 py-2 rounded-lg'}`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="text-base leading-none">{selected?.flag}</span>
          <span className="font-medium">{value || '+91'}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !disabled && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_40px_-12px_rgba(0,0,0,0.28)]">
          <div className="p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country or code"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/10"
            />
          </div>
          <div className="max-h-56 overflow-y-auto pb-1">
            {filtered.map((c) => (
              <button
                key={c.isoCode}
                type="button"
                onClick={() => { onChange(c.phoneCode); setOpen(false); setQuery(''); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                  c.phoneCode === value ? 'bg-[#fff5f5]' : ''
                }`}
              >
                <span className="text-base leading-none">{c.flag}</span>
                <span className="flex-1 truncate text-slate-700">{c.name}</span>
                <span className="tabular-nums text-slate-500">{c.phoneCode}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-3 text-sm text-slate-400">No matches</p>}
          </div>
        </div>
      )}
    </div>
  );
}
