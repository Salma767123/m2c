"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Eye, RefreshCw } from "lucide-react";
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

export default function VendorOrderManagement() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [shipments, setShipments] = useState<VendorShipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const statusOptions = ["All", "ORDER_CREATED", "VENDOR_PROCESSING", "PACKED_BY_VENDOR", "IN_TRANSIT_TO_ADMIN_HUB", "APPROVED_BY_ADMIN_HUB", "REJECTED_BY_ADMIN_HUB", "CANCELLED"];

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ORDER_CREATED":
        return "bg-gray-100 text-gray-800";
      case "VENDOR_PROCESSING":
        return "bg-blue-100 text-blue-800";
      case "PACKED_BY_VENDOR":
        return "bg-purple-100 text-purple-800";
      case "IN_TRANSIT_TO_ADMIN_HUB":
        return "bg-indigo-100 text-indigo-800";
      case "RECEIVED_AT_ADMIN_HUB":
        return "bg-teal-100 text-teal-800";
      case "APPROVED_BY_ADMIN_HUB":
        return "bg-green-100 text-green-800";
      case "REJECTED_BY_ADMIN_HUB":
        return "bg-orange-100 text-orange-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewOrder = (shipmentId: string) => {
    router.push(`/vendor/dashboard/orders/view/${shipmentId}`);
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">Loading orders...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{shipments.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Processing</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {shipments.filter((s) => s.status === "VENDOR_PROCESSING").length}
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
          <p className="text-2xl font-bold text-indigo-600 mt-1">
            {shipments.filter((s) => s.status === "IN_TRANSIT_TO_ADMIN_HUB").length}
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
              placeholder="Search by Order ID, Product, or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            />
          </div>
          <div className="w-full md:w-64">
            <Dropdown
              value={statusFilter}
              options={statusOptions}
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

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
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
            {filteredShipments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              filteredShipments.map((s) => {
                const mainItem = s.items?.[0] || ({} as any);
                const productName = mainItem.productName || "Unknown";
                const sku = mainItem.sku || "N/A";
                const totalQuantity = s.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0;

                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.order?.orderId || s.shipmentId}</TableCell>
                    <TableCell>
                      {productName}
                      {s.items?.length > 1 && <span className="text-xs text-gray-500 block">+{s.items.length - 1} more items</span>}
                    </TableCell>
                    <TableCell>{sku}</TableCell>
                    <TableCell>{totalQuantity}</TableCell>
                    <TableCell>{new Date(s.order?.createdAt || s.createdAt).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(s.status)}`}
                      >
                        {s.status.replace(/_/g, " ")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleViewOrder(s.id)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View Order"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
