"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import { ArrowLeft, Printer, RefreshCw, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { showErrorToast } from "@/lib/toast-utils";
import { orderService, Order } from "@/services/orderService";
import axios from "@/lib/axios";
import { hasPermission } from "@/lib/auth";

interface InvoiceDetailProps {
  invoiceId: string; // can be order.id (ObjectId) or order.orderId (ORD-...) or order.invoiceNo (INV-...)
}

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtINR = (n: number) =>
  "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const payStatusColor = (s?: string) => {
  if (!s) return "text-yellow-600";
  const p = s.toUpperCase();
  if (p === "PAID" || p === "SUCCESS" || p === "CAPTURED") return "text-green-600";
  return "text-yellow-600";
};

export default function InvoiceDetail({ invoiceId }: InvoiceDetailProps) {
  const router = useRouter();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [companyName, setCompanyName] = useState("M2C Store");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  // ── Fetch order ────────────────────────────────────────────────────────────
  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const [orderRes, companyRes] = await Promise.all([
        orderService.getAdminOrderById(invoiceId),
        axios.get('/company-info').catch(() => null),
      ]);
      if (orderRes.success) setOrder(orderRes.data);
      if (companyRes?.data?.success) {
        setCompanyName(companyRes.data.data?.companyName || "M2C Store");
        setCompanyLogo(companyRes.data.data?.companyLogo || "/assets/logo/logo2.png");
      } else {
        setCompanyLogo("/assets/logo/logo2.png");
      }
    } catch (err: any) {
      showErrorToast("Error", err.message || "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  // ── Print via backend HTML ─────────────────────────────────────────────────
  const handlePrint = async () => {
    if (!order) return;
    setPrinting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const token = localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken") || "";
      const response = await fetch(`${baseUrl}/orders/admin/${order.id}/invoice`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const html = await response.text();
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        // Trigger print after content loads
        setTimeout(() => win.print(), 300);
      }
    } catch {
      showErrorToast("Error", "Failed to generate invoice for printing");
    } finally {
      setPrinting(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-3" />
        <span className="text-gray-500">Loading invoice…</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Invoice not found</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-indigo-600 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const addr = typeof order.shippingAddress === "string"
    ? JSON.parse(order.shippingAddress)
    : order.shippingAddress || {};

  const addrStr = [
    addr.addressLine1,
    addr.addressLine2,
    addr.city && addr.state ? `${addr.city}, ${addr.state}` : (addr.city || addr.state),
    addr.postalCode || addr.zipCode,
    addr.country,
  ].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">

      {/* ── Action Bar ── */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoice Detail</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500">Order: <span className="font-mono font-semibold">{order.orderId}</span></span>
              {order.invoiceNo && (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2.5 py-0.5">
                  <FileText className="h-3 w-3" />
                  {order.invoiceNo}
                </span>
              )}
            </div>
          </div>
        </div>
        {hasPermission("view_billing") && (
          <button
            onClick={handlePrint}
            disabled={printing}
            className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors font-medium"
          >
            {printing
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : <Printer className="h-4 w-4" />}
            {printing ? "Generating…" : "Print Invoice"}
          </button>
        )}
      </div>

      {/* ── Invoice Document ── */}
      <div ref={invoiceRef} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="bg-gray-900 px-8 py-6 flex justify-between items-start">
          <div className="flex items-center gap-4">
            {companyLogo && (
              <img
                src={companyLogo}
                alt={`${companyName} logo`}
                className="h-16 w-auto object-contain rounded-lg bg-white p-1"
              />
            )}
            <div>
              {(companyName !== "M2C Store" && companyName !== "M2C Marketplace Pvt Ltd") && (
                <p className="text-2xl font-bold text-white mb-1">{companyName}</p>
              )}
              <p className="text-indigo-400 font-mono font-semibold text-lg">{order.invoiceNo || order.orderId}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Date</p>
            <p className="text-white font-semibold">{fmtDate(order.orderDate || order.createdAt)}</p>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${(order.paymentStatus || "").toUpperCase() === "PAID" || (order.paymentStatus || "").toUpperCase() === "SUCCESS"
              ? "bg-green-500 text-white"
              : "bg-yellow-400 text-gray-900"
              }`}>
              {order.paymentStatus || "PENDING"}
            </span>
          </div>
        </div>

        <div className="p-8">
          {/* Bill To + Order Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-100">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Bill To</p>
              <p className="font-bold text-gray-900 text-base">{order.customerName || "—"}</p>
              <p className="text-sm text-gray-600 mt-1">{order.customerEmail}</p>
              <p className="text-sm text-gray-600">{order.customerPhone || "—"}</p>
              {addrStr && <p className="text-sm text-gray-600 mt-2 leading-relaxed">{addrStr}</p>}
            </div>
            <div className="md:text-right">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Order Info</p>
              <div className="space-y-1 text-sm">
                <div className="flex md:justify-end gap-4">
                  <span className="text-gray-500">Order ID</span>
                  <span className="font-mono font-semibold text-gray-900">{order.orderId}</span>
                </div>
                <div className="flex md:justify-end gap-4">
                  <span className="text-gray-500">Invoice No</span>
                  <span className="font-mono font-semibold text-indigo-700">{order.invoiceNo || "—"}</span>
                </div>
                <div className="flex md:justify-end gap-4">
                  <span className="text-gray-500">Payment</span>
                  <span className="font-semibold text-gray-900">{order.paymentMethod || "—"}</span>
                </div>
                {order.paymentId && (
                  <div className="flex md:justify-end gap-4">
                    <span className="text-gray-500">Txn ID</span>
                    <span className="font-mono text-xs text-gray-600 break-all max-w-[180px]">{order.paymentId}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">#</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">Item</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">SKU</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">Qty</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">Unit Price</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">Total</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((item: any, i: number) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{item.productName}</div>
                      {item.vendorName && <div className="text-xs text-gray-500">Vendor: {item.vendorName}</div>}
                      {item.size && <div className="text-xs text-gray-500">Size: {item.size}</div>}
                      {item.color && <div className="text-xs text-gray-500">Color: {item.color}</div>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.sku || "—"}</td>
                    <td className="px-4 py-3 text-center">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">{fmtINR(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmtINR(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{fmtINR(order.subtotal)}</span>
              </div>
              {order.shippingCost > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Shipping</span>
                  <span className="font-medium">{fmtINR(order.shippingCost)}</span>
                </div>
              )}
              {order.tax > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Tax (GST)</span>
                  <span className="font-medium">{fmtINR(order.tax)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-green-600">Discount</span>
                  <span className="font-medium text-green-600">− {fmtINR(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 px-4 bg-gray-900 text-white rounded-lg mt-2">
                <span className="font-bold text-base">Grand Total</span>
                <span className="font-bold text-base">{fmtINR(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">Thank you for your purchase!</p>
            <p className="text-xs text-gray-400 mt-1">This is a computer-generated invoice and does not require a signature.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
