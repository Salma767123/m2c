"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Eye, RefreshCw, FileText, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/UI/Table";
import Dropdown from "@/components/UI/Dropdown";
import { orderService, Order } from "@/services/orderService";
import { showErrorToast } from "@/lib/toast-utils";
import { hasPermission } from "@/lib/auth";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const fmtINR = (n: number) =>
  "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Map payment status → invoice status label
const invoiceStatus = (paymentStatus?: string): "Paid" | "Pending" | "Overdue" => {
  if (!paymentStatus) return "Pending";
  const p = paymentStatus.toUpperCase();
  if (p === "PAID" || p === "SUCCESS" || p === "CAPTURED") return "Paid";
  if (p === "FAILED" || p === "REFUNDED") return "Overdue";
  return "Pending";
};

const statusColor = (s: string) => {
  if (s === "Paid") return "bg-green-100 text-green-800";
  if (s === "Pending") return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function InvoiceManagement() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

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

    return matchSearch && matchStatus;
  });

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
    <div className="space-y-6">

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Invoices", value: ordersWithInvoice.length, color: "text-gray-900" },
          { label: "Paid", value: paid, color: "text-green-600" },
          { label: "Pending", value: pending, color: "text-yellow-600" },
          { label: "Overdue", value: overdue, color: "text-red-600" },
        ].map(s => (
          <div key={s.label} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by Invoice No, Order ID or Customer…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            />
          </div>
          <div className="w-full md:w-44">
            <Dropdown
              value={statusFilter}
              options={statusOptions}
              onChange={v => setStatusFilter(v as string)}
              placeholder="Filter by Status"
            />
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-3" />
            <span className="text-gray-500">Loading invoices…</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
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
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                    <Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>No invoices found</p>
                    {!searchTerm && statusFilter === "All" && (
                      <p className="text-xs mt-1 text-gray-400">New orders will appear here once placed</p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(order => {
                  const status = invoiceStatus(order.paymentStatus);
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-semibold text-indigo-700">
                        {order.invoiceNo ? (
                          <span className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            {order.invoiceNo}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs italic">No invoice</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{order.orderId}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{order.customerName || "—"}</p>
                          <p className="text-xs text-gray-500">{order.customerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {fmtDate(order.orderDate || order.createdAt)}
                      </TableCell>
                      <TableCell className="font-semibold">{fmtINR(order.totalAmount)}</TableCell>
                      <TableCell className="text-sm text-gray-600">{order.paymentMethod || "—"}</TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(status)}`}>
                          {status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {hasPermission('view_billing') && (
                            <button
                              onClick={() => router.push(`/admin/dashboard/billing/invoices/view/${order.id}`)}
                              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                              title="View Invoice"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          {order.invoiceNo && hasPermission('view_billing') && (
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
        )}
      </div>

      {/* ── Footer count ── */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          Showing {filtered.length} of {orders.length} orders
        </p>
      )}
    </div>
  );
}
