"use client";

import { useState } from "react";
import { Search, Eye, Download, Share2 } from "lucide-react";
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

interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  customer: string;
  date: string;
  dueDate: string;
  amount: number;
  status: "Paid" | "Pending" | "Overdue";
  type: "Customer" | "Vendor";
}

const mockInvoices: Invoice[] = [
  {
    id: "1",
    invoiceNumber: "INV-2024-001",
    orderId: "ORD-2024-001",
    customer: "John Doe",
    date: "2024-02-10",
    dueDate: "2024-02-20",
    amount: 2500,
    status: "Paid",
    type: "Customer",
  },
  {
    id: "2",
    invoiceNumber: "INV-2024-002",
    orderId: "ORD-2024-002",
    customer: "Jane Smith",
    date: "2024-02-11",
    dueDate: "2024-02-21",
    amount: 5000,
    status: "Pending",
    type: "Customer",
  },
  {
    id: "3",
    invoiceNumber: "INV-2024-003",
    orderId: "ORD-2024-003",
    customer: "Textile Traders",
    date: "2024-02-12",
    dueDate: "2024-02-22",
    amount: 3500,
    status: "Paid",
    type: "Vendor",
  },
  {
    id: "4",
    invoiceNumber: "INV-2024-004",
    orderId: "ORD-2024-004",
    customer: "Mike Johnson",
    date: "2024-02-13",
    dueDate: "2024-02-23",
    amount: 1500,
    status: "Overdue",
    type: "Customer",
  },
];

export default function InvoiceManagement() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const statusOptions = ["All", "Paid", "Pending", "Overdue"];
  const typeOptions = ["All", "Customer", "Vendor"];

  const filteredInvoices = mockInvoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || invoice.status === statusFilter;
    const matchesType = typeFilter === "All" || invoice.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: string) => {
    return type === "Customer" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800";
  };

  const handleViewInvoice = (invoiceId: string) => {
    router.push(`/admin/dashboard/billing/invoices/view/${invoiceId}`);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Total Invoices</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{mockInvoices.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Paid</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {mockInvoices.filter((i) => i.status === "Paid").length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {mockInvoices.filter((i) => i.status === "Pending").length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Overdue</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {mockInvoices.filter((i) => i.status === "Overdue").length}
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
              placeholder="Search by Invoice Number, Order ID, or Customer..."
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
          <div className="w-full md:w-48">
            <Dropdown
              value={typeFilter}
              options={typeOptions}
              onChange={(value) => setTypeFilter(value as string)}
              placeholder="Filter by Type"
            />
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice Number</TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer/Vendor</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  No invoices found
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.orderId}</TableCell>
                  <TableCell>{invoice.customer}</TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(
                        invoice.type
                      )}`}
                    >
                      {invoice.type}
                    </span>
                  </TableCell>
                  <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell>₹{invoice.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        invoice.status
                      )}`}
                    >
                      {invoice.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewInvoice(invoice.id)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View Invoice"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </div>
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
