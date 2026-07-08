// React Native port of the web QC portal's shared DateRangeCalendar
// (frontend/src/components/Shared/DateRangeCalendar.tsx).
//
// Same props API as the web component so callers can be written identically:
//   <DateRangeCalendar from={from} to={to} onChange={(f, t) => ...} placeholder="Date" />
//
// Dates are exchanged as 'YYYY-MM-DD' strings (empty string = unset), exactly
// like the web. Tapping a day applies immediately via onChange (web behavior);
// "Done" simply closes the picker and "Clear" resets both endpoints.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, Modal } from 'react-native';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react-native';

export const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseDate = (s: string) => new Date(s + 'T00:00:00');
export const prettyDate = (s: string) =>
  s ? parseDate(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export interface DateRangeCalendarProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  placeholder?: string;
}

export default function DateRangeCalendar({
  from,
  to,
  onChange,
  placeholder = 'Date',
}: DateRangeCalendarProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Date>(() => (from ? parseDate(from) : new Date()));

  const openPicker = () => {
    // Re-anchor the visible month on the current selection each time we open
    setView(from ? parseDate(from) : new Date());
    setOpen(true);
  };

  const handleDayPress = (day: Date) => {
    const ds = fmtDate(day);
    // Start a fresh range if none started or a full range already exists.
    if (!from || (from && to)) {
      onChange(ds, '');
    } else {
      // from is set, to is empty → set the second endpoint
      if (parseDate(ds) < parseDate(from)) {
        onChange(ds, from);
      } else {
        onChange(from, ds);
      }
    }
  };

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [
    ...Array.from({ length: firstWeekday }, () => null as Date | null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const fromD = from ? parseDate(from) : null;
  const toD = to ? parseDate(to) : null;
  const inRange = (d: Date) => !!(fromD && toD && d >= fromD && d <= toD);
  const isEndpoint = (d: Date) =>
    !!((fromD && fmtDate(d) === from) || (toD && fmtDate(d) === to));

  const label = from
    ? to
      ? `${prettyDate(from)} – ${prettyDate(to)}`
      : `${prettyDate(from)} – …`
    : placeholder;

  // Group day cells into weeks of 7 for the RN grid layout
  const weeks: Array<Array<Date | null>> = [];
  for (let i = 0; i < cells.length; i += 7) {
    const week = cells.slice(i, i + 7);
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  return (
    <>
      {/* Trigger field */}
      <Pressable
        onPress={openPicker}
        className={`w-full flex-row items-center rounded-xl border bg-white px-3 py-3 ${
          from ? 'border-blue-300' : 'border-slate-200'
        }`}
      >
        <Calendar size={16} color="#94a3b8" />
        <Text
          className={`ml-2 flex-1 text-sm font-medium ${from ? 'text-slate-700' : 'text-slate-500'}`}
          numberOfLines={1}
        >
          {label}
        </Text>
        {!!from && (
          <TouchableOpacity
            onPress={() => onChange('', '')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Clear date filter"
            className="rounded p-0.5"
          >
            <X size={14} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </Pressable>

      {/* Calendar popup */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        {/* Backdrop — tap outside closes, like the web's document click */}
        <Pressable
          onPress={() => setOpen(false)}
          className="flex-1 items-center justify-center bg-black/40 px-6"
        >
          {/* Stop backdrop press from closing when tapping the card itself */}
          <Pressable onPress={() => {}} className="w-full max-w-[320px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
            {/* Month navigation */}
            <View className="mb-2 flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => setView(new Date(year, month - 1, 1))}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                className="rounded-lg p-1.5"
              >
                <ChevronLeft size={18} color="#64748b" />
              </TouchableOpacity>
              <Text className="text-sm font-semibold text-slate-800">
                {MONTHS[month]} {year}
              </Text>
              <TouchableOpacity
                onPress={() => setView(new Date(year, month + 1, 1))}
                accessibilityRole="button"
                accessibilityLabel="Next month"
                className="rounded-lg p-1.5"
              >
                <ChevronRight size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Weekday header */}
            <View className="mb-1 flex-row">
              {WEEKDAYS.map((w) => (
                <View key={w} className="flex-1 items-center py-1">
                  <Text className="text-[10px] font-bold uppercase text-slate-400">{w}</Text>
                </View>
              ))}
            </View>

            {/* Day grid */}
            {weeks.map((week, wi) => (
              <View key={`w-${wi}`} className="flex-row">
                {week.map((d, di) =>
                  d === null ? (
                    <View key={`e-${wi}-${di}`} className="h-9 flex-1" />
                  ) : (
                    <View key={fmtDate(d)} className="flex-1 items-center">
                      <TouchableOpacity
                        onPress={() => handleDayPress(d)}
                        className={`h-9 w-9 items-center justify-center rounded-lg ${
                          isEndpoint(d)
                            ? 'bg-blue-600'
                            : inRange(d)
                            ? 'bg-blue-50'
                            : ''
                        }`}
                      >
                        <Text
                          className={`text-sm ${
                            isEndpoint(d)
                              ? 'font-semibold text-white'
                              : inRange(d)
                              ? 'text-blue-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {d.getDate()}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )
                )}
              </View>
            ))}

            {/* Footer actions */}
            <View className="mt-3 flex-row items-center justify-between border-t border-slate-100 pt-3">
              <TouchableOpacity
                onPress={() => onChange('', '')}
                className="px-2 py-1.5"
              >
                <Text className="text-xs font-medium text-slate-500">Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                className="rounded-lg bg-blue-600 px-3 py-1.5"
              >
                <Text className="text-xs font-semibold text-white">Done</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
