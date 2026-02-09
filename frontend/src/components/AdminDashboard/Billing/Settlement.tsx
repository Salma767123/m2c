"use client";

import { useState } from "react";
import { Search, Eye, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "../../UI/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../UI/Table";
import Dropdown from "../../UI/Dropdown";

interface Settlement {
  id: string;
  settlementId: string;
  vendorName: string;
  billingPeriod: string;
  amount: number;
  status: "completed" | "pending" | "failed" | "processing";
  requestedDate: string;
  settledDate?: string;
  paymentMethod: string;
  transactionId?: string;
}

export default function Settlement() {
  const [settlements] = useState<Settlement[]>([
    {
      id: "1",
      settlementId: "SET-2024-001",
      vendorName: "Textile Co.",
      billingPeriod: "January 2024",
      amount: 11250.00,
      status: "completed",
      requestedDate: "2024-02-01",
      settledDate: "2024-02-03",
      paymentMethod: "Bank Transfer",
      transactionId: "TXN-20240203-001",
    },
    {
      id: "2",
      settlementId: "SET-2024-002",
      vendorName: "Home Fabrics Ltd.",
      billingPeriod: "January 2024",
      amount: 8010.00,
      status: "processing",
      requestedDate: "2024-02-01",
      paymentMethod: "Bank Transfer",
    },
    {
      id: "3",
      settlementId: "SET-2024-003",
      vendorName: "Quality Textiles",
      billingPeriod: "January 2024",
      amount: 6840.00,
      status: "pending",
      requestedDate: "2024-02-01",
      paymentMethod: "Bank Transfer",
    },
    {
      id: "4",
      settlementId: "SET-2024-004",
      vendorName: "Premium Fabrics",
      billingPeriod: "December 2023",
      amount: 5200.00,
      status: "failed",
      requestedDate: "2024-01-05",
      paymentMethod: "Bank Transfer",
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredSettlements = settlements.filter(settlement => {
    const matchesSearch = settlement.settlementId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         settlement.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         settlement.billingPeriod.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || settlement.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      failed: "bg-red-100 text-red-800",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const totalSettled = settlements.filter(s => s.status === "completed").reduce((sum, s) => sum + s.amount, 0);
  const totalPending = settlements.filter(s => s.status === "pending").reduce((sum, s) => sum + s.amount, 0);
  const totalProcessing = settlements.filter(s => s.status === "processing").reduce((sum, s) => sum + s.amount, 0);
  const totalFailed = settlements.filter(s => s.status === "failed").reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settlement</h1>
        <p className="text-gray-600 mt-1">Track and manage vendor payment settlements</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Completed</div>
            <div className="text-2xl font-bold text-green-600">${totalSettled.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {settlements.filter(s => s.status === "completed").length} settlements
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Processing</div>
            <div className="text-2xl font-bold text-blue-600">${totalProcessing.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {settlements.filter(s => s.status === "processing").length} settlements
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">${totalPending.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {settlements.filter(s => s.status === "pending").length} settlements
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Failed</div>
            <div className="text-2xl font-bold text-red-600">${totalFailed.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {settlements.filter(s => s.status === "failed").length} settlements
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
              <input
                type="text"
                placeholder="Search by settlement ID, vendor, or period..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222222] focus:border-transparent"
              />
            </div>
            <div className="w-full md:w-48">
              <Dropdown
                value={filterStatus}
                options={[
                  { value: "all", label: "All Status" },
                  { value: "completed", label: "Completed" },
                  { value: "processing", label: "Processing" },
                  { value: "pending", label: "Pending" },
                  { value: "failed", label: "Failed" }
                ]}
                onChange={(val) => setFilterStatus(val as string)}
                placeholder="Filter by status"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settlements Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Settlement ID</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Billing Period</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Requested Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSettlements.map((settlement) => (
              <TableRow key={settlement.id}>
                <TableCell>
                  <div className="font-mono font-medium text-gray-900">{settlement.settlementId}</div>
                  {settlement.transactionId && (
                    <div className="text-xs text-gray-500 mt-1">TXN: {settlement.transactionId}</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">{settlement.vendorName}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">{settlement.billingPeriod}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-gray-900">${settlement.amount.toFixed(2)}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">{settlement.paymentMethod}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">
                    {new Date(settlement.requestedDate).toLocaleDateString()}
                  </div>
                  {settlement.settledDate && (
                    <div className="text-xs text-green-600 mt-1">
                      Settled: {new Date(settlement.settledDate).toLocaleDateString()}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {getStatusBadge(settlement.status)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {settlement.status === "pending" && (
                      <button
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Approve Settlement"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                    {settlement.status === "failed" && (
                      <button
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Retry Settlement"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
