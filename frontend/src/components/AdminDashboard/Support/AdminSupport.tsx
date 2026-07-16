"use client";

import { useState } from "react";
import { Search, Eye, Clock, CheckCircle, AlertCircle, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "../../UI/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../UI/Table";
import Dropdown from "../../UI/Dropdown";
import DateRangeCalendar from "@/components/Shared/DateRangeCalendar";
import { Breadcrumb } from "../Breadcrumb/Breadcrumb";
import supportService, { SupportTicket } from "@/services/supportService";
import { hasPermission } from "@/lib/auth";
import { useEffect } from "react";

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

export default function AdminSupport() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const res = await supportService.getAllTickets();
      if (res.success) {
        setTickets(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-50 text-red-700 border border-red-200";
      case "in-progress":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      case "resolved":
        return "bg-green-50 text-green-700 border border-green-200";
      case "closed":
        return "bg-slate-50 text-slate-700 border border-slate-200";
      default:
        return "bg-slate-50 text-slate-700 border border-slate-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-50 text-red-700 border border-red-200";
      case "high":
        return "bg-orange-50 text-orange-700 border border-orange-200";
      case "medium":
        return "bg-yellow-50 text-yellow-700 border border-yellow-200";
      case "low":
        return "bg-green-50 text-green-700 border border-green-200";
      default:
        return "bg-slate-50 text-slate-700 border border-slate-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="w-4 h-4" />;
      case "in-progress":
        return <Clock className="w-4 h-4" />;
      case "resolved":
        return <CheckCircle className="w-4 h-4" />;
      case "closed":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Keep a ticket when its created date falls within the selected range.
  const inDateRange = (d?: string | null) => {
    if (!dateFrom && !dateTo) return true;
    if (!d) return false;
    const day = new Date(d).toLocaleDateString("en-CA"); // local YYYY-MM-DD
    if (dateFrom && day < dateFrom) return false;
    if (dateTo && day > dateTo) return false;
    return true;
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.creatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticketId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority && inDateRange(ticket.createdAt);
  });

  const totalPages = Math.ceil(filteredTickets.length / PAGE_SIZE);
  const paginatedItems = filteredTickets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in-progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  // Interactive metric cards — clicking one filters the table by that status.
  const metricCards = [
    { key: "all", label: "Total Tickets", subtitle: "All requests", count: stats.total, Icon: MessageCircle, iconBg: "bg-brand-50", iconColor: "text-brand-500", countColor: "text-slate-900", activeClass: "border-brand-400 bg-brand-50/50" },
    { key: "open", label: "Open", subtitle: "Awaiting response", count: stats.open, Icon: AlertCircle, iconBg: "bg-red-50", iconColor: "text-red-500", countColor: "text-red-700", activeClass: "border-red-400 bg-red-50/60" },
    { key: "in-progress", label: "In Progress", subtitle: "Being handled", count: stats.inProgress, Icon: Clock, iconBg: "bg-blue-50", iconColor: "text-blue-500", countColor: "text-blue-700", activeClass: "border-blue-400 bg-blue-50/60" },
    { key: "resolved", label: "Resolved", subtitle: "Completed", count: stats.resolved, Icon: CheckCircle, iconBg: "bg-emerald-50", iconColor: "text-emerald-500", countColor: "text-emerald-700", activeClass: "border-emerald-400 bg-emerald-50/60" },
  ];

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendor Support Tickets</h1>
          <p className="text-slate-600 mt-1">Manage and respond to vendor support requests</p>
        </div>
      </div>

      {/* Interactive metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricCards.map(({ key, label, subtitle, count, Icon, iconBg, iconColor, countColor, activeClass }) => {
          const isActive = statusFilter === key;
          const pct = stats.total > 0 && key !== "all" ? Math.round((count / stats.total) * 100) : null;
          return (
            <button
              key={key}
              onClick={() => { setStatusFilter(statusFilter === key ? "all" : key); setCurrentPage(1); }}
              className={`text-left bg-white border rounded-2xl shadow-xs transition-all duration-200 hover:shadow-sm group ${
                isActive ? activeClass : "border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div className="flex flex-row items-center justify-between px-4 pt-4 pb-2">
                <span className="text-sm font-medium text-slate-500">{label}</span>
                <div className={`p-1.5 rounded-lg ${iconBg} transition-transform duration-150 group-hover:scale-110`}>
                  <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
              </div>
              <div className="px-4 pb-4">
                <div className={`text-2xl font-bold ${countColor}`}>{count}</div>
                <p className="text-xs text-slate-400 mt-0.5">{pct !== null ? `${pct}% of total` : subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 z-10" />
                <input
                  type="text"
                  placeholder="Search tickets by ID, vendor, or subject..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <DateRangeCalendar
                from={dateFrom}
                to={dateTo}
                placeholder="Created Date"
                onChange={(f, t) => { setDateFrom(f); setDateTo(t); setCurrentPage(1); }}
              />
              <div className="w-full sm:w-48">
                <Dropdown
                  value={statusFilter}
                  options={[
                    { value: "all", label: "All Status" },
                    { value: "open", label: "Open" },
                    { value: "in-progress", label: "In Progress" },
                    { value: "resolved", label: "Resolved" },
                    { value: "closed", label: "Closed" },
                  ]}
                  onChange={(val) => { setStatusFilter(val as string); setCurrentPage(1); }}
                  placeholder="Filter by status"
                />
              </div>

              <div className="w-full sm:w-48">
                <Dropdown
                  value={priorityFilter}
                  options={[
                    { value: "all", label: "All Priority" },
                    { value: "urgent", label: "Urgent" },
                    { value: "high", label: "High" },
                    { value: "medium", label: "Medium" },
                    { value: "low", label: "Low" },
                  ]}
                  onChange={(val) => { setPriorityFilter(val as string); setCurrentPage(1); }}
                  placeholder="Filter by priority"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <Table>
          <TableHeader className="!bg-brand-500/[0.06] !border-0 [&_tr]:border-b [&_tr]:border-brand-100/50 [&_th]:!text-brand-500/60 [&_th]:font-bold [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:h-11">
            <TableRow>
              <TableHead>Ticket ID</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Responses</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.length > 0 ? (
              paginatedItems.map((ticket) => (
                <TableRow key={ticket.id} className="hover:bg-slate-50/60 transition-colors">
                  <TableCell>
                    <div className="font-mono font-medium text-slate-900">{ticket.ticketId}</div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-slate-900">{ticket.creatorName}</div>
                      <div className="text-sm text-slate-500">{ticket.creatorEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-slate-900">{ticket.subject}</div>
                      <div className="text-sm text-slate-500 line-clamp-1">{ticket.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        ticket.status
                      )}`}
                    >
                      {getStatusIcon(ticket.status)}
                      <span className="ml-1 capitalize">{ticket.status.replace("-", " ")}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                        ticket.priority
                      )}`}
                    >
                      {ticket.priority.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-900">{ticket.category}</span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-900">{new Date(ticket.createdAt).toLocaleDateString()}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-900">{ticket.messages?.length || 0}</span>
                  </TableCell>
                  <TableCell>
                    {hasPermission('support:view') && (
                      <Link
                        href={`/admin/dashboard/support/${ticket.id}`}
                        title="View & Reply"
                        className="inline-flex p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9}>
                  <div className="p-6 text-center text-slate-500">No tickets found matching your criteria.</div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
            {getPageRange(currentPage, totalPages).map((p, i) => p === '…' ? (<span key={`e-${i}`} className="px-2 text-slate-400">…</span>) : (<button key={`p-${p}`} onClick={() => setCurrentPage(p as number)} aria-current={p === currentPage ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-brand-500 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
