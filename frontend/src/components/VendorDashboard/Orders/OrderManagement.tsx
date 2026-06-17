"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Eye, RefreshCw, ChevronLeft, ChevronRight, ShoppingBag, Clock, PackageCheck, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/UI/Table";
import Dropdown from "@/components/UI/Dropdown";
import { orderService, VendorShipment } from "@/services/orderService";
import { showErrorToast } from "@/lib/toast-utils";

// Polls every 30s while the tab is visible so vendor sees admin status updates without F5.
const REFRESH_INTERVAL_MS = 30000;
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

export default function VendorOrderManagement() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [shipments, setShipments] = useState<VendorShipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const statusOptions = [
    { value: "All", label: "All Status" },
    { value: "ORDER_CREATED", label: "Order Created" },
    { value: "VENDOR_PROCESSING", label: "Processing" },
    { value: "PACKED_BY_VENDOR", label: "Packed" },
    { value: "IN_TRANSIT_TO_ADMIN_HUB", label: "In Transit" },
    { value: "APPROVED_BY_ADMIN_HUB", label: "Approved" },
    { value: "REJECTED_BY_ADMIN_HUB", label: "Rejected" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  const setCardFilter = (status: string) => {
    setStatusFilter((prev) => (prev === status ? "All" : status));
    setCurrentPage(1);
  };

  const isFetchingRef = useRef(false);

  const fetchOrders = useCallback(async (silent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      if (silent) setIsRefreshing(true);
      else setIsLoading(true);
      const res = await orderService.getVendorOrders();
      if (res.success) {
        setShipments(res.data);
        setLastUpdated(new Date());
      }
    } catch (error: any) {
      if (!silent) showErrorToast(error.message || "Failed to fetch orders");
      else console.warn("Silent order refresh failed:", error.message || error);
    } finally {
      isFetchingRef.current = false;
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    let timer: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (timer) return;
      timer = setInterval(() => fetchOrders(true), REFRESH_INTERVAL_MS);
    };
    const stopPolling = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchOrders(true);
        startPolling();
      } else {
        stopPolling();
      }
    };
    startPolling();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fetchOrders]);

  const handleManualRefresh = () => fetchOrders(true);

  const filteredShipments = shipments.filter((s) => {
    const mainItem = s.items?.[0] || ({} as any);
    const productName = mainItem.productName || "Unknown";
    const sku = mainItem.sku || "N/A";
    const orderId = s.order?.orderId || s.shipmentId || "";

    const matchesSearch =
      orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredShipments.length / PAGE_SIZE);
  const paginatedShipments = filteredShipments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ORDER_CREATED":
        return "bg-slate-50 text-slate-700 border border-slate-200";
      case "VENDOR_PROCESSING":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      case "PACKED_BY_VENDOR":
        return "bg-purple-50 text-purple-700 border border-purple-200";
      case "IN_TRANSIT_TO_ADMIN_HUB":
        return "bg-indigo-50 text-indigo-700 border border-indigo-200";
      case "RECEIVED_AT_ADMIN_HUB":
        return "bg-teal-50 text-teal-700 border border-teal-200";
      case "APPROVED_BY_ADMIN_HUB":
        return "bg-green-50 text-green-700 border border-green-200";
      case "REJECTED_BY_ADMIN_HUB":
        return "bg-orange-50 text-orange-700 border border-orange-200";
      case "CANCELLED":
        return "bg-red-50 text-red-700 border border-red-200";
      default:
        return "bg-slate-50 text-slate-700 border border-slate-200";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ORDER_CREATED: "Order Created",
      VENDOR_PROCESSING: "Processing",
      PACKED_BY_VENDOR: "Packed",
      IN_TRANSIT_TO_ADMIN_HUB: "In Transit",
      RECEIVED_AT_ADMIN_HUB: "Received at Hub",
      APPROVED_BY_ADMIN_HUB: "Approved",
      REJECTED_BY_ADMIN_HUB: "Rejected",
      CANCELLED: "Cancelled",
    };
    return labels[status] || status.replace(/_/g, " ");
  };

  const handleViewOrder = (shipmentId: string) => {
    router.push(`/vendor/dashboard/orders/view/${shipmentId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Order Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Process and ship your assigned orders</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700"></div>
            <span className="ml-3 text-slate-600">Loading orders...</span>
          </div>
        </div>
      </div>
    );
  }

  const processingCount = shipments.filter((s) => s.status === "VENDOR_PROCESSING").length;
  const packedCount = shipments.filter((s) => s.status === "PACKED_BY_VENDOR").length;
  const inTransitCount = shipments.filter((s) => s.status === "IN_TRANSIT_TO_ADMIN_HUB").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Order Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">Process and ship your assigned orders</p>
      </div>

      {/* Stats Cards (clickable filters) */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => setCardFilter("All")}
          className={`group text-left bg-white rounded-xl border shadow-xs p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-brand-200 ${statusFilter === "All" ? "border-brand-300 ring-1 ring-brand-200" : "border-slate-200/80"}`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-slate-600">Total Orders</span>
            <div className="p-2 bg-brand-50 rounded-xl transition-transform duration-200 group-hover:scale-110">
              <ShoppingBag className="h-4 w-4 text-brand-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{shipments.length}</p>
          <p className="text-xs text-slate-500 mt-1">All assigned orders</p>
        </button>
        <button
          type="button"
          onClick={() => setCardFilter("VENDOR_PROCESSING")}
          className={`group text-left bg-white rounded-xl border shadow-xs p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200 ${statusFilter === "VENDOR_PROCESSING" ? "border-blue-300 ring-1 ring-blue-200" : "border-slate-200/80"}`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-slate-600">Processing</span>
            <div className="p-2 bg-blue-50 rounded-xl transition-transform duration-200 group-hover:scale-110">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <p className={`text-xl font-bold mt-2 ${processingCount > 0 ? "text-blue-600" : "text-slate-900"}`}>{processingCount}</p>
          <p className="text-xs text-slate-500 mt-1">Awaiting packing</p>
        </button>
        <button
          type="button"
          onClick={() => setCardFilter("PACKED_BY_VENDOR")}
          className={`group text-left bg-white rounded-xl border shadow-xs p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-purple-200 ${statusFilter === "PACKED_BY_VENDOR" ? "border-purple-300 ring-1 ring-purple-200" : "border-slate-200/80"}`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-slate-600">Packed</span>
            <div className="p-2 bg-purple-50 rounded-xl transition-transform duration-200 group-hover:scale-110">
              <PackageCheck className="h-4 w-4 text-purple-600" />
            </div>
          </div>
          <p className={`text-xl font-bold mt-2 ${packedCount > 0 ? "text-purple-600" : "text-slate-900"}`}>{packedCount}</p>
          <p className="text-xs text-slate-500 mt-1">Ready to ship</p>
        </button>
        <button
          type="button"
          onClick={() => setCardFilter("IN_TRANSIT_TO_ADMIN_HUB")}
          className={`group text-left bg-white rounded-xl border shadow-xs p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-200 ${statusFilter === "IN_TRANSIT_TO_ADMIN_HUB" ? "border-indigo-300 ring-1 ring-indigo-200" : "border-slate-200/80"}`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-slate-600">In Transit</span>
            <div className="p-2 bg-indigo-50 rounded-xl transition-transform duration-200 group-hover:scale-110">
              <Truck className="h-4 w-4 text-indigo-600" />
            </div>
          </div>
          <p className={`text-xl font-bold mt-2 ${inTransitCount > 0 ? "text-indigo-600" : "text-slate-900"}`}>{inTransitCount}</p>
          <p className="text-xs text-slate-500 mt-1">On the way to hub</p>
        </button>
      </div>

      {/* Filters */}
      <div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by Order ID, Product, or SKU..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-3">
            <Dropdown
              id="statusFilter"
              value={statusFilter}
              options={statusOptions}
              onChange={(value) => { setStatusFilter(value as string); setCurrentPage(1); }}
              placeholder="Filter by Status"
            />
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shrink-0"
              title={lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString("en-IN")}` : "Refresh"}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="text-sm font-medium">Refresh</span>
            </button>
          </div>
        </div>
        {lastUpdated && (
          <p className="text-xs text-slate-500 mt-3">
            Auto-updates every 30s &middot; Last updated {lastUpdated.toLocaleTimeString("en-IN")}
          </p>
        )}
      </div>

      {/* Results summary */}
      <div className="flex items-center justify-between gap-4 flex-wrap text-sm text-slate-600">
        <span>
          {filteredShipments.length === 0
            ? '0 orders'
            : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredShipments.length)} of ${filteredShipments.length} order${filteredShipments.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader className="!bg-slate-50/80 !border-slate-200/80 [&_tr]:border-b [&_tr]:border-slate-200/80 [&_th]:!text-slate-500 [&_th]:font-bold [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:h-11">
            <TableRow className="!bg-slate-50/80 hover:!bg-slate-50/80">
              <TableHead>Order ID</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>SKU Code</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Order Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedShipments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              paginatedShipments.map((s) => {
                const mainItem = s.items?.[0] || ({} as any);
                const productName = mainItem.productName || "Unknown";
                const sku = mainItem.sku || "N/A";
                const totalQuantity = s.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0;

                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.order?.orderId || s.shipmentId}</TableCell>
                    <TableCell>
                      {productName}
                      {s.items?.length > 1 && <span className="text-xs text-slate-500 block">+{s.items.length - 1} more items</span>}
                    </TableCell>
                    <TableCell>{sku}</TableCell>
                    <TableCell>{totalQuantity}</TableCell>
                    <TableCell>{new Date(s.order?.createdAt || s.createdAt).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${getStatusColor(s.status)}`}
                      >
                        {getStatusLabel(s.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleViewOrder(s.id)}
                        className="p-1.5 text-slate-500 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                        title="View Order"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-3 text-sm px-5 py-3 border-t border-slate-200">
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
              {getPageRange(currentPage, totalPages).map((p, i) => p === '…' ? (<span key={`e-${i}`} className="px-2 text-slate-400">…</span>) : (<button key={`p-${p}`} onClick={() => setCurrentPage(p as number)} aria-current={p === currentPage ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-brand-500 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
