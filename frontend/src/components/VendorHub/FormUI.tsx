'use client';

/**
 * Vendor registration form primitives.
 *
 * Single source of truth for input / label / section styling across every
 * step of the vendor onboarding flow. Replaces inline class strings that
 * had drifted between steps — same look-and-feel, same a11y wiring, same
 * error treatment in CompanyDetails, ContactTradeInfo, WarehouseDetails,
 * etc.
 *
 * The components are deliberately tiny so adopters can drop them in
 * incrementally without rewriting an entire step at once.
 */

import React, { useState, useRef, useEffect, useMemo, useId } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, Check, Search, MapPin, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Country, type ICountry } from 'country-state-city';
import { parsePhoneNumberFromString, validatePhoneNumberLength } from 'libphonenumber-js';
import { searchAddress, type AddressSuggestion } from '@/lib/addressSearch';

// ── Shared input chrome ─────────────────────────────────────────────────

// `text-base` (16px) on mobile so iOS doesn't auto-zoom inputs on focus —
// drops to `text-sm` from sm: upwards to keep desktop forms dense.
// `py-3` brings the input height to 44px minimum (touch-target guideline).
const BASE_INPUT =
  'w-full text-base sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 ' +
  'px-4 py-3 border border-slate-200 rounded-lg bg-white transition-colors ' +
  'focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 ' +
  'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed';

function inputClasses(invalid?: boolean, extra?: string) {
  return [
    BASE_INPUT,
    invalid ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:border-slate-400',
    extra || '',
  ].join(' ');
}

// ── Section card ────────────────────────────────────────────────────────

