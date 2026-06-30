'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

interface Option {
  value: string | number;
  label: string | number;
}

interface DropdownProps {
  id?: string;
  label?: string;
  value: string | string[];
  options: (string | number | Option)[];
  placeholder?: string;
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  error?: boolean | string;
  onBlur?: () => void;
  buttonClassName?: string;
}

export default function Dropdown({
  id, label, value, options, placeholder, onChange, multiple, disabled, error, onBlur, buttonClassName,
}: DropdownProps) {
  const normalized = useMemo(() =>
    options.map(opt => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { value: String(opt), label: String(opt) };
      }
      return { value: String(opt.value), label: String(opt.label) };
    }),
  [options]);

  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef   = useRef<HTMLButtonElement>(null);
  const listRef     = useRef<HTMLUListElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (open && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onBlur]);

  // Initialise focusedIndex to the currently-selected item (or 0) when opening
  useEffect(() => {
    if (open) {
      const currentValue = Array.isArray(value) ? value[0] : value;
      const idx = normalized.findIndex(o => o.value === currentValue);
      setFocusedIndex(idx >= 0 ? idx : 0);
    } else {
      setFocusedIndex(-1);
    }
    // Only re-run when open toggles — not on every value/normalized change,
    // otherwise focusedIndex resets while the user is navigating.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Move keyboard focus onto the list as soon as it appears
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  // Scroll the highlighted item into view when navigating with arrow keys
  useEffect(() => {
    if (!open || focusedIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[focusedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex, open]);

  const openDropdown = () => { if (!disabled) setOpen(true); };
  const toggleOpen   = () => { if (!disabled) setOpen(prev => !prev); };

  // Return focus to the trigger button (used after Escape; NOT after Tab)
  const returnFocus = () => setTimeout(() => buttonRef.current?.focus(), 0);

  const closeWithBlur = () => { setOpen(false); onBlur?.(); };

  const onSelectSingle = (val: string) => {
    onChange(val);
    closeWithBlur();
    returnFocus();
  };

  const onToggleMultiple = (val: string) => {
    const arr = Array.isArray(value) ? [...value] : [];
    const idx = arr.indexOf(val);
    if (idx >= 0) arr.splice(idx, 1); else arr.push(val);
    onChange(arr);
  };

  // Keyboard handler for the open list
  const onListKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(i => (i + 1) % normalized.length);
        break;

      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(i => (i - 1 + normalized.length) % normalized.length);
        break;

      case 'Enter':
      case ' ': // Space
        e.preventDefault();
        if (focusedIndex >= 0) {
          const val = normalized[focusedIndex].value;
          if (multiple) onToggleMultiple(val);
          else onSelectSingle(val);
        }
        break;

      case 'Tab':
        // Close the dropdown but do NOT preventDefault — let the browser move
        // focus to the next field in the natural tab order.
        closeWithBlur();
        break;

      case 'Escape':
        e.preventDefault();
        closeWithBlur();
        returnFocus();
        break;
    }
  };

  const renderButtonLabel = () => {
    if (multiple) {
      const arr = Array.isArray(value) ? value : [];
      if (arr.length === 0) return placeholder || 'Select';
      return normalized.filter(n => arr.includes(n.value)).map(n => n.label).join(', ');
    }
    const val = typeof value === 'string' ? value : (Array.isArray(value) ? value[0] : '');
    return val ? (normalized.find(n => n.value === val)?.label) : (placeholder || 'Select');
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-multiselectable={multiple || undefined}
        disabled={disabled}
        onClick={toggleOpen}
        onBlur={() => { if (!open) onBlur?.(); }}
        onKeyDown={(e) => {
          if (disabled) return;
          // Open on ArrowDown, ArrowUp, or Enter while the button is focused
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
            e.preventDefault();
            openDropdown();
          }
        }}
        className={`w-full text-left px-4 border flex items-center justify-between outline-none focus-visible:ring-1 focus-visible:ring-brand-500 transition-colors ${
          disabled
            ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
            : error
              ? 'bg-red-50 border-red-500'
              : 'bg-white border-slate-300 hover:border-slate-400 cursor-pointer'
        } ${buttonClassName || 'py-2 rounded-lg'}`}
      >
        <span className={
          Array.isArray(value)
            ? (value.length ? 'text-gray-900' : 'text-gray-500')
            : (value ? 'text-gray-900' : 'text-gray-500')
        }>
          {renderButtonLabel()}
        </span>
        <svg
          className={`ml-3 w-4 h-4 ${disabled ? 'text-gray-400' : 'text-gray-500'}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
        >
          <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && !disabled && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={focusedIndex >= 0 ? `${id}-option-${focusedIndex}` : undefined}
          aria-multiselectable={multiple || undefined}
          onKeyDown={onListKeyDown}
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto outline-none"
        >
          {normalized.map((opt, idx) => {
            const selected = multiple
              ? (Array.isArray(value) && value.includes(opt.value))
              : (value === opt.value);
            return (
              <li
                id={`${id}-option-${idx}`}
                key={opt.value}
                role="option"
                aria-selected={selected}
                onClick={() => (multiple ? onToggleMultiple(opt.value) : onSelectSingle(opt.value))}
                onMouseEnter={() => setFocusedIndex(idx)}
                className={`px-4 py-2 cursor-pointer flex items-center justify-between ${
                  focusedIndex === idx ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{opt.label}</span>
                {multiple && selected && (
                  <svg className="w-4 h-4 text-gray-900" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
