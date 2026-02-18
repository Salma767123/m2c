'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Badge } from '@/components/UI/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table'
import Dropdown from '@/components/UI/Dropdown'
import { Eye, Check, X, Search, Filter, AlertCircle } from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import { adminProductService } from '@/services/adminProductService'

interface VendorProductRequest {
  id: string
  name: string
  description: string
  category: string
  subCategory?: string
  basePrice: number
  totalStock: number
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK'
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedAt?: string
  rejectionReason?: string
  createdAt: string
  vendor: {
    id: string
    companyName: string
    ownerName: string
    businessEmail: string
  }
  images?: Array<{
    url: string
    isPrimary: boolean
  }>
  variants?: Array<{
    id: string
    size: string
    color: string
    price: number
    stock: number
  }>
  fabricType?: string
  material?: string
  baseSku: string
}

export default function VendorProductRequests() {
  const router = useRouter()
  const [requests, setRequests] = useState<VendorProductRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [selectedRequest, setSelectedRequest] = useState<VendorProductRequest | null>(null)
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10
  })

  // Load product requests from API
  useEffect(() => {
    loadRequests()
  }, [statusFilter, searchTerm, pagination.currentPage])

  const loadRequests = async () => {
    setLoading(true)
    try {
      const params = {
        page: pagination.currentPage,
        limit: pagination.limit,
        ...(statusFilter !== 'all' && { approvalStatus: statusFilter as any }),
        ...(searchTerm && { search: searchTerm })
      }

      const response = await adminProductService.getAllProducts(params)
      
      if (response.success) {
        setRequests(response.data.products)
        setPagination(prev => ({
          ...prev,
          totalPages: response.data.pagination.totalPages,
          totalCount: response.data.pagination.totalCount
        }))
      }
    } catch (error: any) {
      console.error('Error loading product requests:', error)
      showErrorToast('Load Failed', error.message || 'Unable to load product requests')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId: string) => {
    const adminPrice = prompt('Enter the admin fixed price for this product:')
    if (!adminPrice || adminPrice.trim() === '' || parseFloat(adminPrice) <= 0) {
      showErrorToast('Invalid Price', 'Please enter a valid admin price')
      return
    }

    try {
      const response = await adminProductService.approveProduct(requestId, parseFloat(adminPrice))
      
      if (response.success) {
        showSuccessToast('Product Approved', 'The vendor product has been approved successfully.')
        loadRequests() // Reload the list
      }
    } catch (error: any) {
      showErrorToast('Approval Failed', error.message || 'Unable to approve product.')
    }
  }

  const handleRejectClick = (requestId: string) => {
    setRejectingRequestId(requestId)
    setShowRejectionModal(true)
  }

  const handleReject = async (reason: string) => {
    if (!rejectingRequestId) return

    try {
      const response = await adminProductService.rejectProduct(rejectingRequestId, reason.trim())
      
      if (response.success) {
        showSuccessToast('Product Rejected', 'The vendor has been notified of the rejection.')
        setShowRejectionModal(false)
        setRejectingRequestId(null)
        loadRequests() // Reload the list
      }
    } catch (error: any) {
      showErrorToast('Rejection Failed', error.message || 'Unable to reject product.')
    }
  }

  const handleViewDetails = (request: VendorProductRequest) => {
    router.push(`/admin/dashboard/products/vendor-requests/view/${request.id}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getProductStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800'
      case 'OUT_OF_STOCK':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"></div>
        <span className="ml-3 text-gray-600">Loading vendor requests...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Product Requests</h1>
          <p className="text-gray-600">Review and manage product submissions from vendors</p>
        </div>
        <div className="text-sm text-gray-500">
          Total: {pagination.totalCount} products
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search by product name, vendor, or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center">
              <Dropdown
                value={statusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'PENDING', label: 'Pending Approval' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'REJECTED', label: 'Rejected' }
                ]}
                onChange={(value) => setStatusFilter(value as any)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No requests found</p>
                <p className="text-sm text-gray-400">Try adjusting your search or filter criteria</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          {request.images?.[0]?.url ? (
                            <img 
                              src={request.images[0].url} 
                              alt={request.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <span className="text-gray-400 text-xs">No Image</span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{request.name}</div>
                          <div className="text-sm text-gray-500">SKU: {request.baseSku}</div>
                          {request.material && (
                            <div className="text-xs text-gray-400">{request.material}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{request.vendor.companyName}</div>
                        <div className="text-sm text-gray-500">{request.vendor.ownerName}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900">{request.category}</div>
                      {request.subCategory && (
                        <div className="text-xs text-gray-500">{request.subCategory}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-gray-900">₹{request.basePrice.toFixed(2)}</span>
                    </TableCell>
                    <TableCell>
                      <span className={request.totalStock === 0 ? "text-red-600" : "text-gray-900"}>
                        {request.totalStock}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getProductStatusColor(request.status)}>
                        {request.status.toLowerCase().replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge className={getStatusColor(request.approvalStatus)}>
                          {request.approvalStatus.toLowerCase()}
                        </Badge>
                        {request.approvalStatus === 'REJECTED' && request.rejectionReason && (
                          <div className="text-xs text-red-600 max-w-32 truncate" title={request.rejectionReason}>
                            {request.rejectionReason}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(request)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {request.approvalStatus === 'PENDING' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApprove(request.id)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRejectClick(request.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {requests.length} of {pagination.totalCount} products
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.currentPage === 1}
              onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-500">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.currentPage === pagination.totalPages}
              onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Product Request</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting this product request. The vendor will be notified.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                placeholder="Enter reason for rejection..."
                rows={4}
                id="rejectionReason"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectionModal(false)
                  setRejectingRequestId(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const reasonInput = document.getElementById('rejectionReason') as HTMLTextAreaElement
                  const reason = reasonInput.value.trim()
                  if (reason) {
                    handleReject(reason)
                  } else {
                    showErrorToast('Validation Error', 'Please provide a rejection reason')
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Reject Product
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
