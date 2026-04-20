'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const canView = hasPermission('view_enquiries') || hasPermission('manage_enquiries');
  const canManage = hasPermission('manage_enquiries');
  const [enquiries, setEnquiries] = useState<VendorEnquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedEnquiry, setSelectedEnquiry] = useState<VendorEnquiry | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this enquiry?')) return;
    setDeletingId(id);
    try {
      await enquiryService.deleteEnquiry(id);
      setEnquiries(prev => prev.filter(e => e.id !== id));
      showSuccessToast('Deleted', 'Enquiry deleted successfully.');
      setShowDetailModal(false);
    } catch (err: any) {
      showErrorToast('Delete Failed', err.message || 'Failed to delete enquiry.');
    } finally {
      setDeletingId(null);
    }
  };

  const stats = {
    total: enquiries.length,
    pending: enquiries.filter(e => e.status === 'pending').length,
    approved: enquiries.filter(e => e.status === 'approved').length,
    rejected: enquiries.filter(e => e.status === 'rejected').length
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendor Enquiry Forms</h1>
          <p className="text-gray-600">Manage vendor applications submitted through the website</p>
        </div>
        <button
          onClick={fetchEnquiries}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Enquiries</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-gray-700" />
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Approved</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.approved}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Rejected</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, company, email, or GST number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-500">Loading enquiries...</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
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
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    No enquiries found
                  </TableCell>
                </TableRow>
              ) : (
                enquiries.map((enquiry) => (
                  <TableRow key={enquiry.id}>
                    <TableCell>
                      <div className="font-medium text-gray-900">{enquiry.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{enquiry.companyName}</div>
                        <div className="text-gray-500 text-xs mt-1">GST: {enquiry.gstNumber}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="flex items-center gap-1 text-gray-700">
                          <Mail className="w-3 h-3" />
                          <span className="text-xs">{enquiry.email}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-700 mt-1">
                          <Phone className="w-3 h-3" />
                          <span className="text-xs">{enquiry.phone}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600">{formatDate(enquiry.createdAt)}</div>
                    </TableCell>
                    <TableCell>{getStatusBadge(enquiry.status)}</TableCell>
                    <TableCell>
                      {canView && (
                        <button
                          onClick={() => handleViewDetails(enquiry)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
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

      {/* Detail Modal */}
      {showDetailModal && selectedEnquiry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Vendor Enquiry Details</h2>
                <p className="text-sm text-gray-600 mt-1">Review and manage vendor application</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-6">
                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Current Status</label>
                  {getStatusBadge(selectedEnquiry.status)}
                </div>

                {/* Personal Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                    <div className="text-gray-900">{selectedEnquiry.name}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name</label>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Building2 className="w-4 h-4 text-gray-500" />
                      {selectedEnquiry.companyName}
                    </div>
                  </div>
                </div>

                {/* GST and Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">GST Number</label>
                    <div className="flex items-center gap-2 text-gray-900">
                      <FileText className="w-4 h-4 text-gray-500" />
                      {selectedEnquiry.gstNumber}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Mail className="w-4 h-4 text-gray-500" />
                      {selectedEnquiry.email}
                    </div>
                  </div>
                </div>

                {/* Phone and Website */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Phone className="w-4 h-4 text-gray-500" />
                      {selectedEnquiry.phone}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Website</label>
                    {selectedEnquiry.website ? (
                      <a
                        href={selectedEnquiry.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                      >
                        <Globe className="w-4 h-4" />
                        {selectedEnquiry.website}
                      </a>
                    ) : (
                      <div className="text-gray-500">Not provided</div>
                    )}
                  </div>
                </div>

                {/* Submission Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Submitted On</label>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Calendar className="w-4 h-4 text-gray-500" />
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
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              {/* Delete button on left */}
              {canManage ? (
                <button
                  onClick={() => handleDelete(selectedEnquiry.id)}
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
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
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
