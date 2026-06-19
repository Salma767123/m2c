"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar, X } from "lucide-react";

interface DateRangeCalendarProps {
  /** Inclusive range start, formatted YYYY-MM-DD ("" = unset). */
  from: string;
  /** Inclusive range end, formatted YYYY-MM-DD ("" = unset). */
  to: string;
  /** Called with both endpoints (YYYY-MM-DD) once a selection is committed, or "","" on clear. */
  onChange: (from: string, to: string) => void;
  placeholder?: string;
  align?: "left" | "right";
  /** Override the trigger's sizing/border (e.g. to match sibling controls). */
  triggerClassName?: string;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const pad = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (s: string): Date | null => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};
const dayDiff = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 86400000);
const sameDay = (a: Date | null, b: Date | null) =>
  !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function DateRangeCalendar({
  from,
  to,
  onChange,
  placeholder = "Filter by date",
  align = "right",
  triggerClassName,
}: DateRangeCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(parseKey(from) || new Date());
  // Selection-in-progress endpoints. While dragging/picking these override the committed props.
  const [anchor, setAnchor] = useState<Date | null>(null);
  const [hover, setHover] = useState<Date | null>(null);
  const isDownRef = useRef(false);
  const movedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const committedStart = parseKey(from);
  const committedEnd = parseKey(to);

  // Active range: mid-selection (anchor set) wins, otherwise show committed props.
  let rangeStart: Date | null;
  let rangeEnd: Date | null;
  if (anchor) {
    const other = hover || anchor;
    rangeStart = dayDiff(anchor, other) <= 0 ? anchor : other;
    rangeEnd = dayDiff(anchor, other) <= 0 ? other : anchor;
  } else {
    rangeStart = committedStart;
    rangeEnd = committedEnd;
  }

  const commit = useCallback(
    (a: Date, b: Date) => {
      const start = dayDiff(a, b) <= 0 ? a : b;
      const end = dayDiff(a, b) <= 0 ? b : a;
      onChange(toKey(start), toKey(end));
    },
    [onChange]
  );

  // End-of-drag: a global mouseup commits whatever endpoints the drag produced.
  useEffect(() => {
    const onUp = () => {
      if (!isDownRef.current) return;
      isDownRef.current = false;
      if (movedRef.current && anchor) {
        commit(anchor, hover || anchor);
        setAnchor(null);
        setHover(null);
      }
      // If it was a plain click (no drag), anchor stays so a second click completes the range.
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, [anchor, hover, commit]);

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isOpen]);

  const openCalendar = () => {
    setViewDate(committedStart || new Date());
    setAnchor(null);
    setHover(null);
    setIsOpen(true);
  };

  const handleDayDown = (day: Date) => {
    isDownRef.current = true;
    movedRef.current = false;
    if (anchor) {
      // Second click of a click-click selection → complete the range immediately.
      commit(anchor, day);
      setAnchor(null);
      setHover(null);
      isDownRef.current = false;
    } else {
      setAnchor(day);
      setHover(day);
    }
  };

  const handleDayEnter = (day: Date) => {
    if (isDownRef.current && anchor) {
      movedRef.current = true;
      setHover(day);
    }
  };

  const handleClear = () => {
    setAnchor(null);
    setHover(null);
    onChange("", "");
  };

  const inRange = (d: Date) =>
    !!rangeStart && !!rangeEnd && dayDiff(d, rangeStart) >= 0 && dayDiff(d, rangeEnd) <= 0;

  // Build the month grid (leading blanks + days).
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();

  const triggerLabel = (() => {
    if (committedStart && committedEnd) {
      const s = committedStart;
      const e = committedEnd;
      const sameYear = s.getFullYear() === e.getFullYear();
      const left = `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]}${sameYear ? "" : " " + s.getFullYear()}`;
      const right = `${e.getDate()} ${MONTHS_SHORT[e.getMonth()]} ${e.getFullYear()}`;
      return sameDay(s, e) ? right : `${left} – ${right}`;
    }
    return placeholder;
  })();

  const hasValue = !!(committedStart && committedEnd);

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex items-center gap-2 border rounded-lg bg-white transition-colors ${
          triggerClassName
            ? `${triggerClassName} ${isOpen ? "border-brand-300 ring-1 ring-brand-200" : ""}`
            : `px-3 py-1.5 ${isOpen ? "border-brand-300 ring-1 ring-brand-200" : "border-slate-200"}`
        }`}
      >
        <button
          type="button"
          onClick={() => (isOpen ? setIsOpen(false) : openCalendar())}
          className="flex items-center gap-2 text-sm focus:outline-none"
          aria-label="Select date range"
        >
          <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
          <span className={hasValue ? "text-slate-700" : "text-slate-400"}>{triggerLabel}</span>
        </button>
        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-md transition-colors"
            aria-label="Clear date filter"
            title="Clear date filter"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          className={`absolute z-50 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-4 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <h3 className="text-sm font-bold text-slate-900">
              {MONTHS_LONG[month]} {year}
            </h3>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d, i) => (
              <div key={i} className="text-center text-[11px] font-semibold text-slate-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days — drag across to select a range, or click start then click end. */}
          <div className="grid grid-cols-7 select-none">
            {cells.map((d, i) => {
              if (!d) return <div key={`b-${i}`} className="h-9" />;
              const isStart = sameDay(d, rangeStart);
              const isEnd = sameDay(d, rangeEnd);
              const isEndpoint = isStart || isEnd;
              const within = inRange(d);
              const isSingle = isStart && isEnd;
              const isTodayCell = sameDay(d, today);

              // Continuous band: light bg on the wrapper, rounded on the range edges.
              let wrapClass = "";
              if (within && !isSingle) {
                wrapClass = "bg-brand-50";
                if (isStart) wrapClass += " rounded-l-full";
                if (isEnd) wrapClass += " rounded-r-full";
              }

              const dayClass = isEndpoint
                ? "bg-brand-500 text-white font-semibold"
                : within
                ? "text-brand-700 hover:bg-brand-100"
                : isTodayCell
                ? "text-brand-600 font-semibold hover:bg-slate-100"
                : "text-slate-700 hover:bg-slate-100";

              return (
                <div key={toKey(d)} className={`h-9 flex items-center justify-center ${wrapClass}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleDayDown(d);
                    }}
                    onMouseEnter={() => handleDayEnter(d)}
                    className={`w-8 h-8 flex items-center justify-center text-sm rounded-full transition-colors ${dayClass}`}
                  >
                    {d.getDate()}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClear}
              className="text-sm text-slate-500 hover:text-brand-500 font-medium transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-sm bg-brand-500 hover:bg-brand-600 text-white font-semibold py-1.5 px-4 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
