"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Check } from "lucide-react";
import { getCountries, getCountry, type CountryOption } from "./constants";

interface CountrySelectProps {
  value: string;
  onChange: (isoCode: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  ariaDescribedBy?: string;
}

export default function CountrySelect({
  value,
  onChange,
  onBlur,
  disabled,
  invalid,
  id,
  ariaDescribedBy,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const countries = useMemo(() => getCountries(), []);
  const selected = useMemo(() => getCountry(value), [value]);

  const filtered = useMemo<CountryOption[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.isoCode.toLowerCase().includes(q) ||
        c.phoneCode.includes(q)
    );
  }, [countries, query]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
        onBlur?.();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onBlur]);

  useEffect(() => {
    if (open) {
      // Focus search and reset highlight when opening
      setTimeout(() => inputRef.current?.focus(), 0);
      const initial = Math.max(0, filtered.findIndex((c) => c.isoCode === value));
      setActiveIndex(initial === -1 ? 0 : initial);
    } else {
      setQuery("");
    }
  }, [open]); // intentionally not depending on filtered/value to avoid resetting while typing

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const choose = (iso: string) => {
    onChange(iso);
    setOpen(false);
    setQuery("");
    onBlur?.();
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filtered[activeIndex];
      if (target) choose(target.isoCode);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
    }
  };

  const baseStyle =
    "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-gray-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed outline-none transition-colors text-left bg-white";
  const triggerStyle = invalid
    ? `${baseStyle} border-red-500 focus:border-red-500`
    : `${baseStyle} border-slate-300 focus:border-gray-500`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid}
        aria-describedby={ariaDescribedBy}
        className={`${triggerStyle} flex items-center justify-between gap-3`}
      >
        <span className="truncate">
          {selected ? `${selected.flag} ${selected.name}` : "Select country"}
        </span>
        <svg className="h-4 w-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleKey}
                placeholder="Search country, ISO code, or +phone code..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-gray-500 focus:ring-1 focus:ring-gray-500 outline-none"
              />
            </div>
          </div>

          <div ref={listRef} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-500">No countries match &quot;{query}&quot;</p>
            ) : (
              filtered.map((c, idx) => {
                const isSelected = c.isoCode === value;
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={c.isoCode}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-idx={idx}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => choose(c.isoCode)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-2 text-sm text-left transition-colors ${
                      isActive ? "bg-slate-100" : "bg-white"
                    } ${isSelected ? "font-semibold text-slate-900" : "text-slate-700"}`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="shrink-0">{c.flag}</span>
                      <span className="truncate">{c.name}</span>
                      <span className="text-xs text-slate-400 shrink-0">{c.phoneCode}</span>
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-gray-700 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
