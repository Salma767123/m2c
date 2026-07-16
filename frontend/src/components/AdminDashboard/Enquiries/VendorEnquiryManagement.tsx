'use client';

import { useState, useEffect } from 'react';
import { toExternalUrl } from '@/lib/utils';
import { enquiryService, VendorEnquiry } from '@/services/enquiryService';
import { Card, CardContent } from '@/components/UI/Card';
import { Badge } from '@/components/UI/Badge';
import { Button } from '@/components/UI/Button';
import DeleteConfirmModal from '@/components/UI/DeleteConfirmModal';
import Dropdown from '@/components/UI/Dropdown';
import DateRangeCalendar, { fmtDate } from '@/components/Shared/DateRangeCalendar';
import { Mail, Phone, Building2, FileText, Eye, Trash2, CheckCircle, XCircle, Search, Globe, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { hasPermission } from '@/lib/auth';

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

export default function VendorEnquiryManagement() {
  const [enquiries, setEnquiries] = useState<VendorEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnquiry, setSelectedEnquiry] = useState<VendorEnquiry | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; type: 'approve' | 'reject' | 'delete'; id: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch the FULL enquiry set so the metric cards reflect global totals.
  // Search + status + date filtering is applied client-side below.
  useEffect(() => {
    fetchEnquiries();
  }, []);

  // Reset to first page whenever the client-side search/filter changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm, dateFrom, dateTo]);

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      const response = await enquiryService.getAllEnquiries({});
      setEnquiries(response.data);
    } catch (error: any) {
      showErrorToast('Error', error.message || 'Failed to fetch enquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleViewEnquiry = (enquiry: VendorEnquiry) => {
    setSelectedEnquiry(enquiry);
    setShowModal(true);
  };

  const handleApproveClick = (id: string, name: string) => {
    setConfirmModal({ show: true, type: 'approve', id, name });
  };

  const handleRejectClick = (id: string, name: string) => {
    setConfirmModal({ show: true, type: 'reject', id, name });
  };

  const handleDeleteClick = (id: string, name: string) => {
    setConfirmModal({ show: true, type: 'delete', id, name });
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    setActionLoading(true);
    try {
      if (confirmModal.type === 'approve') {
        await enquiryService.approveEnquiry(confirmModal.id);
        showSuccessToast('Success', 'Vendor enquiry approved and registration email sent');
        setShowModal(false);
      } else if (confirmModal.type === 'reject') {
        await enquiryService.rejectEnquiry(confirmModal.id);
        showSuccessToast('Success', 'Vendor enquiry rejected');
        setShowModal(false);
      } else {
        await enquiryService.deleteEnquiry(confirmModal.id);
        showSuccessToast('Success', 'Enquiry deleted');
      }
      fetchEnquiries();
    } catch (error: any) {
      const action = confirmModal.type === 'approve' ? 'approve' : confirmModal.type === 'reject' ? 'reject' : 'delete';
      showErrorToast('Error', error.message || `Failed to ${action} enquiry`);
    } finally {
      setActionLoading(false);
      setConfirmModal(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      approved: 'bg-green-50 text-green-700 border border-green-200',
      rejected: 'bg-red-50 text-red-700 border border-red-200'
    };
    return <Badge className={`${styles[status as keyof typeof styles]} text-xs`}>{status.toUpperCase()}</Badge>;
  };

  const stats = {
    total: enquiries.length,
    pending: enquiries.filter(e => e.status === 'pending').length,
    approved: enquiries.filter(e => e.status === 'approved').length,
    rejected: enquiries.filter(e => e.status === 'rejected').length
  };

  // Client-side search + status + created-date filtering (stats stay global).
  const filteredEnquiries = enquiries.filter((e) => {
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      const hay = `${e.name} ${e.companyName} ${e.email} ${e.phone} ${e.gstNumber}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (dateFrom || dateTo) {
      const d = e.createdAt ? fmtDate(new Date(e.createdAt)) : '';
      if (!d) return false;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredEnquiries.length / PAGE_SIZE);
  const paginatedItems = filteredEnquiries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Metric cards — styled like the Vendor Product Requests module; click to filter.
  const metricCards = [
    { key: 'all',      label: 'Total',    subtitle: 'All enquiries',   value: stats.total,    Icon: FileText,    iconBg: 'bg-brand-50',   iconColor: 'text-brand-500',   countColor: 'text-slate-900',   activeClass: 'border-brand-400 bg-brand-50/50' },
    { key: 'pending',  label: 'Pending',  subtitle: 'Awaiting review', value: stats.pending,  Icon: Clock,       iconBg: 'bg-amber-50',   iconColor: 'text-amber-500',   countColor: 'text-amber-700',   activeClass: 'border-amber-400 bg-amber-50/60' },
    { key: 'approved', label: 'Approved', subtitle: 'Registered',      value: stats.approved, Icon: CheckCircle, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', countColor: 'text-emerald-700', activeClass: 'border-emerald-400 bg-emerald-50/60' },
    { key: 'rejected', label: 'Rejected', subtitle: 'Declined',        value: stats.rejected, Icon: XCircle,     iconBg: 'bg-red-50',     iconColor: 'text-red-500',     countColor: 'text-red-700',     activeClass: 'border-red-400 bg-red-50/60' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Vendor Enquiries</h1>
        <p className="text-slate-600">Manage vendor registration requests</p>
      </div>

      {/* Stats Cards — click a card to filter the table below by that status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map(({ key, label, subtitle, value, Icon, iconBg, iconColor, countColor, activeClass }) => {
          const isActive = statusFilter === key;
          const toggle = () => setStatusFilter((prev) => (prev === key ? 'all' : key));
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
                  placeholder="Search by name, company, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500/40"
                />
              </div>
            </div>
            <div className="shrink-0">
              <DateRangeCalendar
                from={dateFrom}
                to={dateTo}
                placeholder="Enquiry Date"
                onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
              />
            </div>
            <div className="w-full md:w-64">
              <Dropdown
                value={statusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' },
                ]}
                onChange={(value) => setStatusFilter(value as string)}
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
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Owner Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">GST Number</th>
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
                        <div className="text-sm text-slate-900">{enquiry.companyName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="flex items-center gap-1 text-slate-600">
                            <Mail className="w-3 h-3" />
                            {enquiry.email}
                          </div>
                          <div className="flex items-center gap-1 text-slate-600 mt-1">
                            <Phone className="w-3 h-3" />
                            {enquiry.phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">{enquiry.gstNumber}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(enquiry.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(enquiry.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          {hasPermission('vendor_enquiries:view') && (
                            <button
                              onClick={() => handleViewEnquiry(enquiry)}
                              title="View Details"
                              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {enquiry.status === 'pending' && hasPermission('vendor_enquiries:approve') && (
                            <>
                              <button
                                onClick={() => handleApproveClick(enquiry.id, enquiry.name)}
                                title="Approve"
                                className="p-2 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRejectClick(enquiry.id, enquiry.name)}
                                title="Reject"
                                className="p-2 rounded-lg text-orange-500 hover:text-orange-700 hover:bg-orange-50 transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {hasPermission('vendor_enquiries:delete') && (
                            <button
                              onClick={() => handleDeleteClick(enquiry.id, enquiry.name)}
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

      {/* Confirm Action Modal */}
      <DeleteConfirmModal
        show={!!confirmModal?.show}
        variant={confirmModal?.type === 'approve' ? 'confirm' : confirmModal?.type === 'reject' ? 'warning' : 'danger'}
        title={confirmModal?.type === 'approve' ? 'Approve Vendor Enquiry' : confirmModal?.type === 'reject' ? 'Reject Vendor Enquiry' : 'Delete Enquiry'}
        subtitle={confirmModal?.type === 'approve' ? 'This will send a registration email' : undefined}
        itemName={confirmModal?.name}
        loading={actionLoading}
        confirmLabel={confirmModal?.type === 'approve' ? 'Approve' : confirmModal?.type === 'reject' ? 'Reject' : 'Delete Permanently'}
        loadingLabel={confirmModal?.type === 'approve' ? 'Approving...' : confirmModal?.type === 'reject' ? 'Rejecting...' : 'Deleting...'}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmModal(null)}
      />

      {/* View Modal */}
      {showModal && selectedEnquiry && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">Vendor Enquiry Details</h2>
                <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-700">
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-600">Owner Name</label>
                  <div className="text-slate-900">{selectedEnquiry.name}</div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600">Company Name</label>
                  <div className="text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    {selectedEnquiry.companyName}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600">GST Number</label>
                  <div className="text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    {selectedEnquiry.gstNumber}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600">Email</label>
                  <div className="text-slate-900 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-500" />
                    {selectedEnquiry.email}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600">Phone</label>
                  <div className="text-slate-900 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-500" />
                    {selectedEnquiry.phone}
                  </div>
                </div>
                {selectedEnquiry.website && (
                  <div>
                    <label className="text-sm font-semibold text-slate-600">Website</label>
                    <div className="text-slate-900 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-slate-500" />
                      {toExternalUrl(selectedEnquiry.website) ? (
                        <a href={toExternalUrl(selectedEnquiry.website)!} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {selectedEnquiry.website}
                        </a>
                      ) : (
                        <span>{selectedEnquiry.website}</span>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-semibold text-slate-600">Status</label>
                  <div>{getStatusBadge(selectedEnquiry.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600">Submitted On</label>
                  <div className="text-slate-900">{new Date(selectedEnquiry.createdAt).toLocaleString()}</div>
                </div>

                {selectedEnquiry.status === 'pending' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button onClick={() => handleApproveClick(selectedEnquiry.id, selectedEnquiry.name)} className="flex-1 bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve & Send Email
                    </Button>
                    <Button onClick={() => handleRejectClick(selectedEnquiry.id, selectedEnquiry.name)} variant="outline" className="flex-1 border-red-600 text-red-600 hover:bg-red-50">
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
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
