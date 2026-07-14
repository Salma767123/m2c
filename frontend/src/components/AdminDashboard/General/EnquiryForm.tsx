'use client';

import { useState, useEffect, useCallback } from 'react';
import { toExternalUrl } from '@/lib/utils';
import {
  Search,
  Eye,
  Mail,
  Phone,
  Building2,
  FileText,
  Globe,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  X,
  Loader2,
  RefreshCw,
  Trash2
} from 'lucide-react';
import Dropdown from '@/components/UI/Dropdown';
import DeleteConfirmModal from '@/components/UI/DeleteConfirmModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/UI/Table';
import { enquiryService, type VendorEnquiry } from '@/services/enquiryService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { hasPermission } from '@/lib/auth';

const EnquiryForm = () => {
  const canView = hasPermission('vendor_enquiries:view');
  const canManage = hasPermission('vendor_enquiries:approve');
  const canDelete = hasPermission('vendor_enquiries:delete');
  const [enquiries, setEnquiries] = useState<VendorEnquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedEnquiry, setSelectedEnquiry] = useState<VendorEnquiry | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; id: string; name: string } | null>(null);

  const fetchEnquiries = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await enquiryService.getAllEnquiries({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchTerm || undefined
      });
      setEnquiries(res.data);
    } catch (err: any) {
      showErrorToast('Error', err.message || 'Failed to load enquiries');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(fetchEnquiries, 300);
    return () => clearTimeout(timer);
  }, [fetchEnquiries]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewDetails = (enquiry: VendorEnquiry) => {
    setSelectedEnquiry(enquiry);
    setShowDetailModal(true);
  };

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      const res = await enquiryService.approveEnquiry(id);
      // Update local state
      setEnquiries(prev => prev.map(e => e.id === id ? { ...e, status: 'approved' as const } : e));
      if (selectedEnquiry?.id === id) {
        setSelectedEnquiry(prev => prev ? { ...prev, status: 'approved' } : null);
      }
      showSuccessToast('Email Sent!', res.message || 'Approval email sent with registration link.');
      setShowDetailModal(false);
    } catch (err: any) {
      showErrorToast('Approval Failed', err.message || 'Failed to approve. Check SMTP configuration.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setRejectingId(id);
    try {
      const res = await enquiryService.rejectEnquiry(id);
      setEnquiries(prev => prev.map(e => e.id === id ? { ...e, status: 'rejected' as const } : e));
      if (selectedEnquiry?.id === id) {
        setSelectedEnquiry(prev => prev ? { ...prev, status: 'rejected' } : null);
      }
      showSuccessToast('Rejected', res.message || 'Enquiry has been rejected.');
      setShowDetailModal(false);
    } catch (err: any) {
      showErrorToast('Rejection Failed', err.message || 'Failed to reject enquiry.');
    } finally {
      setRejectingId(null);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteModal({ show: true, id, name });
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    setDeletingId(deleteModal.id);
    try {
      await enquiryService.deleteEnquiry(deleteModal.id);
      setEnquiries(prev => prev.filter(e => e.id !== deleteModal.id));
      showSuccessToast('Deleted', 'Enquiry deleted successfully.');
      setShowDetailModal(false);
    } catch (err: any) {
      showErrorToast('Delete Failed', err.message || 'Failed to delete enquiry.');
    } finally {
      setDeletingId(null);
      setDeleteModal(null);
    }
  };

  const stats = {
    total: enquiries.length,
    pending: enquiries.filter(e => e.status === 'pending').length,
    approved: enquiries.filter(e => e.status === 'approved').length,
    rejected: enquiries.filter(e => e.status === 'rejected').length
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Vendor Enquiry Forms</h1>
          <p className="text-slate-600">Manage vendor applications submitted through the website</p>
        </div>
        <button
          onClick={fetchEnquiries}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-sm font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Total Enquiries</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-slate-700" />
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Approved</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.approved}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Rejected</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, company, email, or GST number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500/40 focus:border-transparent"
            />
          </div>
          <div className="w-full md:w-48">
            <Dropdown
              value={statusFilter}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' }
              ]}
              onChange={(value) => setStatusFilter(value as any)}
              placeholder="Filter by status"
            />
          </div>
        </div>
      </div>

      {/* Enquiries Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            <span className="ml-3 text-slate-500">Loading enquiries...</span>
          </div>
        ) : (
          <Table>
            <TableHeader className="!bg-brand-500/[0.06] !border-0 [&_tr]:border-b [&_tr]:border-brand-100/50 [&_th]:!text-brand-500/60 [&_th]:font-bold [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:h-11">
              <TableRow>
                <TableHead>Vendor Details</TableHead>
                <TableHead>Company Info</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enquiries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                    No enquiries found
                  </TableCell>
                </TableRow>
              ) : (
                enquiries.map((enquiry) => (
                  <TableRow key={enquiry.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900">{enquiry.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium text-slate-900">{enquiry.companyName}</div>
                        <div className="text-slate-500 text-xs mt-1">GST: {enquiry.gstNumber}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="flex items-center gap-1 text-slate-700">
                          <Mail className="w-3 h-3" />
                          <span className="text-xs">{enquiry.email}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-700 mt-1">
                          <Phone className="w-3 h-3" />
                          <span className="text-xs">{enquiry.phone}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-600">{formatDate(enquiry.createdAt)}</div>
                    </TableCell>
                    <TableCell>{getStatusBadge(enquiry.status)}</TableCell>
                    <TableCell>
                      {canView && (
                        <button
                          onClick={() => handleViewDetails(enquiry)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        show={!!deleteModal?.show}
        title="Delete Enquiry"
        itemName={deleteModal?.name}
        loading={!!deletingId}
        confirmLabel="Delete Permanently"
        loadingLabel="Deleting..."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal(null)}
      />

      {/* Detail Modal */}
      {showDetailModal && selectedEnquiry && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Vendor Enquiry Details</h2>
                <p className="text-sm text-slate-600 mt-1">Review and manage vendor application</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-6">
                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Current Status</label>
                  {getStatusBadge(selectedEnquiry.status)}
                </div>

                {/* Personal Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                    <div className="text-slate-900">{selectedEnquiry.name}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Company Name</label>
                    <div className="flex items-center gap-2 text-slate-900">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      {selectedEnquiry.companyName}
                    </div>
                  </div>
                </div>

                {/* GST and Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">GST Number</label>
                    <div className="flex items-center gap-2 text-slate-900">
                      <FileText className="w-4 h-4 text-slate-500" />
                      {selectedEnquiry.gstNumber}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                    <div className="flex items-center gap-2 text-slate-900">
                      <Mail className="w-4 h-4 text-slate-500" />
                      {selectedEnquiry.email}
                    </div>
                  </div>
                </div>

                {/* Phone and Website */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
                    <div className="flex items-center gap-2 text-slate-900">
                      <Phone className="w-4 h-4 text-slate-500" />
                      {selectedEnquiry.phone}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Website</label>
                    {toExternalUrl(selectedEnquiry.website) ? (
                      <a
                        href={toExternalUrl(selectedEnquiry.website)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                      >
                        <Globe className="w-4 h-4" />
                        {selectedEnquiry.website}
                      </a>
                    ) : (
                      <div className="text-slate-500">Not provided</div>
                    )}
                  </div>
                </div>

                {/* Submission Date */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Submitted On</label>
                  <div className="flex items-center gap-2 text-slate-900">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    {formatDate(selectedEnquiry.createdAt)}
                  </div>
                </div>

                {/* Approval info box */}
                {selectedEnquiry.status === 'pending' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>📧 On Approve:</strong> A registration link will be sent to{' '}
                      <strong>{selectedEnquiry.email}</strong>, allowing them to create their vendor account.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
              {/* Delete button on left */}
              {canDelete ? (
                <button
                  onClick={() => handleDeleteClick(selectedEnquiry.id, selectedEnquiry.name)}
                  disabled={!!deletingId}
                  className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {deletingId === selectedEnquiry.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete
                </button>
              ) : <div />}

              {/* Action buttons on right */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
                >
                  Close
                </button>
                {selectedEnquiry.status === 'pending' && canManage && (
                  <>
                    <button
                      onClick={() => handleReject(selectedEnquiry.id)}
                      disabled={!!rejectingId || !!approvingId}
                      className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {rejectingId === selectedEnquiry.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      {rejectingId === selectedEnquiry.id ? 'Rejecting...' : 'Reject'}
                    </button>
                    <button
                      onClick={() => handleApprove(selectedEnquiry.id)}
                      disabled={!!approvingId || !!rejectingId}
                      className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {approvingId === selectedEnquiry.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending Mail...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          Approve & Send Link
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnquiryForm;
