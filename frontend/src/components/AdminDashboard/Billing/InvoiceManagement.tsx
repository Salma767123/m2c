"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Eye, RefreshCw, FileText, Receipt, ChevronLeft, ChevronRight, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/UI/Table";
import Dropdown from "@/components/UI/Dropdown";
import DateRangeCalendar, { fmtDate as isoDate } from "@/components/Shared/DateRangeCalendar";
import { orderService, Order } from "@/services/orderService";
import { formatOrderAmount } from "@/lib/currency";
import { showErrorToast } from "@/lib/toast-utils";
import { hasPermission } from "@/lib/auth";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// Show what the customer was actually charged, plus an INR equivalent for USD
// orders so admins can compare a .com invoice against a .in one. Mirrors the
// Money cell used across the Orders module; the equivalent uses the rate
// snapshotted on the order, so it never drifts when the live rate is edited.
function Money({ amount, order }: { amount: number; order: { currency?: "INR" | "USD"; exchangeRate?: number | null } }) {
  const { charged, inrEquivalent } = formatOrderAmount(amount, order.currency, order.exchangeRate);
  return (
    <div className="whitespace-nowrap">
      <span className="font-semibold text-slate-900">{charged}</span>
      {inrEquivalent && <span className="block text-xs font-normal text-slate-500">≈ {inrEquivalent}</span>}
    </div>
  );
}

// Map payment status → invoice status label
const invoiceStatus = (paymentStatus?: string): "Paid" | "Pending" | "Overdue" => {
  if (!paymentStatus) return "Pending";
  const p = paymentStatus.toUpperCase();
  if (p === "PAID" || p === "SUCCESS" || p === "CAPTURED") return "Paid";
  if (p === "FAILED" || p === "REFUNDED") return "Overdue";
  return "Pending";
};

const statusColor = (s: string) => {
  if (s === "Paid") return "bg-green-50 text-green-700 border border-green-200";
  if (s === "Pending") return "bg-yellow-50 text-yellow-700 border border-yellow-200";
  return "bg-red-50 text-red-700 border border-red-200";
};

const PAGE_SIZE = 10;

