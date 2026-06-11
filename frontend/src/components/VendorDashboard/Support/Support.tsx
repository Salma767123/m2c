'use client'

import { useState } from 'react'
import { MessageCircle, Plus, Search, Eye, Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/UI/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table'
import Dropdown from '@/components/UI/Dropdown'
import supportService, { SupportTicket } from '@/services/supportService'
import { useEffect } from 'react'

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
  const [priorityFilter, setPriorityFilter] = useState('all')
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
      case 'open': return 'bg-red-100 text-red-800'
      case 'in-progress': return 'bg-blue-100 text-blue-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-slate-100 text-slate-800'
      default: return 'bg-slate-100 text-slate-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-slate-100 text-slate-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="w-4 h-4" />
      case 'in-progress': return <Clock className="w-4 h-4" />
      case 'resolved': return <CheckCircle className="w-4 h-4" />
      case 'closed': return <CheckCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Support Tickets</h1>
        <Link
          href="/vendor/dashboard/support/create"
          className="flex items-center px-4 py-2 bg-brand-500 text-white rounded-md hover:bg-slate-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Ticket
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <MessageCircle className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-slate-500">Total Tickets</h3>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-slate-500">Open</h3>
                <p className="text-2xl font-bold text-slate-900">{stats.open}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-slate-500">In Progress</h3>
                <p className="text-2xl font-bold text-slate-900">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-slate-500">Resolved</h3>
                <p className="text-2xl font-bold text-slate-900">{stats.resolved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 z-10" />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="w-full sm:w-48">
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
              </div>

              <div className="w-full sm:w-48">
                <Dropdown
                  value={priorityFilter}
                  options={[
                    { value: 'all', label: 'All Priority' },
                    { value: 'urgent', label: 'Urgent' },
                    { value: 'high', label: 'High' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'low', label: 'Low' }
                  ]}
                  onChange={(val) => { setPriorityFilter(val as string); setCurrentPage(1) }}
                  placeholder="Filter by priority"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results summary */}
      {filteredTickets.length > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap text-sm text-slate-600">
          <span>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredTickets.length)} of {filteredTickets.length} ticket{filteredTickets.length === 1 ? '' : 's'}
          </span>
        </div>
      )}

      {/* Tickets Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
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
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                      {getStatusIcon(ticket.status)}
                      <span className="ml-1 capitalize">{ticket.status.replace('-', ' ')}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-900">{ticket.category}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-900">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-900">{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-900">{ticket.messages?.length || 0}</span>
                  </TableCell>
                  <TableCell>
                    <Link href={`/vendor/dashboard/support/${ticket.id}`} className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8}>
                  <div className="p-6 text-center text-slate-500">
                    No tickets found matching your criteria.
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-3 text-sm px-5 py-3 border-t border-slate-200">
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
              {getPageRange(currentPage, totalPages).map((p, i) => p === '…' ? (<span key={`e-${i}`} className="px-2 text-slate-400">…</span>) : (<button key={`p-${p}`} onClick={() => setCurrentPage(p as number)} aria-current={p === currentPage ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-brand-500 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
