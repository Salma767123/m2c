'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/UI/Table';
import Dropdown from '@/components/UI/Dropdown';
import {
  BarChart3, Download, TrendingUp, DollarSign, Users, FileText,
  Package, Store, ShoppingCart, Clock, PieChart, Activity,
  ArrowUp, ArrowDown, Minus, RefreshCw, CheckCircle, XCircle,
  AlertCircle, Loader2,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import reportsService, { ReportPeriod } from '@/services/reportsService';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportTab = 'overview' | 'sales' | 'orders' | 'settlement' | 'financial' | 'vendors' | 'products' | 'customers';

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: '3months', label: 'Last 3 Months' },
  { value: '6months', label: 'Last 6 Months' },
  { value: '1year', label: 'Last Year' },
];

const calcChange = (current: number, previous: number) =>
  previous === 0 ? '0.0' : (((current - previous) / previous) * 100).toFixed(1);

const TrendChip = ({ current, previous }: { current: number; previous: number }) => {
  const change = calcChange(current, previous);
  const val = parseFloat(change);
  return (
    <div className={`flex items-center gap-1 text-sm font-medium ${val > 0 ? 'text-green-600' : val < 0 ? 'text-red-600' : 'text-gray-500'}`}>
      {val > 0 ? <ArrowUp className="w-4 h-4" /> : val < 0 ? <ArrowDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
      <span>{Math.abs(val)}%</span>
      <span className="text-gray-500 text-xs ml-1">vs last period</span>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = status?.toUpperCase();
  const map: Record<string, string> = {
    DELIVERED: 'bg-green-100 text-green-800',
    PAID: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-green-100 text-green-800',
    ORDER_CREATED: 'bg-blue-100 text-blue-800',
    VENDOR_PROCESSING: 'bg-blue-100 text-blue-800',
    PROCESSING: 'bg-blue-100 text-blue-800',
    PACKED_BY_VENDOR: 'bg-yellow-100 text-yellow-800',
    IN_TRANSIT_TO_ADMIN_HUB: 'bg-purple-100 text-purple-800',
    SHIPPED_TO_CUSTOMER: 'bg-indigo-100 text-indigo-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    CANCELLED: 'bg-red-100 text-red-800',
    RETURNED: 'bg-orange-100 text-orange-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${map[s] || 'bg-gray-100 text-gray-800'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

export default function AdminReports() {
  const [reportType, setReportType] = useState<ReportTab>('overview');
  const [period, setPeriod] = useState<ReportPeriod>('30days');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);


  const exportToExcel = useCallback(() => {
    if (!data || !data.tables) {
      toast({ title: 'No Data', description: 'There is no data to export yet.', variant: 'destructive' });
      return;
    }

    try {
      const wb = XLSX.utils.book_new();
      let hasData = false;

      const tables = data.tables as Record<string, any[]>;

      for (const [key, rows] of Object.entries(tables)) {
        if (Array.isArray(rows) && rows.length > 0) {
          const ws = XLSX.utils.json_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, key.substring(0, 31)); // sheet names max 31 chars
          hasData = true;
        }
      }

      if (!hasData) {
        toast({ title: 'Empty Data', description: 'No table data available to export for this report.', variant: 'default' });
        return;
      }

      XLSX.writeFile(wb, `${reportType}_report_${period}_${new Date().getTime()}.xlsx`);
      toast({ title: 'Export Successful', description: 'Report downloaded successfully.' });
    } catch (err) {
      console.error('Export error:', err);
      toast({ title: 'Export Failed', description: 'Could not generate excel file.', variant: 'destructive' });
    }
  }, [data, reportType, period]);

  const exportToPDF = useCallback(() => {
    if (!data || !data.tables) {
      toast({ title: 'No Data', description: 'There is no data to export.', variant: 'destructive' });
      return;
    }

    try {
      const doc = new jsPDF();
      let hasData = false;
      const tables = data.tables as Record<string, any[]>;
      let yPos = 20;

      doc.setFontSize(16);
      doc.text(`${reportType.toUpperCase()} REPORT - ${period.toUpperCase()}`, 14, yPos);
      yPos += 10;

      for (const [key, rows] of Object.entries(tables)) {
        if (Array.isArray(rows) && rows.length > 0) {
          doc.setFontSize(12);
          doc.text(key.toUpperCase(), 14, yPos);
          yPos += 5;

          const headers = Object.keys(rows[0]);
          const dataRows = rows.map(r => headers.map(h => {
            const val = r[h];
            if (val instanceof Date) return val.toLocaleDateString();
            if (typeof val === 'object' && val !== null) return JSON.stringify(val);
            return String(val ?? '');
          }));

          autoTable(doc, {
            startY: yPos,
            head: [headers.map(h => h.charAt(0).toUpperCase() + h.slice(1))],
            body: dataRows,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [17, 24, 39] }, // bg-gray-900
          });

          yPos = (doc as any).lastAutoTable.finalY + 15;
          hasData = true;
        }
      }

      if (!hasData) {
        toast({ title: 'Empty Data', description: 'No table data available to export.', variant: 'default' });
        return;
      }

      doc.save(`${reportType}_report_${period}_${new Date().getTime()}.pdf`);
      toast({ title: 'Export Successful', description: 'PDF downloaded successfully.' });
    } catch (err) {
      console.error('Export error:', err);
      toast({ title: 'Export Failed', description: 'Could not generate PDF file.', variant: 'destructive' });
    }
  }, [data, reportType, period]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setData(null);
    try {
      let result;
      switch (reportType) {
        case 'overview': result = await reportsService.getOverview(period); break;
        case 'sales': result = await reportsService.getSales(period); break;
        case 'orders': result = await reportsService.getOrders(period); break;
        case 'settlement': result = await reportsService.getSettlement(period); break;
        case 'financial': result = await reportsService.getFinancial(period); break;
        case 'vendors': result = await reportsService.getVendors(period); break;
        case 'products': result = await reportsService.getProducts(period); break;
        case 'customers': result = await reportsService.getCustomers(period); break;
      }
      if (result?.success) setData(result.data);
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to load report data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [reportType, period]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const fmt = (n?: number) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const fmtN = (n?: number) => (n || 0).toLocaleString('en-IN');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Live data from your platform</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="w-44">
            <Dropdown
              value={period}
              options={PERIOD_OPTIONS}
              onChange={(v) => setPeriod(v as ReportPeriod)}
            />
          </div>
          <Button variant="outline" className="gap-2" onClick={exportToPDF} disabled={loading || !data}>
            <FileText className="w-4 h-4" />
            PDF
          </Button>
          <Button variant="outline" className="gap-2" onClick={exportToExcel} disabled={loading || !data}>
            <Download className="w-4 h-4" />
            Excel
          </Button>
          <Button variant="outline" className="gap-2" onClick={fetchReport} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {([
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'sales', label: 'Sales & Revenue', icon: DollarSign },
              { id: 'orders', label: 'Orders', icon: ShoppingCart },
              { id: 'settlement', label: 'Settlement', icon: FileText },
              { id: 'financial', label: 'Financial', icon: BarChart3 },
              { id: 'vendors', label: 'Vendors', icon: Store },
              { id: 'products', label: 'Products', icon: Package },
              { id: 'customers', label: 'Customers', icon: Users },
            ] as { id: ReportTab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant="outline"
                onClick={() => setReportType(id)}
                className={`gap-2 ${reportType === id ? 'bg-gray-900 text-white hover:bg-gray-800 border-gray-900' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-500 text-lg">Loading report…</span>
        </div>
      )}

      {/* ===================== OVERVIEW ===================== */}
      {!loading && data && reportType === 'overview' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { label: 'Revenue', icon: DollarSign, color: 'bg-green-50 text-green-600', current: data.metrics?.revenue?.current || 0, previous: data.metrics?.revenue?.previous || 0, format: fmt },
              { label: 'Orders', icon: ShoppingCart, color: 'bg-blue-50 text-blue-600', current: data.metrics?.orders?.current || 0, previous: data.metrics?.orders?.previous || 0, format: fmtN },
              { label: 'Customers', icon: Users, color: 'bg-orange-50 text-orange-600', current: data.metrics?.customers?.current || 0, previous: data.metrics?.customers?.previous || 0, format: fmtN },
              { label: 'New Vendors', icon: Store, color: 'bg-purple-50 text-purple-600', current: data.metrics?.vendors?.current || 0, previous: data.metrics?.vendors?.previous || 0, format: fmtN },
              { label: 'Products', icon: Package, color: 'bg-indigo-50 text-indigo-600', current: data.metrics?.products?.current || 0, previous: 0, format: fmtN },
              { label: 'Avg Order', icon: TrendingUp, color: 'bg-pink-50 text-pink-600', current: data.metrics?.avgOrderValue?.current || 0, previous: data.metrics?.avgOrderValue?.previous || 0, format: fmt },
            ].map(({ label, icon: Icon, color, current, previous, format }) => (
              <Card key={label}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg ${color.split(' ')[0]}`}>
                      <Icon className={`w-5 h-5 ${color.split(' ')[1]}`} />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-500">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 my-1">{format(current)}</p>
                  <TrendChip current={current} previous={previous} />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-gray-600" />Revenue Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.charts?.revenueChartData || []}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => fmt(v)} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#grad)" name="Revenue" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><PieChart className="w-5 h-5 text-gray-600" />Order Status</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={data.charts?.orderStatusData || []}
                      cx="50%" cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }: { name?: string; percent?: number }) => `${(name ?? '').slice(0, 8)} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                    >
                      {(data.charts?.orderStatusData || []).map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => `${v} orders`} />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" />Recent Orders</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.tables?.recentOrders || []).map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium text-gray-900">{o.id}</TableCell>
                      <TableCell className="text-gray-600">{o.customer}</TableCell>
                      <TableCell className="text-gray-600">{o.vendor}</TableCell>
                      <TableCell className="font-semibold">{fmt(o.amount)}</TableCell>
                      <TableCell><StatusBadge status={o.status} /></TableCell>
                      <TableCell className="text-gray-500 text-sm">{new Date(o.date).toLocaleDateString('en-IN')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top Vendors */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Store className="w-5 h-5" />Top Performing Vendors</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(data.tables?.topVendors || []).map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold">#{v.rank}</div>
                      <div>
                        <p className="font-semibold text-gray-900">{v.name}</p>
                        <p className="text-sm text-gray-500">{v.orders} orders</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{fmt(v.revenue)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ===================== SALES ===================== */}
      {!loading && data && reportType === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue', value: fmt(data.metrics.totalRevenue?.current ?? data.metrics.totalRevenue), icon: DollarSign, color: 'bg-green-50 text-green-600' },
              { label: 'Orders', value: fmtN(data.metrics.orderCount), icon: ShoppingCart, color: 'bg-blue-50 text-blue-600' },
              { label: 'Total Tax', value: fmt(data.metrics.totalTax), icon: FileText, color: 'bg-yellow-50 text-yellow-600' },
              { label: 'Avg Order Value', value: fmt(data.metrics.avgOrderValue?.current ?? data.metrics.avgOrderValue), icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{label}</p>
                      <p className="text-2xl font-bold text-gray-900">{value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${color.split(' ')[0]}`}>
                      <Icon className={`w-7 h-7 ${color.split(' ')[1]}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle>Daily Sales Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={data.charts?.dailySalesTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any, name: string | undefined) => name === 'sales' ? [fmt(v), 'Sales'] : [v, 'Orders']} />
                  <Legend />
                  <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 5 }} name="Sales" />
                  <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 5 }} name="Orders" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Top Selling Products</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Qty Sold</TableHead>
                    <TableHead>Orders</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.tables?.topProducts || []).map((p: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-gray-900">{p.name}</TableCell>
                      <TableCell className="font-semibold">{fmt(p.revenue)}</TableCell>
                      <TableCell className="text-gray-600">{fmtN(p.quantity)}</TableCell>
                      <TableCell className="text-gray-600">{p.orders}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===================== ORDERS ===================== */}
      {!loading && data && reportType === 'orders' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Orders', value: fmtN(data.metrics.total), icon: ShoppingCart, color: 'bg-blue-50 text-blue-600' },
              { label: 'Delivered', value: fmtN(data.metrics.delivered), icon: CheckCircle, color: 'bg-green-50 text-green-600' },
              { label: 'Processing', value: fmtN(data.metrics.processing), icon: Clock, color: 'bg-yellow-50 text-yellow-600' },
              { label: 'Cancelled', value: fmtN(data.metrics.cancelled), icon: XCircle, color: 'bg-red-50 text-red-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{label}</p>
                      <p className="text-3xl font-bold text-gray-900">{value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${color.split(' ')[0]}`}>
                      <Icon className={`w-8 h-8 ${color.split(' ')[1]}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Status Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.charts?.statusBreakdown || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="status" stroke="#6b7280" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#6b7280" />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Order Status Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(data.charts?.statusBreakdown || []).map((s: any) => {
                    const pct = data.metrics.total > 0 ? Math.round((s.count / data.metrics.total) * 100) : 0;
                    return (
                      <div key={s.status}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{s.status.replace(/_/g, ' ')}</span>
                          <span className="text-gray-500">{s.count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full bg-gray-800 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Order List</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.tables?.orders || []).map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium text-gray-900">{o.id}</TableCell>
                      <TableCell className="text-gray-600">{o.customer}</TableCell>
                      <TableCell className="text-gray-600">{o.vendor}</TableCell>
                      <TableCell className="font-semibold">{fmt(o.amount)}</TableCell>
                      <TableCell><StatusBadge status={o.status} /></TableCell>
                      <TableCell><StatusBadge status={o.paymentStatus} /></TableCell>
                      <TableCell className="text-gray-500 text-sm">{new Date(o.date).toLocaleDateString('en-IN')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===================== SETTLEMENT ===================== */}
      {!loading && data && reportType === 'settlement' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Amount', value: fmt(data.metrics.totalAmount), icon: DollarSign, cl: 'bg-blue-50 text-blue-600' },
              { label: 'Paid', value: fmt(data.metrics.totalSettled), icon: CheckCircle, cl: 'bg-green-50 text-green-600' },
              { label: 'Pending', value: fmt(data.metrics.totalPending), icon: AlertCircle, cl: 'bg-yellow-50 text-yellow-600' },
              { label: 'Processing', value: fmt(data.metrics.totalProcessing), icon: Clock, cl: 'bg-purple-50 text-purple-600' },
            ].map(({ label, value, icon: Icon, cl }) => (
              <Card key={label}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{label}</p>
                      <p className="text-2xl font-bold text-gray-900">{value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${cl.split(' ')[0]}`}>
                      <Icon className={`w-8 h-8 ${cl.split(' ')[1]}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle>Settlement Transactions</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Settlement #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.tables?.settlements || []).map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium text-gray-900">{s.id}</TableCell>
                      <TableCell className="text-gray-600">{s.vendor}</TableCell>
                      <TableCell className="font-semibold text-gray-900">{fmt(s.amount)}</TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell className="text-gray-500 text-sm">{s.dueDate ? new Date(s.dueDate).toLocaleDateString('en-IN') : '-'}</TableCell>
                      <TableCell className="text-gray-500 text-sm">{new Date(s.date).toLocaleDateString('en-IN')}</TableCell>
                    </TableRow>
                  ))}
                  {(data.tables?.settlements || []).length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-8">No settlements found for this period</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===================== FINANCIAL ===================== */}
      {!loading && data && reportType === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total Revenue', value: fmt(data.metrics.totalRevenue), cl: 'bg-green-50 text-green-600' },
              { label: 'Total Tax', value: fmt(data.metrics.totalTax), cl: 'bg-yellow-50 text-yellow-600' },
              { label: 'Shipping', value: fmt(data.metrics.totalShipping), cl: 'bg-blue-50 text-blue-600' },
              { label: 'Discounts', value: fmt(data.metrics.totalDiscount), cl: 'bg-red-50 text-red-600' },
              { label: 'Net Revenue', value: fmt(data.metrics.netRevenue), cl: 'bg-purple-50 text-purple-700' },
            ].map(({ label, value, cl }) => (
              <Card key={label}>
                <CardContent className="p-5">
                  <p className="text-sm text-gray-500 mb-1">{label}</p>
                  <p className={`text-2xl font-bold ${cl.split(' ')[1]}`}>{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle>Monthly Financial Breakdown</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data.charts?.monthlyFinancials || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
                  <Bar dataKey="profit" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Net Profit" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===================== VENDORS ===================== */}
      {!loading && data && reportType === 'vendors' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-500">Active Vendors</p>
                <p className="text-4xl font-bold text-gray-900 mt-1">{fmtN(data.metrics.totalActive)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-500">New This Period</p>
                <p className="text-4xl font-bold text-gray-900 mt-1">{fmtN(data.metrics.newThisPeriod)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Top Vendors by Revenue</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Orders</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.tables?.topVendors || []).map((v: any) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-bold text-gray-700">#{v.rank}</TableCell>
                      <TableCell className="font-medium text-gray-900">{v.name}</TableCell>
                      <TableCell className="font-semibold">{fmt(v.revenue)}</TableCell>
                      <TableCell className="text-gray-600">{v.orders}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===================== PRODUCTS ===================== */}
      {!loading && data && reportType === 'products' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Active', value: fmtN(data.metrics.total), cl: 'bg-blue-50' },
              { label: 'Approved', value: fmtN(data.metrics.approved), cl: 'bg-green-50' },
              { label: 'Pending Review', value: fmtN(data.metrics.pending), cl: 'bg-yellow-50' },
              { label: 'Low Stock', value: fmtN(data.metrics.lowStock), cl: 'bg-red-50' },
            ].map(({ label, value, cl }) => (
              <Card key={label} className={cl}>
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600">{label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-red-500" />Low Stock Products</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Min</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.tables?.lowStockProducts || []).map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium text-gray-900">{p.name}</TableCell>
                        <TableCell className="font-mono text-xs text-gray-500">{p.baseSku}</TableCell>
                        <TableCell>
                          <span className={`font-bold ${p.totalStock <= 0 ? 'text-red-600' : 'text-orange-600'}`}>{p.totalStock}</span>
                        </TableCell>
                        <TableCell className="text-gray-500">{p.lowStockThreshold}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Top Selling Products</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.tables?.topSellingProducts || []).map((p: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-gray-900">{p.name}</TableCell>
                        <TableCell className="font-semibold">{fmt(p.revenue)}</TableCell>
                        <TableCell className="text-gray-600">{fmtN(p.quantity)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ===================== CUSTOMERS ===================== */}
      {!loading && data && reportType === 'customers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-500">Total Customers</p>
                <p className="text-4xl font-bold text-gray-900 mt-1">{fmtN(data.metrics.total)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-500">New This Period</p>
                <p className="text-4xl font-bold text-gray-900 mt-1">{fmtN(data.metrics.new?.current)}</p>
                <TrendChip current={data.metrics.new?.current || 0} previous={data.metrics.new?.previous || 0} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Top Customers by Spend</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total Spend</TableHead>
                    <TableHead>Orders</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.tables?.topCustomers || []).map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-bold text-gray-700">#{c.rank}</TableCell>
                      <TableCell className="font-medium text-gray-900">{c.name}</TableCell>
                      <TableCell className="text-gray-500 text-sm">{c.email}</TableCell>
                      <TableCell className="font-semibold">{fmt(c.revenue)}</TableCell>
                      <TableCell className="text-gray-600">{c.orders}</TableCell>
                    </TableRow>
                  ))}
                  {(data.tables?.topCustomers || []).length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-8">No customer data for this period</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {!loading && !data && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <BarChart3 className="w-12 h-12 mb-4" />
          <p className="text-lg">No data available</p>
          <Button className="mt-4" onClick={fetchReport}>Retry</Button>
        </div>
      )}
    </div>
  );
}
