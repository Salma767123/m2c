'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Badge } from '@/components/UI/Badge'
import {
  ArrowLeft,
  Check,
  X,
  Calendar,
  Package,
  User,
  Tag,
  DollarSign,
  FileText,
  Image as ImageIcon,
  Layers,
  Warehouse
} from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import Image from 'next/image'
import { adminProductService, type AdminProduct } from '@/services/adminProductService'

interface VendorProductRequestViewProps {
  requestId: string
}

export default function VendorProductRequestView({ requestId }: VendorProductRequestViewProps) {
  const router = useRouter()
  const [product, setProduct] = useState<AdminProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [adminPrice, setAdminPrice] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Fetch product data from backend
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true)
        const response = await adminProductService.getProduct(requestId)
        if (response.success && response.data) {
          setProduct(response.data)
          // Set initial admin price to the product's admin fixed price or base price
          setAdminPrice((response.data.adminFixedPrice || response.data.basePrice).toString())
        } else {
          showErrorToast('Error', 'Product not found')
        }
      } catch (error: any) {
        console.error('Error fetching product:', error)
        showErrorToast('Error', error.message || 'Failed to fetch product details')
      } finally {
        setLoading(false)
      }
    }

    if (requestId) {
      fetchProduct()
    }
  }, [requestId])

  const handleApprove = async () => {
    if (!product || !adminPrice || parseFloat(adminPrice) <= 0) {
      showErrorToast('Invalid Price', 'Please enter a valid admin price')
      return
    }

    try {
      setActionLoading(true)
      const response = await adminProductService.approveProduct(product.id, parseFloat(adminPrice))

      if (response.success) {
        showSuccessToast('Product Approved', 'The vendor product has been approved and is now live.')
        setShowApprovalModal(false)
        // Update local state
        setProduct(prev => prev ? {
          ...prev,
          approvalStatus: 'APPROVED',
          approvedAt: new Date().toISOString(),
          adminFixedPrice: parseFloat(adminPrice) // Store in adminFixedPrice field
        } : null)
        // Optionally redirect back to requests list
        setTimeout(() => {
          router.push('/admin/dashboard/products/vendor-requests')
        }, 1500)
      }
    } catch (error: any) {
      console.error('Error approving product:', error)
      showErrorToast('Approval Failed', error.message || 'Unable to approve product.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!product || !rejectionReason.trim()) return

    try {
      setActionLoading(true)
      const response = await adminProductService.rejectProduct(product.id, rejectionReason.trim())

      if (response.success) {
        showSuccessToast('Product Rejected', 'The vendor has been notified of the rejection.')
        setShowRejectionModal(false)
        // Update local state
        setProduct(prev => prev ? {
          ...prev,
          approvalStatus: 'REJECTED',
          rejectionReason: rejectionReason.trim(),
          approvedAt: undefined
        } : null)
        // Optionally redirect back to requests list
        setTimeout(() => {
          router.push('/admin/dashboard/products/vendor-requests')
        }, 1500)
      }
    } catch (error: any) {
      console.error('Error rejecting product:', error)
      showErrorToast('Rejection Failed', error.message || 'Unable to reject product.')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'qc_approved':
        return 'bg-blue-100 text-blue-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"></div>
        <span className="ml-3 text-gray-600">Loading product details...</span>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Product not found</p>
          <p className="text-sm text-gray-400">The requested vendor product could not be found.</p>
          <Button
            onClick={() => router.push('/admin/dashboard/products/vendor-requests')}
            className="mt-4"
          >
            Back to Requests
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6" aria-label="Breadcrumb">
        <div className="flex items-center space-x-2">
          <Link href="/admin/dashboard" className="hover:text-gray-900 transition-colors duration-200 hover:underline">
            Dashboard
          </Link>
          <span className="text-gray-400">/</span>
          <Link href="/admin/dashboard/products" className="hover:text-gray-900 transition-colors duration-200 hover:underline">
            Products
          </Link>
          <span className="text-gray-400">/</span>
          <Link href="/admin/dashboard/products/vendor-requests" className="hover:text-gray-900 transition-colors duration-200 hover:underline">
            Vendor Requests
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium" aria-current="page">
            {product?.name || 'View Request'}
          </span>
        </div>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/dashboard/products/vendor-requests')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requests
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-gray-600">Vendor Product Request Details</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className={getStatusColor(product.approvalStatus)}>
            {product.approvalStatus.replace('_', ' ').charAt(0).toUpperCase() + product.approvalStatus.replace('_', ' ').slice(1).toLowerCase()}
          </Badge>
          {(product.approvalStatus === 'PENDING' || product.approvalStatus === 'QC_APPROVED') && (
            <>
              {product.approvalStatus === 'QC_APPROVED' ? (
                <Button
                  onClick={() => setShowApprovalModal(true)}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {actionLoading ? 'Processing...' : 'Approve'}
                </Button>
              ) : (
                <div className="flex flex-col items-end">
                  <Badge variant="outline" className="text-xs text-yellow-600 mb-1">
                    Waiting for QC Approval
                  </Badge>
                  <span className="text-[10px] text-gray-400 italic">QC must approve first</span>
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => setShowRejectionModal(true)}
                disabled={actionLoading}
                className="border-red-300 text-red-600 hover:bg-red-50 ml-3"
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ImageIcon className="h-5 w-5 mr-2" />
                Product Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {product.images && product.images.length > 0 ? (
                  product.images.map((image, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                      <Image
                        src={image.url}
                        alt={image.alt || `${product.name} - Image ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No images available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Product Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Product Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{product.description}</p>
            </CardContent>
          </Card>

          {/* Product Specifications */}
          {product.fabricSpecifications && Object.keys(product.fabricSpecifications).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Layers className="h-5 w-5 mr-2" />
                  Specifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(product.fabricSpecifications).map(([key, value]) => (
                    <div key={key} className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="text-gray-900">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Product Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Layers className="h-5 w-5 mr-2" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {product.dimensions && (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-500">Dimensions</span>
                    <span className="text-gray-900">{product.dimensions}</span>
                  </div>
                )}
                {product.weight && (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-500">Weight</span>
                    <span className="text-gray-900">{product.weight}</span>
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-500">Dispatch Timeline</span>
                  <span className="text-gray-900">
                    {product.dispatchTimeline.totalDays} days
                    ({product.dispatchTimeline.processingDays} processing + {product.dispatchTimeline.shippingDays} shipping)
                  </span>
                </div>
                {product.tags && product.tags.length > 0 && (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-500">Tags</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {product.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Request Info */}
          <Card>
            <CardHeader>
              <CardTitle>Request Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Submitted Date</p>
                  <p className="text-sm text-gray-600">
                    {new Date(product.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Pricing</p>
                  <p className="text-sm text-gray-600">Vendor Price: ₹{product.basePrice}</p>
                  {product.adminFixedPrice && (
                    <p className="text-sm text-green-600 font-medium">Admin Price: ₹{product.adminFixedPrice}</p>
                  )}
                  {product.gstPercentage && (
                    <p className="text-sm text-gray-600">GST: {product.gstPercentage}%</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Tag className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Category</p>
                  <p className="text-sm text-gray-600">{product.category}</p>
                  {product.subCategory && (
                    <p className="text-xs text-gray-500">{product.subCategory}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Warehouse className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Stock & Variants</p>
                  <p className="text-sm text-gray-600">{product.totalStock} units</p>
                  <p className="text-xs text-gray-500">
                    {product.hasVariants ? `${product.variants?.length || 0} variants` : 'No variants'}
                  </p>
                </div>
              </div>
              {product.approvalStatus === 'REJECTED' && product.rejectionReason && (
                <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                  <X className="h-4 w-4 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900">Rejection Reason</p>
                    <p className="text-sm text-red-700">{product.rejectionReason}</p>
                  </div>
                </div>
              )}
              {product.approvalStatus === 'APPROVED' && product.approvedAt && (
                <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Approved</p>
                    <p className="text-sm text-green-700">
                      {new Date(product.approvedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vendor Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Vendor Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{product.vendor.companyName}</p>
                <p className="text-xs text-gray-500">ID: {product.vendor.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Owner</p>
                <p className="text-sm text-gray-600">{product.vendor.ownerName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Contact</p>
                <p className="text-sm text-gray-600">{product.vendor.businessEmail}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Status</p>
                <Badge className={product.vendor.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {product.vendor.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Material Info */}
          <Card>
            <CardHeader>
              <CardTitle>Material Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {product.fabricType && (
                <div>
                  <p className="text-sm font-medium text-gray-900">Fabric Type</p>
                  <p className="text-sm text-gray-600">{product.fabricType}</p>
                </div>
              )}
              {product.material && (
                <div>
                  <p className="text-sm font-medium text-gray-900">Material</p>
                  <p className="text-sm text-gray-600">{product.material}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">Base SKU</p>
                <p className="text-sm text-gray-600 font-mono">{product.baseSku}</p>
              </div>
            </CardContent>
          </Card>

          {/* Variants */}
          {product.hasVariants && product.variants && product.variants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Product Variants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {product.variants.map((variant, index) => (
                    <div key={variant.id || index} className="p-3 border rounded-lg">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-500">Size:</span>
                          <span className="ml-2 text-gray-900">{variant.size}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Color:</span>
                          <span className="ml-2 text-gray-900">{variant.color}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Price:</span>
                          <span className="ml-2 text-gray-900">₹{variant.price}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Stock:</span>
                          <span className="ml-2 text-gray-900">{variant.stock}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Approve Product Request</h3>
            <p className="text-gray-600 mb-4">
              Set the final price for this product. This will be the price customers see.
            </p>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Product: {product.name}</p>
              <p className="text-sm text-gray-600">Vendor Price: ₹{product.basePrice}</p>
              {product.adminFixedPrice && (
                <p className="text-sm text-green-600">Current Admin Price: ₹{product.adminFixedPrice}</p>
              )}
              <p className="text-sm text-gray-600">Vendor: {product.vendor.companyName}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Fixed Price (₹)
              </label>
              <input
                type="number"
                value={adminPrice}
                onChange={(e) => setAdminPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                placeholder="Enter final price"
                step="0.01"
                min="0"
                disabled={actionLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be the final price customers see. Vendor's original price: ₹{product.basePrice}
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowApprovalModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApprove}
                disabled={!adminPrice || parseFloat(adminPrice) <= 0 || actionLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {actionLoading ? 'Approving...' : 'Approve Product'}
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
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                placeholder="Enter reason for rejection..."
                rows={4}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowRejectionModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || actionLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {actionLoading ? 'Rejecting...' : 'Reject Product'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}