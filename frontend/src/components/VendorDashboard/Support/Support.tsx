'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Plus, Search, Eye, Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table'
import Dropdown from '@/components/UI/Dropdown'
import DateRangeCalendar from '@/components/Shared/DateRangeCalendar'
import supportService, { SupportTicket } from '@/services/supportService'

const PAGE_SIZE = 10

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

export default function Support() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      setIsLoading(true)
      const res = await supportService.getMyTickets()
      if (res.success) {
        setTickets(res.data)
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-50 text-red-700 border border-red-200'
      case 'in-progress': return 'bg-blue-50 text-blue-700 border border-blue-200'
      case 'resolved': return 'bg-green-50 text-green-700 border border-green-200'
      case 'closed': return 'bg-slate-50 text-slate-700 border border-slate-200'
      default: return 'bg-slate-50 text-slate-700 border border-slate-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-50 text-red-700 border border-red-200'
      case 'high': return 'bg-orange-50 text-orange-700 border border-orange-200'
      case 'medium': return 'bg-yellow-50 text-yellow-700 border border-yellow-200'
      case 'low': return 'bg-green-50 text-green-700 border border-green-200'
      default: return 'bg-slate-50 text-slate-700 border border-slate-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="w-3 h-3" />
      case 'in-progress': return <Clock className="w-3 h-3" />
      case 'resolved': return <CheckCircle className="w-3 h-3" />
      case 'closed': return <CheckCircle className="w-3 h-3" />
      default: return <Clock className="w-3 h-3" />
    }
  }

  const setCardFilter = (status: string) => {
    setStatusFilter((prev) => (prev === status ? 'all' : status))
    setCurrentPage(1)
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter

    // Date filter: a full range filters between both endpoints; a single
    // selected date (only one endpoint) filters to that exact day.
    let matchesDate = true
    if (dateFrom || dateTo) {
      if (!ticket.createdAt) return false
      const start = dateFrom || dateTo
      const end = dateTo || dateFrom
      const c = new Date(ticket.createdAt)
      const day = new Date(c.getFullYear(), c.getMonth(), c.getDate())
      if (day < new Date(start + 'T00:00:00')) matchesDate = false
      if (day > new Date(end + 'T23:59:59')) matchesDate = false
    }

    return matchesSearch && matchesStatus && matchesDate
  })

  const totalPages = Math.ceil(filteredTickets.length / PAGE_SIZE)
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in-progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Support Tickets</h1>
          <p className="text-sm text-slate-500 mt-0.5">Raise issues and track responses from our support team</p>
        </div>
        <Link
          href="/vendor/dashboard/support/create"
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Ticket
        </Link>
      </div>

      {/* Stats Cards (clickable filters) */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => setCardFilter('all')}
          className={`group text-left bg-white rounded-xl border shadow-xs p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-brand-200 ${statusFilter === 'all' ? 'border-brand-300 ring-1 ring-brand-200' : 'border-slate-200/80'}`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-slate-600">Total Tickets</span>
            <div className="p-2 bg-brand-50 rounded-xl transition-transform duration-200 group-hover:scale-110">
              <MessageCircle className="h-4 w-4 text-brand-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{stats.total}</p>
          <p className="text-xs text-slate-500 mt-1">All your tickets</p>
        </button>
        <button
          type="button"
          onClick={() => setCardFilter('open')}
          className={`group text-left bg-white rounded-xl border shadow-xs p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-red-200 ${statusFilter === 'open' ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200/80'}`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-slate-600">Open</span>
            <div className="p-2 bg-red-50 rounded-xl transition-transform duration-200 group-hover:scale-110">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
          </div>
          <p className={`text-xl font-bold mt-2 ${stats.open > 0 ? 'text-red-600' : 'text-slate-900'}`}>{stats.open}</p>
          <p className="text-xs text-slate-500 mt-1">Awaiting response</p>
        </button>
        <button
          type="button"
          onClick={() => setCardFilter('in-progress')}
          className={`group text-left bg-white rounded-xl border shadow-xs p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200 ${statusFilter === 'in-progress' ? 'border-blue-300 ring-1 ring-blue-200' : 'border-slate-200/80'}`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-slate-600">In Progress</span>
            <div className="p-2 bg-blue-50 rounded-xl transition-transform duration-200 group-hover:scale-110">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <p className={`text-xl font-bold mt-2 ${stats.inProgress > 0 ? 'text-blue-600' : 'text-slate-900'}`}>{stats.inProgress}</p>
          <p className="text-xs text-slate-500 mt-1">Being worked on</p>
        </button>
        <button
          type="button"
          onClick={() => setCardFilter('resolved')}
          className={`group text-left bg-white rounded-xl border shadow-xs p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-green-200 ${statusFilter === 'resolved' ? 'border-green-300 ring-1 ring-green-200' : 'border-slate-200/80'}`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-slate-600">Resolved</span>
            <div className="p-2 bg-green-50 rounded-xl transition-transform duration-200 group-hover:scale-110">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </div>
          <p className={`text-xl font-bold mt-2 ${stats.resolved > 0 ? 'text-green-600' : 'text-slate-900'}`}>{stats.resolved}</p>
          <p className="text-xs text-slate-500 mt-1">Closed successfully</p>
        </button>
      </div>

      {/* Filters */}
      <div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Dropdown
              value={statusFilter}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'open', label: 'Open' },
                { value: 'in-progress', label: 'In Progress' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'closed', label: 'Closed' }
              ]}
              onChange={(val) => { setStatusFilter(val as string); setCurrentPage(1) }}
              placeholder="Filter by status"
            />
            <DateRangeCalendar
              from={dateFrom}
              to={dateTo}
              placeholder="Created Date"
              onChange={(f, t) => { setDateFrom(f); setDateTo(t); setCurrentPage(1) }}
            />
          </div>
        </div>
      </div>

      {/* Results summary — only shown when there are tickets to page through */}
      {filteredTickets.length > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap text-sm text-slate-600">
          <span>
            {`Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredTickets.length)} of ${filteredTickets.length} ticket${filteredTickets.length === 1 ? '' : 's'}`}
          </span>
        </div>
      )}

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="!bg-brand-500/[0.06] !border-0 [&_tr]:border-b [&_tr]:border-brand-100/50 [&_th]:!text-brand-500/60 [&_th]:font-bold [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:h-11">
              <TableRow className="!bg-brand-500/[0.06] hover:!bg-brand-500/[0.06]">
                <TableHead>Ticket</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Responses</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTickets.length > 0 ? (
                paginatedTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-slate-900">{ticket.subject}</div>
                        <div className="text-sm text-slate-500 mt-1 line-clamp-1">{ticket.description}</div>
                        <div className="text-xs text-slate-400 mt-1">#{ticket.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${getStatusColor(ticket.status)}`}>
                        {getStatusIcon(ticket.status)}
                        <span className="capitalize">{ticket.status.replace('-', ' ')}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-900 capitalize">{ticket.category}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-900">{new Date(ticket.createdAt).toLocaleDateString('en-IN')}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-900">{new Date(ticket.updatedAt).toLocaleDateString('en-IN')}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-900">{ticket.messages?.length || 0}</span>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/vendor/dashboard/support/${ticket.id}`}
                        className="p-1.5 inline-flex text-slate-500 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                        title="View Ticket"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    No tickets found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-3 text-sm px-5 py-3 border-t border-slate-200">
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
              {getPageRange(currentPage, totalPages).map((p, i) => p === '…' ? (<span key={`e-${i}`} className="px-2 text-slate-400">…</span>) : (<button key={`p-${p}`} onClick={() => setCurrentPage(p as number)} aria-current={p === currentPage ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-brand-500 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
