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

import React, { useState, useRef, useEffect, useMemo, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { ChevronDown, Check, Search, MapPin, Loader2, AlertCircle, CheckCircle2, Plus, X } from 'lucide-react';
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

  // shadcn-country-dropdown phone-input style — unified h-11 field with
  // rounded-md border, the country trigger blends into the input (no
  // visible vertical divider), brand-red focus ring on focus-within.
  return (
    <div
      className={[
        'flex h-11 items-center rounded-md border bg-white shadow-sm transition-colors',
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

// ── LocalLandlineInput — country dial code + STD/area code + number ──────
//
// "Option B" landline capture: the country code comes from the same curated
// dropdown PhoneInput uses (finite ISO list), while the STD/area code and the
// subscriber number are free-text — area codes are too numerous and varied to
// enumerate in a dropdown. The three segments live in one unified field shell
// so it sits flush beside PhoneInput. State is kept as three separate values
// (not a single combined string) because STD-code length varies, so splitting
// a combined string back out would be ambiguous.
export interface LocalLandlineValue {
  countryCode: string; // dial code with leading "+", e.g. "+91"
  std: string;         // STD / area / city code, e.g. "44"
  number: string;      // subscriber number, e.g. "28175000"
}

export function LocalLandlineInput({
  value,
  onChange,
  onBlur,
  invalid,
  disabled,
  name,
  locked,
}: {
  value: LocalLandlineValue;
  onChange: (v: LocalLandlineValue) => void;
  onBlur?: () => void;
  invalid?: boolean;
  disabled?: boolean;
  name?: string;
  locked?: boolean;
}) {
  const cc = value.countryCode || DEFAULT_DIAL;
  return (
    <div
      className={[
        'flex h-11 items-center rounded-md border bg-white shadow-sm transition-colors',
        'focus-within:ring-2 focus-within:ring-offset-0',
        invalid
          ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-500/25'
          : 'border-slate-200 hover:border-slate-300 focus-within:border-brand-500 focus-within:ring-brand-500/20',
        disabled ? 'cursor-not-allowed bg-slate-50 opacity-60' : '',
      ].join(' ')}
    >
      {locked ? (
        <span className="flex h-full shrink-0 items-center gap-1.5 rounded-l-md bg-slate-50 px-2.5 text-sm font-medium text-slate-700 select-none">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://flagcdn.com/w40/in.png" alt="" className="h-full w-full scale-[1.25] object-cover" loading="lazy" />
          </div>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>+91</span>
        </span>
      ) : (
        <CountryDialPicker
          value={cc}
          onChange={(code) => onChange({ ...value, countryCode: code })}
          disabled={disabled}
        />
      )}
      <span className="h-5 w-px shrink-0 bg-slate-200" aria-hidden="true" />
      <input
        type="tel"
        inputMode="numeric"
        value={value.std}
        disabled={disabled}
        onBlur={onBlur}
        onChange={(e) => onChange({ ...value, std: e.target.value.replace(/\D/g, '') })}
        placeholder="STD"
        aria-label="STD / area code"
        className="h-full w-16 min-w-0 bg-transparent px-2 text-center text-base text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed sm:text-sm"
      />
      <span className="h-5 w-px shrink-0 bg-slate-200" aria-hidden="true" />
      <input
        type="tel"
        inputMode="tel"
        name={name}
        value={value.number}
        disabled={disabled}
        onBlur={onBlur}
        onChange={(e) => onChange({ ...value, number: e.target.value.replace(/\D/g, '') })}
        placeholder="Landline number"
        className="h-full min-w-0 flex-1 rounded-r-md bg-transparent pl-2 pr-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed sm:text-sm"
      />
    </div>
  );
}

// ── Landline formatting helpers ─────────────────────────────────────────
//
// The main contact stores landlines in two shapes:
//   • Local:  localLandlineCountryCode + localLandlineStd + localLandline
//   • Intl:   intlLandline — a single E.164 string (same as PhoneInput)
// Older records only have a single `landline` string. `getLandlineDisplay`
// resolves all three so every display screen stays a one-liner with a
// built-in fallback to the legacy value.

export function formatLocalLandline(parts?: {
  countryCode?: string | null;
  std?: string | null;
  number?: string | null;
} | null): string {
  if (!parts) return '';
  const cc = (parts.countryCode || '').toString().trim();
  const std = (parts.std || '').toString().trim();
  const num = (parts.number || '').toString().trim();
  if (!num) return '';
  return [cc, std, num].filter(Boolean).join(' ');
}

export function formatIntlLandline(value?: string | null): string {
  if (!value) return '';
  const { dial, national } = parsePhone(value);
  if (!national) return '';
  return `${dial} ${national}`;
}

export function getLandlineDisplay(c?: {
  localLandlineCountryCode?: string | null;
  localLandlineStd?: string | null;
  localLandline?: string | null;
  intlLandline?: string | null;
  landline?: string | null;
} | null): { local: string; intl: string; legacy: string; hasNew: boolean } {
  if (!c) return { local: '', intl: '', legacy: '', hasNew: false };
  const local = formatLocalLandline({
    countryCode: c.localLandlineCountryCode,
    std: c.localLandlineStd,
    number: c.localLandline,
  });
  const intl = formatIntlLandline(c.intlLandline);
  const legacy = (c.landline || '').toString().trim();
  return { local, intl, legacy, hasNew: Boolean(local || intl) };
}

// ── Country flag helper ─────────────────────────────────────────────────
// Resolves a stored country NAME to its flag image (flagcdn, same source as
// the phone country picker) — used by the chips + the picker modal.
export function countryFlagUrl(name?: string | null): string | null {
  if (!name) return null;
  const c = PHONE_COUNTRY_CODES.find((x) => x.name === name);
  return c ? `https://flagcdn.com/w40/${c.iso.toLowerCase()}.png` : null;
}

// ── CountryPickerModal — searchable, multi-select country grid ──────────
//
// A modal of flag country cards (checkbox + flag + name) with a live search
// box and Cancel / Done actions. Selection is held in a local draft and only
// committed to the parent on Done, so Cancel/Esc discards. Backed by the same
// PHONE_COUNTRY_CODES list the rest of the form uses, and stores country
// NAMES (so the saved data shape is unchanged). Rendered through a portal to
// document.body so it overlays correctly regardless of accordion clipping.
export function CountryPickerModal({
  open,
  title,
  selected,
  onClose,
  onDone,
}: {
  open: boolean;
  title: string;
  selected: string[];
  onClose: () => void;
  onDone: (names: string[]) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<string[]>(selected);
  // Drives the exit animation: while closing we keep the modal mounted for a
  // beat so the fade / zoom-out can play before the parent unmounts it.
  const [closing, setClosing] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => setMounted(true), []);

  // Re-seed the working draft + clear the search each time the modal opens.
  useEffect(() => {
    if (open) {
      setDraft(selected);
      setQuery('');
      setClosing(false);
    }
    // Only re-seed on the open→true transition, not on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Play the exit animation, then run `after` (onClose / onDone) once it ends.
  const animateOut = useCallback((after: () => void) => {
    if (timerRef.current) return; // a close/done is already in flight
    setClosing(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setClosing(false);
      after();
    }, 180);
  }, []);

  const requestClose = useCallback(() => animateOut(onClose), [animateOut, onClose]);

  // Clear a pending exit timer if the component unmounts mid-animation.
  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  // Lock background scroll + wire Esc-to-close while open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, requestClose]);

  if (!mounted || !open) return null;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? PHONE_COUNTRY_CODES.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.includes(q) ||
          c.iso.toLowerCase() === q,
      )
    : PHONE_COUNTRY_CODES;

  const toggle = (name: string) =>
    setDraft((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center overflow-hidden p-0 sm:items-center sm:p-4">
      {/* Backdrop — dims + blurs the whole page (sidebar, header, content). */}
      <div
        className={`absolute inset-0 bg-slate-900/50 backdrop-blur-[6px] ${
          closing ? 'animate-out fade-out duration-150' : 'animate-in fade-in duration-200'
        }`}
        onClick={requestClose}
        aria-hidden="true"
      />
      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 flex w-full max-w-2xl max-h-[88vh] flex-col rounded-t-2xl bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-2xl ${
          closing
            ? 'animate-out fade-out zoom-out-95 slide-out-to-bottom-4 duration-150'
            : 'animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-200'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-slate-900">{title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{draft.length} selected</p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search countries..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ overscrollBehavior: 'contain' }}>
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-slate-700">No matches</p>
              <p className="mt-1 text-xs text-slate-500">
                Nothing matches &ldquo;{query}&rdquo;. Try another country name.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => {
                const sel = draft.includes(c.name);
                return (
                  <button
                    key={`${c.iso}-${c.code}`}
                    type="button"
                    onClick={() => toggle(c.name)}
                    aria-pressed={sel}
                    className={[
                      'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all duration-150',
                      sel
                        ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                        sel ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 bg-white',
                      ].join(' ')}
                    >
                      {sel && <Check className="h-3 w-3" />}
                    </span>
                    <span className="h-4 w-6 shrink-0 overflow-hidden rounded-sm border border-slate-100 bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://flagcdn.com/w40/${c.iso.toLowerCase()}.png`}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </span>
                    <span className="truncate text-sm font-medium text-slate-700">{c.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5">
          <button
            type="button"
            onClick={() => setDraft([])}
            className="text-xs font-semibold text-slate-500 transition-colors hover:text-slate-700 disabled:opacity-40"
            disabled={draft.length === 0}
          >
            Clear all
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={requestClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => animateOut(() => onDone(draft))}
              className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 transition-colors hover:bg-brand-600"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── CountryMultiSelect — "+ Select…" button + chips + picker modal ──────
//
// Drop-in replacement for the old multi-select dropdown. Stores an array of
// country NAMES (unchanged data shape), shows each pick as a flag chip with a
// remove ✕, and opens CountryPickerModal to add/edit the selection.
export function CountryMultiSelect({
  label,
  buttonLabel,
  value,
  onChange,
  onBlur,
  invalid,
  emptyHint,
}: {
  label: string;
  buttonLabel: string;
  value: string[];
  onChange: (names: string[]) => void;
  onBlur?: () => void;
  invalid?: boolean;
  emptyHint?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          'inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
          invalid
            ? 'border-red-400 bg-red-50 text-red-600 hover:bg-red-100'
            : 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100',
        ].join(' ')}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {buttonLabel}
      </button>

      {value.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {value.map((name) => {
            const flag = countryFlagUrl(name);
            return (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 pl-2 pr-1 text-sm text-slate-700 shadow-sm"
              >
                {flag && (
                  <span className="h-3.5 w-5 shrink-0 overflow-hidden rounded-sm border border-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={flag} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </span>
                )}
                <span className="font-medium">{name}</span>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((n) => n !== name))}
                  className="ml-0.5 rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                  aria-label={`Remove ${name}`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            );
          })}
        </div>
      ) : (
        emptyHint && <p className="mt-2 text-xs text-slate-400">{emptyHint}</p>
      )}

      <CountryPickerModal
        open={open}
        title={label}
        selected={value}
        onClose={() => setOpen(false)}
        onDone={(names) => {
          onChange(names);
          setOpen(false);
          onBlur?.();
        }}
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

// ── AccordionSection (always-open section card) ─────────────────────────
// NOTE: despite the name, this no longer collapses — every section is
// permanently expanded so the whole step is visible at once (better
// scanning, no hidden fields, and none of the collapse-state bugs:
// focus loss, empty "Fix required" bars, etc.). The header is now a
// static label (icon bubble + title/subtitle + status badge), not a
// toggle button.
//
// The `isOpen` / `onActivate` props are kept on the interface for
// backwards-compatibility (callers still pass them) but are intentionally
// ignored — the body always renders. Status badge: "Fix Error" on
// error, else "Completed" / "In Progress" from `status`.
//
// `headerExtra` is an optional action slot rendered on the header's right
// edge. Pass `null` (the default) when not needed.
export type AccordionSectionStatus = 'complete' | 'partial' | 'empty';
export interface AccordionSectionProps {
  id: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  /** @deprecated sections are always open — kept for caller compatibility. */
  isOpen?: boolean;
  status: AccordionSectionStatus;
  hasErrors: boolean;
  /** @deprecated sections are always open — kept for caller compatibility. */
  onActivate?: () => void;
  headerExtra?: ReactNode;
  children: ReactNode;
}
export function AccordionSection({
  id,
  icon,
  title,
  subtitle,
  status,
  hasErrors,
  headerExtra,
  children,
}: AccordionSectionProps) {
  return (
    <div
      aria-labelledby={`section-${id}-title`}
      className={`scroll-mt-44 md:scroll-mt-32 rounded-xl border bg-white transition-colors duration-200 ${
        hasErrors ? 'border-red-300' : 'border-slate-200'
      }`}
    >
      <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100">
        <div
          className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg ${
            hasErrors
              ? 'bg-red-100 text-red-600'
              : status === 'complete'
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-brand-50 text-brand-600'
          }`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p
            id={`section-${id}-title`}
            className="font-semibold text-sm leading-tight text-slate-800"
          >
            {title}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          {headerExtra}
          {hasErrors ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-semibold">
              <AlertCircle className="w-3 h-3" aria-hidden="true" />
              Fix Error
            </span>
          ) : status === 'complete' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
              <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
              Completed
            </span>
          ) : status === 'partial' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
              In Progress
            </span>
          ) : null}
        </div>
      </div>

      <div id={`section-${id}`} className="px-5 pb-6 pt-5 space-y-5">
        {children}
      </div>
    </div>
  );
}

// ── TitleSelect — compact popover for Mr. / Mrs. / Ms. ──────────────────────
// Matches the CountrySelect trigger design: h-10, rounded-md, shadow-sm,
// border-slate-200, brand-500 focus ring and open ring. No search needed
// since there are only three options.

const TITLE_OPTIONS = ['Mr.', 'Mrs.', 'Ms.'];

export interface TitleSelectProps {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  id?: string;
  disabled?: boolean;
}

export function TitleSelect({ value, onChange, onBlur, id, disabled }: TitleSelectProps) {
  const [open, setOpen] = useState(false);
  const [flipUp, setFlipUp] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const ALL_OPTIONS = ['', ...TITLE_OPTIONS];

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

  const toggle = () => {
    if (disabled) return;
    if (!open) {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setFlipUp(window.innerHeight - rect.bottom < 160);
      setHighlight(ALL_OPTIONS.indexOf(value));
    }
    setOpen((v) => !v);
  };

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
    onBlur?.();
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (rect) setFlipUp(window.innerHeight - rect.bottom < 160);
        setHighlight(ALL_OPTIONS.indexOf(value));
        setOpen(true);
      } else {
        setHighlight((h) => {
          const next = e.key === 'ArrowDown'
            ? Math.min(h + 1, ALL_OPTIONS.length - 1)
            : Math.max(h - 1, 0);
          return next;
        });
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (open) {
        e.preventDefault();
        if (highlight >= 0) choose(ALL_OPTIONS[highlight]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      onBlur?.();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={toggle}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        className={[
          'flex h-10 w-full cursor-pointer items-center justify-between gap-1.5 rounded-md border bg-white px-3 text-left text-sm shadow-sm',
          'transition-colors focus-visible:outline-none focus-visible:ring-2',
          'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60',
          open
            ? 'border-brand-500 ring-2 ring-brand-500/20'
            : 'border-slate-200 hover:border-slate-300 focus-visible:border-brand-500 focus-visible:ring-brand-500/20',
        ].join(' ')}
      >
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>
          {value || 'Title'}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Title options"
          className={[
            'absolute left-0 z-50 min-w-full rounded-lg border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 py-1 overflow-hidden',
            flipUp ? 'bottom-[calc(100%+4px)]' : 'top-[calc(100%+4px)]',
          ].join(' ')}
        >
          {ALL_OPTIONS.map((opt, i) => (
            <li
              key={i}
              role="option"
              aria-selected={value === opt}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(opt)}
              onMouseEnter={() => setHighlight(i)}
              className={[
                'px-3 py-2 cursor-pointer text-sm transition-colors select-none',
                highlight === i ? 'bg-brand-50' : '',
                value === opt ? 'text-brand-700 font-semibold bg-brand-50' : i === 0 ? 'text-slate-500 hover:bg-slate-50' : 'text-slate-700 hover:bg-slate-50',
              ].join(' ')}
            >
              {opt === '' ? '—' : opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
