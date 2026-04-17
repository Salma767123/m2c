'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Badge } from '@/components/UI/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table'
import Dropdown from '@/components/UI/Dropdown'
import { Eye, Check, X, Search, AlertCircle, UserPlus, UserCog, CheckCircle } from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import { adminProductService } from '@/services/adminProductService'
import qcCheckerService from '@/services/qcCheckerService'

interface VendorProductRequest {
  id: string
  name: string
  description: string
  category: string
  subCategory?: string
  basePrice: number
  originalPrice?: number
  totalStock: number
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK'
  approvalStatus: 'PENDING' | 'QC_APPROVED' | 'APPROVED' | 'REJECTED' | 'REINSPECTION'
  approvedAt?: string
  rejectionReason?: string
  createdAt: string
  vendor: {
    id: string
    companyName: string
    ownerName: string
    businessEmail: string
  }
  assignedQcId?: string | null
  assignedQc?: {
    id: string
    checkerId: string
    name?: string
    email?: string
    status?: string
  } | null
  images?: Array<{
    url: string
    isPrimary: boolean
  }>
  variants?: Array<{
    id: string
    size: string
    color: string
    price: number
    originalPrice?: number
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'QC_APPROVED' | 'APPROVED' | 'REJECTED' | 'REINSPECTION'>('PENDING')
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assigningRequestId, setAssigningRequestId] = useState<string | null>(null)
  const [qcCheckers, setQcCheckers] = useState<{ id: string; name: string }[]>([])
  const [selectedQcChecker, setSelectedQcChecker] = useState<string>('')
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvingRequest, setApprovingRequest] = useState<VendorProductRequest | null>(null)
  const [adminPrice, setAdminPrice] = useState<string>('')
  const [originalPrice, setOriginalPrice] = useState<string>('')
  const [variantPrices, setVariantPrices] = useState<Record<string, string>>({})
  const [variantOriginalPrices, setVariantOriginalPrices] = useState<Record<string, string>>({})

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10
  })

  // Load product requests and QC Checkers from API
  useEffect(() => {
    loadRequests()
    loadQcCheckers()
  }, [statusFilter, searchTerm, pagination.currentPage])

  const loadQcCheckers = async () => {
    try {
      const response = await qcCheckerService.getAllQCCheckers({ status: 'ACTIVE' });
      if (response.success && response.data) {
        setQcCheckers(response.data);
      }
    } catch (error) {
      console.error('Error fetching QC checkers:', error);
    }
  }

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

  const handleApproveClick = (requestId: string) => {
    const request = requests.find(r => r.id === requestId)
    if (!request) return

    setApprovingRequest(request)
    setAdminPrice(request.basePrice.toString())
    setOriginalPrice(request.originalPrice?.toString() || '')

    // Initialize variant prices if product has variants
    if (request.variants && request.variants.length > 0) {
      const initialPrices: Record<string, string> = {}
      const initialOriginalPrices: Record<string, string> = {}
      request.variants.forEach(v => {
        initialPrices[v.id] = v.price.toString()
        initialOriginalPrices[v.id] = v.originalPrice?.toString() || ''
      })
      setVariantPrices(initialPrices)
      setVariantOriginalPrices(initialOriginalPrices)
    } else {
      setVariantPrices({})
      setVariantOriginalPrices({})
    }

    setShowApprovalModal(true)
  }

  const handleApproveSubmit = async () => {
    if (!approvingRequest) return

    const hasVariants = approvingRequest.variants && approvingRequest.variants.length > 0

    // Validate base admin price
    if (!adminPrice || parseFloat(adminPrice) <= 0) {
      showErrorToast('Invalid Price', 'Please enter a valid admin selling price')
      return
    }

    // Validate original price (required)
    if (!originalPrice || parseFloat(originalPrice) <= 0) {
      showErrorToast('Invalid Price', 'Please enter a valid original price')
      return
    }

    if (parseFloat(originalPrice) <= parseFloat(adminPrice)) {
      showErrorToast('Invalid Price', 'Original price must be greater than selling price')
      return
    }

    if (hasVariants) {
      // Validate all variant prices
      const invalidVariants = approvingRequest.variants!.filter(v =>
        !variantPrices[v.id] || parseFloat(variantPrices[v.id]) <= 0
      )
      if (invalidVariants.length > 0) {
        showErrorToast('Invalid Prices', 'Please enter valid admin prices for all variants')
        return
      }

      const invalidOriginalPrices = approvingRequest.variants!.filter(v =>
        !variantOriginalPrices[v.id] || parseFloat(variantOriginalPrices[v.id]) <= 0
      )
      if (invalidOriginalPrices.length > 0) {
        showErrorToast('Invalid Prices', 'Please enter valid original prices for all variants')
        return
      }

      const invalidDiscounts = approvingRequest.variants!.filter(v =>
        parseFloat(variantOriginalPrices[v.id]) <= parseFloat(variantPrices[v.id])
      )
      if (invalidDiscounts.length > 0) {
        showErrorToast('Invalid Prices', 'Original price must be greater than admin price for all variants')
        return
      }
    }

    try {
      const variantPricesNum = hasVariants
        ? Object.fromEntries(
            Object.entries(variantPrices).map(([id, price]) => [id, parseFloat(price)])
          )
        : undefined

      const variantOriginalPricesNum = hasVariants
        ? Object.fromEntries(
            Object.entries(variantOriginalPrices)
              .filter(([, price]) => price && parseFloat(price) > 0)
              .map(([id, price]) => [id, parseFloat(price)])
          )
        : undefined

      const response = await adminProductService.approveProduct(
        approvingRequest.id,
        parseFloat(adminPrice),
        variantPricesNum,
        originalPrice ? parseFloat(originalPrice) : undefined,
        variantOriginalPricesNum && Object.keys(variantOriginalPricesNum).length > 0 ? variantOriginalPricesNum : undefined
      )

      if (response.success) {
        showSuccessToast('Product Approved', 'The vendor product has been approved successfully.')
        setShowApprovalModal(false)
        setApprovingRequest(null)
        loadRequests()
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

  const handleAssignClick = (requestId: string) => {
    const req = requests.find(r => r.id === requestId)
    setAssigningRequestId(requestId)
    setSelectedQcChecker(req?.assignedQcId ?? '')
    setShowAssignModal(true)
  }

  const handleAssignQC = async () => {
    if (!assigningRequestId || !selectedQcChecker) {
      showErrorToast('Validation Error', 'Please select a QC Checker')
      return
    }

    const wasReassign = Boolean(requests.find(r => r.id === assigningRequestId)?.assignedQcId)

    try {
      const response = await adminProductService.assignQCChecker(assigningRequestId, selectedQcChecker)

      if (response.success) {
        showSuccessToast(
          wasReassign ? 'QC Checker Reassigned' : 'QC Checker Assigned',
          wasReassign
            ? 'The product has been reassigned to a new Quality Checker.'
            : 'The product has been assigned for inspection.'
        )
        setShowAssignModal(false)
        setAssigningRequestId(null)
        setSelectedQcChecker('')
        loadRequests() // Reload the list
      }
    } catch (error: any) {
      showErrorToast(
        wasReassign ? 'Reassignment Failed' : 'Assignment Failed',
        error.message || 'Unable to assign QC Checker.'
      )
    }
  }

  const handleViewDetails = (request: VendorProductRequest) => {
    router.push(`/admin/dashboard/products/vendor-requests/view/${request.id}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'QC_APPROVED':
        return 'bg-blue-100 text-blue-800'
      case 'REINSPECTION':
        return 'bg-orange-100 text-orange-800'
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
                  { value: 'PENDING', label: 'Pending QC' },
                  { value: 'QC_APPROVED', label: 'QC Approved (Ready)' },
                  { value: 'REINSPECTION', label: 'Reinspection Required' },
                  { value: 'APPROVED', label: 'Final Approved' },
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
                  <TableHead>QC Checker</TableHead>
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
                      {request.assignedQc?.name ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {request.assignedQc.name}
                            </div>
                            {request.assignedQc.checkerId && (
                              <div className="text-xs font-mono text-gray-400">
                                {request.assignedQc.checkerId}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Not assigned</span>
                      )}
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
                        {(request.approvalStatus === 'PENDING' || request.approvalStatus === 'QC_APPROVED' || request.approvalStatus === 'REINSPECTION') && (
                          <>
                            {request.approvalStatus === 'QC_APPROVED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApproveClick(request.id)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Final Approve & Set Price"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRejectClick(request.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Reject"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            {(request.approvalStatus === 'PENDING' || request.approvalStatus === 'REINSPECTION') && (
                              request.assignedQcId ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAssignClick(request.id)}
                                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                  title="Reassign QC Checker"
                                >
                                  <UserCog className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAssignClick(request.id)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  title="Assign QC Checker"
                                >
                                  <UserPlus className="h-4 w-4" />
                                </Button>
                              )
                            )}
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

      {/* Approval Modal */}
      {showApprovalModal && approvingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Approve Product</h3>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Product: {approvingRequest.name}</p>
              <p className="text-sm text-gray-600">Vendor: {approvingRequest.vendor.companyName}</p>
              <p className="text-sm text-gray-500">Vendor Base Price: ₹{approvingRequest.basePrice}</p>
            </div>

            {/* Base Pricing - always shown */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Selling Price (₹) *
                </label>
                <div className="mb-2 text-sm text-gray-600">
                  Vendor Base Price: ₹{approvingRequest.basePrice}
                </div>
                <input
                  type="number"
                  value={adminPrice}
                  onChange={(e) => setAdminPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                  placeholder="Enter selling price"
                  step="0.01"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">Final selling price customers see.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Original Price (₹) *
                </label>
                <div className="mb-2 text-sm text-gray-600">
                  For showing strikethrough discount
                </div>
                <input
                  type="number"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                  placeholder="Enter original price"
                  step="0.01"
                  min="0"
                />
                {originalPrice && parseFloat(originalPrice) > parseFloat(adminPrice) && (
                  <p className="text-xs text-green-600 mt-1">
                    {Math.round(((parseFloat(originalPrice) - parseFloat(adminPrice)) / parseFloat(adminPrice)) * 100)}% off
                  </p>
                )}
              </div>
            </div>

            {/* Variant Prices */}
            {approvingRequest.variants && approvingRequest.variants.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Set Prices for Each Variant
                </label>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {approvingRequest.variants.map((variant) => (
                    <div key={variant.id} className="p-3 border border-gray-200 rounded-lg bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {variant.size} - {variant.color}
                            </p>
                            <p className="text-xs text-gray-500">
                              Vendor Price: ₹{variant.price} | Stock: {variant.stock}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Admin Price (₹) *
                          </label>
                          <input
                            type="number"
                            value={variantPrices[variant.id] || ''}
                            onChange={(e) => setVariantPrices(prev => ({
                              ...prev,
                              [variant.id]: e.target.value
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent text-sm"
                            placeholder="Selling price"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Original Price (₹) *
                          </label>
                          <input
                            type="number"
                            value={variantOriginalPrices[variant.id] || ''}
                            onChange={(e) => setVariantOriginalPrices(prev => ({
                              ...prev,
                              [variant.id]: e.target.value
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent text-sm"
                            placeholder="Original price"
                            step="0.01"
                            min="0"
                          />
                          {variantOriginalPrices[variant.id] && variantPrices[variant.id] && parseFloat(variantOriginalPrices[variant.id]) > parseFloat(variantPrices[variant.id]) && (
                            <p className="text-xs text-green-600 mt-1">
                              {Math.round(((parseFloat(variantOriginalPrices[variant.id]) - parseFloat(variantPrices[variant.id])) / parseFloat(variantPrices[variant.id])) * 100)}% off
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Set admin selling price and original price for each variant. Discount % is auto-calculated.
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowApprovalModal(false)
                  setApprovingRequest(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApproveSubmit}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Approve Product
              </Button>
            </div>
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

      {/* Assign QC Checker Modal */}
      {showAssignModal && (() => {
        const assigningRequest = requests.find(r => r.id === assigningRequestId)
        const currentQcId = assigningRequest?.assignedQcId ?? ''
        const isReassign = Boolean(currentQcId)
        const isUnchanged = isReassign && selectedQcChecker === currentQcId
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {isReassign ? 'Reassign QC Checker' : 'Assign QC Checker'}
              </h3>
              <p className="text-gray-600 mb-4">
                {isReassign
                  ? 'Select a different Quality Checker to take over inspection of this product.'
                  : 'Select a Quality Checker to inspect this product before it can be approved.'}
              </p>
              {isReassign && assigningRequest?.assignedQc?.name && (
                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Currently assigned</div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">
                      {assigningRequest.assignedQc.name}
                    </span>
                    {assigningRequest.assignedQc.checkerId && (
                      <span className="text-xs font-mono text-gray-400">
                        ({assigningRequest.assignedQc.checkerId})
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  QC Checker
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                  value={selectedQcChecker}
                  onChange={(e) => setSelectedQcChecker(e.target.value)}
                >
                  <option value="">Select a QC Checker</option>
                  {qcCheckers.map(qc => (
                    <option key={qc.id} value={qc.id}>{qc.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAssignModal(false)
                    setAssigningRequestId(null)
                    setSelectedQcChecker('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignQC}
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                  disabled={!selectedQcChecker || isUnchanged}
                  title={isUnchanged ? 'Select a different QC Checker to reassign' : undefined}
                >
                  {isReassign ? 'Reassign' : 'Assign'}
                </Button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
