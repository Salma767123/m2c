'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/UI/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/UI/Table'
import { Badge } from '@/components/UI/Badge'
import { LoadingSpinner } from '@/components/UI/LoadingSpinner'
import Dropdown from '@/components/UI/Dropdown'
import { Edit, Eye, CheckCircle, XCircle, Search, Filter, Plus, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import VendorService, { VendorProfile, VendorFilters } from '@/services/vendorService'

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
import { formatDate } from '@/lib/utils'
import RejectionModal from './RejectionModal'
import SuspensionModal from './SuspensionModal'
import { toast } from '@/hooks/use-toast'
import { hasPermission } from '@/lib/auth'

const getStatusBadge = (status: string) => {
  switch (status.toUpperCase()) {
    case 'APPROVED':
      return <Badge className="bg-green-100 text-green-800">Approved</Badge>
    case 'PENDING':
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
    case 'UNDER_REVIEW':
      return <Badge className="bg-blue-100 text-blue-800">Under Review</Badge>
    case 'SUSPENDED':
      return <Badge className="bg-gray-100 text-gray-800">Suspended</Badge>
    case 'REJECTED':
      return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
    case 'APPROVAL_PENDING':
      return <Badge className="bg-cyan-100 text-cyan-800">Approval Pending</Badge>
    case 'REJECTION_PENDING':
      return <Badge className="bg-orange-100 text-orange-800">Rejection Pending</Badge>
    case 'REINSPECTION':
      return <Badge className="bg-amber-100 text-amber-800">Re-Inspection</Badge>
    case 'SUBMITTED':
      return <Badge className="bg-blue-100 text-blue-800">Submitted</Badge>
    default:
      return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
  }
}

const getLocationString = (vendor: VendorProfile): string => {
  const parts = [vendor.businessCity, vendor.businessState, vendor.businessCountry]
    .filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'Not specified'
}

// Admin delivery rating aggregate. Backend computes the average over all
// admin reviews submitted for this vendor's orders; `ratingCount` is the
// sample size. Until the first admin review lands for a vendor, the field is
// null and the UI shows a "No reviews" placeholder.
const hasRating = (vendor: VendorProfile): boolean =>
  typeof vendor.rating === 'number' && (vendor.ratingCount ?? 0) > 0

export default function VendorsTable() {
  const [vendors, setVendors] = useState<VendorProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<VendorFilters>({
    page: 1,
    limit: 10
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectionModal, setRejectionModal] = useState<{ isOpen: boolean; vendor: VendorProfile | null }>({
    isOpen: false,
    vendor: null
  })
  const [suspensionModal, setSuspensionModal] = useState<{ isOpen: boolean; vendor: VendorProfile | null }>({
    isOpen: false,
    vendor: null
  })

  // Fetch vendors from backend
  const fetchVendors = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Debug: Check authentication
      const auth = VendorService.getStoredAuth ? VendorService.getStoredAuth() : null
      console.log('Auth check:', auth)
      
      const response = await VendorService.getAllVendors(filters)
      setVendors(response.vendors)
      setPagination(response.pagination)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch vendors'
      console.error('Fetch vendors error:', err)
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle search
  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm || undefined,
      page: 1
    }))
  }

  // Handle status filter
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status)
    setFilters(prev => ({
      ...prev,
      status: status ? status as any : undefined,
      page: 1
    }))
  }

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }))
  }

  // Handle vendor approval
  const handleApproveVendor = async (vendorId: string) => {
    try {
      setActionLoading(vendorId)
      await VendorService.approveVendor(vendorId)
      
      toast({
        title: 'Success',
        description: 'Vendor approved successfully'
      })
      
      // Refresh the vendors list
      fetchVendors()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve vendor'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  // Handle vendor rejection
  const handleRejectVendor = (vendor: VendorProfile) => {
    setRejectionModal({ isOpen: true, vendor })
  }

  // Handle rejection confirmation
  const handleRejectConfirm = async (reason: string) => {
    if (!rejectionModal.vendor) return

    try {
      setActionLoading(rejectionModal.vendor.id)
      await VendorService.rejectVendor(rejectionModal.vendor.id, reason)
      
      toast({
        title: 'Success',
        description: 'Vendor rejected successfully'
      })
      
      // Refresh the vendors list
      fetchVendors()
      setRejectionModal({ isOpen: false, vendor: null })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject vendor'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  // Handle vendor suspension
  const handleSuspendVendor = (vendor: VendorProfile) => {
    setSuspensionModal({ isOpen: true, vendor })
  }

  // Handle suspension confirmation
  const handleSuspendConfirm = async (reason: string) => {
    if (!suspensionModal.vendor) return

    try {
      setActionLoading(suspensionModal.vendor.id)
      await VendorService.suspendVendor(suspensionModal.vendor.id, reason)
      
      toast({
        title: 'Success',
        description: 'Vendor suspended successfully'
      })
      
      // Refresh the vendors list
      fetchVendors()
      setSuspensionModal({ isOpen: false, vendor: null })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to suspend vendor'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  // Fetch vendors on component mount and when filters change
  useEffect(() => {
    fetchVendors()
  }, [filters])

  if (loading && vendors.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Vendors Management</CardTitle>
          {hasPermission('create_vendors') && (
            <Link href="/admin/dashboard/vendors/add">
              <Button className="bg-[#313131] text-white hover:bg-[#222222]">
                <Plus className="h-4 w-4 mr-2" />
                Add Vendor
              </Button>
            </Link>
          )}
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="min-w-[150px]">
              <Dropdown
                value={statusFilter}
                options={[
                  { value: '', label: 'All Status' },
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'UNDER_REVIEW', label: 'Under Review' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'REJECTED', label: 'Rejected' },
                  { value: 'APPROVAL_PENDING', label: 'Approval Pending' },
                  { value: 'REJECTION_PENDING', label: 'Rejection Pending' },
                  { value: 'REINSPECTION', label: 'Re-Inspection' },
                  { value: 'SUSPENDED', label: 'Suspended' }
                ]}
                placeholder="All Status"
                onChange={(value) => handleStatusFilter(value as string)}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No vendors found matching your criteria.
          </div>
        ) : (
          <>
            {/* Results summary */}
            <div className="flex items-center justify-between gap-4 flex-wrap text-sm text-slate-600 mb-2">
              <span>
                Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} vendor{pagination.total === 1 ? '' : 's'}
              </span>
            </div>
            <Table>
              <TableHeader className='bg-[#313131] text-white rounded-t-lg'>
                <TableRow>
                  <TableHead className="text-white">Vendor</TableHead>
                  <TableHead className="text-white">Location</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white">Completion</TableHead>
                  <TableHead className="text-white">Rating</TableHead>
                  <TableHead className="text-white">Join Date</TableHead>
                  <TableHead className="text-white">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{vendor.companyName}</div>
                        <div className="text-sm text-gray-500">{vendor.email}</div>
                        <div className="text-xs text-gray-400">{vendor.ownerName}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getLocationString(vendor)}</TableCell>
                    <TableCell>
                      {getStatusBadge(vendor.status)}
                      {vendor.status === 'APPROVAL_PENDING' && vendor.approvalRequestedByName && (
                        <p className="text-xs text-cyan-600 mt-1">by {vendor.approvalRequestedByName}</p>
                      )}
                      {vendor.status === 'REJECTION_PENDING' && vendor.rejectionRequestedByName && (
                        <p className="text-xs text-orange-600 mt-1">by {vendor.rejectionRequestedByName}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const pct = vendor.completionPercentage ?? 0;
                        const color = pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-orange-400';
                        return (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`text-xs font-semibold ${pct === 100 ? 'text-green-600' : pct >= 50 ? 'text-blue-600' : 'text-orange-500'}`}>
                              {pct}%
                            </span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {hasRating(vendor) ? (
                        <div className="flex items-center" title={`Based on ${vendor.ratingCount} admin review${(vendor.ratingCount ?? 0) === 1 ? '' : 's'}`}>
                          <span className="text-yellow-400">★</span>
                          <span className="ml-1 font-medium">{vendor.rating?.toFixed(1)}</span>
                          <span className="ml-1 text-xs text-gray-500">({vendor.ratingCount})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No reviews yet</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(vendor.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {hasPermission('view_vendors') && (
                          <Link href={`/admin/dashboard/vendors/view/${vendor.id}`}>
                            <Button variant="ghost" size="sm" title="View Details">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                        {hasPermission('edit_vendors') && (
                          <Link href={`/admin/dashboard/vendors/edit/${vendor.id}`}>
                            <Button variant="ghost" size="sm" title="Edit Vendor">
                              <Edit className="h-4 w-4 text-blue-500" />
                            </Button>
                          </Link>
                        )}
                        {(vendor.status === 'PENDING' || vendor.status === 'UNDER_REVIEW') && hasPermission('edit_vendors') && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:bg-green-50"
                              title="Approve Vendor"
                              onClick={() => handleApproveVendor(vendor.id)}
                              disabled={actionLoading === vendor.id}
                            >
                              {actionLoading === vendor.id ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:bg-red-50"
                              title="Reject Vendor"
                              onClick={() => handleRejectVendor(vendor)}
                              disabled={actionLoading === vendor.id}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {vendor.status === 'APPROVED' && hasPermission('edit_vendors') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-orange-600 hover:bg-orange-50"
                            title="Suspend Vendor"
                            onClick={() => handleSuspendVendor(vendor)}
                            disabled={actionLoading === vendor.id}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {vendor.status === 'APPROVAL_PENDING' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:bg-green-50"
                              title="Confirm Approval"
                              onClick={async () => {
                                if (!confirm('Confirm approval? Credentials will be sent to the vendor.')) return;
                                try {
                                  setActionLoading(vendor.id);
                                  await VendorService.confirmApproval(vendor.id);
                                  toast({ title: 'Approval Confirmed', description: 'Vendor approved and credentials sent.' });
                                  fetchVendors();
                                } catch (err: any) {
                                  toast({ title: 'Error', description: err?.response?.data?.error || 'Failed to confirm approval', variant: 'destructive' });
                                } finally {
                                  setActionLoading(null);
                                }
                              }}
                              disabled={actionLoading === vendor.id}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-orange-600 hover:bg-orange-50"
                              title="Cancel Approval — Restore to Pending"
                              onClick={async () => {
                                if (!confirm('Cancel this approval? Vendor will be restored to Pending.')) return;
                                try {
                                  setActionLoading(vendor.id);
                                  await VendorService.cancelApproval(vendor.id);
                                  toast({ title: 'Approval Cancelled', description: 'Vendor restored to Pending.' });
                                  fetchVendors();
                                } catch (err: any) {
                                  toast({ title: 'Error', description: err?.response?.data?.error || 'Failed to cancel approval', variant: 'destructive' });
                                } finally {
                                  setActionLoading(null);
                                }
                              }}
                              disabled={actionLoading === vendor.id}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {vendor.status === 'REJECTION_PENDING' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:bg-red-50"
                              title="Confirm Rejection"
                              onClick={async () => {
                                if (!confirm('Confirm rejection? Rejection email will be sent to the vendor.')) return;
                                try {
                                  setActionLoading(vendor.id);
                                  await VendorService.confirmRejection(vendor.id);
                                  toast({ title: 'Rejection Confirmed', description: 'Vendor has been rejected and notified.' });
                                  fetchVendors();
                                } catch (err: any) {
                                  toast({ title: 'Error', description: err?.response?.data?.error || 'Failed to confirm rejection', variant: 'destructive' });
                                } finally {
                                  setActionLoading(null);
                                }
                              }}
                              disabled={actionLoading === vendor.id}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:bg-green-50"
                              title="Cancel Rejection — Restore to Pending"
                              onClick={async () => {
                                if (!confirm('Cancel this rejection? Vendor will be restored to Pending status.')) return;
                                try {
                                  setActionLoading(vendor.id);
                                  await VendorService.cancelRejection(vendor.id);
                                  toast({ title: 'Rejection Cancelled', description: 'Vendor restored to Pending.' });
                                  fetchVendors();
                                } catch (err: any) {
                                  toast({ title: 'Error', description: err?.response?.data?.error || 'Failed to cancel rejection', variant: 'destructive' });
                                } finally {
                                  setActionLoading(null);
                                }
                              }}
                              disabled={actionLoading === vendor.id}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-end gap-3 text-sm mt-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {getPageRange(pagination.page, pagination.pages).map((p, i) =>
                    p === '…' ? (
                      <span key={`e-${i}`} className="px-2 text-slate-400">…</span>
                    ) : (
                      <button
                        key={`p-${p}`}
                        onClick={() => handlePageChange(p as number)}
                        aria-current={p === pagination.page ? 'page' : undefined}
                        className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === pagination.page ? 'bg-[#222222] text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Rejection Modal */}
      <RejectionModal
        isOpen={rejectionModal.isOpen}
        onClose={() => setRejectionModal({ isOpen: false, vendor: null })}
        onConfirm={handleRejectConfirm}
        vendor={rejectionModal.vendor ? {
          id: rejectionModal.vendor.id,
          companyName: rejectionModal.vendor.companyName,
          ownerName: rejectionModal.vendor.ownerName,
          email: rejectionModal.vendor.email
        } : null}
        isLoading={actionLoading === rejectionModal.vendor?.id}
      />

      {/* Suspension Modal */}
      <SuspensionModal
        isOpen={suspensionModal.isOpen}
        onClose={() => setSuspensionModal({ isOpen: false, vendor: null })}
        onConfirm={handleSuspendConfirm}
        vendor={suspensionModal.vendor ? {
          id: suspensionModal.vendor.id,
          companyName: suspensionModal.vendor.companyName,
          ownerName: suspensionModal.vendor.ownerName,
          email: suspensionModal.vendor.email,
          status: suspensionModal.vendor.status
        } : null}
        isLoading={actionLoading === suspensionModal.vendor?.id}
      />
    </Card>
  )
}