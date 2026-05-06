"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search, Eye, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
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
import { hasPermission } from "@/lib/auth";

// Polls every 30s while the tab is visible so admin sees vendor status updates without F5.
const REFRESH_INTERVAL_MS = 30000;
const PAGE_SIZE = 10;

function getPageRange(current: number, total: number): Array<number | '\u2026'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | '\u2026'> = [1];
  if (current > 4) pages.push('\u2026');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < total - 3) pages.push('\u2026');
  pages.push(total);
  return pages;
}

/** A group of shipments that belong to the same customer order. */
interface OrderGroup {
  orderId: string;          // human-readable e.g. ORD-2024-001
  orderDbId: string;        // mongo ObjectId of the order
  orderDate: string;
  shipments: VendorShipment[];
  isMultiVendor: boolean;
}

/** Aggregate status label for a multi-vendor group (ignores cancelled/returned). */
function getGroupStatus(shipments: VendorShipment[]): string {
  const active = shipments.filter(s => s.status !== 'CANCELLED' && s.status !== 'RETURNED');
  if (active.length === 0) return shipments[0].status; // all terminal — show first
  const statuses = new Set(active.map(s => s.status));
  if (statuses.size === 1) return active[0].status;
  return "MIXED";
}

export default function VendorToHub() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [shipments, setShipments] = useState<VendorShipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const STATUS_LABELS: Record<string, string> = {
    "Active": "Active Orders",
    "All": "All Statuses",
    "ORDER_CREATED": "Order Created",
    "VENDOR_PROCESSING": "Vendor Processing",
    "PACKED_BY_VENDOR": "Packed by Vendor",
    "IN_TRANSIT_TO_ADMIN_HUB": "In Transit to Hub",
    "RECEIVED_AT_ADMIN_HUB": "Received at Hub",
  };
  const ACTIVE_STATUSES = ["ORDER_CREATED", "VENDOR_PROCESSING", "PACKED_BY_VENDOR", "IN_TRANSIT_TO_ADMIN_HUB"];
  const statusOptions = Object.keys(STATUS_LABELS);
  const statusDisplayOptions = statusOptions.map(key => ({ value: key, label: STATUS_LABELS[key] }));

  const isFetchingRef = useRef(false);

  const fetchShipments = useCallback(async (silent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      if (silent) setIsRefreshing(true);
      else setIsLoading(true);
      const res = await orderService.getAdminShipments();
      if (res.success) {
        setShipments(res.data);
        setLastUpdated(new Date());
      }
    } catch (error: any) {
      if (!silent) showErrorToast(error.message || "Failed to fetch shipments");
      else console.warn("Silent shipment refresh failed:", error.message || error);
    } finally {
      isFetchingRef.current = false;
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShipments();

    let timer: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (timer) return;
      timer = setInterval(() => fetchShipments(true), REFRESH_INTERVAL_MS);
    };
    const stopPolling = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchShipments(true);
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
  }, [fetchShipments]);

  const handleManualRefresh = () => {
    isFetchingRef.current = false; // allow manual refresh even if polling is in-flight
    fetchShipments(true);
  };

  // Group shipments by order
  const orderGroups: OrderGroup[] = useMemo(() => {
    const map = new Map<string, OrderGroup>();
    for (const s of shipments) {
      // Group by the stable orderId (ObjectId), not the human-readable string
      const key = s.orderId;
      if (!map.has(key)) {
        map.set(key, {
          orderId: s.order?.orderId || s.shipmentId,
          orderDbId: s.orderId,
          orderDate: s.order?.createdAt || s.createdAt,
          shipments: [],
          isMultiVendor: false,
        });
      }
      map.get(key)!.shipments.push(s);
    }
    // Mark groups that need expandable rows (multiple shipments OR multiple vendors)
    for (const group of map.values()) {
      group.isMultiVendor = group.shipments.length > 1;
    }
    return Array.from(map.values());
  }, [shipments]);

  // Filter groups
  const filteredGroups = orderGroups.filter((group) => {
    // Search across all shipments in the group
    const matchesSearch = searchTerm === "" || group.shipments.some((s) => {
      const mainItem = s.items?.[0] || {} as any;
      const productName = mainItem.productName || "";
      const sku = mainItem.sku || "";
      return (
        group.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.vendorName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    // Status filter: match if ANY shipment in the group matches
    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Active" && group.shipments.some(s => ACTIVE_STATUSES.includes(s.status))) ||
      group.shipments.some(s => s.status === statusFilter);

    return matchesSearch && matchesStatus;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Pagination (by order group, not by shipment)
  const totalPages = Math.ceil(filteredGroups.length / PAGE_SIZE);
  const paginatedGroups = filteredGroups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = filteredGroups.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredGroups.length);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ORDER_CREATED":
      case "VENDOR_PROCESSING":
        return "bg-yellow-100 text-yellow-800";
      case "PACKED_BY_VENDOR":
        return "bg-purple-100 text-purple-800";
      case "IN_TRANSIT_TO_ADMIN_HUB":
        return "bg-blue-100 text-blue-800";
      case "RECEIVED_AT_ADMIN_HUB":
        return "bg-green-100 text-green-800";
      case "MIXED":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewShipment = (shipmentId: string) => {
    router.push(`/admin/dashboard/orders/vendor-to-hub/view/${shipmentId}`);
  };

  const toggleExpanded = (orderId: string) => {
    setExpandedOrder((prev) => (prev === orderId ? null : orderId));
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">Loading shipments...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Total Shipments</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{shipments.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Processing</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {shipments.filter((s) => s.status === "VENDOR_PROCESSING" || s.status === "ORDER_CREATED").length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Packed</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {shipments.filter((s) => s.status === "PACKED_BY_VENDOR").length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">In Transit</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {shipments.filter((s) => s.status === "IN_TRANSIT_TO_ADMIN_HUB").length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Received at Hub</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {shipments.filter((s) => s.status === "RECEIVED_AT_ADMIN_HUB").length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by Order ID, Product, SKU, or Vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            />
          </div>
          <div className="w-full md:w-64">
            <Dropdown
              value={statusFilter}
              options={statusDisplayOptions}
              onChange={(value) => setStatusFilter(value as string)}
              placeholder="Filter by Status"
            />
          </div>
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shrink-0"
            title={lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString("en-IN")}` : "Refresh"}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="text-sm font-medium">Refresh</span>
          </button>
        </div>
        {lastUpdated && (
          <p className="text-xs text-gray-500 mt-3">
            Auto-updates every 30s &middot; Last updated {lastUpdated.toLocaleTimeString("en-IN")}
          </p>
        )}
      </div>

      {/* Results summary */}
      <div className="flex items-center justify-between gap-4 flex-wrap text-sm text-slate-600">
        <span>
          {filteredGroups.length === 0
            ? '0 orders'
            : `Showing ${rangeStart}–${rangeEnd} of ${filteredGroups.length} order${filteredGroups.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Order Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              paginatedGroups.map((group) => {
                const isExpanded = expandedOrder === group.orderId;

                if (!group.isMultiVendor) {
                  // Single-vendor order — render one flat row
                  const s = group.shipments[0];
                  const mainItem = s.items?.[0] || {} as any;
                  const productName = mainItem.productName || "Unknown";
                  const sku = mainItem.sku || "N/A";
                  const shipmentAmount = s.items?.reduce((acc: number, item: any) => acc + item.totalPrice, 0) || 0;

                  return (
                    <TableRow key={s.id}>
                      <TableCell></TableCell>
                      <TableCell className="font-medium">{group.orderId}</TableCell>
                      <TableCell>
                        {productName}
                        {s.items?.length > 1 && <span className="text-xs text-gray-500 block">+{s.items.length - 1} more</span>}
                      </TableCell>
                      <TableCell>{sku}</TableCell>
                      <TableCell>{s.vendorName}</TableCell>
                      <TableCell>{new Date(group.orderDate).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell>₹{shipmentAmount.toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(s.status)}`}>
                          {s.status.replace(/_/g, " ")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleViewShipment(s.id)}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View Shipment"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                }

                // Multi-vendor order — render parent row + expandable children
                const groupStatus = getGroupStatus(group.shipments);
                const activeShipments = group.shipments.filter(s => s.status !== 'CANCELLED' && s.status !== 'RETURNED');
                const vendorCount = new Set(group.shipments.map(s => s.vendorId)).size;
                const totalItems = activeShipments.reduce((acc, s) => acc + (s.items?.length || 0), 0);
                const totalAmount = activeShipments.reduce((acc, s) =>
                  acc + (s.items?.reduce((a: number, i: any) => a + i.totalPrice, 0) || 0), 0);

                return (
                  <React.Fragment key={group.orderId}>
                    {/* Parent row */}
                    <TableRow
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleExpanded(group.orderId)}
                    >
                      <TableCell>
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4 text-gray-500" />
                          : <ChevronDown className="h-4 w-4 text-gray-500" />
                        }
                      </TableCell>
                      <TableCell className="font-medium">{group.orderId}</TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-900">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-gray-500">—</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-gray-900">
                          {vendorCount} vendor{vendorCount !== 1 ? 's' : ''}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(group.orderDate).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell>₹{totalAmount.toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(groupStatus)}`}>
                          {groupStatus === "MIXED" ? "MIXED STATUS" : groupStatus.replace(/_/g, " ")}
                        </span>
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>

                    {/* Child shipment rows */}
                    {isExpanded && group.shipments.map((s) => {
                      const mainItem = s.items?.[0] || {} as any;
                      const productName = mainItem.productName || "Unknown";
                      const sku = mainItem.sku || "N/A";
                      const shipmentAmount = s.items?.reduce((acc: number, item: any) => acc + item.totalPrice, 0) || 0;

                      return (
                        <TableRow key={s.id} className="bg-gray-50/70">
                          <TableCell>
                            <div className="w-px h-6 bg-gray-300 mx-auto"></div>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500 pl-6">
                            {s.shipmentId.split('-').slice(-1)[0]}
                          </TableCell>
                          <TableCell>
                            {productName}
                            {s.items?.length > 1 && <span className="text-xs text-gray-500 block">+{s.items.length - 1} more</span>}
                          </TableCell>
                          <TableCell>{sku}</TableCell>
                          <TableCell>{s.vendorName}</TableCell>
                          <TableCell className="text-xs text-gray-500">—</TableCell>
                          <TableCell>₹{shipmentAmount.toLocaleString("en-IN")}</TableCell>
                          <TableCell>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(s.status)}`}>
                              {s.status.replace(/_/g, " ")}
                            </span>
                          </TableCell>
                          <TableCell>
                            {hasPermission('view_orders') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewShipment(s.id);
                                }}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                title="View Shipment"
                              >
                                <Eye className="h-5 w-5" />
                              </button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {getPageRange(currentPage, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`e-${i}`} className="px-2 text-slate-400">…</span>
              ) : (
                <button
                  key={`p-${p}`}
                  onClick={() => setCurrentPage(p as number)}
                  aria-current={p === currentPage ? 'page' : undefined}
                  className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-[#222222] text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
