'use client';

import { useState, useEffect } from 'react';
import { enquiryService, VendorEnquiry } from '@/services/enquiryService';
import { Card, CardContent } from '@/components/UI/Card';
import { Badge } from '@/components/UI/Badge';
import { Button } from '@/components/UI/Button';
import DeleteConfirmModal from '@/components/UI/DeleteConfirmModal';
import Dropdown from '@/components/UI/Dropdown';
import { Mail, Phone, Building2, FileText, Eye, Trash2, CheckCircle, XCircle, Search, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; type: 'approve' | 'reject' | 'delete'; id: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchEnquiries();
  }, [statusFilter, searchTerm]);

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      const response = await enquiryService.getAllEnquiries({
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
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return <Badge className={`${styles[status as keyof typeof styles]} text-xs`}>{status.toUpperCase()}</Badge>;
  };

  const stats = {
    total: enquiries.length,
    pending: enquiries.filter(e => e.status === 'pending').length,
    approved: enquiries.filter(e => e.status === 'approved').length,
    rejected: enquiries.filter(e => e.status === 'rejected').length
  };

  const totalPages = Math.ceil(enquiries.length / PAGE_SIZE);
  const paginatedItems = enquiries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendor Enquiries</h1>
        <p className="text-gray-600">Manage vendor registration requests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'bg-gray-100' },
          { label: 'Pending', value: stats.pending, color: 'bg-yellow-100' },
          { label: 'Approved', value: stats.approved, color: 'bg-green-100' },
          { label: 'Rejected', value: stats.rejected, color: 'bg-red-100' }
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">{stat.label}</div>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, company, email..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                />
              </div>
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
                onChange={(value) => { setStatusFilter(value as string); setCurrentPage(1); }}
                placeholder="Filter by Status"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enquiries Table */}
      {enquiries.length > 0 && (
        <p className="text-sm text-slate-600">
          Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, enquiries.length)} of {enquiries.length}
        </p>
      )}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : enquiries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No enquiries found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800 text-white">
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
                <tbody className="divide-y divide-gray-200">
                  {paginatedItems.map((enquiry) => (
                    <tr key={enquiry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{enquiry.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{enquiry.companyName}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Mail className="w-3 h-3" />
                            {enquiry.email}
                          </div>
                          <div className="flex items-center gap-1 text-gray-600 mt-1">
                            <Phone className="w-3 h-3" />
                            {enquiry.phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{enquiry.gstNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(enquiry.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(enquiry.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {hasPermission(['view_enquiries', 'manage_enquiries']) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewEnquiry(enquiry)}
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          {enquiry.status === 'pending' && hasPermission('manage_enquiries') && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleApproveClick(enquiry.id, enquiry.name)}
                                className="text-green-600 hover:text-green-700"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRejectClick(enquiry.id, enquiry.name)}
                                className="text-red-600 hover:text-red-700"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {hasPermission('manage_enquiries') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteClick(enquiry.id, enquiry.name)}
                              className="text-red-600 hover:text-red-700"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
            {getPageRange(currentPage, totalPages).map((p, i) => p === '…' ? (<span key={`e-${i}`} className="px-2 text-slate-400">…</span>) : (<button key={`p-${p}`} onClick={() => setCurrentPage(p as number)} aria-current={p === currentPage ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-[#222222] text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">Vendor Enquiry Details</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600">Owner Name</label>
                  <div className="text-gray-900">{selectedEnquiry.name}</div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Company Name</label>
                  <div className="text-gray-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    {selectedEnquiry.companyName}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">GST Number</label>
                  <div className="text-gray-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    {selectedEnquiry.gstNumber}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Email</label>
                  <div className="text-gray-900 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    {selectedEnquiry.email}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Phone</label>
                  <div className="text-gray-900 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    {selectedEnquiry.phone}
                  </div>
                </div>
                {selectedEnquiry.website && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Website</label>
                    <div className="text-gray-900 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-500" />
                      <a href={selectedEnquiry.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {selectedEnquiry.website}
                      </a>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-semibold text-gray-600">Status</label>
                  <div>{getStatusBadge(selectedEnquiry.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Submitted On</label>
                  <div className="text-gray-900">{new Date(selectedEnquiry.createdAt).toLocaleString()}</div>
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
