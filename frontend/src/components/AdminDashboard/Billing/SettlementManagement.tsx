"use client";

import { useState } from "react";
import { Search, Eye, CheckCircle, Clock, X } from "lucide-react";
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
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";

interface Settlement {
  id: string;
  settlementNumber: string;
  vendor: string;
  billingNumber: string;
  period: string;
  amount: number;
  dueDate: string;
  status: "Pending" | "Processing" | "Paid" | "Failed";
  paymentDate?: string;
  transactionId?: string;
}

const mockSettlements: Settlement[] = [
  {
    id: "1",
    settlementNumber: "SET-2024-001",
    vendor: "Textile Traders",
    billingNumber: "BILL-2024-001",
    period: "January 2024",
    amount: 112500,
    dueDate: "2024-02-10",
    status: "Paid",
    paymentDate: "2024-02-08",
    transactionId: "TXN-SET-001",
  },
  {
    id: "2",
    settlementNumber: "SET-2024-002",
    vendor: "Silk Emporium",
    billingNumber: "BILL-2024-002",
    period: "January 2024",
    amount: 88200,
    dueDate: "2024-02-10",
    status: "Processing",
  },
  {
    id: "3",
    settlementNumber: "SET-2024-003",
    vendor: "Wool Crafts",
    billingNumber: "BILL-2024-003",
    period: "February 2024",
    amount: 67500,
    dueDate: "2024-03-10",
    status: "Pending",
  },
  {
    id: "4",
    settlementNumber: "SET-2024-004",
    vendor: "Home Textiles",
    billingNumber: "BILL-2024-004",
    period: "February 2024",
    amount: 130500,
    dueDate: "2024-03-10",
    status: "Pending",
  },
];

export default function SettlementManagement() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [transactionId, setTransactionId] = useState("");

  const statusOptions = ["All", "Pending", "Processing", "Paid", "Failed"];

  const filteredSettlements = mockSettlements.filter((settlement) => {
    const matchesSearch =
      settlement.settlementNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      settlement.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      settlement.billingNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || settlement.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800";
      case "Processing":
        return "bg-blue-100 text-blue-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewSettlement = (settlementId: string) => {
    router.push(`/admin/dashboard/billing/settlement/view/${settlementId}`);
  };

  const handleMarkAsPaid = (settlement: Settlement) => {
    setSelectedSettlement(settlement);
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = () => {
    if (!transactionId.trim()) {
      showErrorToast("Please enter transaction ID");
      return;
    }

    showSuccessToast(`Settlement ${selectedSettlement?.settlementNumber} marked as paid`);
    setShowPaymentModal(false);
    setSelectedSettlement(null);
    setTransactionId("");
  };

  const totalPending = mockSettlements
    .filter((s) => s.status === "Pending")
    .reduce((sum, s) => sum + s.amount, 0);
  const totalProcessing = mockSettlements
    .filter((s) => s.status === "Processing")
    .reduce((sum, s) => sum + s.amount, 0);
  const totalPaid = mockSettlements
    .filter((s) => s.status === "Paid")
    .reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Total Settlements</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{mockSettlements.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">₹{totalPending.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Processing</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">₹{totalProcessing.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Paid</p>
          <p className="text-2xl font-bold text-green-600 mt-1">₹{totalPaid.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by Settlement Number, Vendor, or Billing Number..."
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

      {/* Settlements Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Settlement Number</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Billing Number</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSettlements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No settlements found
                </TableCell>
              </TableRow>
            ) : (
              filteredSettlements.map((settlement) => (
                <TableRow key={settlement.id}>
                  <TableCell className="font-medium">{settlement.settlementNumber}</TableCell>
                  <TableCell>{settlement.vendor}</TableCell>
                  <TableCell>{settlement.billingNumber}</TableCell>
                  <TableCell>{settlement.period}</TableCell>
                  <TableCell className="font-medium">₹{settlement.amount.toLocaleString()}</TableCell>
                  <TableCell>{new Date(settlement.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        settlement.status
                      )}`}
                    >
                      {settlement.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewSettlement(settlement.id)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View Settlement"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      {(settlement.status === "Pending" || settlement.status === "Processing") && (
                        <button
                          onClick={() => handleMarkAsPaid(settlement)}
                          className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors"
                          title="Mark as Paid"
                        >
                          <CheckCircle className="h-5 w-5" />
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

      {/* Payment Confirmation Modal */}
      {showPaymentModal && selectedSettlement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Confirm Payment</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Settlement Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Settlement Number:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedSettlement.settlementNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Vendor:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedSettlement.vendor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Amount:</span>
                    <span className="text-sm font-medium text-gray-900">₹{selectedSettlement.amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter transaction/reference ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  Please confirm that the payment has been successfully transferred to the vendor's bank account.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
