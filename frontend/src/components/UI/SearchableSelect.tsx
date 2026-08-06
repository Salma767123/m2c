'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export interface SearchableOption {
    value: string;
    label: string;
    /** Extra text to match against when filtering (e.g. a product SKU). */
    keywords?: string;
    /** Small muted line under the label (e.g. the SKU shown in the list). */
    hint?: string;
    /** Pin to the top and never filtered out (e.g. an "All products" entry). */
    pinned?: boolean;
}

interface Props {
    value: string;
    options: SearchableOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    disabled?: boolean;
    onChange: (value: string) => void;
    buttonClassName?: string;
}

// A styled, searchable single-select dropdown that matches the app's Dropdown UI
// (light popup, chevron trigger) but adds a filter box — search by label or keywords,
// or just scroll and click. Pinned options always show, above the filtered results.
export default function SearchableSelect({
    value, options, placeholder = 'Select…', searchPlaceholder = 'Search…', disabled, onChange, buttonClassName,
}: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selected = options.find((o) => o.value === value);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter((o) =>
            o.pinned ||
            o.label.toLowerCase().includes(q) ||
            (o.keywords || '').toLowerCase().includes(q)
        );
    }, [options, query]);

    // Close on outside click.
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (open && containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Focus the search box when the panel opens; reset the query when it closes.
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 0);
        else setQuery('');
    }, [open]);

    const pick = (v: string) => { onChange(v); setOpen(false); };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen((p) => !p)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={`w-full text-left px-4 border flex items-center justify-between outline-none focus-visible:ring-1 focus-visible:ring-brand-500 transition-colors ${
                    disabled
                        ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                        : 'bg-white border-slate-300 hover:border-slate-400 cursor-pointer'
                } ${buttonClassName || 'py-2 rounded-lg text-sm'}`}
            >
                <span className={`truncate ${selected ? 'text-gray-900' : 'text-gray-500'}`}>
                    {selected ? selected.label : placeholder}
                </span>
                <ChevronDown className={`ml-3 w-4 h-4 shrink-0 ${disabled ? 'text-gray-400' : 'text-gray-500'}`} />
            </button>

            {open && !disabled && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
                    {/* Search box */}
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Options */}
                    <ul role="listbox" className="max-h-60 overflow-auto py-1">
                        {filtered.length === 0 ? (
                            <li className="px-4 py-3 text-sm text-gray-400 text-center">No matches</li>
                        ) : (
                            filtered.map((o) => {
                                const isSel = o.value === value;
                                return (
                                    <li
                                        key={o.value}
                                        role="option"
                                        aria-selected={isSel}
                                        onClick={() => pick(o.value)}
                                        className={`px-4 py-2 cursor-pointer flex items-center justify-between gap-2 ${
                                            isSel ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-100'
                                        } ${o.pinned ? 'font-semibold' : ''}`}
                                    >
                                        <span className="min-w-0">
                                            <span className="block truncate">{o.label}</span>
                                            {o.hint && <span className="block text-xs text-gray-400 truncate">{o.hint}</span>}
                                        </span>
                                        {isSel && <Check className="w-4 h-4 shrink-0" />}
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
