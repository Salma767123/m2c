"use client";

import { useState, useEffect } from "react";
import { Search, Eye, CheckCircle, Clock, X, RefreshCw, ChevronLeft, ChevronRight, CalendarDays, Receipt, Hourglass } from "lucide-react";
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
import DateRangeCalendar, { fmtDate } from "@/components/Shared/DateRangeCalendar";
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
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

    // Settlement-date range filter (YYYY-MM-DD strings compare lexicographically)
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const sd = settlement.createdAt ? fmtDate(new Date(settlement.createdAt)) : "";
      if (!sd) matchesDate = false;
      else if (dateFrom && sd < dateFrom) matchesDate = false;
      else if (dateTo && sd > dateTo) matchesDate = false;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalPages = Math.ceil(filteredSettlements.length / PAGE_SIZE);
  const paginatedSettlements = filteredSettlements.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-50 text-green-700 border border-green-200";
      case "Processing":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      case "Pending":
        return "bg-yellow-50 text-yellow-700 border border-yellow-200";
      case "Failed":
        return "bg-red-50 text-red-700 border border-red-200";
      case "Cancelled":
        return "bg-slate-50 text-slate-700 border border-slate-200";
      default:
        return "bg-slate-50 text-slate-700 border border-slate-200";
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

  // Metric cards — styled like the Vendor Product Requests module; click to filter.
  const metricCards = [
    { key: "All",        label: "Total Settlements", subtitle: "All settlements",   value: settlements.length.toLocaleString(), Icon: Receipt,      iconBg: "bg-brand-50",   iconColor: "text-brand-500",   countColor: "text-slate-900",  activeClass: "border-brand-400 bg-brand-50/50" },
    { key: "Pending",    label: "Pending",           subtitle: "Awaiting payment",  value: `₹${totalPending.toLocaleString()}`, Icon: Clock,        iconBg: "bg-amber-50",   iconColor: "text-amber-500",   countColor: "text-amber-700",  activeClass: "border-amber-400 bg-amber-50/60" },
    { key: "Processing", label: "Processing",        subtitle: "In progress",       value: `₹${totalProcessing.toLocaleString()}`, Icon: Hourglass, iconBg: "bg-blue-50",    iconColor: "text-blue-500",    countColor: "text-blue-700",   activeClass: "border-blue-400 bg-blue-50/60" },
    { key: "Paid",       label: "Paid",              subtitle: "Completed",         value: `₹${totalPaid.toLocaleString()}`,    Icon: CheckCircle,  iconBg: "bg-emerald-50", iconColor: "text-emerald-500", countColor: "text-emerald-700", activeClass: "border-emerald-400 bg-emerald-50/60" },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Cards (click a card to filter the table below by that status) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metricCards.map(({ key, label, subtitle, value, Icon, iconBg, iconColor, countColor, activeClass }) => {
          const isActive = statusFilter === key;
          const toggle = () => { setStatusFilter((prev) => (prev === key ? "All" : key)); setCurrentPage(1); };
          return (
            <button
              key={key}
              type="button"
              onClick={toggle}
              className={`text-left bg-white border rounded-2xl shadow-xs transition-all duration-200 hover:shadow-sm group ${isActive ? activeClass : "border-slate-200/80 hover:border-slate-300"}`}
            >
              <div className="flex flex-row items-center justify-between px-3.5 pt-3 pb-1">
                <span className="text-[13px] font-medium text-slate-500">{label}</span>
                <div className={`p-1.5 rounded-lg ${isActive ? iconBg.replace("50", "100") : iconBg} transition-transform duration-150 group-hover:scale-110`}>
                  <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
              </div>
              <div className="px-3.5 pb-3">
                <div className={`text-xl font-bold ${countColor}`}>{value}</div>
                <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by Settlement Number, Vendor, or Billing Number..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500/40 focus:border-transparent"
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
          <div className="shrink-0">
            <DateRangeCalendar
              from={dateFrom}
              to={dateTo}
              onChange={(from, to) => { setDateFrom(from); setDateTo(to); setCurrentPage(1); }}
              placeholder="Settlement Date"
            />
          </div>
          <button
            onClick={fetchSettlements}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="ml-3 text-slate-500 font-medium">Loading Settlements...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader className="!bg-brand-500/[0.06] !border-0 [&_tr]:border-b [&_tr]:border-brand-100/50 [&_th]:!text-brand-500/60 [&_th]:font-bold [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:h-11">
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
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    No settlements found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSettlements.map((settlement) => (
                  <TableRow key={settlement.id} className="hover:bg-slate-50/60 transition-colors duration-150 border-b border-slate-100 last:border-0">
                    <TableCell className="font-medium text-indigo-600">{settlement.settlementNumber}</TableCell>
                    <TableCell className="font-medium">{settlement.vendorName}</TableCell>
                    <TableCell>{settlement.billingNumber}</TableCell>
                    <TableCell>{settlement.period}</TableCell>
                    <TableCell>
                      {/* Gross payable, with the vendor-GST split underneath. Legacy
                          rows have no split, so they just show the single figure. */}
                      <div className="font-medium">₹{settlement.amount.toLocaleString()}</div>
                      {settlement.taxAmount ? (
                        <div className="text-xs text-slate-500 whitespace-nowrap">
                          ₹{(settlement.baseAmount ?? 0).toLocaleString()}
                          {' + '}
                          {settlement.gstPercentage != null ? `${settlement.gstPercentage}% GST` : 'GST'}
                          {' '}₹{settlement.taxAmount.toLocaleString()}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {settlement.dueDate ? (
                          <>
                            <span className={`text-sm ${new Date(settlement.dueDate) < new Date() && settlement.status !== 'Paid' ? 'text-red-600 font-medium' : ''}`}>
                              {new Date(settlement.dueDate).toLocaleDateString()}
                            </span>
                            {settlement.status !== 'Paid' && hasPermission('settlement:set_due_date') && (
                              <button onClick={() => handleSetDueDate(settlement)} className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors" title="Edit due date">
                                <CalendarDays className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </>
                        ) : (
                          settlement.status === 'Pending' ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-amber-600 font-medium">Awaiting Approval</span>
                              {hasPermission('settlement:set_due_date') && (
                                <button onClick={() => handleSetDueDate(settlement)} className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors" title="Set due date manually">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
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
                            isDelivered ? 'bg-green-50 text-green-700 border border-green-200' :
                            os.includes('TRANSIT') || os.includes('SHIPPED') ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            os.includes('CANCEL') ? 'bg-red-50 text-red-700 border border-red-200' :
                            'bg-yellow-50 text-yellow-700 border border-yellow-200'
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
                        {(settlement.status === "Pending" || settlement.status === "Processing") && hasPermission('settlement:mark_paid') ? (
                          (() => {
                            const os = settlement.order?.status?.toUpperCase() || '';
                            const isDelivered = os === 'DELIVERED' || os === 'COMPLETED';
                            const hasBankDetails = !!settlement.vendor?.bankDetails;

                            if (!isDelivered) {
                              return <span className="text-xs text-slate-400 italic">Awaiting delivery</span>;
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
          </div>
        )}

        {!loading && filteredSettlements.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-end px-4 py-3 border-t border-slate-100">
            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
                  {getPageRange(currentPage, totalPages).map((p, i) => p === '...' ? (<span key={`e-${i}`} className="px-2 text-slate-400">...</span>) : (<button key={`p-${p}`} onClick={() => setCurrentPage(p as number)} aria-current={p === currentPage ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-brand-500 text-white shadow-xs shadow-brand-500/20' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Confirmation Modal */}
      {showPaymentModal && selectedSettlement && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Confirm Payment</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Settlement Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Settlement Number:</span>
                    <span className="text-sm font-medium text-slate-900">{selectedSettlement.settlementNumber}</span>
                  </div>
                  {/* Which invoice this payout settles — lets the admin tie the transfer
                      back to the source invoice before releasing funds. */}
                  {selectedSettlement.billingNumber ? (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Invoice:</span>
                      <span className="text-sm font-medium text-slate-900">{selectedSettlement.billingNumber}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Vendor:</span>
                    <span className="text-sm font-medium text-slate-900">{selectedSettlement.vendorName}</span>
                  </div>
                  {/* Show the vendor-GST split so the admin can reconcile this
                      payout against the vendor's tax invoice before releasing it. */}
                  {selectedSettlement.taxAmount ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Goods Value:</span>
                        <span className="text-sm font-medium text-slate-900">₹{(selectedSettlement.baseAmount ?? 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">
                          Vendor GST{selectedSettlement.gstPercentage != null ? ` (${selectedSettlement.gstPercentage}%)` : ''}:
                        </span>
                        <span className="text-sm font-medium text-slate-900">₹{selectedSettlement.taxAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                        <span className="text-sm font-semibold text-slate-900">Total Payable:</span>
                        <span className="text-sm font-bold text-slate-900">₹{selectedSettlement.amount.toLocaleString()}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Amount:</span>
                      <span className="text-sm font-medium text-slate-900">₹{selectedSettlement.amount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Transaction ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter transaction/reference ID"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500/40 focus:border-transparent"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  Please confirm that the payment has been successfully transferred to the vendor's bank account.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                disabled={processing}
                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
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
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Set Due Date</h2>
              <button onClick={() => setShowDueDateModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="h-5 w-5 text-slate-600" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg text-sm">
                <p className="font-medium text-slate-900">{dueDateSettlement.settlementNumber}</p>
                <p className="text-slate-600">{dueDateSettlement.vendorName} &middot; ₹{dueDateSettlement.amount.toLocaleString()}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Quick Presets</label>
                <div className="flex gap-2">
                  {[7, 14, 30].map((d) => (
                    <button
                      key={d}
                      onClick={() => setPresetDueDate(d)}
                      className="flex-1 px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      {d} days
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="due-date-picker" className="block text-sm font-medium text-slate-700 mb-2">
                  Or pick a date
                </label>
                <input
                  id="due-date-picker"
                  type="date"
                  value={dueDateValue}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setDueDateValue(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500/40 focus:border-transparent"
                />
              </div>

              {dueDateValue && (
                <p className="text-sm text-slate-600">
                  Due date will be set to <strong>{new Date(dueDateValue).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                </p>
              )}
            </div>
            <div className="p-5 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowDueDateModal(false)}
                disabled={processing}
                className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDueDate}
                disabled={processing || !dueDateValue}
                className="flex items-center gap-2 px-5 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-medium disabled:opacity-50"
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