export interface SectionProps {
  /** Optional Lucide icon component (e.g. `Building2`). */
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  /** Right-aligned actions (e.g. a "Same as company address" toggle). */
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Section({
  icon: Icon,
  title,
  description,
  actions,
  children,
  className = '',
}: SectionProps) {
  return (
    <section
      className={`bg-white border border-slate-200 rounded-lg overflow-hidden ${className}`}
    >
      <header className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            {Icon ? <Icon className="w-5 h-5 text-slate-500 shrink-0" /> : null}
            <span className="truncate">{title}</span>
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>
      <div className="px-6 py-6 space-y-6">{children}</div>
    </section>
  );
}

// ── Field wrapper (label + child + error / hint) ────────────────────────

export interface FieldProps {
  label: string;
  required?: boolean;
  error?: string | false | null;
  hint?: string;
  htmlFor?: string;
  /** Pass `true` to render the children full-width without the label cell —
   * useful for inline `RadioGroup`-style controls. */
  bare?: boolean;
  children: React.ReactNode;
}

export function Field({
  label,
  required,
  error,
  hint,
  htmlFor,
  bare,
  children,
}: FieldProps) {
  if (bare) return <>{children}</>;
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-slate-700 mb-1.5"
      >
        {label}
        {required ? (
          <span className="text-red-500 ml-1" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

// ── Inputs ──────────────────────────────────────────────────────────────

type InputBaseProps = { invalid?: boolean };

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & InputBaseProps
>(function Input({ invalid, className, ...props }, ref) {
  return (
    <input
      ref={ref}
      {...props}
      className={inputClasses(invalid, className)}
    />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & InputBaseProps
>(function Textarea({ invalid, className, rows = 3, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      {...props}
      className={inputClasses(invalid, `resize-y min-h-[80px] ${className ?? ''}`)}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & InputBaseProps
>(function Select({ invalid, className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      {...props}
      className={inputClasses(invalid, `pr-10 ${className ?? ''}`)}
    >
      {children}
    </select>
  );
});

// ── Responsive grid for field rows ──────────────────────────────────────

/**
 * Two-column on desktop / tablet, single-column on mobile. Use to group
 * related short fields (city + zip + country, etc.) without bespoke grids
 * in every step.
 */
export function Grid2({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 ${className}`}>
      {children}
    </div>
  );
}

/** Three-column at lg+, two at sm, one on mobile. */
export function Grid3({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 ${className}`}
    >
      {children}
    </div>
  );
}

// ── ToggleButton — pill-style selectable chip with strong selected state
//
// Used for Business Type, Vendor Type, Market Type, Ownership Type etc.
// across the registration flow. Replaces the inline div+onClick pattern
// each step had drifted into, so every chip has the same a11y wiring
// (button, aria-pressed, focus ring) and visible state for hover / focus /
// active / selected / invalid. ─────────────────────────────────────────────

export interface ToggleButtonProps {
  selected?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  /** Optional small Lucide icon to render before the label. */
  icon?: React.ComponentType<{ className?: string }>;
}

export function ToggleButton({
  selected,
  invalid,
  disabled,
  onClick,
  icon: Icon,
  children,
  className = '',
}: ToggleButtonProps) {
  // `min-h-[44px]` + `py-3` guarantee a 44 × 44 touch target (accessibility
  // guideline) regardless of label length.
  const base =
    'group inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-3 rounded-full text-sm font-semibold border ' +
    'transition-all duration-200 ease-out ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.96]';

  const stateClasses = selected
    ? 'border-brand-500 bg-brand-500 text-white shadow-lg shadow-brand-500/20 hover:bg-brand-600 hover:border-brand-600'
    : invalid
      ? 'border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100'
      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`${base} ${stateClasses} ${className}`}
    >
      {Icon ? (
        <Icon
          className={`w-4 h-4 transition-all duration-200 shrink-0 ${
            selected
              ? 'text-white scale-110'
              : 'text-slate-400 group-hover:text-slate-600 group-hover:scale-110'
          }`}
        />
      ) : null}
      <span className="transition-transform duration-200">{children}</span>
    </button>
  );
}

// ── PhoneInput — country-code dropdown + national-number input ─────────
//
// Stores the combined E.164 value (e.g. "+919876543210") as one string so
// callers don't have to manage separate dial / national state. Defaults to
// the project's primary market (+91 India). Sorted by code length (desc)
// so prefix-matching picks the longest dial code first when parsing.

// Sourced from country-state-city (same package the checkout flow uses) so
// the dial-code list stays curated by the package rather than hand-maintained.
// `flag` is the regional-indicator emoji; `phoneCode` is normalised to start
// with "+". Some territories share dial codes (US/CA → +1), so the dropdown
// shows the full country name to disambiguate.
export interface PhoneCountry {
  code: string; // dial code with leading "+"
  iso: string;  // ISO-3166-1 alpha-2
  name: string;
  flag: string; // emoji
}

function buildCountryList(): PhoneCountry[] {
  return Country.getAllCountries()
    .map((c: ICountry) => {
      const raw = c.phonecode?.trim() ?? '';
      const code = raw.startsWith('+') ? raw : raw ? `+${raw}` : '';
      return {
        code,
        iso: c.isoCode,
        name: c.name,
        flag: c.flag ?? '',
      };
    })
    .filter((c) => c.code.length > 1) // drop entries with no dial code
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const PHONE_COUNTRY_CODES: PhoneCountry[] = buildCountryList();

const SORTED_CODES = [...PHONE_COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
const DEFAULT_DIAL = '+91';

/** Parse a stored E.164-ish string into a dial + national pair. */
export function parsePhone(value?: string | null): { dial: string; national: string } {
  if (!value) return { dial: DEFAULT_DIAL, national: '' };
  const trimmed = value.replace(/\s+/g, '');
  if (trimmed.startsWith('+')) {
    for (const c of SORTED_CODES) {
      if (trimmed.startsWith(c.code)) {
        return { dial: c.code, national: trimmed.slice(c.code.length).replace(/\D/g, '') };
      }
    }
  }
  return { dial: DEFAULT_DIAL, national: trimmed.replace(/\D/g, '') };
}

// ── Phone validation (per-country via libphonenumber-js) ────────────────
//
// PhoneInput stores values in E.164 form ("+91" + national digits). This
// helper parses that value and uses libphonenumber-js's country-specific
// rules to validate length, prefix, and shape — replacing the loose
// "+ digits" regex that accepted nonsense like "+1234".
//
// Reused by every step that has a phone field so the message wording stays
// consistent ("Please enter a valid phone number for India" etc.).
export interface ValidatePhoneOptions {
  /** When true, an empty value is an error. Defaults to false. */
  required?: boolean;
  /** Field label used in the "X is required" message. */
  label?: string;
  /**
   * Live-typing mode: the user is still typing, so "too short" should NOT
   * be flagged as invalid (they haven't finished yet). Only complete-length
   * errors (too long, wrong prefix, non-digit content) surface. Use this
   * from onChange handlers; leave false (default) for onBlur and submit.
   */
  isLive?: boolean;
}

export function validatePhoneE164(
  value: string,
  opts: ValidatePhoneOptions = {},
): string {
  const label = opts.label ?? 'Phone number';
  const required = opts.required ?? false;
  const isLive = opts.isLive ?? false;
  const trimmed = (value || '').replace(/\s/g, '');

  // Empty, or a bare dial code with no national digits ("+91")
  if (!trimmed || /^\+\d{1,4}$/.test(trimmed)) {
    // Required-empty errors are surfaced at submit/blur, not while typing
    return required && !isLive ? `${label} is required` : '';
  }

  // Must at least look like E.164 before handing to libphonenumber-js
  if (!/^\+\d{6,}$/.test(trimmed)) {
    // In live mode, "+918" is "still being typed", not "invalid"
    return isLive ? '' : `Please enter a valid ${label.toLowerCase()}`;
  }

  // In live mode, use length-only check first — let TOO_SHORT slide so we
  // don't shout at users mid-typing. TOO_LONG / NOT_A_NUMBER / wrong prefix
  // still surface immediately because those are real format errors.
  if (isLive) {
    const lengthCheck = validatePhoneNumberLength(trimmed);
    if (lengthCheck === 'TOO_SHORT' || lengthCheck === undefined) {
      // Either still typing OR length is plausibly valid — defer to strict
      // check only when length is in range
      if (lengthCheck === 'TOO_SHORT') return '';
    }
  }

  const parsed = parsePhoneNumberFromString(trimmed);
  if (!parsed || !parsed.isValid()) {
    const iso = parsed?.country;
    const countryName = iso
      ? PHONE_COUNTRY_CODES.find((c) => c.iso === iso)?.name
      : undefined;
    return countryName
      ? `Please enter a valid phone number for ${countryName}`
      : `Please enter a valid ${label.toLowerCase()}`;
  }

  return '';
}

export interface PhoneInputProps {
  value: string;
  onChange: (e164: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  name?: string;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
}

// Custom country dial picker — ARIA combobox pattern.
// Trigger button opens a popover containing a search input (role=combobox)
// linked to a listbox of countries. `aria-activedescendant` keeps focus on
// the search input while screen readers announce the highlighted option.
function CountryDialPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [flipUp, setFlipUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  const selected =
    PHONE_COUNTRY_CODES.find((c) => c.code === value) ?? PHONE_COUNTRY_CODES[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PHONE_COUNTRY_CODES;
    return PHONE_COUNTRY_CODES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.includes(q) ||
        c.iso.toLowerCase().includes(q)
    );
  }, [query]);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // On open: focus the search, highlight current selection, decide flip direction
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
      const idx = PHONE_COUNTRY_CODES.findIndex((c) => c.code === selected.code);
      setHighlight(idx >= 0 ? idx : 0);

      // Flip up if the trigger is in the bottom half of the viewport
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        // Prefer downward by default. The dropdown's max-height is ~360px
        // but the page can scroll, so we only flip up when there's clearly
        // insufficient room below (≤220px — fits search + ~3 list items)
        // AND substantially more room above. Otherwise the page scroll
        // takes care of any clipping.
        const MIN_BELOW = 220;
        const FLIP_MARGIN = 40;
        setFlipUp(spaceBelow < MIN_BELOW && spaceAbove > spaceBelow + FLIP_MARGIN);
      }
    } else {
      setQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep highlighted option scrolled into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const choose = (code: string) => {
    onChange(code);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setHighlight(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setHighlight(filtered.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) choose(filtered[highlight].code);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    } else if (e.key === 'Tab') {
      // Let Tab close the popover and continue tab order naturally
      setOpen(false);
    }
  };

  const activeOptionId = filtered[highlight] ? optionId(highlight) : undefined;

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={[
          'flex h-full cursor-pointer items-center gap-1.5 self-stretch rounded-l-md pl-2.5 pr-1.5',
          'text-sm text-slate-700',
          'transition-colors hover:bg-slate-50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/30',
          'disabled:cursor-not-allowed disabled:opacity-60',
          open ? 'bg-slate-50' : '',
        ].join(' ')}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={`Country code, currently ${selected.name} ${selected.code}. Press Enter to change.`}
      >
        <div
          className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200"
          aria-hidden="true"
        >
          {selected?.iso ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://flagcdn.com/w40/${selected.iso.toLowerCase()}.png`}
              alt=""
              className="h-full w-full scale-[1.25] object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-[10px]">🌐</span>
          )}
        </div>
        <span
          className="font-medium text-slate-700"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {selected.code}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className={[
            'absolute left-0 z-(--z-dropdown) w-[min(20rem,calc(100vw-2rem))]',
            'overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl ring-1 ring-black/5',
            flipUp ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]',
          ].join(' ')}
          role="dialog"
          aria-label="Choose country code"
        >
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              role="combobox"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Country or +code…"
              className="w-full bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none sm:text-sm"
              aria-label="Search countries"
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-expanded
              aria-activedescendant={activeOptionId}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              inputMode="search"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setHighlight(0);
                  searchRef.current?.focus();
                }}
                className="cursor-pointer rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                aria-label="Clear search"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* List or empty state */}
          {filtered.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm font-medium text-slate-700">No matches</p>
              <p className="mt-1 text-xs text-slate-500">
                Try a country name like &ldquo;India&rdquo; or a dial code like &ldquo;+91&rdquo;.
              </p>
            </div>
          ) : (
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label="Countries"
              className="max-h-72 overflow-y-auto py-1"
              style={{ overscrollBehavior: 'contain' }}
            >
              {filtered.map((c, i) => {
                const isSel = c.code === selected.code && c.iso === selected.iso;
                const isHi = i === highlight;
                return (
                  <li
                    key={`${c.iso}-${c.code}`}
                    id={optionId(i)}
                    role="option"
                    aria-selected={isSel}
                    onMouseEnter={() => setHighlight(i)}
                    onMouseDown={(e) => e.preventDefault()} /* keep search focused */
                    onClick={() => choose(c.code)}
                    className={[
                      'flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors',
                      isHi ? 'bg-slate-100' : '',
                      isSel ? 'text-brand-700 font-semibold' : 'text-slate-700',
                    ].join(' ')}
                    style={{ touchAction: 'manipulation' }}
                  >
                    <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-100 flex items-center justify-center shrink-0 bg-slate-100" aria-hidden="true">
                      {c?.iso ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`https://flagcdn.com/w40/${c.iso.toLowerCase()}.png`}
                          alt=""
                          className="w-full h-full object-cover scale-[1.25]"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-xs">🌐</span>
                      )}
                    </div>
                    <span className="flex-1 truncate text-slate-700 font-medium">{c.name}</span>
                    <span
                      className={`text-xs ${isSel ? 'text-brand-600' : 'text-slate-500'}`}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {c.code}
                    </span>
                    <span className="flex w-4 justify-end">
                      {isSel && (
                        <Check className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Keyboard hint footer — hidden on small screens to save room */}
          <div
            className="hidden items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-3 py-1.5 text-[11px] text-slate-500 sm:flex"
            aria-hidden="true"
          >
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-slate-300 bg-white px-1 font-mono text-[10px] text-slate-600">
                ↑↓
              </kbd>
              Navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-slate-300 bg-white px-1 font-mono text-[10px] text-slate-600">
                ↵
              </kbd>
              Select
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-slate-300 bg-white px-1 font-mono text-[10px] text-slate-600">
                Esc
              </kbd>
              Close
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function PhoneInput({
  value,
  onChange,
  onBlur,
  invalid,
  name,
  placeholder,
  autoComplete = 'tel',
  disabled,
}: PhoneInputProps) {
  const { dial, national } = parsePhone(value);

  // shadcn-country-dropdown phone-input style — unified h-10 field with
  // rounded-md border, the country trigger blends into the input (no
  // visible vertical divider), brand-red focus ring on focus-within.
  return (
    <div
      className={[
        'flex h-10 items-center rounded-md border bg-white shadow-sm transition-colors',
        'focus-within:ring-2 focus-within:ring-offset-0',
        invalid
          ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-500/25'
          : 'border-slate-200 hover:border-slate-300 focus-within:border-brand-500 focus-within:ring-brand-500/20',
        disabled ? 'cursor-not-allowed bg-slate-50 opacity-60' : '',
      ].join(' ')}
    >
      <CountryDialPicker
        value={dial}
        onChange={(code) => onChange(`${code}${national}`)}
        disabled={disabled}
      />
      <input
        type="tel"
        name={name}
        value={national}
        disabled={disabled}
        onBlur={onBlur}
        onChange={(e) => onChange(`${dial}${e.target.value.replace(/\D/g, '')}`)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode="tel"
        className="h-full min-w-0 flex-1 rounded-r-md bg-transparent pl-1.5 pr-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed sm:text-sm"
      />
    </div>
  );
}

// ── CountrySelect — shadcn-style country picker (full name in trigger) ──
// Same popover engine as CountryDialPicker (search, listbox, keyboard nav,
// flip-up positioning, click-outside) but the trigger shows the flag and
// full country name. Stores the country *name* (e.g. "India") as the
// value, so it can be a drop-in replacement for the legacy react-select
// driven by `react-select-country-list`.

export interface CountrySelectProps {
  /** Country name, e.g. "India". Matched against PHONE_COUNTRY_CODES.name. */
  value: string;
  onChange: (countryName: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Pass-through DOM id, e.g. for a `<label htmlFor>` link. */
  id?: string;
  ariaDescribedBy?: string;
}

export function CountrySelect({
  value,
  onChange,
  onBlur,
  invalid,
  disabled,
  placeholder = 'Select country…',
  id,
  ariaDescribedBy,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [flipUp, setFlipUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  const selected = PHONE_COUNTRY_CODES.find((c) => c.name === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PHONE_COUNTRY_CODES;
    return PHONE_COUNTRY_CODES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.includes(q) ||
        c.iso.toLowerCase().includes(q)
    );
  }, [query]);

  // Click-outside to close (and fire onBlur — react-select behavior parity)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onBlur]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
      const idx = selected
        ? PHONE_COUNTRY_CODES.findIndex((c) => c.iso === selected.iso)
        : 0;
      setHighlight(idx >= 0 ? idx : 0);
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        // Prefer downward by default. The dropdown's max-height is ~360px
        // but the page can scroll, so we only flip up when there's clearly
        // insufficient room below (≤220px — fits search + ~3 list items)
        // AND substantially more room above. Otherwise the page scroll
        // takes care of any clipping.
        const MIN_BELOW = 220;
        const FLIP_MARGIN = 40;
        setFlipUp(spaceBelow < MIN_BELOW && spaceAbove > spaceBelow + FLIP_MARGIN);
      }
    } else {
      setQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const choose = (countryName: string) => {
    onChange(countryName);
    setOpen(false);
    onBlur?.();
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setHighlight(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setHighlight(filtered.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) choose(filtered[highlight].name);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const activeOptionId = filtered[highlight] ? optionId(highlight) : undefined;

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid}
        aria-label={
          selected
            ? `Country, currently ${selected.name}. Press Enter to change.`
            : 'Select country'
        }
        className={[
          'flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-md border bg-white px-3 text-left text-sm shadow-sm',
          'transition-colors',
          'focus-visible:outline-none focus-visible:ring-2',
          'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60',
          invalid
            ? 'border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/25'
            : 'border-slate-200 hover:border-slate-300 focus-visible:border-brand-500 focus-visible:ring-brand-500/20',
          open && !invalid ? 'border-brand-500 ring-2 ring-brand-500/20' : '',
          open && invalid ? 'border-red-500 ring-2 ring-red-500/25' : '',
        ].join(' ')}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {selected ? (
            <>
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200"
                aria-hidden="true"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://flagcdn.com/w40/${selected.iso.toLowerCase()}.png`}
                  alt=""
                  className="h-full w-full scale-[1.25] object-cover"
                  loading="lazy"
                />
              </span>
              <span className="truncate text-slate-900">{selected.name}</span>
            </>
          ) : (
            <span className="truncate text-slate-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className={[
            'absolute left-0 right-0 z-(--z-dropdown)',
            'overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl ring-1 ring-black/5',
            flipUp ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]',
          ].join(' ')}
          role="dialog"
          aria-label="Choose country"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              role="combobox"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Country or +code…"
              className="w-full bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none sm:text-sm"
              aria-label="Search countries"
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-expanded
              aria-activedescendant={activeOptionId}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              inputMode="search"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setHighlight(0);
                  searchRef.current?.focus();
                }}
                className="cursor-pointer rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                aria-label="Clear search"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm font-medium text-slate-700">No matches</p>
              <p className="mt-1 text-xs text-slate-500">
                Try a country name like &ldquo;India&rdquo; or a dial code like &ldquo;+91&rdquo;.
              </p>
            </div>
          ) : (
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label="Countries"
              className="max-h-72 overflow-y-auto py-1"
              style={{ overscrollBehavior: 'contain' }}
            >
              {filtered.map((c, i) => {
                const isSel = !!selected && c.iso === selected.iso;
                const isHi = i === highlight;
                return (
                  <li
                    key={`${c.iso}-${c.code}`}
                    id={optionId(i)}
                    role="option"
                    aria-selected={isSel}
                    onMouseEnter={() => setHighlight(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(c.name)}
                    className={[
                      'flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors',
                      isHi ? 'bg-slate-100' : '',
                      isSel ? 'text-brand-700 font-semibold' : 'text-slate-700',
                    ].join(' ')}
                    style={{ touchAction: 'manipulation' }}
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200"
                      aria-hidden="true"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://flagcdn.com/w40/${c.iso.toLowerCase()}.png`}
                        alt=""
                        className="h-full w-full scale-[1.25] object-cover"
                        loading="lazy"
                      />
                    </span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span
                      className={`text-xs ${isSel ? 'text-brand-600' : 'text-slate-500'}`}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {c.code}
                    </span>
                    <span className="flex w-4 justify-end">
                      {isSel && (
                        <Check className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <div
            className="hidden items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-3 py-1.5 text-[11px] text-slate-500 sm:flex"
            aria-hidden="true"
          >
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-slate-300 bg-white px-1 font-mono text-[10px] text-slate-600">
                ↑↓
              </kbd>
              Navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-slate-300 bg-white px-1 font-mono text-[10px] text-slate-600">
                ↵
              </kbd>
              Select
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-slate-300 bg-white px-1 font-mono text-[10px] text-slate-600">
                Esc
              </kbd>
              Close
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AddressAutocomplete — type-to-search address suggestions ────────────
//
// Backed by Nominatim (OpenStreetMap) via `lib/addressSearch.ts`. The user
// types into a normal-looking input; results appear in a popover below.
// Picking one fires `onSelect` with the parsed address parts so callers
// can auto-fill Line 1, City, State, ZIP, and Country in one shot.
//
// Debounced 400ms so we don't hammer Nominatim's free endpoint. Aborts
// stale requests when the query changes again.

export interface AddressAutocompleteProps {
  onSelect: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export function AddressAutocomplete({
  onSelect,
  placeholder = 'Search address (e.g. 12 Anna Salai, Chennai)…',
  disabled,
  id,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  // Debounced search — fire 400ms after last keystroke
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setLoading(false);
      abortRef.current?.abort();
      return;
    }
    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      searchAddress(trimmed, controller.signal).then((items) => {
        if (controller.signal.aborted) return;
        setResults(items);
        setHighlight(0);
        setLoading(false);
        setOpen(true);
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Abort in-flight search on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  // Keep highlighted row in view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const choose = (s: AddressSuggestion) => {
    onSelect(s);
    setQuery('');
    setResults([]);
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.blur());
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) {
      if (e.key === 'Escape') setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(results.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[highlight]) choose(results[highlight]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  const activeOptionId = results[highlight] ? optionId(highlight) : undefined;

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <MapPin
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id={id}
          type="search"
          role="combobox"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length >= 3) setOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-controls={open ? listboxId : undefined}
          aria-expanded={open}
          aria-activedescendant={activeOptionId}
          className="w-full text-base sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 pl-10 pr-10 py-3 border border-slate-300 rounded-lg bg-white transition-colors hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 disabled:bg-slate-50 disabled:cursor-not-allowed"
        />
        {loading && (
          <Loader2
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-500 animate-spin"
            aria-label="Searching addresses"
          />
        )}
      </div>

      {open && (query.trim().length >= 3 || results.length > 0) && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-(--z-dropdown) overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl ring-1 ring-black/5"
          role="dialog"
          aria-label="Address suggestions"
        >
          {loading && results.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-slate-500">
              <Loader2 className="inline-block h-4 w-4 animate-spin mr-2 text-brand-500" aria-hidden="true" />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-sm font-medium text-slate-700">No matches</p>
              <p className="mt-1 text-xs text-slate-500">
                Try a more specific query, or fill the address manually below.
              </p>
            </div>
          ) : (
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label="Address suggestions"
              className="max-h-72 overflow-y-auto py-1"
              style={{ overscrollBehavior: 'contain' }}
            >
              {results.map((s, i) => {
                const isHi = i === highlight;
                return (
                  <li
                    key={s.id}
                    id={optionId(i)}
                    role="option"
                    aria-selected={isHi}
                    onMouseEnter={() => setHighlight(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(s)}
                    className={`flex cursor-pointer items-start gap-2.5 px-3 py-2.5 text-sm text-slate-700 transition-colors ${
                      isHi ? 'bg-slate-100' : ''
                    }`}
                    style={{ touchAction: 'manipulation' }}
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-slate-900 truncate">
                        {s.line1 || s.city || s.displayName.split(',')[0]}
                      </span>
                      <span className="block text-xs text-slate-500 truncate">
                        {s.displayName}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helper text block (the amber tip boxes some steps use) ─────────────

export function Hint({
  variant = 'info',
  children,
}: {
  variant?: 'info' | 'warning';
  children: React.ReactNode;
}) {
  const tone =
    variant === 'warning'
      ? 'bg-amber-50 border-amber-200 text-amber-900'
      : 'bg-blue-50 border-blue-200 text-blue-900';
  return (
    <div className={`text-sm border rounded-lg px-3 py-2 ${tone}`}>{children}</div>
  );
}

// ── AccordionSection ───────────────────────────────────────────────────
// Single-active-section accordion card matching the visual contract of
// Step 1's (CompanyDetails) inline AccordionSection: colored border per
// state, gradient header when open, colored icon bubble, status badge
// ("Done" / "In progress" / "Fix required"), rotating chevron, max-h
// body transition.
//
// Module-level on purpose — defining the same JSX inside the parent
// component would violate react-hooks/static-components (each render
// creates a fresh component identity, resetting state). Callers compute
// `isOpen` / `status` / `hasErrors` from their own state and pass them
// in; this component stays stateless apart from the children it renders.
//
// `headerExtra` is an optional slot that renders ABOVE the body, BELOW
// the header band — used for per-section action buttons that don't fit
// in the title row. Pass `null` (the default) when not needed.
export type AccordionSectionStatus = 'complete' | 'partial' | 'empty';
export interface AccordionSectionProps {
  id: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  isOpen: boolean;
  status: AccordionSectionStatus;
  hasErrors: boolean;
  onActivate: () => void;
  headerExtra?: ReactNode;
  children: ReactNode;
}
export function AccordionSection({
  id,
  icon,
  title,
  subtitle,
  isOpen,
  status,
  hasErrors,
  onActivate,
  headerExtra,
  children,
}: AccordionSectionProps) {
  return (
    <div
      className={`rounded-xl border transition-all duration-300 ${!isOpen ? 'overflow-hidden' : ''} ${
        isOpen
          ? 'border-brand-300 shadow-md shadow-brand-500/8'
          : hasErrors
            ? 'border-red-300 bg-red-50/30'
            : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onActivate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onActivate();
          }
        }}
        className={`w-full rounded-t-xl flex items-center gap-4 px-5 py-4 text-left transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 ${
          isOpen ? 'bg-linear-to-r from-brand-50/80 to-white' : 'bg-white hover:bg-slate-50/60'
        }`}
        aria-expanded={isOpen}
        aria-controls={`section-${id}`}
      >
        <div
          className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-200 ${
            isOpen
              ? 'bg-brand-500 text-white'
              : hasErrors
                ? 'bg-red-100 text-red-600'
                : status === 'complete'
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-slate-100 text-slate-500'
          }`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`font-semibold text-sm leading-tight ${
              isOpen ? 'text-brand-700' : 'text-slate-800'
            }`}
          >
            {title}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          {headerExtra && (
            <div className="mr-2" onClick={(e) => e.stopPropagation()}>
              {headerExtra}
            </div>
          )}
          {hasErrors && !isOpen && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-semibold">
              <AlertCircle className="w-3 h-3" aria-hidden="true" />
              Fix required
            </span>
          )}
          {!hasErrors && status === 'complete' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
              <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
              Done
            </span>
          )}
          {!hasErrors && status === 'partial' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
              In progress
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </div>
      </div>

      <div
        id={`section-${id}`}
        className={`transition-all duration-300 ${
          isOpen ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="px-5 pb-6 pt-2 space-y-5 border-t border-slate-100">{children}</div>
      </div>
    </div>
  );
}
