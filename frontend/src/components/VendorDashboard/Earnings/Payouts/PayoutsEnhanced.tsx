'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Download, Search, Calendar, DollarSign, CheckCircle, Clock, AlertCircle, XCircle, Eye, X, Edit, RefreshCw, ExternalLink, ShieldCheck, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table';
import Dropdown from '@/components/UI/Dropdown';
import DateRangeCalendar from '@/components/Shared/DateRangeCalendar';
import { settlementService, Settlement } from '@/services/settlementService';
import VendorService, { VendorBankDetails } from '@/services/vendorService';
import { showErrorToast } from '@/lib/toast-utils';

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

export default function PayoutsEnhanced() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All Status');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [metricFilter, setMetricFilter] = useState<'all' | 'paid' | 'month' | 'pending' | 'failed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankDetails, setBankDetails] = useState<VendorBankDetails | null>(null);
  const [bankLoading, setBankLoading] = useState(true);

  const fetchSettlements = async () => {
    try {
      setLoading(true);
      const res = await settlementService.getVendorSettlements();
      if (res?.success && Array.isArray(res.data)) {
        setSettlements(res.data);
      }
    } catch (error: any) {
      showErrorToast(error?.error || "Failed to load settlements");
    } finally {
      setLoading(false);
    }
  };

  const fetchBankDetails = async () => {
    try {
      setBankLoading(true);
      const res = await VendorService.getVendorBankDetails();
      setBankDetails(res.bankDetails);
    } catch {
      setBankDetails(null);
    } finally {
      setBankLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
    fetchBankDetails();
  }, []);

  const handleDownloadReport = () => {
    if (filteredSettlements.length === 0) return;

    const headers = ['Settlement No', 'Order No', 'Period', 'Amount', 'Status', 'Due Date', 'Paid On', 'Transaction ID'];
    const fmtDate = (d: string | undefined | null) => {
      if (!d) return '-';
      const date = new Date(d);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const rows = filteredSettlements.map((s) => [
      s.settlementNumber,
      s.billingNumber,
      s.period,
      s.amount.toFixed(2),
      s.status,
      s.dueDate ? fmtDate(s.dueDate) : s.status === 'Pending' ? 'Awaiting Approval' : '—',
      s.paymentDate ? fmtDate(s.paymentDate) : '-',
      s.transactionId || '-',
    ]);

    // Use ="value" formula to force Excel to treat every cell as text (prevents scientific notation and date conversion)
    const excelText = (val: string) => `="${val.replace(/"/g, '""')}"`;
    const escapeHeader = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const csvContent = '\uFEFF' + headers.map(escapeHeader).join(',') + '\r\n' + rows.map((row) => row.map(excelText).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `settlements-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadReceipt = async (settlement: Settlement) => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    const fmtDate = (d: string | undefined | null) => {
      if (!d) return '-';
      return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    // ── Header bar ── (brand-500 #e01a1b)
    doc.setFillColor(224, 26, 27);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Settlement Receipt', 15, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(settlement.settlementNumber, pageW - 15, 16, { align: 'right' });

    // ── Payout Information section ──
    let y = 40;
    doc.setFillColor(243, 244, 246);
    doc.rect(15, y - 6, pageW - 30, 10, 'F');
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Payout Information', 18, y);

    const rows: [string, string][] = [
      ['Settlement Number', settlement.settlementNumber],
      ['Billing / Order No.', settlement.billingNumber],
      ['Vendor', settlement.vendorName],
      ['Period', settlement.period],
      ['Status', settlement.status],
      ['Created', fmtDate(settlement.createdAt)],
      ['Due Date', settlement.dueDate ? fmtDate(settlement.dueDate) : settlement.status === 'Pending' ? 'Awaiting Approval' : '—'],
      ['Payment Date', fmtDate(settlement.paymentDate)],
      ['Transaction ID', settlement.transactionId || '-'],
    ];

    y += 10;
    rows.forEach(([label, value]) => {
      // Alternate row background
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(label, 18, y);
      doc.setTextColor(17, 24, 39);
      doc.setFont('helvetica', 'bold');
      doc.text(value, pageW - 18, y, { align: 'right' });
      // Divider line
      doc.setDrawColor(229, 231, 235);
      doc.line(15, y + 3, pageW - 15, y + 3);
      y += 10;
    });

    // ── Financial Overview section ──
    y += 5;
    doc.setFillColor(243, 244, 246);
    doc.rect(15, y - 6, pageW - 30, 10, 'F');
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Overview', 18, y);

    y += 14;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text('Settlement Amount', 18, y);
    doc.setFontSize(16);
    doc.setTextColor(5, 150, 105);
    const amountStr = `Rs. ${settlement.amount.toLocaleString('en-IN')}`;
    doc.text(amountStr, pageW - 18, y, { align: 'right' });

    // ── Footer ──
    y += 20;
    doc.setDrawColor(229, 231, 235);
    doc.line(15, y, pageW - 15, y);
    y += 8;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} | M2C MarkDowns Private Limited`,
      pageW / 2, y, { align: 'center' }
    );

    doc.save(`receipt-${settlement.settlementNumber}.pdf`);
  };

  const filteredSettlements = settlements.filter((settlement) => {
    const matchesSearch =
      (settlement.settlementNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (settlement.billingNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All Status' || settlement.status === filterStatus;

    let matchesMetric = true;
    if (metricFilter === 'paid') {
      matchesMetric = settlement.status === 'Paid';
    } else if (metricFilter === 'pending') {
      // A failed payout is still unpaid, so it counts as outstanding/pending.
      matchesMetric = settlement.status === 'Pending' || settlement.status === 'Processing' || settlement.status === 'Failed';
    } else if (metricFilter === 'failed') {
      matchesMetric = settlement.status === 'Failed';
    } else if (metricFilter === 'month') {
      if (!settlement.createdAt) {
        matchesMetric = false;
      } else {
        const date = new Date(settlement.createdAt);
        const now = new Date();
        matchesMetric = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }
    }

    // Date filter: a full range filters between both endpoints; a single
    // selected date (only one endpoint) filters to that exact day.
    let matchesDate = true;
    if (dateFrom || dateTo) {
      if (!settlement.createdAt) {
        matchesDate = false;
      } else {
        const start = dateFrom || dateTo;
        const end = dateTo || dateFrom;
        const c = new Date(settlement.createdAt);
        const day = new Date(c.getFullYear(), c.getMonth(), c.getDate());
        if (day < new Date(start + 'T00:00:00')) matchesDate = false;
        if (day > new Date(end + 'T23:59:59')) matchesDate = false;
      }
    }

    return matchesSearch && matchesStatus && matchesMetric && matchesDate;
  });

  const totalPages = Math.ceil(filteredSettlements.length / PAGE_SIZE);
  const paginatedSettlements = filteredSettlements.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Paid':
        return <CheckCircle className="w-3.5 h-3.5" />;
      case 'Processing':
        return <Clock className="w-3.5 h-3.5" />;
      case 'Pending':
        return <Clock className="w-3.5 h-3.5" />;
      case 'Failed':
        return <AlertCircle className="w-3.5 h-3.5" />;
      case 'Cancelled':
        return <XCircle className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'Processing':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'Pending':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'Failed':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'Cancelled':
        return 'bg-slate-50 text-slate-700 border border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  const totalCompleted = settlements
    .filter((s) => s.status === 'Paid')
    .reduce((sum, s) => sum + s.amount, 0);

  const totalPending = settlements
    .filter((s) => s.status === 'Pending' || s.status === 'Processing' || s.status === 'Failed')
    .reduce((sum, s) => sum + s.amount, 0);

  const totalFailed = settlements
    .filter((s) => s.status === 'Failed')
    .reduce((sum, s) => sum + s.amount, 0);

  const thisMonthPayouts = settlements
    .filter((s) => {
      if (!s.createdAt) return false;
      const date = new Date(s.createdAt);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, s) => sum + s.amount, 0);

  const viewPayoutDetails = (settlement: Settlement) => {
    setSelectedSettlement(settlement);
    setShowDetailsModal(true);
  };

  const handleMetricClick = (metric: 'paid' | 'month' | 'pending' | 'failed') => {
    setMetricFilter((prev) => (prev === metric ? 'all' : metric));
    setFilterStatus('All Status');
    setCurrentPage(1);
  };

  // Mask the account number for display security
  const maskAccountNumber = (acc: string) => {
    if (!acc || acc.length < 4) return acc;
    return '*'.repeat(acc.length - 4) + acc.slice(-4);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Settlements & Payouts</h1>
          <p className="text-sm text-slate-500 mt-0.5">View and manage your payout history</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowBankModal(true)}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold py-2.5 px-4 rounded-lg transition-colors"
          >
            <DollarSign className="w-4 h-4 text-slate-500" />
            Bank Account
            {!bankLoading && bankDetails?.isVerified && (
              <ShieldCheck className="w-4 h-4 text-green-600" />
            )}
          </button>
          <button
            onClick={handleDownloadReport}
            disabled={filteredSettlements.length === 0}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => handleMetricClick('paid')}
          className={`group text-left bg-white rounded-xl border shadow-xs p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-green-200 ${metricFilter === 'paid' ? 'border-green-300 ring-1 ring-green-200' : 'border-slate-200/80'}`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-slate-600">Total Paid</span>
            <div className="p-2 bg-green-50 rounded-xl transition-transform duration-200 group-hover:scale-110">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">₹{totalCompleted.toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-500 mt-1">
            {settlements.filter((p) => p.status === 'Paid').length} payouts
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleMetricClick('month')}
          className={`group text-left bg-white rounded-xl border shadow-xs p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200 ${metricFilter === 'month' ? 'border-blue-300 ring-1 ring-blue-200' : 'border-slate-200/80'}`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-slate-600">This Month</span>
            <div className="p-2 bg-blue-50 rounded-xl transition-transform duration-200 group-hover:scale-110">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">₹{thisMonthPayouts.toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-500 mt-1">Current month payouts</p>
        </button>

        <button
          type="button"
          onClick={() => handleMetricClick('pending')}
          className={`group text-left bg-white rounded-xl border shadow-xs p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-yellow-200 ${metricFilter === 'pending' ? 'border-yellow-300 ring-1 ring-yellow-200' : 'border-slate-200/80'}`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-slate-600">Pending Payment</span>
            <div className="p-2 bg-yellow-50 rounded-xl transition-transform duration-200 group-hover:scale-110">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">₹{totalPending.toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-500 mt-1">
            {settlements.filter((p) => p.status === 'Pending' || p.status === 'Processing' || p.status === 'Failed').length} payouts · incl. failed
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleMetricClick('failed')}
          className={`group text-left bg-white rounded-xl border shadow-xs p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-red-200 ${metricFilter === 'failed' ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200/80'}`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-slate-600">Failed</span>
            <div className="p-2 bg-red-50 rounded-xl transition-transform duration-200 group-hover:scale-110">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">₹{totalFailed.toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-500 mt-1">
            {settlements.filter((p) => p.status === 'Failed').length} payouts
          </p>
        </button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
              <input
                type="text"
                placeholder="Search by settlement number or order number..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition"
              />
            </div>

            <div className="w-full sm:w-48">
              <Dropdown
                value={filterStatus}
                options={["All Status", "Paid", "Processing", "Pending", "Failed", "Cancelled"]}
                onChange={(val) => { setFilterStatus(val as string); setMetricFilter('all'); setCurrentPage(1); }}
                placeholder="Filter by status"
              />
            </div>

            <DateRangeCalendar
              from={dateFrom}
              to={dateTo}
              placeholder="Created Date"
              onChange={(f, t) => { setDateFrom(f); setDateTo(t); setCurrentPage(1); }}
            />

            <button
              onClick={fetchSettlements}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Results summary */}
      {filteredSettlements.length > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap text-sm text-slate-600">
          <span>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredSettlements.length)} of {filteredSettlements.length} settlement{filteredSettlements.length === 1 ? '' : 's'}
          </span>
        </div>
      )}

      {/* Payouts Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
            <span className="ml-3 text-slate-500 font-medium">Loading Settlements...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader className="!bg-brand-500/[0.06] !border-0 [&_tr]:border-b [&_tr]:border-brand-100/50 [&_th]:!text-brand-500/60 [&_th]:font-bold [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:h-11">
              <TableRow className="!bg-brand-500/[0.06] hover:!bg-brand-500/[0.06]">
                <TableHead>Settlement No.</TableHead>
                <TableHead>Billing/Order No.</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due/Payment Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSettlements.length > 0 ? (
                paginatedSettlements.map((settlement) => (
                  <TableRow key={settlement.id}>
                    <TableCell>
                      <div className="font-semibold text-brand-600">{settlement.settlementNumber}</div>
                      {settlement.transactionId && (
                        <div className="text-xs text-slate-500 mt-1 font-mono">
                          TXN: {settlement.transactionId}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-900">{settlement.billingNumber}</div>
                    </TableCell>
                    <TableCell>
                      {/* Gross received, split into goods + GST so it can be
                          reconciled against the vendor's own tax invoice. */}
                      <div className="font-semibold text-slate-900">
                        ₹{settlement.amount.toLocaleString('en-IN')}
                      </div>
                      {settlement.taxAmount ? (
                        <div className="text-xs text-slate-500 whitespace-nowrap">
                          ₹{(settlement.baseAmount ?? 0).toLocaleString('en-IN')}
                          {' + '}
                          {settlement.gstPercentage != null ? `${settlement.gstPercentage}% GST` : 'GST'}
                          {' '}₹{settlement.taxAmount.toLocaleString('en-IN')}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-900">{settlement.period}</div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold capitalize whitespace-nowrap ${getStatusBadge(settlement.status)}`}
                      >
                        {getStatusIcon(settlement.status)}
                        {settlement.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {settlement.paymentDate ? (
                        <div className="text-sm text-slate-600">
                          Paid: {new Date(settlement.paymentDate).toLocaleDateString('en-IN')}
                        </div>
                      ) : settlement.dueDate ? (
                        <div className="text-sm text-slate-600">
                          Due: {new Date(settlement.dueDate).toLocaleDateString('en-IN')}
                        </div>
                      ) : settlement.status === 'Pending' ? (
                        <div className="text-sm text-amber-600 font-medium">Awaiting Approval</div>
                      ) : (
                        <div className="text-sm text-slate-400">—</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => viewPayoutDetails(settlement)}
                        className="p-1.5 text-slate-500 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500 py-12">
                    <p className="text-sm">No settlements found matching your filters</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        )}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-end gap-3 text-sm px-5 py-3 border-t border-slate-200">
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
              {getPageRange(currentPage, totalPages).map((p, i) => p === '…' ? (<span key={`e-${i}`} className="px-2 text-slate-400">…</span>) : (<button key={`p-${p}`} onClick={() => setCurrentPage(p as number)} aria-current={p === currentPage ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-brand-500 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Bank Account Modal */}
      {showBankModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-slate-600" />
                Bank Account
              </h2>
              <button
                onClick={() => setShowBankModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            <div className="p-6">
              {bankLoading ? (
                <div className="flex items-center justify-center py-6">
                  <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
                  <span className="ml-2 text-sm text-slate-500">Loading bank details...</span>
                </div>
              ) : bankDetails ? (
                <div className="space-y-4">
                  {/* Verification Badge */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium w-fit ${bankDetails.isVerified ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                    {bankDetails.isVerified
                      ? <><ShieldCheck className="w-4 h-4" /> Verified by Admin</>
                      : <><ShieldAlert className="w-4 h-4" /> Pending Verification</>
                    }
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Bank Name</p>
                      <p className="font-semibold text-slate-900">{bankDetails.bankName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Account Holder</p>
                      <p className="font-semibold text-slate-900">{bankDetails.accountHolderName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Account Number</p>
                      <p className="font-semibold font-mono text-slate-900">{maskAccountNumber(bankDetails.accountNumber)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">IFSC Code</p>
                      <p className="font-semibold text-slate-900">{bankDetails.ifscCode}</p>
                    </div>
                    {bankDetails.accountType && (
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Account Type</p>
                        <p className="font-semibold text-slate-900 capitalize">{bankDetails.accountType}</p>
                      </div>
                    )}
                    {bankDetails.branchName && (
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Branch</p>
                        <p className="font-semibold text-slate-900">{bankDetails.branchName}</p>
                      </div>
                    )}
                  </div>
                  <Link href="/vendor/dashboard/settings/bank" className="block">
                    <Button variant="outline" size="sm" className="gap-2 w-full">
                      <Edit className="w-4 h-4" />
                      Manage Bank Details
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                  <AlertCircle className="w-10 h-10 text-yellow-500" />
                  <p className="text-sm font-semibold text-slate-700">No bank details added yet</p>
                  <p className="text-xs text-slate-500">Add your bank account to receive payouts from settlements.</p>
                  <Link href="/vendor/dashboard/settings/bank">
                    <Button size="sm" className="gap-2 bg-brand-500 hover:bg-brand-600 text-white mt-1">
                      <ExternalLink className="w-4 h-4" />
                      Add Bank Details
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payout Details Modal */}
      {showDetailsModal && selectedSettlement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Settlement Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Settlement Information */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Payout Information</h3>
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Settlement Number</p>
                    <p className="font-semibold text-slate-900">{selectedSettlement.settlementNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Billing Number</p>
                    <p className="font-semibold text-slate-900">{selectedSettlement.billingNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Period</p>
                    <p className="font-semibold text-slate-900">{selectedSettlement.period}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Status</p>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusBadge(selectedSettlement.status)}`}
                    >
                      {selectedSettlement.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Created At</p>
                    <p className="font-semibold text-slate-900">
                      {selectedSettlement.createdAt ? new Date(selectedSettlement.createdAt).toLocaleDateString('en-IN') : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Due Date</p>
                    <p className="font-semibold text-slate-900">
                      {selectedSettlement.dueDate ? new Date(selectedSettlement.dueDate).toLocaleDateString('en-IN') : selectedSettlement.status === 'Pending' ? 'Awaiting Approval' : '—'}
                    </p>
                  </div>
                  {selectedSettlement.paymentDate && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Payment Date</p>
                      <p className="font-semibold text-slate-900">
                        {new Date(selectedSettlement.paymentDate).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  )}
                  {selectedSettlement.transactionId && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Transaction ID</p>
                      <p className="font-semibold font-mono text-slate-900">{selectedSettlement.transactionId}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Financial Overview</h3>
                <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between items-center border-t border-slate-300 pt-3">
                    <span className="font-bold text-slate-900 text-lg">Settlement Amount</span>
                    <span className="font-bold text-slate-900 text-lg">
                      ₹{selectedSettlement.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Download Receipt Button */}
              {selectedSettlement.status === 'Paid' && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDownloadReceipt(selectedSettlement); }}
                  className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Receipt
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-4">
          <p className="text-sm text-slate-700">
            <span className="font-semibold">Note:</span> Payouts are processed
            to your registered bank account. You will receive a confirmation email for each payout.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
