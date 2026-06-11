'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import {
  DollarSign,
  ShoppingCart,
  Calendar,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  Loader2,
  Inbox,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import VendorDashboardService, {
  ChartPoint,
  ChartRange,
} from '@/services/vendorDashboardService';

interface AnalyticsData {
  revenue: { current: number; change: number };
  orders: { current: number; change: number };
}

interface AnalyticsOverviewProps {
  analytics: AnalyticsData;
  // earningsData is the initial server-rendered snapshot (last year, monthly).
  earningsData: { name: string; total: number }[];
}

const PRESETS: { value: ChartRange; label: string }[] = [
  { value: 'this_week', label: 'This week' },
  { value: 'last_week', label: 'Last week' },
  { value: 'last_month', label: 'Last 1 month' },
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'last_year', label: 'Last 1 year' },
  { value: 'last_3_years', label: 'Last 3 years' },
  { value: 'custom', label: 'Custom' },
];

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* ------------------------------------------------------------------ */
/* Themed dropdown (replaces native <select>)                          */
/* ------------------------------------------------------------------ */
function ThemedSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = options.find((o) => o.value === value)?.label ?? 'Select';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center justify-between gap-2 min-w-[130px] text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg pl-3 pr-2 py-1.5 shadow-xs transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500"
      >
        <span>{current}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-1.5 min-w-[160px] bg-white border border-slate-200 rounded-xl shadow-lg p-1"
        >
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  selected
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{opt.label}</span>
                {selected && <Check className="w-3.5 h-3.5 text-brand-500" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Calendar date picker (brand themed)                                 */
/* ------------------------------------------------------------------ */
function formatDate(d: Date | null) {
  if (!d) return 'dd/mm/yyyy';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function isSameDay(a: Date | null, b: Date | null) {
  return !!a && !!b && a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

function MiniDatePicker({
  value,
  onChange,
  placeholderLabel,
}: {
  value: Date | null;
  onChange: (d: Date | null) => void;
  placeholderLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Date>(value ?? new Date());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const year = view.getFullYear();
  const month = view.getMonth();
  const today = new Date();

  const cells = useMemo(() => {
    const startWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: { date: Date; current: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const dayNum = i - startWeekday + 1;
      const date = new Date(year, month, dayNum);
      result.push({ date, current: dayNum >= 1 && dayNum <= daysInMonth });
    }
    return result;
  }, [year, month]);

  return (
    <div ref={ref} className="relative">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{placeholderLabel}</span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-[140px] text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-xs transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500"
      >
        <Calendar className="w-4 h-4 text-brand-500 shrink-0" />
        <span className={value ? 'text-slate-700' : 'text-slate-400'}>{formatDate(value)}</span>
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">
              {view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setView(new Date(year, month - 1, 1))}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Previous month"
              >
                <ChevronUp className="w-4 h-4 text-slate-500" />
              </button>
              <button
                type="button"
                onClick={() => setView(new Date(year, month + 1, 1))}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Next month"
              >
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d, i) => (
              <div key={i} className="text-center text-xs font-semibold text-slate-500 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map(({ date, current }, i) => {
              const selected = isSameDay(date, value);
              const isToday = isSameDay(date, today);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onChange(date);
                    setView(date);
                    setOpen(false);
                  }}
                  className={`h-9 w-9 mx-auto flex items-center justify-center text-sm rounded-lg transition-colors ${
                    selected
                      ? 'bg-brand-500 text-white font-semibold'
                      : isToday
                        ? 'text-brand-600 font-semibold ring-1 ring-brand-200'
                        : current
                          ? 'text-slate-700 hover:bg-slate-100'
                          : 'text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(today);
                setView(today);
                setOpen(false);
              }}
              className="text-sm font-semibold text-brand-500 hover:text-brand-600 transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trend chart: owns its filter + fetches real aggregated data         */
/* ------------------------------------------------------------------ */
type TrendType = 'revenue' | 'orders';

function TrendChart({
  type,
  title,
  initialData,
}: {
  type: TrendType;
  title: string;
  initialData: ChartPoint[];
}) {
  const isRevenue = type === 'revenue';

  const [preset, setPreset] = useState<ChartRange>('last_year');
  const today = useMemo(() => new Date(), []);
  const [fromDate, setFromDate] = useState<Date | null>(new Date(today.getFullYear(), 0, 1));
  const [toDate, setToDate] = useState<Date | null>(today);

  const [data, setData] = useState<ChartPoint[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateError =
    preset === 'custom' && fromDate && toDate && fromDate > toDate
      ? 'Start date must be on or before end date'
      : null;

  const fetchData = useCallback(
    async (range: ChartRange, from: Date | null, to: Date | null) => {
      setLoading(true);
      setError(null);
      try {
        const params: { range: ChartRange; start?: string; end?: string } = { range };
        if (range === 'custom') {
          if (!from || !to) {
            setLoading(false);
            return;
          }
          // Normalise order so start <= end.
          const s = from <= to ? from : to;
          const e = from <= to ? to : from;
          params.start = toISODate(s);
          params.end = toISODate(e);
        }
        const res = await VendorDashboardService.getChartData(params);
        setData(res.data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load chart data');
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Fetch real aggregated data on mount (default: last year).
  useEffect(() => {
    fetchData('last_year', null, null);
  }, [fetchData]);

  const handlePreset = (value: string) => {
    const range = value as ChartRange;
    setPreset(range);
    if (range !== 'custom') {
      fetchData(range, null, null);
    } else {
      fetchData('custom', fromDate, toDate);
    }
  };

  const handleFrom = (d: Date | null) => {
    setFromDate(d);
    if (d && toDate && d <= toDate) fetchData('custom', d, toDate);
  };
  const handleTo = (d: Date | null) => {
    setToDate(d);
    if (fromDate && d && fromDate <= d) fetchData('custom', fromDate, d);
  };

  const hasData = data.length > 0 && data.some((d) => (isRevenue ? d.revenue : d.orders) > 0);

  return (
    <Card className="border border-slate-200/80 rounded-2xl shadow-xs">
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
          <span className={`p-2 rounded-lg ${isRevenue ? 'bg-emerald-50' : 'bg-blue-50'}`}>
            {isRevenue ? (
              <DollarSign className="w-5 h-5 text-emerald-600" />
            ) : (
              <ShoppingCart className="w-5 h-5 text-blue-500" />
            )}
          </span>
          {title}
        </CardTitle>

        <div className="flex flex-wrap items-end gap-2">
          <ThemedSelect value={preset} options={PRESETS} onChange={handlePreset} />
          {preset === 'custom' && (
            <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
              <MiniDatePicker value={fromDate} placeholderLabel="From" onChange={handleFrom} />
              <span className="text-xs font-medium text-slate-400 pb-1.5">to</span>
              <MiniDatePicker value={toDate} placeholderLabel="To" onChange={handleTo} />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {dateError && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm font-medium text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {dateError}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center text-slate-400" style={{ height: 300 }}>
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <span className="text-sm font-medium">Loading…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center text-red-500" style={{ height: 300 }}>
            <AlertCircle className="w-6 h-6 mb-2" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center text-slate-400" style={{ height: 300 }}>
            <Inbox className="w-7 h-7 mb-2" />
            <span className="text-sm font-medium">No Data Available</span>
            <span className="text-xs text-slate-400 mt-0.5">No records for the selected period</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            {isRevenue ? (
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            ) : (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value: any) => [`${value} orders`, 'Orders']}
                />
                <Bar dataKey="orders" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
export default function AnalyticsOverview({ earningsData }: AnalyticsOverviewProps) {
  // Map the server-rendered snapshot (name/total) into ChartPoint shape so the
  // charts have something to paint on first render before their own fetch.
  const initialRevenue: ChartPoint[] = useMemo(
    () => earningsData.map((d) => ({ name: d.name, revenue: d.total, orders: 0 })),
    [earningsData],
  );

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">Analytics Overview</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <TrendChart type="revenue" title="Revenue Trend" initialData={initialRevenue} />
        <TrendChart type="orders" title="Orders Trend" initialData={[]} />
      </div>
    </div>
  );
}
