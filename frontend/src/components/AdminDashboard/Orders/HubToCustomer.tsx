"use client";

import { useState, useEffect } from "react";
import { Search, Eye } from "lucide-react";
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
import { orderService, Order } from "@/services/orderService";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";

export default function HubToCustomer() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Statuses relevant for Hub to Customer tracking
  const statusOptions = ["All", "RECEIVED_AT_ADMIN_HUB", "APPROVED_BY_ADMIN_HUB", "SHIPPED_TO_CUSTOMER", "DELIVERED", "CANCELLED", "RETURNED"];

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const res = await orderService.getAdminOrders();
      if (res.success) {
        setOrders(res.data);
      }
    } catch (error: any) {
      showErrorToast(error.message || "Failed to fetch orders");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const mainItem = order.items?.[0] || {} as any;
    const productName = mainItem.productName || "Unknown";
    const sku = mainItem.sku || "N/A";
    const customer = order.customerName || "Unknown";

    const matchesSearch =
      order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "RECEIVED_AT_ADMIN_HUB":
      case "APPROVED_BY_ADMIN_HUB":
        return "bg-teal-100 text-teal-800";
      case "SHIPPED_TO_CUSTOMER":
        return "bg-orange-100 text-orange-800";
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
      case "REJECTED_BY_ADMIN_HUB":
      case "RETURNED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewOrder = (orderId: string) => {
    router.push(`/admin/dashboard/orders/hub-to-customer/view/${orderId}`);
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
          <p className="text-2xl font-bold text-gray-900 mt-1">{orders.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">At Hub</p>
          <p className="text-2xl font-bold text-teal-600 mt-1">
            {orders.filter((o) => ["RECEIVED_AT_ADMIN_HUB", "APPROVED_BY_ADMIN_HUB"].includes(o.status)).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Out for Delivery</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">
            {orders.filter((o) => o.status === "SHIPPED_TO_CUSTOMER").length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Delivered</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {orders.filter((o) => o.status === "DELIVERED").length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by Order ID, Product, SKU, or Customer..."
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
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Order Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => {
                const mainItem = order.items?.[0] || {} as any;
                const productName = mainItem.productName || "Unknown";
                const sku = mainItem.sku || "N/A";
                const customer = order.customerName || "Unknown";

                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderId}</TableCell>
                    <TableCell>
                      {productName}
                      {order.items?.length > 1 && <span className="text-xs text-gray-500 block">+{order.items.length - 1} more items</span>}
                    </TableCell>
                    <TableCell>{sku}</TableCell>
                    <TableCell>{customer}</TableCell>
                    <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>₹{order.totalAmount?.toLocaleString()}</TableCell>
                    <TableCell>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleViewOrder(order.id)}
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
