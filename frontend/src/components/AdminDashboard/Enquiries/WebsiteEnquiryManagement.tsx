'use client';

import { useState, useEffect } from 'react';
import { contactEnquiryService, ContactEnquiry } from '@/services/contactEnquiryService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Badge } from '@/components/UI/Badge';
import { Button } from '@/components/UI/Button';
import Dropdown from '@/components/UI/Dropdown';
import DateRangeCalendar, { fmtDate } from '@/components/Shared/DateRangeCalendar';
import { Mail, Phone, Eye, Trash2, MessageSquare, Search, ChevronLeft, ChevronRight, Inbox, Reply, CheckCircle } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { hasPermission } from '@/lib/auth';
import DeleteConfirmModal from '@/components/UI/DeleteConfirmModal';

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

export default function WebsiteEnquiryManagement() {
  const [enquiries, setEnquiries] = useState<ContactEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnquiry, setSelectedEnquiry] = useState<ContactEnquiry | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [stats, setStats] = useState({ total: 0, new: 0, read: 0, replied: 0, closed: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; subject: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchEnquiries();
    fetchStats();
  }, [statusFilter, searchTerm]);

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      const response = await contactEnquiryService.getAllEnquiries({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchTerm || undefined
      });
      setEnquiries(response.data);
    } catch (error: any) {
      showErrorToast('Error', error.message || 'Failed to fetch enquiries');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await contactEnquiryService.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleViewEnquiry = async (enquiry: ContactEnquiry) => {
    try {
      const response = await contactEnquiryService.getEnquiryById(enquiry.id);
      setSelectedEnquiry(response.data);
      setShowModal(true);
      fetchEnquiries(); // Refresh to update status
      fetchStats();
    } catch (error: any) {
      showErrorToast('Error', error.message || 'Failed to fetch enquiry details');
    }
  };

  const handleUpdateStatus = async (status: string, notes?: string) => {
    if (!selectedEnquiry) return;

    try {
      await contactEnquiryService.updateStatus(selectedEnquiry.id, { status, notes });
      showSuccessToast('Success', 'Enquiry status updated');
      setShowModal(false);
      fetchEnquiries();
      fetchStats();
    } catch (error: any) {
      showErrorToast('Error', error.message || 'Failed to update status');
    }
  };

  const handleDeleteClick = (enquiry: ContactEnquiry) => {
    setDeleteTarget({ id: enquiry.id, name: enquiry.name, subject: enquiry.subject });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await contactEnquiryService.deleteEnquiry(deleteTarget.id);
      showSuccessToast('Success', 'Enquiry deleted');
      fetchEnquiries();
      fetchStats();
    } catch (error: any) {
      showErrorToast('Error', error.message || 'Failed to delete enquiry');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      new: 'bg-blue-50 text-blue-700 border border-blue-200',
      read: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      replied: 'bg-green-50 text-green-700 border border-green-200',
      closed: 'bg-slate-50 text-slate-700 border border-slate-200'
    };
    return <Badge className={`${styles[status as keyof typeof styles]} text-xs`}>{status.toUpperCase()}</Badge>;
  };

  // Client-side created-date filter (status + search are handled server-side).
  const filteredEnquiries = enquiries.filter((e) => {
    if (!dateFrom && !dateTo) return true;
    const d = e.createdAt ? fmtDate(new Date(e.createdAt)) : '';
    if (!d) return false;
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredEnquiries.length / PAGE_SIZE);
  const paginatedItems = filteredEnquiries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Metric cards — styled like the Vendor Product Requests module; click to filter.
  const metricCards = [
    { key: 'all',     label: 'Total',   subtitle: 'All enquiries',   value: stats.total,   Icon: MessageSquare, iconBg: 'bg-brand-50',   iconColor: 'text-brand-500',   countColor: 'text-slate-900',  activeClass: 'border-brand-400 bg-brand-50/50' },
    { key: 'new',     label: 'New',     subtitle: 'Unopened',        value: stats.new,     Icon: Inbox,         iconBg: 'bg-blue-50',    iconColor: 'text-blue-500',    countColor: 'text-blue-700',   activeClass: 'border-blue-400 bg-blue-50/60' },
    { key: 'read',    label: 'Read',    subtitle: 'Opened',          value: stats.read,    Icon: Eye,           iconBg: 'bg-amber-50',   iconColor: 'text-amber-500',   countColor: 'text-amber-700',  activeClass: 'border-amber-400 bg-amber-50/60' },
    { key: 'replied', label: 'Replied', subtitle: 'Responded',       value: stats.replied, Icon: Reply,         iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', countColor: 'text-emerald-700', activeClass: 'border-emerald-400 bg-emerald-50/60' },
    { key: 'closed',  label: 'Closed',  subtitle: 'Resolved',        value: stats.closed,  Icon: CheckCircle,   iconBg: 'bg-slate-100',  iconColor: 'text-slate-500',   countColor: 'text-slate-700',  activeClass: 'border-slate-400 bg-slate-100/60' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Website Enquiries</h1>
        <p className="text-slate-600">Manage contact form submissions from website visitors</p>
      </div>

      {/* Stats Cards — click a card to filter the table below by that status */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {metricCards.map(({ key, label, subtitle, value, Icon, iconBg, iconColor, countColor, activeClass }) => {
          const isActive = statusFilter === key;
          const toggle = () => { setStatusFilter((prev) => (prev === key ? 'all' : key)); setCurrentPage(1); };
          return (
            <button
              key={key}
              type="button"
              onClick={toggle}
              className={`text-left bg-white border rounded-2xl shadow-xs transition-all duration-200 hover:shadow-sm group ${isActive ? activeClass : 'border-slate-200/80 hover:border-slate-300'}`}
            >
              <div className="flex flex-row items-center justify-between px-4 pt-4 pb-2">
                <span className="text-sm font-medium text-slate-500">{label}</span>
                <div className={`p-1.5 rounded-lg ${isActive ? iconBg.replace('50', '100') : iconBg} transition-transform duration-150 group-hover:scale-110`}>
                  <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
              </div>
              <div className="px-4 pb-4">
                <div className={`text-2xl font-bold ${countColor}`}>{value}</div>
                <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, subject..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500/40"
                />
              </div>
            </div>
            <div className="shrink-0">
              <DateRangeCalendar
                from={dateFrom}
                to={dateTo}
                placeholder="Enquiry Date"
                onChange={(f, t) => { setDateFrom(f); setDateTo(t); setCurrentPage(1); }}
              />
            </div>
            <div className="w-full md:w-64">
              <Dropdown
                value={statusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'new', label: 'New' },
                  { value: 'read', label: 'Read' },
                  { value: 'replied', label: 'Replied' },
                  { value: 'closed', label: 'Closed' },
                ]}
                onChange={(value) => { setStatusFilter(value as string); setCurrentPage(1); }}
                placeholder="Filter by Status"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enquiries Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : filteredEnquiries.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No enquiries found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-brand-500/[0.06] border-b border-brand-100/50 [&_th]:!text-brand-500/60">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedItems.map((enquiry) => (
                    <tr key={enquiry.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{enquiry.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="flex items-center gap-1 text-slate-600">
                            <Mail className="w-3 h-3" />
                            {enquiry.email}
                          </div>
                          {enquiry.phone && (
                            <div className="flex items-center gap-1 text-slate-600 mt-1">
                              <Phone className="w-3 h-3" />
                              {enquiry.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900 max-w-xs truncate">{enquiry.subject}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(enquiry.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(enquiry.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          {hasPermission('website_enquiries:view') && (
                            <button
                              onClick={() => handleViewEnquiry(enquiry)}
                              title="View Details"
                              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('website_enquiries:delete') && (
                            <button
                              onClick={() => handleDeleteClick(enquiry)}
                              title="Delete"
                              className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
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

      <DeleteConfirmModal
        show={!!deleteTarget}
        title="Delete Enquiry"
        itemName={deleteTarget?.name || ''}
        itemDetail={deleteTarget?.subject || ''}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* View Modal */}
      {showModal && selectedEnquiry && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">Enquiry Details</h2>
                <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-700">
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-600">Name</label>
                  <div className="text-slate-900">{selectedEnquiry.name}</div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600">Email</label>
                  <div className="text-slate-900">{selectedEnquiry.email}</div>
                </div>
                {selectedEnquiry.phone && (
                  <div>
                    <label className="text-sm font-semibold text-slate-600">Phone</label>
                    <div className="text-slate-900">{selectedEnquiry.phone}</div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-semibold text-slate-600">Subject</label>
                  <div className="text-slate-900">{selectedEnquiry.subject}</div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600">Message</label>
                  <div className="text-slate-900 whitespace-pre-wrap bg-slate-50 p-4 rounded">
                    {selectedEnquiry.message}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600">Status</label>
                  <div>{getStatusBadge(selectedEnquiry.status)}</div>
                </div>

                {hasPermission('website_enquiries:resolve') && selectedEnquiry.status !== 'closed' && (
                  <div className="flex gap-2 pt-4 border-t">
                    {selectedEnquiry.status !== 'replied' && (
                      <Button onClick={() => handleUpdateStatus('replied')} className="flex-1">
                        Mark as Replied
                      </Button>
                    )}
                    <Button onClick={() => handleUpdateStatus('closed')} variant="outline" className="flex-1">
                      Close Enquiry
                    </Button>
                  </div>
                )}
                {selectedEnquiry.status === 'closed' && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-slate-500 text-center italic">This enquiry has been closed.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
