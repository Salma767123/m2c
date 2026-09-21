"use client";

import { useState, useEffect } from "react";
import { Search, Eye, ChevronLeft, ChevronRight, Package, Warehouse, Truck, CheckCircle, X, ChevronDown, SlidersHorizontal } from "lucide-react";
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
import { orderService, Order } from "@/services/orderService";
import { courierService } from "@/services/courierService";
import { courierName } from "@/lib/couriers";
import { formatOrderAmount } from "@/lib/currency";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { hasPermission } from "@/lib/auth";

// Show what the customer was actually charged, plus an INR equivalent for USD orders
// so admins can compare a .com order against a .in one. The equivalent comes from the
// rate snapshotted on the order, so it never drifts when the live rate is edited.
function Money({ amount, order }: { amount: number; order: { currency?: "INR" | "USD"; exchangeRate?: number | null } }) {
  const { charged, inrEquivalent } = formatOrderAmount(amount, order.currency, order.exchangeRate);
  return (
    <div className="whitespace-nowrap">
      <span className="font-medium text-slate-900">{charged}</span>
      {inrEquivalent && <span className="block text-xs text-slate-500">≈ {inrEquivalent}</span>}
    </div>
  );
}

const PAGE_SIZE = 10;

function getPageRange(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | '…'> = [1];
  if (current > 4) pages.push('…');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < total - 3) pages.push('…');
  pages.push(total);
  return pages;
}

