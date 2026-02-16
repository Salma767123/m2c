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
  customer: string;
  hub: string;
  orderDate: string;
  status: "At Hub" | "Out for Delivery" | "Delivered";
  amount: number;
}

const mockOrders: Order[] = [
  {
    id: "1",
    orderId: "ORD-2024-005",
    product: "Linen Curtains",
    sku: "LC-089",
    customer: "David Brown",
    hub: "Mumbai Hub",
    orderDate: "2024-02-14",
    status: "At Hub",
    amount: 4000,
  },
  {
    id: "2",
    orderId: "ORD-2024-006",
    product: "Silk Pillowcase",
    sku: "SP-034",
    customer: "Emma Wilson",
    hub: "Delhi Hub",
    orderDate: "2024-02-13",
    status: "Out for Delivery",
    amount: 2200,
  },
  {
    id: "3",
    orderId: "ORD-2024-007",
    product: "Cotton Duvet",
    sku: "CD-056",
    customer: "Michael Chen",
    hub: "Bangalore Hub",
    orderDate: "2024-02-12",
    status: "Delivered",
    amount: 3800,
  },
];

export default function HubToCustomer() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const statusOptions = ["All", "At Hub", "Out for Delivery", "Delivered"];

  const filteredOrders = mockOrders.filter((order) => {
    const matchesSearch =
      order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "At Hub":
        return "bg-teal-100 text-teal-800";
      case "Out for Delivery":
        return "bg-orange-100 text-orange-800";
      case "Delivered":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewOrder = (orderId: string) => {
    router.push(`/admin/dashboard/orders/hub-to-customer/view/${orderId}`);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{mockOrders.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">At Hub</p>
          <p className="text-2xl font-bold text-teal-600 mt-1">
            {mockOrders.filter((o) => o.status === "At Hub").length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Out for Delivery</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">
            {mockOrders.filter((o) => o.status === "Out for Delivery").length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Delivered</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {mockOrders.filter((o) => o.status === "Delivered").length}
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
              <TableHead>Customer</TableHead>
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
                  <TableCell>{order.customer}</TableCell>
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
