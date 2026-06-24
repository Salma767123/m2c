'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/UI/Table';
import Dropdown from '@/components/UI/Dropdown';
import {
  BarChart3,
  Download,
  TrendingUp,
  DollarSign,
  Package,
  Boxes,
  ShoppingCart,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  FileText,
  PieChart,
  Activity,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import vendorReportsService, { ReportPeriod } from '@/services/vendorReportsService';
import DateRangeCalendar from '@/components/Shared/DateRangeCalendar';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportTab = 'overview' | 'orders';
type MetricKey = 'revenue' | 'orders' | 'stock' | 'products';

// Distinct colour per order status so every slice of the Order Status
// Distribution pie is visually unique (keyed by the space-separated label the
// API sends, e.g. "PACKED BY VENDOR"). Unmapped statuses fall back to a
// well-spaced palette by index so two slices never share a colour.
const ORDER_STATUS_COLORS: Record<string, string> = {
  'ORDER CREATED': '#3b82f6',           // blue
  'VENDOR PROCESSING': '#f59e0b',       // amber
  'PACKED BY VENDOR': '#8b5cf6',        // violet
  'IN TRANSIT TO ADMIN HUB': '#06b6d4', // cyan
  'RECEIVED AT ADMIN HUB': '#ec4899',   // pink
  'APPROVED BY ADMIN HUB': '#14b8a6',   // teal
  'REJECTED BY ADMIN HUB': '#ef4444',   // red
  'SHIPPED TO CUSTOMER': '#0ea5e9',     // sky
  'DELIVERED': '#22c55e',               // green
  'CANCELLED': '#64748b',               // slate
};
const STATUS_FALLBACK_PALETTE = ['#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#0ea5e9', '#a855f7', '#64748b'];

const statusColor = (status: string, index: number): string =>
  ORDER_STATUS_COLORS[String(status).toUpperCase()] || STATUS_FALLBACK_PALETTE[index % STATUS_FALLBACK_PALETTE.length];

const METRIC_LABELS: Record<MetricKey, string> = {
  revenue: 'Revenue Breakdown',
  orders: 'Orders',
  stock: 'Stock by Product',
  products: 'Products Listed',
};

// Table columns whose values should render as INR currency.
const CURRENCY_COLUMNS = new Set(['Amount', 'Revenue', 'Base Price']);

const PAGE_SIZE = 10;

function getPageRange(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | '…'> = [1];
  if (current > 4) pages.push('…');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < total - 3) pages.push('…');
  pages.push(total);
  return pages;
}

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: '3months', label: 'Last 3 Months' },
  { value: '6months', label: 'Last 6 Months' },
  { value: '1year', label: 'Last Year' },
];

// Compact INR for axis ticks. Scales to k / L (lakh) / Cr (crore) and keeps
// small values readable (e.g. ₹250 instead of collapsing to ₹0k).
const formatRevenueTick = (value: number) => {
  const v = Number(value) || 0;
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(v % 1_00_00_000 === 0 ? 0 : 1)}Cr`;
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(v % 1_00_000 === 0 ? 0 : 1)}L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1)}k`;
  return `₹${Math.round(v)}`;
};

const calcChange = (current: number, previous: number) =>
  previous === 0 ? '0.0' : (((current - previous) / previous) * 100).toFixed(1);

