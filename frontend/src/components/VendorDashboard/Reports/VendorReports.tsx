'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/UI/Table';
import Dropdown from '@/components/UI/Dropdown';
import {
  BarChart3,
  Download,
  TrendingUp,
  DollarSign,
  Package,
  ShoppingCart,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  PieChart,
  Activity,
  Loader2,
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
  BarChart as RechartsBarChart,
  Bar,
} from 'recharts';
import vendorReportsService, { ReportPeriod } from '@/services/vendorReportsService';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportTab = 'overview' | 'orders';

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
    ORDER_CREATED: 'bg-blue-100 text-blue-800',
    VENDOR_PROCESSING: 'bg-yellow-100 text-yellow-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${map[s] || 'bg-gray-100 text-gray-800'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

export default function VendorReports() {
  const [reportType, setReportType] = useState<ReportTab>('overview');
  const [period, setPeriod] = useState<ReportPeriod>('30days');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setData(null);
    try {
      let result;
      switch (reportType) {
        case 'overview': result = await vendorReportsService.getOverview(period); break;
        case 'orders': result = await vendorReportsService.getOrders(period); break;
      }
      if (result?.success) setData(result.data);
    } catch (err: any) {
      console.error("Error fetching vendor reports", err);
      toast({ title: 'Error', description: 'Failed to load report data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [reportType, period]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const exportToExcel = useCallback(() => {
    if (!data || !data.tables) return toast({ title: 'No Data', description: 'No table data available to export.', variant: 'destructive' });
    try {
      const wb = XLSX.utils.book_new();
      let hasData = false;
      const tables = data.tables as Record<string, any[]>;
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
  }, [data, reportType, period]);

  const exportToPDF = useCallback(() => {
    if (!data || !data.tables) return toast({ title: 'No Data', description: 'No table data available to export.', variant: 'destructive' });
    try {
      const doc = new jsPDF();
      let hasData = false;
      const tables = data.tables as Record<string, any[]>;
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
            headStyles: { fillColor: [17, 24, 39] },
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
  }, [data, reportType, period]);

  const fmt = (n?: number) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const fmtN = (n?: number) => (n || 0).toLocaleString('en-IN');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Track your store performance and insights</p>
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
            <FileText className="w-4 h-4" /> PDF
          </Button>
          <Button variant="outline" className="gap-2" onClick={exportToExcel} disabled={loading || !data}>
            <Download className="w-4 h-4" /> Excel
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
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'orders', label: 'Orders & Sales', icon: ShoppingCart },
            ].map((type) => {
              const Icon = type.icon;
              const isActive = reportType === type.id;
              return (
                <Button
                  key={type.id}
                  variant="outline"
                  onClick={() => setReportType(type.id as ReportTab)}
                  className={`gap-2 ${isActive ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  <Icon className="w-4 h-4" />
                  {type.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-500 text-lg">Loading report…</span>
        </div>
      )}

      {/* Overview Report */}
      {!loading && data && reportType === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue', value: fmt(data.metrics?.revenue?.current || 0), current: data.metrics?.revenue?.current || 0, previous: data.metrics?.revenue?.previous || 0, icon: DollarSign, color: 'text-green-600', bgColor: 'bg-green-50' },
              { label: 'Total Orders', value: fmtN(data.metrics?.orders?.current || 0), current: data.metrics?.orders?.current || 0, previous: data.metrics?.orders?.previous || 0, icon: ShoppingCart, color: 'text-blue-600', bgColor: 'bg-blue-50' },
              { label: 'Avg Order Value', value: fmt(data.metrics?.avgOrderValue?.current || 0), current: data.metrics?.avgOrderValue?.current || 0, previous: data.metrics?.avgOrderValue?.previous || 0, icon: TrendingUp, color: 'text-orange-600', bgColor: 'bg-orange-50' },
              { label: 'Products Listed', value: fmtN(data.metrics?.productsListed?.current || 0), current: data.metrics?.productsListed?.current || 0, previous: data.metrics?.productsListed?.previous || 0, icon: Package, color: 'text-purple-600', bgColor: 'bg-purple-50' }
            ].map((m, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">{m.label}</p>
                      <p className="text-2xl font-bold text-gray-900 mb-2">{m.value}</p>
                      <TrendChip current={m.current} previous={m.previous} />
                    </div>
                    <div className={`p-3 rounded-lg ${m.bgColor}`}>
                      <m.icon className={`w-6 h-6 ${m.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-gray-600" />Revenue Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={data.charts?.revenueChartData || []}>
                    <defs>
                      <linearGradient id="colorRevs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="period" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => [fmt(v), 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevs)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><PieChart className="w-5 h-5 text-gray-600" />Order Status Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <RechartsPieChart>
                    <Pie
                      data={data.charts?.orderStatusData || []}
                      cx="50%" cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) => percent ? `${(percent * 100).toFixed(0)}%` : ''}
                      outerRadius={100}
                      dataKey="count"
                    >
                      {(data.charts?.orderStatusData || []).map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any, name: any) => [v, 'Orders']} />
                    <Legend verticalAlign="bottom" height={36} formatter={(value: any, entry: any) => entry.payload?.status || value} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-gray-600" />Top Selling Products</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty Sold</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Remaining Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.tables?.topProducts || []).map((product: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-gray-900">{product.name}</TableCell>
                      <TableCell className="text-gray-600">{product.sales}</TableCell>
                      <TableCell className="font-semibold text-gray-900">{fmt(product.revenue)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.stock > 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {product.stock} items left
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(data.tables?.topProducts || []).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-gray-400 py-8">No products sold in this period.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Orders Report */}
      {!loading && data && reportType === 'orders' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{fmtN(data.metrics?.orders)}</p>
                  </div>
                  <ShoppingCart className="w-10 h-10 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg Order Item Value</p>
                    <p className="text-2xl font-bold text-gray-900">{fmt(data.metrics?.avgOrderValue)}</p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Order History</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.tables?.orders || []).map((order: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-gray-900">{order.orderId}</TableCell>
                      <TableCell className="text-gray-600">{order.product}</TableCell>
                      <TableCell className="text-gray-600">{order.quantity}</TableCell>
                      <TableCell className="font-semibold text-gray-900">{fmt(order.amount)}</TableCell>
                      <TableCell className="text-gray-500 text-sm">{new Date(order.date).toLocaleDateString()}</TableCell>
                      <TableCell><StatusBadge status={order.status} /></TableCell>
                    </TableRow>
                  ))}
                  {(data.tables?.orders || []).length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-8">No order data for this period.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
