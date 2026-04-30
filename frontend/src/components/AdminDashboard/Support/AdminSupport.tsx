"use client";

import { useState } from "react";
import { Search, Eye, Clock, CheckCircle, AlertCircle, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "../../UI/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../UI/Table";
import Dropdown from "../../UI/Dropdown";
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
        return "bg-red-100 text-red-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
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

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.creatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticketId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const totalPages = Math.ceil(filteredTickets.length / PAGE_SIZE);
  const paginatedItems = filteredTickets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in-progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Support Tickets</h1>
          <p className="text-gray-600 mt-1">Manage and respond to vendor support requests</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <MessageCircle className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Tickets</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Open</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.open}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">In Progress</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Resolved</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                <input
                  type="text"
                  placeholder="Search tickets by ID, vendor, or subject..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#222222]"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
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
      {filteredTickets.length > 0 && (
        <p className="text-sm text-slate-600">
          Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredTickets.length)} of {filteredTickets.length}
        </p>
      )}
      <Card>
        <Table>
          <TableHeader>
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
                <TableRow key={ticket.id}>
                  <TableCell>
                    <div className="font-mono font-medium text-gray-900">{ticket.ticketId}</div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{ticket.creatorName}</div>
                      <div className="text-sm text-gray-500">{ticket.creatorEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{ticket.subject}</div>
                      <div className="text-sm text-gray-500 line-clamp-1">{ticket.description}</div>
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
                    <span className="text-sm text-gray-900">{ticket.category}</span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">{new Date(ticket.createdAt).toLocaleDateString()}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-900">{ticket.messages?.length || 0}</span>
                  </TableCell>
                  <TableCell>
                    {hasPermission(['view_support', 'manage_support']) && (
                      <Link
                        href={`/admin/dashboard/support/${ticket.id}`}
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View & Reply
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9}>
                  <div className="p-6 text-center text-gray-500">No tickets found matching your criteria.</div>
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
            {getPageRange(currentPage, totalPages).map((p, i) => p === '…' ? (<span key={`e-${i}`} className="px-2 text-slate-400">…</span>) : (<button key={`p-${p}`} onClick={() => setCurrentPage(p as number)} aria-current={p === currentPage ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-[#222222] text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
