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
import { Edit, Eye, CheckCircle, XCircle, Search, Filter, Plus } from 'lucide-react'
import VendorService, { VendorProfile, VendorFilters } from '@/services/vendorService'
import { formatDate } from '@/lib/utils'
import RejectionModal from './SimpleRejectionModal'
import SuspensionModal from './SimpleSuspensionModal'
import { toast } from '@/hooks/use-toast'

const getStatusBadge = (status: string) => {
  switch (status.toUpperCase()) {
    case 'APPROVED':
      return <Badge className="bg-green-100 text-green-800">Active</Badge>
    case 'PENDING':
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
    case 'SUSPENDED':
      return <Badge className="bg-gray-100 text-gray-800">Suspended</Badge>
    case 'REJECTED':
      return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
    default:
      return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
  }
}

const getLocationString = (vendor: VendorProfile): string => {
  const parts = [vendor.businessCity, vendor.businessState, vendor.businessCountry]
    .filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'Not specified'
}

const getProductCount = (vendor: VendorProfile): number => {
  return vendor.productCategories?.length || 0
}

const getRevenue = (vendor: VendorProfile): string => {
  if (vendor.annualTurnover) {
    return vendor.annualTurnover
  }
  return 'N/A'
}

const getRating = (vendor: VendorProfile): number => {
  // For now, return a default rating since it's not in the backend model
  // This could be calculated based on reviews/feedback in the future
  return 4.5
}

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
          <Link href="/admin/dashboard/vendors/add">
            <Button className="bg-[#313131] text-white hover:bg-[#222222]">
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
          </Link>
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
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            
            <Button onClick={handleSearch} variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
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
            <Table>
              <TableHeader className='bg-[#313131] text-white rounded-t-lg'>
                <TableRow>
                  <TableHead className="text-white">Vendor</TableHead>
                  <TableHead className="text-white">Location</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white">Products</TableHead>
                  <TableHead className="text-white">Revenue</TableHead>
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
                    <TableCell>{getStatusBadge(vendor.status)}</TableCell>
                    <TableCell>{getProductCount(vendor)}</TableCell>
                    <TableCell className="font-medium">{getRevenue(vendor)}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="text-yellow-400">★</span>
                        <span className="ml-1">{getRating(vendor)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(vendor.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Link href={`/admin/dashboard/vendors/view/${vendor.id}`}>
                          <Button variant="ghost" size="sm" title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/admin/dashboard/vendors/edit/${vendor.id}`}>
                          <Button variant="ghost" size="sm" title="Edit Vendor">
                            <Edit className="h-4 w-4 text-blue-500" />
                          </Button>
                        </Link>
                        {vendor.status === 'PENDING' && (
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
                        {vendor.status === 'APPROVED' && (
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} vendors
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                  >
                    Next
                  </Button>
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