"use client";

import { useState, useEffect } from "react";
import { Search, Eye, CheckCircle, Clock, X, RefreshCw, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
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
import { settlementService, Settlement } from "@/services/settlementService";
import { hasPermission } from "@/lib/auth";

const PAGE_SIZE = 10;

function getPageRange(current: number, total: number): Array<number | '...'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | '...'> = [1];
  if (current > 4) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < total - 3) pages.push('...');
  pages.push(total);
  return pages;
}

export default function SettlementManagement() {
  const router = useRouter();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDueDateModal, setShowDueDateModal] = useState(false);
  const [dueDateSettlement, setDueDateSettlement] = useState<Settlement | null>(null);
  const [dueDateValue, setDueDateValue] = useState("");

  const statusOptions = ["All", "Pending", "Processing", "Paid", "Failed", "Cancelled"];

  const fetchSettlements = async () => {
    try {
      setLoading(true);
      const res = await settlementService.getAllSettlements();
      if (res.success) {
        setSettlements(res.data);
      }
    } catch (error: any) {
      showErrorToast(error?.error || "Failed to load settlements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  const filteredSettlements = settlements.filter((settlement) => {
    const matchesSearch =
      settlement.settlementNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      settlement.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      settlement.billingNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || settlement.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredSettlements.length / PAGE_SIZE);
  const paginatedSettlements = filteredSettlements.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

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
      case "Cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleMarkAsPaid = (settlement: Settlement) => {
    setSelectedSettlement(settlement);
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!transactionId.trim()) {
      showErrorToast("Please enter transaction ID");
      return;
    }

    if (!selectedSettlement) return;

    try {
      setProcessing(true);
      const res = await settlementService.updateSettlementStatus(selectedSettlement.id, "Paid", transactionId);
      if (res.success) {
        showSuccessToast(`Settlement ${selectedSettlement.settlementNumber} marked as paid`);
        setShowPaymentModal(false);
        setSelectedSettlement(null);
        setTransactionId("");
        fetchSettlements(); // refresh table
      }
    } catch (error: any) {
      showErrorToast(error?.error || "Failed to confirm payment");
    } finally {
      setProcessing(false);
    }
  };

  const handleSetDueDate = (settlement: Settlement) => {
    setDueDateSettlement(settlement);
    setDueDateValue(settlement.dueDate ? new Date(settlement.dueDate).toISOString().split('T')[0] : '');
    setShowDueDateModal(true);
  };

  const handleConfirmDueDate = async () => {
    if (!dueDateValue) {
      showErrorToast("Please select a due date");
      return;
    }
    if (!dueDateSettlement) return;

    try {
      setProcessing(true);
      const res = await settlementService.updateSettlementDueDate(dueDateSettlement.id, dueDateValue);
      if (res.success) {
        showSuccessToast(`Due date set to ${new Date(dueDateValue).toLocaleDateString()}`);
        setShowDueDateModal(false);
        setDueDateSettlement(null);
        setDueDateValue("");
        fetchSettlements();
      }
    } catch (error: any) {
      showErrorToast(error?.error || "Failed to update due date");
    } finally {
      setProcessing(false);
    }
  };

  const setPresetDueDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setDueDateValue(date.toISOString().split('T')[0]);
  };

  const totalPending = settlements
    .filter((s) => s.status === "Pending")
    .reduce((sum, s) => sum + s.amount, 0);
  const totalProcessing = settlements
    .filter((s) => s.status === "Processing")
    .reduce((sum, s) => sum + s.amount, 0);
  const totalPaid = settlements
    .filter((s) => s.status === "Paid")
    .reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Total Settlements</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{settlements.length}</p>
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
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            />
          </div>
          <div className="w-full md:w-48">
            <Dropdown
              value={statusFilter}
              options={statusOptions}
              onChange={(value) => { setStatusFilter(value as string); setCurrentPage(1); }}
              placeholder="Filter by Status"
            />
          </div>
          <button
            onClick={fetchSettlements}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Showing */}
      {!loading && filteredSettlements.length > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap text-sm text-slate-600">
          <span>Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredSettlements.length)} of {filteredSettlements.length}</span>
        </div>
      )}

      {/* Settlements Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="ml-3 text-gray-500 font-medium">Loading Settlements...</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Settlement No.</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Billing/Order No.</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Order Status</TableHead>
                <TableHead>Settlement</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSettlements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No settlements found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSettlements.map((settlement) => (
                  <TableRow key={settlement.id}>
                    <TableCell className="font-medium text-indigo-600">{settlement.settlementNumber}</TableCell>
                    <TableCell className="font-medium">{settlement.vendorName}</TableCell>
                    <TableCell>{settlement.billingNumber}</TableCell>
                    <TableCell>{settlement.period}</TableCell>
                    <TableCell className="font-medium">₹{settlement.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {settlement.dueDate ? (
                          <>
                            <span className={`text-sm ${new Date(settlement.dueDate) < new Date() && settlement.status !== 'Paid' ? 'text-red-600 font-medium' : ''}`}>
                              {new Date(settlement.dueDate).toLocaleDateString()}
                            </span>
                            {settlement.status !== 'Paid' && hasPermission('manage_billing') && (
                              <button onClick={() => handleSetDueDate(settlement)} className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors" title="Edit due date">
                                <CalendarDays className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </>
                        ) : (
                          settlement.status === 'Pending' ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-amber-600 font-medium">Awaiting Approval</span>
                              {hasPermission('manage_billing') && (
                                <button onClick={() => handleSetDueDate(settlement)} className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors" title="Set due date manually">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const os = settlement.order?.status?.toUpperCase() || '';
                        const isDelivered = os === 'DELIVERED' || os === 'COMPLETED';
                        return (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            isDelivered ? 'bg-green-100 text-green-800' :
                            os.includes('TRANSIT') || os.includes('SHIPPED') ? 'bg-blue-100 text-blue-800' :
                            os.includes('CANCEL') ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {settlement.order?.status?.replace(/_/g, ' ') || 'Unknown'}
                          </span>
                        );
                      })()}
                    </TableCell>
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
                      <div className="flex gap-2 items-center">
                        {(settlement.status === "Pending" || settlement.status === "Processing") && hasPermission('manage_billing') ? (
                          (() => {
                            const os = settlement.order?.status?.toUpperCase() || '';
                            const isDelivered = os === 'DELIVERED' || os === 'COMPLETED';
                            const hasBankDetails = !!settlement.vendor?.bankDetails;

                            if (!isDelivered) {
                              return <span className="text-xs text-gray-400 italic">Awaiting delivery</span>;
                            }
                            if (!hasBankDetails) {
                              return <span className="text-xs text-red-500 italic">No bank details</span>;
                            }
                            return (
                              <button
                                onClick={() => handleMarkAsPaid(settlement)}
                                className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors"
                                title="Mark as Paid"
                              >
                                <CheckCircle className="h-5 w-5" />
                              </button>
                            );
                          })()
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {!loading && filteredSettlements.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200">
            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
                  {getPageRange(currentPage, totalPages).map((p, i) => p === '...' ? (<span key={`e-${i}`} className="px-2 text-slate-400">...</span>) : (<button key={`p-${p}`} onClick={() => setCurrentPage(p as number)} aria-current={p === currentPage ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-[#222222] text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        )}
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
                    <span className="text-sm font-medium text-gray-900">{selectedSettlement.vendorName}</span>
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
                disabled={processing}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={processing}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
              >
                {processing && <RefreshCw className="h-4 w-4 animate-spin" />}
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Due Date Modal */}
      {showDueDateModal && dueDateSettlement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Set Due Date</h2>
              <button onClick={() => setShowDueDateModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <p className="font-medium text-gray-900">{dueDateSettlement.settlementNumber}</p>
                <p className="text-gray-600">{dueDateSettlement.vendorName} &middot; ₹{dueDateSettlement.amount.toLocaleString()}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quick Presets</label>
                <div className="flex gap-2">
                  {[7, 14, 30].map((d) => (
                    <button
                      key={d}
                      onClick={() => setPresetDueDate(d)}
                      className="flex-1 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {d} days
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="due-date-picker" className="block text-sm font-medium text-gray-700 mb-2">
                  Or pick a date
                </label>
                <input
                  id="due-date-picker"
                  type="date"
                  value={dueDateValue}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setDueDateValue(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
              </div>

              {dueDateValue && (
                <p className="text-sm text-gray-600">
                  Due date will be set to <strong>{new Date(dueDateValue).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                </p>
              )}
            </div>
            <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowDueDateModal(false)}
                disabled={processing}
                className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDueDate}
                disabled={processing || !dueDateValue}
                className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors font-medium disabled:opacity-50"
              >
                {processing && <RefreshCw className="h-4 w-4 animate-spin" />}
                Set Due Date
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
