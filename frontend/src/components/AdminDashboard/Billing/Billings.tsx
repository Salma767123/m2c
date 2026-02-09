"use client";

import { useState } from "react";
import { Search, Eye, DollarSign } from "lucide-react";
import { Card, CardContent } from "../../UI/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../UI/Table";
import Dropdown from "../../UI/Dropdown";

interface Billing {
  id: string;
  billingId: string;
  vendorName: string;
  period: string;
  totalOrders: number;
  totalAmount: number;
  commission: number;
  netAmount: number;
  status: "processed" | "pending" | "on-hold";
  generatedDate: string;
}

export default function Billings() {
  const [billings] = useState<Billing[]>([
    {
      id: "1",
      billingId: "BILL-2024-001",
      vendorName: "Textile Co.",
      period: "January 2024",
      totalOrders: 45,
      totalAmount: 12500.00,
      commission: 1250.00,
      netAmount: 11250.00,
      status: "processed",
      generatedDate: "2024-02-01",
    },
    {
      id: "2",
      billingId: "BILL-2024-002",
      vendorName: "Home Fabrics Ltd.",
      period: "January 2024",
      totalOrders: 32,
      totalAmount: 8900.00,
      commission: 890.00,
      netAmount: 8010.00,
      status: "pending",
      generatedDate: "2024-02-01",
    },
    {
      id: "3",
      billingId: "BILL-2024-003",
      vendorName: "Quality Textiles",
      period: "January 2024",
      totalOrders: 28,
      totalAmount: 7600.00,
      commission: 760.00,
      netAmount: 6840.00,
      status: "on-hold",
      generatedDate: "2024-02-01",
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredBillings = billings.filter(billing => {
    const matchesSearch = billing.billingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         billing.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         billing.period.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || billing.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      processed: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      "on-hold": "bg-red-100 text-red-800",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
      </span>
    );
  };

  const totalBillingAmount = billings.reduce((sum, bill) => sum + bill.totalAmount, 0);
  const totalCommission = billings.reduce((sum, bill) => sum + bill.commission, 0);
  const totalNetAmount = billings.reduce((sum, bill) => sum + bill.netAmount, 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Billings</h1>
        <p className="text-gray-600 mt-1">Manage vendor billing cycles and payments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Total Billing</div>
            <div className="text-2xl font-bold text-gray-900">${totalBillingAmount.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Total Commission</div>
            <div className="text-2xl font-bold text-blue-600">${totalCommission.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Net to Vendors</div>
            <div className="text-2xl font-bold text-green-600">${totalNetAmount.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Total Vendors</div>
            <div className="text-2xl font-bold text-gray-900">{billings.length}</div>
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
                placeholder="Search by billing ID, vendor, or period..."
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
                  { value: "processed", label: "Processed" },
                  { value: "pending", label: "Pending" },
                  { value: "on-hold", label: "On Hold" }
                ]}
                onChange={(val) => setFilterStatus(val as string)}
                placeholder="Filter by status"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billings Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Billing ID</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Commission (10%)</TableHead>
              <TableHead>Net Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBillings.map((billing) => (
              <TableRow key={billing.id}>
                <TableCell>
                  <div className="font-mono font-medium text-gray-900">{billing.billingId}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">{billing.vendorName}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">{billing.period}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900">{billing.totalOrders}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-gray-900">${billing.totalAmount.toFixed(2)}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-blue-600">${billing.commission.toFixed(2)}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-green-600">${billing.netAmount.toFixed(2)}</div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(billing.status)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Process Payment"
                    >
                      <DollarSign className="h-4 w-4" />
                    </button>
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