function getPageRange(current: number, total: number): Array<number | '...'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | '...'> = [1];
  if (current > 4) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < total - 3) pages.push('...');
  pages.push(total);
  return pages;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InvoiceManagement() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const statusOptions = ["All", "Paid", "Pending", "Overdue"];

  // ── Fetch all orders (admin) ──────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await orderService.getAdminOrders();
      if (res.success) {
        // Only show orders that have an invoice number assigned
        setOrders(res.data); // show all; invoiceNo may be null for old orders
      }
    } catch (err: any) {
      showErrorToast("Error", err.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const ordersWithInvoice = orders.filter(o => o.invoiceNo);
  const paid = ordersWithInvoice.filter(o => invoiceStatus(o.paymentStatus) === "Paid").length;
  const pending = ordersWithInvoice.filter(o => invoiceStatus(o.paymentStatus) === "Pending").length;
  const overdue = ordersWithInvoice.filter(o => invoiceStatus(o.paymentStatus) === "Overdue").length;

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = orders.filter(order => {
    const invNo = (order.invoiceNo || "").toLowerCase();
    const ordId = (order.orderId || "").toLowerCase();
    const custRaw = order.customerName || order.customerEmail || "";
    const cust = custRaw.toLowerCase();
    const search = searchTerm.toLowerCase();

    const matchSearch = !search ||
      invNo.includes(search) || ordId.includes(search) || cust.includes(search);

    const status = invoiceStatus(order.paymentStatus);
    const matchStatus = statusFilter === "All" || status === statusFilter;

    // Invoice-date range filter (YYYY-MM-DD strings compare lexicographically)
    let matchDate = true;
    if (dateFrom || dateTo) {
      const src = order.orderDate || order.createdAt;
      const od = src ? isoDate(new Date(src)) : "";
      if (!od) matchDate = false;
      else if (dateFrom && od < dateFrom) matchDate = false;
      else if (dateTo && od > dateTo) matchDate = false;
    }

    return matchSearch && matchStatus && matchDate;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedInvoices = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // ── Print invoice in new tab ──────────────────────────────────────────────
  const handlePrintInvoice = async (order: Order) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken") || "";
      const response = await fetch(`${baseUrl}/orders/admin/${order.id}/invoice`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const html = await response.text();
      const win = window.open("", "_blank");
      if (win) { win.document.write(html); win.document.close(); win.focus(); }
    } catch {
      showErrorToast("Error", "Failed to generate invoice");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Stats (click a card to filter the table below) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { key: "All", label: "Total Invoices", subtitle: "All invoices", value: ordersWithInvoice.length, Icon: Receipt, iconBg: "bg-brand-50", iconColor: "text-brand-500", countColor: "text-slate-900", activeClass: "border-brand-400 bg-brand-50/50" },
          { key: "Paid", label: "Paid", subtitle: "Settled", value: paid, Icon: CheckCircle, iconBg: "bg-emerald-50", iconColor: "text-emerald-500", countColor: "text-emerald-700", activeClass: "border-emerald-400 bg-emerald-50/60" },
          { key: "Pending", label: "Pending", subtitle: "Awaiting payment", value: pending, Icon: Clock, iconBg: "bg-amber-50", iconColor: "text-amber-500", countColor: "text-amber-700", activeClass: "border-amber-400 bg-amber-50/60" },
          { key: "Overdue", label: "Overdue", subtitle: "Past due", value: overdue, Icon: AlertTriangle, iconBg: "bg-red-50", iconColor: "text-red-500", countColor: "text-red-700", activeClass: "border-red-400 bg-red-50/60" },
        ].map(({ key, label, subtitle, value, Icon, iconBg, iconColor, countColor, activeClass }) => {
          const isActive = statusFilter === key;
          const toggle = () => { setStatusFilter(prev => (prev === key ? "All" : key)); setCurrentPage(1); };
          return (
            <button
              key={key}
              type="button"
              onClick={toggle}
              className={`text-left bg-white border rounded-2xl shadow-xs transition-all duration-200 hover:shadow-sm group ${isActive ? activeClass : "border-slate-200/80 hover:border-slate-300"}`}
            >
              <div className="flex flex-row items-center justify-between px-3.5 pt-3 pb-1">
                <span className="text-[13px] font-medium text-slate-500">{label}</span>
                <div className={`p-1.5 rounded-lg ${isActive ? iconBg.replace("50", "100") : iconBg} transition-transform duration-150 group-hover:scale-110`}>
                  <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
              </div>
              <div className="px-3.5 pb-3">
                <div className={`text-xl font-bold ${countColor}`}>{value}</div>
                <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by Invoice No, Order ID or Customer…"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/40 focus:border-transparent"
            />
          </div>
          <div className="w-full md:w-44">
            <Dropdown
              value={statusFilter}
              options={statusOptions}
              onChange={v => { setStatusFilter(v as string); setCurrentPage(1); }}
              placeholder="Filter by Status"
            />
          </div>
          <div className="shrink-0">
            <DateRangeCalendar
              from={dateFrom}
              to={dateTo}
              onChange={(from, to) => { setDateFrom(from); setDateTo(to); setCurrentPage(1); }}
              placeholder="Invoice Date"
            />
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-slate-400 mr-3" />
            <span className="text-slate-500">Loading invoices…</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader className="!bg-brand-500/[0.06] !border-0 [&_tr]:border-b [&_tr]:border-brand-100/50 [&_th]:!text-brand-500/60 [&_th]:font-bold [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:h-11">
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    <Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>No invoices found</p>
                    {!searchTerm && statusFilter === "All" && !dateFrom && !dateTo && (
                      <p className="text-xs mt-1 text-slate-400">New orders will appear here once placed</p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInvoices.map(order => {
                  const status = invoiceStatus(order.paymentStatus);
                  return (
                    <TableRow key={order.id} className="hover:bg-slate-50/60 transition-colors duration-150 border-b border-slate-100 last:border-0">
                      <TableCell className="font-mono font-semibold text-indigo-700">
                        {order.invoiceNo ? (
                          <span className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            {order.invoiceNo}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">No invoice</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{order.orderId}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{order.customerName || "—"}</p>
                          <p className="text-xs text-slate-500">{order.customerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {fmtDate(order.orderDate || order.createdAt)}
                      </TableCell>
                      <TableCell><Money amount={order.totalAmount} order={order} /></TableCell>
                      <TableCell className="text-sm text-slate-600">{order.paymentMethod || "—"}</TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(status)}`}>
                          {status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {hasPermission('invoices:view') && (
                            <button
                              onClick={() => router.push(`/admin/dashboard/billing/invoices/view/${order.id}`)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                              title="View Invoice"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          {order.invoiceNo && hasPermission('invoices:print') && (
                            <button
                              onClick={() => handlePrintInvoice(order)}
                              className="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Print Invoice"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>
        )}

        {!loading && filtered.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-end px-4 py-3 border-t border-slate-100">
            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
                  {getPageRange(currentPage, totalPages).map((p, i) => p === '...' ? (<span key={`e-${i}`} className="px-2 text-slate-400">...</span>) : (<button key={`p-${p}`} onClick={() => setCurrentPage(p as number)} aria-current={p === currentPage ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-brand-500 text-white shadow-xs shadow-brand-500/20' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
