"use client";

import { useState } from "react";
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

interface Order {
  id: string;
  orderId: string;
  product: string;
  sku: string;
  orderDate: string;
  status: "Pending" | "Assigned" | "Packed" | "Shipped";
  vendor: string;
  hub: string;
  amount: number;
}

const mockOrders: Order[] = [
  {
    id: "1",
    orderId: "ORD-2024-001",
    product: "Cotton Bedsheet Set",
    sku: "CBS-001",
    orderDate: "2024-02-10",
    status: "Pending",
    vendor: "Textile Traders",
    hub: "Not Assigned",
    amount: 2500,
  },
  {
    id: "2",
    orderId: "ORD-2024-002",
    product: "Silk Saree",
    sku: "SS-045",
    orderDate: "2024-02-11",
    status: "Assigned",
    vendor: "Silk Emporium",
    hub: "Mumbai Hub",
    amount: 5000,
  },
  {
    id: "3",
    orderId: "ORD-2024-003",
    product: "Woolen Blanket",
    sku: "WB-023",
    orderDate: "2024-02-12",
    status: "Packed",
    vendor: "Wool Crafts",
    hub: "Delhi Hub",
    amount: 3500,
  },
  {
    id: "4",
    orderId: "ORD-2024-004",
    product: "Cotton Towel Set",
    sku: "CTS-012",
    orderDate: "2024-02-13",
    status: "Shipped",
    vendor: "Home Textiles",
    hub: "Bangalore Hub",
    amount: 1500,
  },
];

export default function VendorToHub() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const statusOptions = ["All", "Pending", "Assigned", "Packed", "Shipped"];

  const filteredOrders = mockOrders.filter((order) => {
    const matchesSearch =
      order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.vendor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Assigned":
        return "bg-blue-100 text-blue-800";
      case "Packed":
        return "bg-purple-100 text-purple-800";
      case "Shipped":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewOrder = (orderId: string) => {
    router.push(`/admin/dashboard/orders/vendor-to-hub/view/${orderId}`);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{mockOrders.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {mockOrders.filter((o) => o.status === "Pending").length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Assigned</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {mockOrders.filter((o) => o.status === "Assigned").length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Packed</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {mockOrders.filter((o) => o.status === "Packed").length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Shipped</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">
            {mockOrders.filter((o) => o.status === "Shipped").length}
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
              placeholder="Search by Order ID, Product, SKU, or Vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            />
          </div>
          <div className="w-full md:w-48">
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
              <TableHead>Vendor</TableHead>
              <TableHead>Hub</TableHead>
              <TableHead>Order Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderId}</TableCell>
                  <TableCell>{order.product}</TableCell>
                  <TableCell>{order.sku}</TableCell>
                  <TableCell>{order.vendor}</TableCell>
                  <TableCell>{order.hub}</TableCell>
                  <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                  <TableCell>₹{order.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
