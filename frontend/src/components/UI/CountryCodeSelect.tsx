'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

/** Panel width, and the gap it keeps from the trigger and the viewport edges. */
const PANEL_W = 256;
const GAP = 6;
const MARGIN = 8;
/** Roughly the panel's height — used to decide whether it opens up or down. */
const PANEL_H = 296;

/**
 * Searchable country dial-code selector — flag + country name + code, matching
 * the address form's phone-code picker. Works off a dial-code string value
 * (the profile's storage format), showing the flag of the first country that
 * matches the current code.
 *
 * ── Why the panel is portalled ────────────────────────────────────────────
 *
 * It used to be an absolutely-positioned child with z-50, and on the account
 * page it opened *underneath* the footer. Not a z-index that needed raising —
 * a stacking context it could not escape.
 *
 * `.reveal` in globals.css sets `will-change: opacity, transform`, and
 * `will-change: transform` opens a stacking context permanently — it does not
 * matter that `.is-visible` resets `transform: none`. The account page wraps
 * its content column in <Reveal>, so every z-index inside is sealed under that
 * wrapper's own level, and anything later in the document paints over it.
 *
 * Portalling to document.body takes the panel out of that context entirely, so
 * it works regardless of what any ancestor does. The cost is that the panel no
 * longer inherits the trigger's position, so it is placed from the trigger's
 * rect and kept in step on scroll and resize.
 */
export default function CountryCodeSelect({
  value,
  onChange,
  disabled,
  buttonClassName,
}: CountryCodeSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState<{ top: number; left: number; drop: 'down' | 'up' } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

  /**
   * Place the panel from the trigger's rect.
   *
   * Flips above the trigger when there is not room below — this control sits
   * near the bottom of the profile card, so downward is often the wrong way.
   * Clamped horizontally so a right-hand field cannot push it off screen.
   */
  const place = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const roomBelow = window.innerHeight - r.bottom;
    const drop: 'down' | 'up' = roomBelow < PANEL_H && r.top > roomBelow ? 'up' : 'down';
    const maxLeft = window.innerWidth - PANEL_W - MARGIN;
    setPos({
      top: drop === 'down' ? r.bottom + GAP : r.top - GAP,
      left: Math.max(MARGIN, Math.min(r.left, maxLeft)),
      drop,
    });
  }, []);

  // Before paint, so the panel never shows at the wrong place for a frame.
  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;

    const close = () => { setOpen(false); setQuery(''); };

    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      // The panel is no longer a descendant of `ref`, so it has to be tested
      // separately or every click inside it would close the panel.
      if (!ref.current?.contains(t) && !panelRef.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const onScroll = () => place();
    const onResize = () => place();

    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    // Capture, so the panel follows scrolling in any container, not just the
    // one that happens to bubble.
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);

    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, place]);

  const panel = open && !disabled && pos && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: PANEL_W,
            // Anchoring by its own bottom edge when flipped means the panel
            // grows upward as it is filtered, instead of creeping over the field.
            transform: pos.drop === 'up' ? 'translateY(-100%)' : undefined,
          }}
          className="z-[300] overflow-hidden rounded-xl border border-[#e6dcd0] bg-white shadow-[0_16px_40px_-12px_rgba(74,50,38,0.4)]"
        >
          <div className="p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country or code"
              className="w-full rounded-lg border border-[#e6dcd0] px-3 py-2 text-sm outline-none placeholder:text-[#a89a8d] focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15"
            />
          </div>
          <div className="max-h-56 overflow-y-auto pb-1">
            {filtered.map((c) => (
              <button
                key={c.isoCode}
                type="button"
                onClick={() => { onChange(c.phoneCode); setOpen(false); setQuery(''); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#faf7f3] ${
                  c.phoneCode === value ? 'bg-[#fdf3f0]' : ''
                }`}
              >
                <span className="text-base leading-none">{c.flag}</span>
                <span className="flex-1 truncate text-[#3d352f]">{c.name}</span>
                <span className="tabular-nums text-[#7a6d62]">{c.phoneCode}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-sm text-[#a89a8d]">No matches</p>
            )}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-label="Select country code"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-1 border border-slate-300 bg-white text-sm text-slate-700 outline-none transition-colors hover:border-slate-400 focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/20 disabled:bg-slate-50 disabled:text-slate-500 ${buttonClassName || 'px-3 py-2 rounded-lg'}`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="text-base leading-none">{selected?.flag}</span>
          <span className="font-medium">{value || '+91'}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {panel}
    </div>
  );
}