export default function HubToCustomer() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  // Additional client-side filters covering every order dimension.
  const [payFilter, setPayFilter] = useState("all");        // payment status
  const [methodFilter, setMethodFilter] = useState("all");  // payment method
  const [currencyFilter, setCurrencyFilter] = useState("all"); // INR / USD region
  const [amountFilter, setAmountFilter] = useState("all");  // amount tiers (INR-equiv)
  const [itemsFilter, setItemsFilter] = useState("all");    // single / multi-item
  const [courierFilter, setCourierFilter] = useState("all"); // delivery partner
  const [sortBy, setSortBy] = useState("recent");           // result ordering
  const [panelOpen, setPanelOpen] = useState(true);         // collapse metrics + filters

  // Statuses relevant for Hub to Customer tracking
  const STATUS_LABELS: Record<string, string> = {
    "Active": "Active Orders",
    "All": "All Statuses",
    "RECEIVED_AT_ADMIN_HUB": "Received at Hub",
    "APPROVED_BY_ADMIN_HUB": "Approved by Hub",
    "SHIPPED_TO_CUSTOMER": "Shipped to Customer",
    "DELIVERED": "Delivered",
    "CANCELLED": "Cancelled",
    "RETURNED": "Returned",
  };
  const ACTIVE_STATUSES = ["RECEIVED_AT_ADMIN_HUB", "APPROVED_BY_ADMIN_HUB", "SHIPPED_TO_CUSTOMER"];
  const statusDisplayOptions = Object.keys(STATUS_LABELS).map(key => ({ value: key, label: STATUS_LABELS[key] }));

  useEffect(() => {
    fetchOrders();
    // Prime the courier registry so courierName() resolves ids to names.
    courierService.getActiveCouriers().catch(() => {});
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

  // INR-equivalent amount, so amount tiers/sorting compare mixed-currency orders fairly.
  const inrAmount = (order: Order) => {
    const amt = order.totalAmount || 0;
    return order.currency === "USD" ? amt * (order.exchangeRate || 83.5) : amt;
  };

  // Distinct payment methods + couriers present in the data, for their dropdowns.
  const methodOptions = [
    { value: "all", label: "Any Method" },
    ...Array.from(new Set(orders.map((o) => (o.paymentMethod || "").trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b))
      .map((m) => ({
        value: m.toLowerCase(),
        label: m.toUpperCase() === "COD" ? "Cash on Delivery" : m.charAt(0).toUpperCase() + m.slice(1),
      })),
  ];
  const courierOptions = [
    { value: "all", label: "Any Courier" },
    ...Array.from(new Set(orders.map((o) => o.courier || "").filter(Boolean)))
      .map((c) => ({ value: c, label: courierName(c) || c }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ];

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
    if (!matchesSearch) return false;

    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Active" && ACTIVE_STATUSES.includes(order.status)) ||
      (statusFilter === "AT_HUB" && ["RECEIVED_AT_ADMIN_HUB", "APPROVED_BY_ADMIN_HUB"].includes(order.status)) ||
      order.status === statusFilter;
    if (!matchesStatus) return false;

    // Order-date range filter (YYYY-MM-DD strings compare lexicographically)
    if (dateFrom || dateTo) {
      const od = order.createdAt ? fmtDate(new Date(order.createdAt)) : "";
      if (!od) return false;
      if (dateFrom && od < dateFrom) return false;
      if (dateTo && od > dateTo) return false;
    }

    // Payment status
    const ps = (order.paymentStatus || "").toUpperCase();
    const refunded = !!order.refundStatus && order.refundStatus !== "NONE";
    if (payFilter === "paid" && ps !== "PAID") return false;
    if (payFilter === "pending" && ps !== "PENDING") return false;
    if (payFilter === "refunded" && !refunded) return false;

    // Payment method
    if (methodFilter !== "all" && (order.paymentMethod || "").toLowerCase() !== methodFilter) return false;

    // Currency / region
    if (currencyFilter !== "all" && (order.currency || "INR") !== currencyFilter) return false;

    // Amount tiers (INR-equivalent)
    if (amountFilter !== "all") {
      const a = inrAmount(order);
      if (amountFilter === "lt500" && !(a < 500)) return false;
      if (amountFilter === "500-2k" && !(a >= 500 && a < 2000)) return false;
      if (amountFilter === "2k-10k" && !(a >= 2000 && a <= 10000)) return false;
      if (amountFilter === "gt10k" && !(a > 10000)) return false;
    }

    // Item count
    const n = order.items?.length || 0;
    if (itemsFilter === "single" && n > 1) return false;
    if (itemsFilter === "multi" && n <= 1) return false;

    // Courier / delivery partner
    if (courierFilter !== "all" && (order.courier || "") !== courierFilter) return false;

    return true;
  });

  // Sort the filtered set (default: newest order first).
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    switch (sortBy) {
      case "oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "amount_desc": return inrAmount(b) - inrAmount(a);
      case "amount_asc": return inrAmount(a) - inrAmount(b);
      case "customer_asc": return (a.customerName || "").localeCompare(b.customerName || "");
      case "recent":
      default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const anyFilterActive =
    !!searchTerm || statusFilter !== "Active" || !!dateFrom || !!dateTo ||
    payFilter !== "all" || methodFilter !== "all" || currencyFilter !== "all" ||
    amountFilter !== "all" || itemsFilter !== "all" || courierFilter !== "all" || sortBy !== "recent";

  const clearAllFilters = () => {
    setSearchTerm(""); setStatusFilter("Active"); setDateFrom(""); setDateTo("");
    setPayFilter("all"); setMethodFilter("all"); setCurrencyFilter("all");
    setAmountFilter("all"); setItemsFilter("all"); setCourierFilter("all"); setSortBy("recent");
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFrom, dateTo, payFilter, methodFilter, currencyFilter, amountFilter, itemsFilter, courierFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedOrders.length / PAGE_SIZE);
  const paginatedOrders = sortedOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "RECEIVED_AT_ADMIN_HUB":
      case "APPROVED_BY_ADMIN_HUB":
        return "bg-teal-50 text-teal-700 border border-teal-200";
      case "SHIPPED_TO_CUSTOMER":
        return "bg-orange-50 text-orange-700 border border-orange-200";
      case "DELIVERED":
        return "bg-green-50 text-green-700 border border-green-200";
      case "CANCELLED":
      case "REJECTED_BY_ADMIN_HUB":
      case "RETURNED":
        return "bg-red-50 text-red-700 border border-red-200";
      default:
        return "bg-slate-50 text-slate-700 border border-slate-200";
    }
  };

  const handleViewOrder = (orderId: string) => {
    router.push(`/admin/dashboard/orders/hub-to-customer/view/${orderId}`);
  };

  if (isLoading) {
    return <div className="p-6 text-center text-slate-500">Loading orders...</div>;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Hub to Customer Orders</h1>
          <p className="text-sm text-slate-500">Manage orders from hub to customers</p>
        </div>
      </div>

      {/* Collapsible "Overview & Filters" — expand/collapse the metrics + filters */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          aria-expanded={panelOpen}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
        >
          <SlidersHorizontal className="h-4 w-4 text-slate-500" />
          Overview &amp; Filters
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${panelOpen ? "rotate-180" : ""}`} />
        </button>
        <span className="text-xs text-slate-500">
          Showing {sortedOrders.length} of {orders.length} orders{anyFilterActive ? " (filtered)" : ""}
        </span>
      </div>

      {panelOpen && (
        <div className="space-y-3">
      {/* Stats Cards — click a card to filter the table below by that status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { key: "All", label: "Total Orders", subtitle: "All orders", value: orders.length, Icon: Package, iconBg: "bg-brand-50", iconColor: "text-brand-500", countColor: "text-slate-900", activeClass: "border-brand-400 bg-brand-50/50" },
          { key: "AT_HUB", label: "At Hub", subtitle: "Received / approved", value: orders.filter((o) => ["RECEIVED_AT_ADMIN_HUB", "APPROVED_BY_ADMIN_HUB"].includes(o.status)).length, Icon: Warehouse, iconBg: "bg-teal-50", iconColor: "text-teal-500", countColor: "text-teal-700", activeClass: "border-teal-400 bg-teal-50/60" },
          { key: "SHIPPED_TO_CUSTOMER", label: "Out for Delivery", subtitle: "On the way", value: orders.filter((o) => o.status === "SHIPPED_TO_CUSTOMER").length, Icon: Truck, iconBg: "bg-orange-50", iconColor: "text-orange-500", countColor: "text-orange-700", activeClass: "border-orange-400 bg-orange-50/60" },
          { key: "DELIVERED", label: "Delivered", subtitle: "Completed", value: orders.filter((o) => o.status === "DELIVERED").length, Icon: CheckCircle, iconBg: "bg-emerald-50", iconColor: "text-emerald-500", countColor: "text-emerald-700", activeClass: "border-emerald-400 bg-emerald-50/60" },
        ].map(({ key, label, subtitle, value, Icon, iconBg, iconColor, countColor, activeClass }) => {
          const isActive = statusFilter === key;
          const toggle = () => setStatusFilter((prev) => (prev === key ? "All" : key));
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

      {/* Filters — search + every order dimension on one wrapping row */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-64 md:w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by Order ID, Product, SKU, or Customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500/40 focus:border-transparent"
            />
          </div>
          <div className="w-44">
            <Dropdown
              value={STATUS_LABELS[statusFilter] ? statusFilter : "All"}
              options={statusDisplayOptions}
              onChange={(value) => setStatusFilter(value as string)}
              placeholder="Filter by Status"
            />
          </div>
          <div className="w-40">
            <Dropdown
              value={payFilter}
              options={[
                { value: "all", label: "Any Payment" },
                { value: "paid", label: "Paid" },
                { value: "pending", label: "Pending" },
                { value: "refunded", label: "Refunded" },
              ]}
              onChange={(value) => setPayFilter(value as string)}
              placeholder="Any Payment"
            />
          </div>
          {methodOptions.length > 1 && (
            <div className="w-44">
              <Dropdown
                value={methodFilter}
                options={methodOptions}
                onChange={(value) => setMethodFilter(value as string)}
                placeholder="Any Method"
              />
            </div>
          )}
          <div className="w-44">
            <Dropdown
              value={currencyFilter}
              options={[
                { value: "all", label: "Any Currency" },
                { value: "INR", label: "India (₹)" },
                { value: "USD", label: "International ($)" },
              ]}
              onChange={(value) => setCurrencyFilter(value as string)}
              placeholder="Any Currency"
            />
          </div>
          <div className="w-44">
            <Dropdown
              value={amountFilter}
              options={[
                { value: "all", label: "Any Amount" },
                { value: "lt500", label: "Under ₹500" },
                { value: "500-2k", label: "₹500 – ₹2,000" },
                { value: "2k-10k", label: "₹2,000 – ₹10,000" },
                { value: "gt10k", label: "Over ₹10,000" },
              ]}
              onChange={(value) => setAmountFilter(value as string)}
              placeholder="Any Amount"
            />
          </div>
          <div className="w-40">
            <Dropdown
              value={itemsFilter}
              options={[
                { value: "all", label: "Any Items" },
                { value: "single", label: "Single item" },
                { value: "multi", label: "Multiple items" },
              ]}
              onChange={(value) => setItemsFilter(value as string)}
              placeholder="Any Items"
            />
          </div>
          {courierOptions.length > 1 && (
            <div className="w-44">
              <Dropdown
                value={courierFilter}
                options={courierOptions}
                onChange={(value) => setCourierFilter(value as string)}
                placeholder="Any Courier"
              />
            </div>
          )}
          <div className="w-44">
            <Dropdown
              value={sortBy}
              options={[
                { value: "recent", label: "Sort: Newest" },
                { value: "oldest", label: "Sort: Oldest" },
                { value: "amount_desc", label: "Sort: Amount high→low" },
                { value: "amount_asc", label: "Sort: Amount low→high" },
                { value: "customer_asc", label: "Sort: Customer A–Z" },
              ]}
              onChange={(value) => setSortBy(value as string)}
              placeholder="Sort"
            />
          </div>
          <div className="shrink-0">
            <DateRangeCalendar
              from={dateFrom}
              to={dateTo}
              onChange={(from, to) => { setDateFrom(from); setDateTo(to); }}
              placeholder="Order Date"
            />
          </div>
          {anyFilterActive && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <X className="h-4 w-4" /> Clear
            </button>
          )}
        </div>
      </div>

        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader className="!bg-brand-500/[0.06] !border-0 [&_tr]:border-b [&_tr]:border-brand-100/50 [&_th]:!text-brand-500/60 [&_th]:font-bold [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:h-11">
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
            {paginatedOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              paginatedOrders.map((order) => {
                const mainItem = order.items?.[0] || {} as any;
                const productName = mainItem.productName || "Unknown";
                const sku = mainItem.sku || "N/A";
                const customer = order.customerName || "Unknown";

                return (
                  <TableRow key={order.id} className="hover:bg-slate-50/60 transition-colors duration-150 border-b border-slate-100 last:border-0">
                    <TableCell className="font-medium">{order.orderId}</TableCell>
                    <TableCell>
                      {productName}
                      {order.items?.length > 1 && <span className="text-xs text-slate-500 block">+{order.items.length - 1} more items</span>}
                    </TableCell>
                    <TableCell>{sku}</TableCell>
                    <TableCell>{customer}</TableCell>
                    <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell><Money amount={order.totalAmount || 0} order={order} /></TableCell>
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
                      {hasPermission('hub_to_customer:view') && (
                        <button
                          onClick={() => handleViewOrder(order.id)}
                          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Order"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm px-4 py-3 border-t border-slate-100">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {getPageRange(currentPage, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`e-${i}`} className="px-2 text-slate-400">…</span>
              ) : (
                <button
                  key={`p-${p}`}
                  onClick={() => setCurrentPage(p as number)}
                  aria-current={p === currentPage ? 'page' : undefined}
                  className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-brand-500 text-white shadow-xs shadow-brand-500/20' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
