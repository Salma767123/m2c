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
import axios from '@/lib/axios';

// M2C's own registration details for the settlement advice "Paid By" block.
interface SellerInfo {
  companyName: string;
  gstNumber?: string | null;
  registeredAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
}

const PAGE_SIZE = 10;

// Settlement money is always the vendor's own figure in INR (backend guarantee).
// Two decimals to read like a real invoice (GST lines carry paise, e.g. 115.20).
const fmtINR = (n?: number | null) =>
  `₹${(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDocDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

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
  const [seller, setSeller] = useState<SellerInfo>({ companyName: 'M2C MarkDowns' });

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

  const fetchSellerInfo = async () => {
    try {
      const res = await axios.get('/company-info/public');
      if (res?.data?.success && res.data.data) {
        const d = res.data.data;
        setSeller({
          companyName: d.companyName || 'M2C MarkDowns',
          gstNumber: d.gstNumber,
          registeredAddress: d.registeredAddress,
          city: d.city,
          state: d.state,
          zipCode: d.zipCode,
          country: d.country,
        });
      }
    } catch {
      // Non-fatal — fall back to the company name only.
    }
  };

  useEffect(() => {
    fetchSettlements();
    fetchBankDetails();
    fetchSellerInfo();
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

    // ── Products in this settlement (only if the frozen snapshot exists) ──
    if (settlement.lineItemsAvailable && settlement.lineItems?.length) {
      y += 5;
      doc.setFillColor(243, 244, 246);
      doc.rect(15, y - 6, pageW - 30, 10, 'F');
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Products in this Settlement', 18, y);

      y += 12;
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.setFont('helvetica', 'bold');
      // Column anchors: Product | Qty | Unit | Taxable | GST | Total
      const colQty = pageW - 92, colUnit = pageW - 74, colTax = pageW - 52, colGst = pageW - 32, colTotal = pageW - 18;
      doc.text('Product', 18, y);
      doc.text('Qty', colQty, y, { align: 'right' });
      doc.text('Unit', colUnit, y, { align: 'right' });
      doc.text('Taxable', colTax, y, { align: 'right' });
      doc.text('GST', colGst, y, { align: 'right' });
      doc.text('Total', colTotal, y, { align: 'right' });
      y += 3;
      doc.setDrawColor(229, 231, 235);
      doc.line(15, y, pageW - 15, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(17, 24, 39);
      settlement.lineItems.forEach((li) => {
        const name = li.productName.length > 34 ? li.productName.slice(0, 33) + '…' : li.productName;
        doc.text(name, 18, y);
        doc.text(String(li.quantity), colQty, y, { align: 'right' });
        doc.text(`Rs.${(li.unitPrice ?? 0).toLocaleString('en-IN')}`, colUnit, y, { align: 'right' });
        doc.text(`Rs.${(li.taxableValue ?? 0).toLocaleString('en-IN')}`, colTax, y, { align: 'right' });
        doc.text(li.gstAmount ? `Rs.${li.gstAmount.toLocaleString('en-IN')}` : '-', colGst, y, { align: 'right' });
        doc.text(`Rs.${(li.lineTotal ?? 0).toLocaleString('en-IN')}`, colTotal, y, { align: 'right' });
        y += 8;
      });
      y += 2;
    }

    // ── Financial Overview section ──
    y += 5;
    doc.setFillColor(243, 244, 246);
    doc.rect(15, y - 6, pageW - 30, 10, 'F');
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Overview', 18, y);

    // Goods + GST split, when present, before the gross total.
    if (settlement.taxAmount) {
      y += 12;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text('Taxable Value (goods)', 18, y);
      doc.text(`Rs. ${(settlement.baseAmount ?? 0).toLocaleString('en-IN')}`, pageW - 18, y, { align: 'right' });
      y += 8;
      doc.text(`GST${settlement.gstPercentage != null ? ` (${settlement.gstPercentage}%)` : ''}`, 18, y);
      doc.text(`Rs. ${settlement.taxAmount.toLocaleString('en-IN')}`, pageW - 18, y, { align: 'right' });
    }

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

      {/* Settlement Advice — rendered as a standard invoice document so the
          vendor gets the same From/To → line-items → totals layout used across
          the platform's invoices (mirrors AdminDashboard/Billing/InvoiceDetail). */}
      {showDetailsModal && selectedSettlement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Action bar (not part of the document) */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Settlement Advice</h2>
              <div className="flex items-center gap-2">
                {selectedSettlement.status === 'Paid' && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDownloadReceipt(selectedSettlement); }}
                    className="hidden sm:flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Receipt
                  </button>
                )}
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-600" />
                </button>
              </div>
            </div>

            {/* ── Invoice Document ── */}
            <div className="p-6">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="bg-brand-500 px-8 py-6 flex justify-between items-start">
                  <div>
                    <p className="text-2xl font-bold text-white mb-1">M2C MarkDowns</p>
                    <p className="text-white/80 text-xs uppercase tracking-wider">Vendor Settlement Advice</p>
                    <p className="text-white font-mono font-semibold text-sm mt-2">{selectedSettlement.settlementNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-white/70 uppercase tracking-wider mb-1">Date</p>
                    <p className="text-white font-semibold">{fmtDocDate(selectedSettlement.createdAt)}</p>
                    <span className={`inline-flex mt-2 px-3 py-1 rounded-full text-xs font-bold capitalize ${getStatusBadge(selectedSettlement.status)}`}>
                      {selectedSettlement.status}
                    </span>
                  </div>
                </div>

                <div className="p-8">
                  {/* Paid By + Paid To — each with GSTIN + registered address */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6 pb-6 border-b border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Paid By</p>
                      <p className="font-bold text-slate-900 text-base">{seller.companyName}</p>
                      {seller.gstNumber && (
                        <p className="text-sm text-slate-600 mt-1">GSTIN: <span className="font-mono">{seller.gstNumber}</span></p>
                      )}
                      {(() => {
                        const line = [
                          seller.registeredAddress,
                          [seller.city, seller.state, seller.zipCode].filter(Boolean).join(', '),
                          seller.country,
                        ].filter(Boolean).join(', ');
                        return line ? <p className="text-sm text-slate-600 mt-1 leading-relaxed">{line}</p> : null;
                      })()}
                    </div>
                    <div className="md:text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Paid To</p>
                      <p className="font-bold text-slate-900 text-base">{selectedSettlement.vendor?.companyName || selectedSettlement.vendorName || '—'}</p>
                      {selectedSettlement.vendor?.gstNumber ? (
                        <p className="text-sm text-slate-600 mt-1">GSTIN: <span className="font-mono">{selectedSettlement.vendor.gstNumber}</span></p>
                      ) : (
                        <p className="text-sm text-slate-400 italic mt-1">Unregistered (no GSTIN)</p>
                      )}
                      {(() => {
                        const v = selectedSettlement.vendor;
                        if (!v) return null;
                        const line = [
                          v.businessAddress, v.addressLine2, v.addressLine3, v.landmark,
                          [v.businessCity, v.businessState, v.businessZipCode].filter(Boolean).join(', '),
                          v.businessCountry,
                        ].filter(Boolean).join(', ');
                        return line ? <p className="text-sm text-slate-600 mt-1 leading-relaxed">{line}</p> : null;
                      })()}
                    </div>
                  </div>

                  {/* Settlement meta — stacked label/value cells so long mono values
                      (billing / order / txn IDs) align cleanly instead of wrapping. */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4 mb-8 pb-8 border-b border-slate-100">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Invoice No</p>
                      <p className="text-sm font-mono font-semibold text-slate-900 break-all">{selectedSettlement.billingNumber || '—'}</p>
                    </div>
                    {selectedSettlement.order?.orderId && (
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Order ID</p>
                        <p className="text-sm font-mono font-semibold text-slate-900 break-all">{selectedSettlement.order.orderId}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Billing Period</p>
                      <p className="text-sm font-semibold text-slate-900">{selectedSettlement.period || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Due Date</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedSettlement.dueDate ? fmtDocDate(selectedSettlement.dueDate) : selectedSettlement.status === 'Pending' ? 'Awaiting Approval' : '—'}
                      </p>
                    </div>
                    {selectedSettlement.paymentDate && (
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Paid On</p>
                        <p className="text-sm font-semibold text-slate-900">{fmtDocDate(selectedSettlement.paymentDate)}</p>
                      </div>
                    )}
                    {selectedSettlement.transactionId && (
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Txn ID</p>
                        <p className="text-sm font-mono font-semibold text-slate-900 break-all">{selectedSettlement.transactionId}</p>
                      </div>
                    )}
                  </div>

                  {/* Line items — goods this payout covers, at the vendor's own price.
                      Shown only when the frozen snapshot exists; older settlements
                      fall back to a note rather than inventing per-line figures. */}
                  <div className="mb-8">
                    {selectedSettlement.lineItemsAvailable && selectedSettlement.lineItems?.length ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-slate-50">
                              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">#</th>
                              <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">Item</th>
                              <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">Qty</th>
                              <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">Unit Price</th>
                              <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">Taxable</th>
                              <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">GST</th>
                              <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedSettlement.lineItems.map((li, i) => (
                              <tr key={li.id} className="border-b border-slate-100">
                                <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                                <td className="px-4 py-3">
                                  <div className="font-semibold text-slate-900">{li.productName}</div>
                                  <div className="text-xs text-slate-500">
                                    SKU: {li.sku}
                                    {(li.size || li.color) && ` · ${[li.size, li.color].filter(Boolean).join(' / ')}`}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">{li.quantity}</td>
                                <td className="px-4 py-3 text-right">{fmtINR(li.unitPrice)}</td>
                                <td className="px-4 py-3 text-right">{fmtINR(li.taxableValue)}</td>
                                <td className="px-4 py-3 text-right">
                                  {li.gstAmount
                                    ? <>{fmtINR(li.gstAmount)}{li.gstRate != null && <span className="text-xs text-slate-400"> ({li.gstRate}%)</span>}</>
                                    : <span className="text-slate-400">—</span>}
                                </td>
                                <td className="px-4 py-3 text-right font-semibold">{fmtINR(li.lineTotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-500">
                        Line-item detail isn&apos;t available for settlements created before this
                        update. The totals below remain accurate.
                      </div>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-72 space-y-2 text-sm">
                      {/* Goods + GST split so it reconciles against the vendor's tax invoice. */}
                      {selectedSettlement.taxAmount ? (
                        <>
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-500">Taxable Value (goods)</span>
                            <span className="font-medium">{fmtINR(selectedSettlement.baseAmount)}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-500">
                              GST{selectedSettlement.gstPercentage != null ? ` (${selectedSettlement.gstPercentage}%)` : ''}
                            </span>
                            <span className="font-medium">{fmtINR(selectedSettlement.taxAmount)}</span>
                          </div>
                        </>
                      ) : null}
                      <div className="flex justify-between py-3 px-4 bg-brand-500 text-white rounded-lg mt-2">
                        <span className="font-bold text-base">Settlement Amount</span>
                        <span className="font-bold text-base">{fmtINR(selectedSettlement.amount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-10 pt-6 border-t border-slate-100 text-center">
                    <p className="text-sm text-slate-500">Payout to your registered bank account.</p>
                    <p className="text-xs text-slate-400 mt-1">This is a computer-generated settlement advice and does not require a signature.</p>
                  </div>
                </div>
              </div>

              {/* Download Receipt — full-width fallback for narrow screens / paid rows */}
              {selectedSettlement.status === 'Paid' && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDownloadReceipt(selectedSettlement); }}
                  className="sm:hidden mt-6 w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
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
