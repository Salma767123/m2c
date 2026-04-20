"use client";

import { useState } from "react";
import { Search, Eye, Download } from "lucide-react";
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
import { hasPermission } from "@/lib/auth";

interface Billing {
  id: string;
  billingNumber: string;
  vendor: string;
  period: string;
  startDate: string;
  endDate: string;
  totalOrders: number;
  totalAmount: number;
  commission: number;
  netAmount: number;
  status: "Pending" | "Processed" | "Paid";
}

const mockBillings: Billing[] = [
  {
    id: "1",
    billingNumber: "BILL-2024-001",
    vendor: "Textile Traders",
    period: "January 2024",
    startDate: "2024-01-01",
    endDate: "2024-01-31",
    totalOrders: 45,
    totalAmount: 125000,
    commission: 12500,
    netAmount: 112500,
    status: "Paid",
  },
  {
    id: "2",
    billingNumber: "BILL-2024-002",
    vendor: "Silk Emporium",
    period: "January 2024",
    startDate: "2024-01-01",
    endDate: "2024-01-31",
    totalOrders: 32,
    totalAmount: 98000,
    commission: 9800,
    netAmount: 88200,
    status: "Processed",
  },
  {
    id: "3",
    billingNumber: "BILL-2024-003",
    vendor: "Wool Crafts",
    period: "February 2024",
    startDate: "2024-02-01",
    endDate: "2024-02-29",
    totalOrders: 28,
    totalAmount: 75000,
    commission: 7500,
    netAmount: 67500,
    status: "Pending",
  },
  {
    id: "4",
    billingNumber: "BILL-2024-004",
    vendor: "Home Textiles",
    period: "February 2024",
    startDate: "2024-02-01",
    endDate: "2024-02-29",
    totalOrders: 52,
    totalAmount: 145000,
    commission: 14500,
    netAmount: 130500,
    status: "Processed",
  },
];

export default function BillingManagement() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const statusOptions = ["All", "Pending", "Processed", "Paid"];

  const filteredBillings = mockBillings.filter((billing) => {
    const matchesSearch =
      billing.billingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      billing.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      billing.period.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || billing.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800";
      case "Processed":
        return "bg-blue-100 text-blue-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewBilling = (billingId: string) => {
    router.push(`/admin/dashboard/billing/billings/view/${billingId}`);
  };

  const totalRevenue = mockBillings.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalCommission = mockBillings.reduce((sum, b) => sum + b.commission, 0);
  const totalNetAmount = mockBillings.reduce((sum, b) => sum + b.netAmount, 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Total Billings</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{mockBillings.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">₹{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Total Commission</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">₹{totalCommission.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Net Payable</p>
          <p className="text-2xl font-bold text-green-600 mt-1">₹{totalNetAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by Billing Number, Vendor, or Period..."
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

      {/* Billings Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Billing Number</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Total Orders</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Commission (10%)</TableHead>
              <TableHead>Net Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBillings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  No billings found
                </TableCell>
              </TableRow>
            ) : (
              filteredBillings.map((billing) => (
                <TableRow key={billing.id}>
                  <TableCell className="font-medium">{billing.billingNumber}</TableCell>
                  <TableCell>{billing.vendor}</TableCell>
                  <TableCell>{billing.period}</TableCell>
                  <TableCell>{billing.totalOrders}</TableCell>
                  <TableCell>₹{billing.totalAmount.toLocaleString()}</TableCell>
                  <TableCell>₹{billing.commission.toLocaleString()}</TableCell>
                  <TableCell className="font-medium">₹{billing.netAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        billing.status
                      )}`}
                    >
                      {billing.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {hasPermission('view_billing') && (
                        <button
                          onClick={() => handleViewBilling(billing.id)}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View Billing"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      )}
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
