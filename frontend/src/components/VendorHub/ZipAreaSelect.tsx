"use client";

import { useState, useRef, useEffect, useId } from "react";
import { ChevronDown } from "lucide-react";
import { type ZipPlace, zipPlaceLabel } from "@/lib/zipLookup";

interface ZipAreaSelectProps {
  places: ZipPlace[];
  value: string;
  onChange: (place: ZipPlace) => void;
  onBlur?: () => void;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
}

export function ZipAreaSelect({
  places,
  value,
  onChange,
  onBlur,
  invalid,
  disabled,
  id,
}: ZipAreaSelectProps) {
  const [open, setOpen] = useState(false);
  const [flipUp, setFlipUp] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  const selected = places.find((p) => p.area === value || zipPlaceLabel(p) === value) ?? places[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onBlur]);

  const toggleOpen = () => {
    if (disabled) return;
    if (!open) {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setFlipUp(window.innerHeight - rect.bottom < 220);
      setHighlight(places.findIndex((p) => p.area === value || zipPlaceLabel(p) === value));
    }
    setOpen((v) => !v);
  };

  const choose = (place: ZipPlace) => {
    onChange(place);
    setOpen(false);
    onBlur?.();
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (rect) setFlipUp(window.innerHeight - rect.bottom < 220);
        setHighlight(places.findIndex((p) => p.area === value || zipPlaceLabel(p) === value));
        setOpen(true);
      } else {
        setHighlight((h) =>
          e.key === 'ArrowDown' ? Math.min(h + 1, places.length - 1) : Math.max(h - 1, 0)
        );
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (open) {
        e.preventDefault();
        if (highlight >= 0 && highlight < places.length) choose(places[highlight]);
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
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        className={[
          "w-full flex items-center justify-between gap-2 text-sm font-medium px-4 py-2.5 border rounded-lg outline-none transition-colors duration-200",
          "focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500",
          "bg-white text-left",
          invalid
            ? "border-red-500 bg-red-50"
            : "border-slate-300 hover:border-slate-400",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        ].join(" ")}
      >
        <span className="truncate min-w-0">
          {selected ? zipPlaceLabel(selected) : "Select area…"}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className={[
            "absolute left-0 z-50 w-full rounded-lg border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 py-1 overflow-y-auto",
            flipUp ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]",
          ].join(" ")}
          style={{ maxHeight: "16rem", overscrollBehavior: "contain" }}
        >
          {places.map((p, i) => {
            const isSel = p.area === value || zipPlaceLabel(p) === value || (!value && i === 0);
            return (
              <li
                key={i}
                role="option"
                aria-selected={isSel}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p)}
                onMouseEnter={() => setHighlight(i)}
                className={[
                  "px-4 py-2.5 cursor-pointer text-sm transition-colors select-none",
                  highlight === i ? "bg-brand-50" : "",
                  isSel
                    ? "text-brand-700 font-semibold bg-brand-50"
                    : "text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                {zipPlaceLabel(p)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