const TrendChip = ({ current, previous }: { current: number; previous: number }) => {
  const change = calcChange(current, previous);
  const val = parseFloat(change);
  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${val > 0 ? 'text-green-600' : val < 0 ? 'text-red-600' : 'text-slate-500'}`}>
      {val > 0 ? <ArrowUp className="w-3.5 h-3.5" /> : val < 0 ? <ArrowDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
      <span>{Math.abs(val)}%</span>
      <span className="text-slate-400 ml-0.5">vs last</span>
    </div>
  );
};

const STATUS_BADGE: Record<string, string> = {
  DELIVERED: 'bg-green-50 text-green-700 border-green-200',
  APPROVED_BY_ADMIN_HUB: 'bg-green-50 text-green-700 border-green-200',
  ORDER_CREATED: 'bg-slate-50 text-slate-700 border-slate-200',
  VENDOR_PROCESSING: 'bg-blue-50 text-blue-700 border-blue-200',
  PACKED_BY_VENDOR: 'bg-purple-50 text-purple-700 border-purple-200',
  IN_TRANSIT_TO_ADMIN_HUB: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  RECEIVED_AT_ADMIN_HUB: 'bg-teal-50 text-teal-700 border-teal-200',
  REJECTED_BY_ADMIN_HUB: 'bg-orange-50 text-orange-700 border-orange-200',
  SHIPPED_TO_CUSTOMER: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = status?.toUpperCase();
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap border ${STATUS_BADGE[s] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

const TABLE_HEADER_CLASS =
  '!bg-slate-50/80 !border-slate-200/80 [&_tr]:border-b [&_tr]:border-slate-200/80 [&_th]:!text-slate-500 [&_th]:font-bold [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:h-11';

const Pagination = ({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) => (
  <div className="flex items-center justify-end gap-3 text-sm px-5 py-3 border-t border-slate-200">
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
      {getPageRange(page, totalPages).map((p, i) => p === '…' ? (<span key={`e-${i}`} className="px-2 text-slate-400">…</span>) : (<button key={`p-${p}`} onClick={() => onChange(p as number)} aria-current={p === page ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-brand-500 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
      <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
    </div>
  </div>
);

export default function VendorReports() {
  const [reportType, setReportType] = useState<ReportTab>('overview');
  const [period, setPeriod] = useState<ReportPeriod>('30days');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [ordersPage, setOrdersPage] = useState(1);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('revenue');
  const [detailPage, setDetailPage] = useState(1);

  const hasCustomRange = !!(dateRange.from || dateRange.to);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setData(null);
    setOrdersPage(1);
    setDetailPage(1);
    try {
      // A single selected date filters to that exact day; a full range uses both endpoints.
      const range = (dateRange.from || dateRange.to)
        ? { from: dateRange.from || dateRange.to, to: dateRange.to || dateRange.from }
        : undefined;
      let result;
      switch (reportType) {
        case 'overview': result = await vendorReportsService.getOverview(period, range); break;
        case 'orders': result = await vendorReportsService.getOrders(period, range); break;
      }
      if (result?.success) setData(result.data);
    } catch (err: any) {
      console.error("Error fetching vendor reports", err);
      toast({ title: 'Error', description: 'Failed to load report data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [reportType, period, dateRange]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // Tables to export reflect what's on screen: the selected metric's table on
  // the overview tab, the order history on the orders tab.
  const getExportTables = useCallback((): Record<string, any[]> => {
    if (!data?.tables) return {};
    if (reportType === 'orders') return { orders: data.tables.orders || [] };
    return { [METRIC_LABELS[selectedMetric]]: data.tables[selectedMetric] || [] };
  }, [data, reportType, selectedMetric]);

  const exportToExcel = useCallback(() => {
    if (!data || !data.tables) return toast({ title: 'No Data', description: 'No table data available to export.', variant: 'destructive' });
    try {
      const wb = XLSX.utils.book_new();
      let hasData = false;
      const tables = getExportTables();
      for (const [key, rows] of Object.entries(tables)) {
        if (Array.isArray(rows) && rows.length > 0) {
          const formatted = rows.map(r => {
            const row: Record<string, any> = {};
            for (const [h, val] of Object.entries(r)) {
              if (typeof val === 'number' && !Number.isInteger(val)) row[h] = parseFloat(val.toFixed(2));
              else row[h] = val;
            }
            return row;
          });
          const sheetName = key.replace(/([a-z])([A-Z])/g, '$1 $2').substring(0, 31);
          const ws = XLSX.utils.json_to_sheet(formatted);
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
          hasData = true;
        }
      }
      if (!hasData) return toast({ title: 'Empty Data', description: 'No data to export.', variant: 'default' });
      XLSX.writeFile(wb, `vendor_${reportType}_report_${period}_${new Date().getTime()}.xlsx`);
      toast({ title: 'Export Successful', description: 'Excel downloaded successfully.' });
    } catch (err) {
      toast({ title: 'Export Failed', description: 'Could not generate excel file.', variant: 'destructive' });
    }
  }, [data, reportType, period, getExportTables]);

  const exportToPDF = useCallback(() => {
    if (!data || !data.tables) return toast({ title: 'No Data', description: 'No table data available to export.', variant: 'destructive' });
    try {
      const doc = new jsPDF();
      let hasData = false;
      const tables = getExportTables();
      let yPos = 20;
      doc.setFontSize(16);
      doc.text(`VENDOR ${reportType.toUpperCase()} REPORT - ${period.replace(/(\d+)/, '$1 ').toUpperCase()}`, 14, yPos);
      yPos += 10;
      for (const [key, rows] of Object.entries(tables)) {
        if (Array.isArray(rows) && rows.length > 0) {
          doc.setFontSize(12);
          doc.text(key.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase(), 14, yPos);
          yPos += 5;
          const headers = Object.keys(rows[0]);
          const dataRows = rows.map(r => headers.map(h => {
            const val = r[h];
            if (val instanceof Date) return val.toLocaleDateString();
            if (typeof val === 'object' && val !== null) return JSON.stringify(val);
            if (typeof val === 'number' && !Number.isInteger(val)) return val.toFixed(2);
            return String(val ?? '');
          }));
          autoTable(doc, {
            startY: yPos,
            head: [headers.map(h => h.charAt(0).toUpperCase() + h.slice(1))],
            body: dataRows,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [224, 26, 27] },
          });
          yPos = (doc as any).lastAutoTable.finalY + 15;
          hasData = true;
        }
      }
      if (!hasData) return toast({ title: 'Empty Data', description: 'No table data to export.', variant: 'default' });
      doc.save(`vendor_${reportType}_report_${period}_${new Date().getTime()}.pdf`);
      toast({ title: 'Export Successful', description: 'PDF downloaded successfully.' });
    } catch (err) {
      toast({ title: 'Export Failed', description: 'Could not generate PDF file.', variant: 'destructive' });
    }
  }, [data, reportType, period, getExportTables]);

  const fmt = (n?: number) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const fmtN = (n?: number) => (n || 0).toLocaleString('en-IN');

  const orders: any[] = data?.tables?.orders || [];
  const ordersTotalPages = Math.ceil(orders.length / PAGE_SIZE);
  const paginatedOrders = orders.slice((ordersPage - 1) * PAGE_SIZE, ordersPage * PAGE_SIZE);

  const detailRows: any[] = data?.tables?.[selectedMetric] || [];
  const detailHeaders = detailRows.length > 0 ? Object.keys(detailRows[0]) : [];
  const detailTotalPages = Math.ceil(detailRows.length / PAGE_SIZE);
  const paginatedDetail = detailRows.slice((detailPage - 1) * PAGE_SIZE, detailPage * PAGE_SIZE);

  const detailTableRef = useRef<HTMLDivElement>(null);
  const selectMetric = (key: MetricKey) => {
    setSelectedMetric(key);
    setDetailPage(1);
    detailTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const exportBtn = "flex items-center justify-center gap-2 h-10 px-4 border border-slate-300 rounded-lg bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track your store performance and insights</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className={`w-44 transition-opacity ${hasCustomRange ? 'opacity-50' : ''}`} title={hasCustomRange ? 'Clear the date range to use a preset period' : undefined}>
            <Dropdown
              value={period}
              options={PERIOD_OPTIONS}
              onChange={(v) => setPeriod(v as ReportPeriod)}
              buttonClassName="h-10 rounded-lg text-sm font-medium"
            />
          </div>
          <DateRangeCalendar
            from={dateRange.from}
            to={dateRange.to}
            onChange={(from, to) => setDateRange({ from, to })}
            placeholder="Custom date range"
          />
          <button type="button" className={exportBtn} onClick={exportToPDF} disabled={loading || !data}>
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button type="button" className={exportBtn} onClick={exportToExcel} disabled={loading || !data}>
            <Download className="w-4 h-4" /> Excel
          </button>
          <button type="button" className={exportBtn} onClick={fetchReport} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'orders', label: 'Orders & Sales', icon: ShoppingCart },
        ].map((type) => {
          const Icon = type.icon;
          const isActive = reportType === type.id;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => setReportType(type.id as ReportTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                isActive
                  ? 'bg-brand-500 text-white border-brand-500 hover:bg-brand-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {type.label}
            </button>
          );
        })}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            <span className="ml-3 text-slate-500">Loading report…</span>
          </div>
        </div>
      )}

      {/* Overview Report */}
      {!loading && data && reportType === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {([
              { key: 'revenue', label: 'Total Revenue', value: fmt(data.metrics?.revenue?.current || 0), current: data.metrics?.revenue?.current || 0, previous: data.metrics?.revenue?.previous || 0, icon: DollarSign, color: 'text-green-600', bgColor: 'bg-green-50' },
              { key: 'orders', label: 'Total Orders', value: fmtN(data.metrics?.orders?.current || 0), current: data.metrics?.orders?.current || 0, previous: data.metrics?.orders?.previous || 0, icon: ShoppingCart, color: 'text-blue-600', bgColor: 'bg-blue-50' },
              { key: 'stock', label: 'Total Stock', value: fmtN(data.metrics?.totalStock?.current || 0), current: data.metrics?.totalStock?.current || 0, previous: data.metrics?.totalStock?.previous || 0, icon: Boxes, color: 'text-orange-600', bgColor: 'bg-orange-50' },
              { key: 'products', label: 'Products Listed', value: fmtN(data.metrics?.productsListed?.current || 0), current: data.metrics?.productsListed?.current || 0, previous: data.metrics?.productsListed?.previous || 0, icon: Package, color: 'text-purple-600', bgColor: 'bg-purple-50' }
            ] as const).map((m) => {
              const isActive = selectedMetric === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => selectMetric(m.key)}
                  aria-pressed={isActive}
                  className={`group text-left bg-white rounded-xl border shadow-xs p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${isActive ? 'border-brand-300 ring-1 ring-brand-200' : 'border-slate-200/80 hover:border-brand-200'}`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-medium text-slate-600">{m.label}</span>
                    <div className={`p-2 rounded-xl ${m.bgColor} transition-transform duration-200 group-hover:scale-110`}>
                      <m.icon className={`w-4 h-4 ${m.color}`} />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-slate-900 mt-2">{m.value}</p>
                  <div className="mt-1.5">
                    <TrendChip current={m.current} previous={m.previous} />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200/80 flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">Revenue Trend</h3>
              </div>
              <div className="p-5">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.charts?.revenueChartData || []}>
                    <defs>
                      <linearGradient id="colorRevs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e01a1b" stopOpacity={0.7} />
                        <stop offset="95%" stopColor="#e01a1b" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="period" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} allowDecimals={false} tickFormatter={(v) => formatRevenueTick(v)} />
                    <Tooltip formatter={(v: any) => [fmt(v), 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#e01a1b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevs)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200/80 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">Order Status Distribution</h3>
              </div>
              <div className="p-5">
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={(data.charts?.orderStatusData || []).map((e: any, i: number) => ({ ...e, color: statusColor(e.status, i) }))}
                      cx="50%" cy="50%"
                      labelLine={false}
                      label={({ percent }: any) => percent ? `${(percent * 100).toFixed(0)}%` : ''}
                      outerRadius={100}
                      dataKey="count"
                    >
                      {(data.charts?.orderStatusData || []).map((entry: any, i: number) => (
                        <Cell key={i} fill={statusColor(entry.status, i)} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [v, 'Orders']} />
                    <Legend verticalAlign="bottom" height={36} formatter={(value: any, entry: any) => entry.payload?.status || value} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div ref={detailTableRef} className="scroll-mt-24 bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">{METRIC_LABELS[selectedMetric]}</h3>
              </div>
              <span className="text-xs text-slate-400">{detailRows.length} row{detailRows.length === 1 ? '' : 's'}</span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className={TABLE_HEADER_CLASS}>
                  <TableRow className="!bg-slate-50/80 hover:!bg-slate-50/80">
                    {detailHeaders.map((h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDetail.map((row: any, idx: number) => (
                    <TableRow key={idx}>
                      {detailHeaders.map((h) => {
                        const val = row[h];
                        const display = CURRENCY_COLUMNS.has(h)
                          ? fmt(Number(val) || 0)
                          : typeof val === 'number'
                            ? fmtN(val)
                            : String(val ?? '—');
                        return (
                          <TableCell key={h} className="text-slate-700 whitespace-nowrap">{display}</TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                  {detailRows.length === 0 && (
                    <TableRow><TableCell colSpan={Math.max(detailHeaders.length, 1)} className="text-center text-slate-400 py-8">No data for this metric in the selected period.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {detailTotalPages > 1 && (
              <Pagination page={detailPage} totalPages={detailTotalPages} onChange={setDetailPage} />
            )}
          </div>
        </>
      )}

      {/* Orders Report */}
      {!loading && data && reportType === 'orders' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-3.5">
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium text-slate-600">Total Orders</span>
                <div className="p-2 rounded-xl bg-blue-50">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p className="text-xl font-bold text-slate-900 mt-2">{fmtN(data.metrics?.orders)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-3.5">
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium text-slate-600">Avg Order Item Value</span>
                <div className="p-2 rounded-xl bg-green-50">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <p className="text-xl font-bold text-slate-900 mt-2">{fmt(data.metrics?.avgOrderValue)}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/80 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Order History</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className={TABLE_HEADER_CLASS}>
                  <TableRow className="!bg-slate-50/80 hover:!bg-slate-50/80">
                    <TableHead>Order ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map((order: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-slate-900">{order.orderId}</TableCell>
                      <TableCell className="text-slate-600">{order.product}</TableCell>
                      <TableCell className="text-slate-600">{order.quantity}</TableCell>
                      <TableCell className="font-semibold text-slate-900">{fmt(order.amount)}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{new Date(order.date).toLocaleDateString()}</TableCell>
                      <TableCell><StatusBadge status={order.status} /></TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-8">No order data for this period.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {ordersTotalPages > 1 && (
              <Pagination page={ordersPage} totalPages={ordersTotalPages} onChange={setOrdersPage} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
