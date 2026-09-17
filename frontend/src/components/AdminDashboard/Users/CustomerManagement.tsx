'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { userManagementService, Customer } from '@/services/userManagementService';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/UI/Table';
import { hasPermission } from '@/lib/auth';
import Dropdown from '@/components/UI/Dropdown';
import DateRangeCalendar, { fmtDate } from '@/components/Shared/DateRangeCalendar';
import { useRouter } from 'next/navigation';
import {
  Users as UsersIcon,
  UserPlus,
  Search,
  Eye,
  ShieldCheck,
  Mail,
  Phone,
  Activity,
  UserCheck,
  UserX,
  Star,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  X,
  ChevronDown,
  SlidersHorizontal
} from 'lucide-react';


const PAGE_SIZE = 10;
const REFRESH_INTERVAL_MS = 30000;

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

export default function CustomerManagement() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  // Additional client-side filters covering every customer dimension.
  const [ordersFilter, setOrdersFilter] = useState('all');   // order-count tiers
  const [spendFilter, setSpendFilter] = useState('all');     // lifetime-spend tiers (₹)
  const [ratingFilter, setRatingFilter] = useState('all');   // reviews / rating
  const [activityFilter, setActivityFilter] = useState('all'); // last-login recency
  const [stateFilter, setStateFilter] = useState('all');     // billing/shipping state
  const [sortBy, setSortBy] = useState('recent');            // result ordering
  const [panelOpen, setPanelOpen] = useState(true);          // collapse metrics + filters
  // const [loyaltyFilter, setLoyaltyFilter] = useState<string>('all'); // TODO: Re-enable when loyalty system is implemented
  const [currentPage, setCurrentPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchCustomersRef = useRef<() => void>(() => {});

  useEffect(() => {
    fetchCustomersRef.current = fetchCustomers;
  });

  // Initial load + 30s polling. Filtering is client-side, so this only needs to
  // run once (plus on tab re-focus) — it no longer refetches per keystroke/filter.
  useEffect(() => {
    fetchCustomers();

    let timer: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (timer) return;
      timer = setInterval(() => fetchCustomersRef.current(), REFRESH_INTERVAL_MS);
    };
    const stopPolling = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchCustomersRef.current();
        startPolling();
      } else {
        stopPolling();
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  // Reset to the first page whenever the client-side search/filter changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFrom, dateTo, ordersFilter, spendFilter, ratingFilter, activityFilter, stateFilter, sortBy]);

  // Always fetch the FULL customer set so the metric cards reflect global,
  // up-to-date totals. Search + status/metric filtering is applied client-side
  // below, so the stats never shrink to the currently-filtered subset.
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await userManagementService.getCustomers();
      setCustomers(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch customers', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const totalCustomers = customers.length;
  const newThisMonth = customers.filter(customer => {
    const joinDate = new Date(customer.joinDate);
    const now = new Date();
    return joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear();
  }).length;
  const activeToday = customers.filter(customer => {
    const lastLogin = new Date(customer.lastLogin);
    const today = new Date();
    return lastLogin.toDateString() === today.toDateString();
  }).length;
  const activeCustomers = customers.filter(customer => customer.status === 'active').length;
  const suspendedCustomers = customers.filter(customer => customer.status === 'suspended').length;
  const pendingCustomers = customers.filter(customer => customer.status === 'pending').length;

  // Clickable metric cards — each key maps to a client-side filter applied to the
  // table below. 'all' clears the filter; the status keys match the derived
  // customer.status; the two date-based keys reuse the exact metric definitions.
  const statCards = [
    { key: 'all',          title: 'Total Customers',  value: totalCustomers,     subtitle: 'Registered customers',  Icon: UsersIcon,   iconBg: 'bg-brand-50',   iconColor: 'text-brand-500',   countColor: 'text-slate-900',   activeClass: 'border-brand-400 bg-brand-50/50' },
    { key: 'newThisMonth', title: 'New This Month',    value: newThisMonth,       subtitle: 'Joined this month',     Icon: UserPlus,    iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', countColor: 'text-emerald-700', activeClass: 'border-emerald-400 bg-emerald-50/60' },
    { key: 'activeToday',  title: 'Active Today',      value: activeToday,        subtitle: 'Logged in today',       Icon: Activity,    iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-500',  countColor: 'text-indigo-700',  activeClass: 'border-indigo-400 bg-indigo-50/60' },
    { key: 'active',       title: 'Active Customers',  value: activeCustomers,    subtitle: 'Verified accounts',     Icon: UserCheck,   iconBg: 'bg-teal-50',    iconColor: 'text-teal-500',    countColor: 'text-teal-700',    activeClass: 'border-teal-400 bg-teal-50/60' },
    { key: 'suspended',    title: 'Suspended',         value: suspendedCustomers, subtitle: 'Restricted access',     Icon: UserX,       iconBg: 'bg-red-50',     iconColor: 'text-red-500',     countColor: 'text-red-700',     activeClass: 'border-red-400 bg-red-50/60' },
    { key: 'pending',      title: 'Pending',           value: pendingCustomers,   subtitle: 'Awaiting verification', Icon: ShoppingBag, iconBg: 'bg-amber-50',   iconColor: 'text-amber-500',   countColor: 'text-amber-700',   activeClass: 'border-amber-400 bg-amber-50/60' },
  ] as const;

  const now = new Date();
  const DAY_MS = 86400000;
  const daysSince = (d: string) => {
    const t = new Date(d).getTime();
    return isNaN(t) ? Infinity : (now.getTime() - t) / DAY_MS;
  };

  // The status card / dropdown selection (status values + two date-based metric keys).
  const matchesStatus = (customer: Customer) => {
    switch (statusFilter) {
      case 'active':
      case 'suspended':
      case 'pending':
        return customer.status === statusFilter;
      case 'newThisMonth': {
        const j = new Date(customer.joinDate);
        return j.getMonth() === now.getMonth() && j.getFullYear() === now.getFullYear();
      }
      case 'activeToday':
        return new Date(customer.lastLogin).toDateString() === now.toDateString();
      default:
        return true; // 'all'
    }
  };

  // Distinct states present in the data, for the Location dropdown.
  const stateOptions = [
    { value: 'all', label: 'All States' },
    ...Array.from(
      new Set(
        customers
          .map((c) => (c.address?.state || '').trim())
          .filter((s) => s && s.toLowerCase() !== 'n/a'),
      ),
    )
      .sort((a, b) => a.localeCompare(b))
      .map((s) => ({ value: s.toLowerCase(), label: s })),
  ];

  const filteredCustomers = customers.filter((customer) => {
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      const haystack = `${customer.firstName} ${customer.lastName} ${customer.email} ${customer.phone}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    // Join-date range filter (YYYY-MM-DD strings compare lexicographically)
    if (dateFrom || dateTo) {
      const joined = customer.joinDate ? fmtDate(new Date(customer.joinDate)) : '';
      if (!joined) return false;
      if (dateFrom && joined < dateFrom) return false;
      if (dateTo && joined > dateTo) return false;
    }
    if (!matchesStatus(customer)) return false;

    // Orders (count tiers)
    const o = customer.totalOrders || 0;
    if (ordersFilter === 'none' && o !== 0) return false;
    if (ordersFilter === '1-4' && !(o >= 1 && o <= 4)) return false;
    if (ordersFilter === '5+' && o < 5) return false;

    // Lifetime spend (₹ tiers)
    const s = customer.totalSpent || 0;
    if (spendFilter === 'zero' && s !== 0) return false;
    if (spendFilter === 'lt5k' && !(s > 0 && s < 5000)) return false;
    if (spendFilter === '5k-20k' && !(s >= 5000 && s <= 20000)) return false;
    if (spendFilter === 'gt20k' && !(s > 20000)) return false;

    // Reviews / rating
    const rc = customer.reviewsCount || 0, ar = customer.averageRating || 0;
    if (ratingFilter === 'has_reviews' && rc === 0) return false;
    if (ratingFilter === 'no_reviews' && rc > 0) return false;
    if (ratingFilter === '4plus' && ar < 4) return false;
    if (ratingFilter === 'under3' && !(rc > 0 && ar < 3)) return false;

    // Activity (last-login recency)
    if (activityFilter !== 'all') {
      const d = daysSince(customer.lastLogin);
      if (activityFilter === 'today' && new Date(customer.lastLogin).toDateString() !== now.toDateString()) return false;
      if (activityFilter === 'week' && d > 7) return false;
      if (activityFilter === 'month' && d > 30) return false;
      if (activityFilter === 'inactive' && d <= 90) return false;
    }

    // Location (state)
    if (stateFilter !== 'all') {
      if ((customer.address?.state || '').trim().toLowerCase() !== stateFilter) return false;
    }
    return true;
  });

  // Sort the filtered set (default: newest join first).
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    switch (sortBy) {
      case 'oldest': return new Date(a.joinDate).getTime() - new Date(b.joinDate).getTime();
      case 'orders_desc': return (b.totalOrders || 0) - (a.totalOrders || 0);
      case 'spend_desc': return (b.totalSpent || 0) - (a.totalSpent || 0);
      case 'active_desc': return new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime();
      case 'name_asc':
        return (a.fullName || `${a.firstName} ${a.lastName}`).localeCompare(b.fullName || `${b.firstName} ${b.lastName}`);
      case 'recent':
      default: return new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime();
    }
  });

  const anyFilterActive =
    !!searchTerm || statusFilter !== 'all' || !!dateFrom || !!dateTo ||
    ordersFilter !== 'all' || spendFilter !== 'all' ||
    ratingFilter !== 'all' || activityFilter !== 'all' || stateFilter !== 'all' || sortBy !== 'recent';

  const clearAllFilters = () => {
    setSearchTerm(''); setStatusFilter('all'); setDateFrom(''); setDateTo('');
    setOrdersFilter('all'); setSpendFilter('all');
    setRatingFilter('all'); setActivityFilter('all'); setStateFilter('all'); setSortBy('recent');
  };

  const totalPages = Math.max(1, Math.ceil(sortedCustomers.length / PAGE_SIZE));
  const paginatedCustomers = sortedCustomers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-50 text-green-700 border border-green-200">Active</Badge>;
      case 'suspended':
        return <Badge className="bg-red-50 text-red-700 border border-red-200">Suspended</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200">Pending</Badge>;
      default:
        return <Badge className="bg-slate-50 text-slate-700 border border-slate-200">Unknown</Badge>;
    }
  };

  // TODO: Re-enable when loyalty system is implemented
  // const getLoyaltyBadge = (tier: string) => {
  //   switch (tier) {
  //     case 'Bronze':
  //       return <Badge className="bg-amber-50 text-amber-700 border border-amber-200">Bronze</Badge>;
  //     case 'Silver':
  //       return <Badge className="bg-slate-50 text-slate-700 border border-slate-200">Silver</Badge>;
  //     case 'Gold':
  //       return <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200">Gold</Badge>;
  //     case 'Platinum':
  //       return <Badge className="bg-slate-50 text-slate-700 border border-slate-200">Platinum</Badge>;
  //     default:
  //       return <Badge className="bg-slate-50 text-slate-700 border border-slate-200">Bronze</Badge>;
  //   }
  // };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-slate-300'}`}
      />
    ));
  };

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Customer Management</h1>
          <p className="text-sm text-slate-500">Manage customer accounts and their status</p>
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
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${panelOpen ? 'rotate-180' : ''}`} />
        </button>
        <span className="text-xs text-slate-500">
          Showing {sortedCustomers.length} of {customers.length} customers{anyFilterActive ? ' (filtered)' : ''}
        </span>
      </div>

      {panelOpen && (
        <div className="space-y-4">
      {/* Stats Cards — click a card to filter the table below by that metric */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map(({ key, title, value, subtitle, Icon, iconBg, iconColor, countColor, activeClass }) => {
          const isActive = statusFilter === key;
          const toggle = () => setStatusFilter((prev) => (key === 'all' || prev === key ? 'all' : key));
          return (
            <button
              key={key}
              type="button"
              onClick={toggle}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
              className={`text-left bg-white border rounded-2xl shadow-xs transition-all duration-200 hover:shadow-sm group ${isActive ? activeClass : 'border-slate-200/80 hover:border-slate-300'}`}
            >
              <div className="flex flex-row items-center justify-between px-3.5 pt-3 pb-1">
                <span className="text-[13px] font-medium text-slate-500">{title}</span>
                <div className={`p-1.5 rounded-lg ${isActive ? iconBg.replace('50', '100') : iconBg} transition-transform duration-150 group-hover:scale-110`}>
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

      {/* Filter Toolbar — search + all filters on one wrapping row */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-60 md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 focus:outline-none w-full transition-all bg-white text-sm"
            />
          </div>
          <div className="w-40">
            <Dropdown
              value={['active', 'suspended', 'pending'].includes(statusFilter) ? statusFilter : 'all'}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'pending', label: 'Pending' },
              ]}
              onChange={(value) => setStatusFilter(value as string)}
              placeholder="All Status"
            />
          </div>
          <div className="w-40">
            <Dropdown
              value={ordersFilter}
              options={[
                { value: 'all', label: 'Any Orders' },
                { value: 'none', label: 'No orders' },
                { value: '1-4', label: '1–4 orders' },
                { value: '5+', label: '5+ orders' },
              ]}
              onChange={(value) => setOrdersFilter(value as string)}
              placeholder="Any Orders"
            />
          </div>
          <div className="w-44">
            <Dropdown
              value={spendFilter}
              options={[
                { value: 'all', label: 'Any Spend' },
                { value: 'zero', label: '₹0 spent' },
                { value: 'lt5k', label: 'Under ₹5,000' },
                { value: '5k-20k', label: '₹5,000 – ₹20,000' },
                { value: 'gt20k', label: 'Over ₹20,000' },
              ]}
              onChange={(value) => setSpendFilter(value as string)}
              placeholder="Any Spend"
            />
          </div>
          <div className="w-40">
            <Dropdown
              value={ratingFilter}
              options={[
                { value: 'all', label: 'Any Rating' },
                { value: 'has_reviews', label: 'Has reviews' },
                { value: 'no_reviews', label: 'No reviews' },
                { value: '4plus', label: '4★ & up' },
                { value: 'under3', label: 'Under 3★' },
              ]}
              onChange={(value) => setRatingFilter(value as string)}
              placeholder="Any Rating"
            />
          </div>
          <div className="w-44">
            <Dropdown
              value={activityFilter}
              options={[
                { value: 'all', label: 'Any Activity' },
                { value: 'today', label: 'Active today' },
                { value: 'week', label: 'Active this week' },
                { value: 'month', label: 'Active this month' },
                { value: 'inactive', label: 'Inactive (90d+)' },
              ]}
              onChange={(value) => setActivityFilter(value as string)}
              placeholder="Any Activity"
            />
          </div>
          {stateOptions.length > 1 && (
            <div className="w-44">
              <Dropdown
                value={stateFilter}
                options={stateOptions}
                onChange={(value) => setStateFilter(value as string)}
                placeholder="All States"
              />
            </div>
          )}
          <div className="w-44">
            <Dropdown
              value={sortBy}
              options={[
                { value: 'recent', label: 'Sort: Newest' },
                { value: 'oldest', label: 'Sort: Oldest' },
                { value: 'orders_desc', label: 'Sort: Most orders' },
                { value: 'spend_desc', label: 'Sort: Highest spend' },
                { value: 'active_desc', label: 'Sort: Recently active' },
                { value: 'name_asc', label: 'Sort: Name A–Z' },
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
              placeholder="Join Date"
            />
          </div>
          {anyFilterActive && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <X className="h-4 w-4" /> Clear
            </button>
          )}
        </div>
      </div>
        </div>
      )}

      {/* Customers Table — matches the Vendor Management table style */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="!bg-brand-500/[0.06] !border-0 [&_tr]:border-b [&_tr]:border-brand-100/50 [&_th]:!text-brand-500/60 [&_th]:font-bold [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:h-11 [&_th]:px-4">
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                {/* <TableHead>Loyalty Tier</TableHead> */}
                <TableHead>Orders & Spending</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="text-slate-500">
                      <p className="text-lg font-medium">No customers found</p>
                      <p className="text-sm">Try adjusting your search or filter criteria</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers.map((customer) => (
                  <TableRow key={customer.id} className="hover:bg-slate-50/60 transition-colors duration-150 border-b border-slate-100 last:border-0">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                          {customer.avatar ? (
                            <img
                              src={customer.avatar}
                              alt={`${customer.firstName} ${customer.lastName}`}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <span className="text-sm font-medium text-slate-600">
                              {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{customer.fullName || `${customer.firstName} ${customer.lastName}`.trim()}</div>
                          <div className="text-sm text-slate-500">{customer.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span className={customer.isEmailVerified ? 'text-green-600' : 'text-slate-600'}>
                            {customer.email}
                          </span>
                          {customer.isEmailVerified && <ShieldCheck className="h-3 w-3 text-green-500" />}
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span className={customer.isPhoneVerified ? 'text-green-600' : 'text-slate-600'}>
                            {customer.phone}
                          </span>
                          {customer.isPhoneVerified && <ShieldCheck className="h-3 w-3 text-green-500" />}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(customer.status)}</TableCell>
                    {/* <TableCell>{getLoyaltyBadge(customer.loyaltyTier)}</TableCell> */}
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{customer.totalOrders} orders</div>
                        <div className="text-slate-500">₹{customer.totalSpent.toFixed(2)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.averageRating ? (
                        <div className="flex items-center gap-1">
                          <div className="flex">
                            {renderStars(customer.averageRating)}
                          </div>
                          <span className="text-sm text-slate-600">
                            {customer.averageRating.toFixed(1)} ({customer.reviewsCount})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">No reviews</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-600">
                        {new Date(customer.lastLogin).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {hasPermission('customer_management:view') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-slate-100"
                            title="View Customer Details"
                            onClick={() => router.push(`/admin/dashboard/users/customer-management/view/${customer.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm px-4 py-3 border-t border-slate-100">
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
            {getPageRange(currentPage, totalPages).map((p, i) => p === '…' ? (<span key={`e-${i}`} className="px-2 text-slate-400">…</span>) : (<button key={`p-${p}`} onClick={() => setCurrentPage(p as number)} aria-current={p === currentPage ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-brand-500 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
