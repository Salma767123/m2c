'use client';

import { useState, useEffect } from 'react';
import { contactEnquiryService, ContactEnquiry } from '@/services/contactEnquiryService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Badge } from '@/components/UI/Badge';
import { Button } from '@/components/UI/Button';
import { Mail, Phone, Calendar, Eye, Trash2, MessageSquare, Search, Filter } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { hasPermission } from '@/lib/auth';

export default function WebsiteEnquiryManagement() {
  const [enquiries, setEnquiries] = useState<ContactEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnquiry, setSelectedEnquiry] = useState<ContactEnquiry | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, new: 0, read: 0, replied: 0, closed: 0 });

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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this enquiry?')) return;

    try {
      await contactEnquiryService.deleteEnquiry(id);
      showSuccessToast('Success', 'Enquiry deleted');
      fetchEnquiries();
      fetchStats();
    } catch (error: any) {
      showErrorToast('Error', error.message || 'Failed to delete enquiry');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      new: 'bg-blue-100 text-blue-800',
      read: 'bg-yellow-100 text-yellow-800',
      replied: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return <Badge className={`${styles[status as keyof typeof styles]} text-xs`}>{status.toUpperCase()}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Website Enquiries</h1>
        <p className="text-gray-600">Manage contact form submissions from website visitors</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'bg-gray-100' },
          { label: 'New', value: stats.new, color: 'bg-blue-100' },
          { label: 'Read', value: stats.read, color: 'bg-yellow-100' },
          { label: 'Replied', value: stats.replied, color: 'bg-green-100' },
          { label: 'Closed', value: stats.closed, color: 'bg-gray-100' }
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
                  placeholder="Search by name, email, subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="replied">Replied</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Enquiries Table */}
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
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {enquiries.map((enquiry) => (
                    <tr key={enquiry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{enquiry.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Mail className="w-3 h-3" />
                            {enquiry.email}
                          </div>
                          {enquiry.phone && (
                            <div className="flex items-center gap-1 text-gray-600 mt-1">
                              <Phone className="w-3 h-3" />
                              {enquiry.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">{enquiry.subject}</div>
                      </td>
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
                          {hasPermission('manage_enquiries') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(enquiry.id)}
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

      {/* View Modal */}
      {showModal && selectedEnquiry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">Enquiry Details</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600">Name</label>
                  <div className="text-gray-900">{selectedEnquiry.name}</div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Email</label>
                  <div className="text-gray-900">{selectedEnquiry.email}</div>
                </div>
                {selectedEnquiry.phone && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Phone</label>
                    <div className="text-gray-900">{selectedEnquiry.phone}</div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-semibold text-gray-600">Subject</label>
                  <div className="text-gray-900">{selectedEnquiry.subject}</div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Message</label>
                  <div className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded">
                    {selectedEnquiry.message}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Status</label>
                  <div>{getStatusBadge(selectedEnquiry.status)}</div>
                </div>

                {hasPermission('manage_enquiries') && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button onClick={() => handleUpdateStatus('replied')} className="flex-1">
                      Mark as Replied
                    </Button>
                    <Button onClick={() => handleUpdateStatus('closed')} variant="outline" className="flex-1">
                      Close Enquiry
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
