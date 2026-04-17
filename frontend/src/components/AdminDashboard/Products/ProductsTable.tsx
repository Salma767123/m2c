'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/UI/Card"
import { Button } from "@/components/UI/Button"
import Link from 'next/link'
import { Badge } from "@/components/UI/Badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/UI/Table"
import { Eye, Edit, Trash2, CheckCircle, XCircle, Filter } from "lucide-react"
import { formatDate, formatPrice } from "@/lib/utils"
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import Dropdown from '@/components/UI/Dropdown'
import { adminProductService } from '@/services/adminProductService'

interface Product {
  id: string
  name: string
  category: string
  basePrice: number
  originalPrice?: number
  adminFixedPrice?: number // Admin's fixed price
  hasVariants?: boolean
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
    originalPrice?: number
    stock: number
  }>
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return <Badge className="bg-green-100 text-green-800">Active</Badge>
    case "INACTIVE":
      return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
    case "OUT_OF_STOCK":
      return <Badge className="bg-red-100 text-red-800">Out of Stock</Badge>
    default:
      return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
  }
}

const getApprovalBadge = (status: string) => {
  switch (status) {
    case "APPROVED":
      return <Badge className="bg-green-100 text-green-800">Approved</Badge>
    case "QC_APPROVED":
      return <Badge className="bg-blue-100 text-blue-800">QC Approved</Badge>
    case "REINSPECTION":
      return <Badge className="bg-orange-100 text-orange-800">Reinspection</Badge>
    case "PENDING":
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
    case "REJECTED":
      return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
    default:
      return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
  }
}

export default function ProductsTable() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    approvalStatus: '',
    status: '',
    search: ''
  })
  const [searchInput, setSearchInput] = useState('') // Separate state for input
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10
  })
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvingProduct, setApprovingProduct] = useState<Product | null>(null)
  const [adminPrice, setAdminPrice] = useState<string>('')
  const [originalPrice, setOriginalPrice] = useState<string>('')
  const [variantPrices, setVariantPrices] = useState<Record<string, string>>({})
  const [variantOriginalPrices, setVariantOriginalPrices] = useState<Record<string, string>>({})

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => {
        if (prev.search === searchInput) return prev // avoid new reference if unchanged
        return { ...prev, search: searchInput }
      })
      setPagination(prev => {
        if (prev.currentPage === 1) return prev
        return { ...prev, currentPage: 1 }
      })
    }, 500) // 500ms delay

    return () => clearTimeout(timer)
  }, [searchInput])

  // Load products
  useEffect(() => {
    loadProducts()
  }, [filters, pagination.currentPage])

  const loadProducts = async () => {
    setIsLoading(true)
    try {
      const params = {
        page: pagination.currentPage,
        limit: pagination.limit,
        ...(filters.approvalStatus && { approvalStatus: filters.approvalStatus as any }),
        ...(filters.status && { status: filters.status as any }),
        ...(filters.search && { search: filters.search })
      }

      const response = await adminProductService.getAllProducts(params)

      if (response.success) {
        setProducts(response.data.products)
        setPagination(prev => ({
          ...prev,
          totalPages: response.data.pagination.totalPages,
          totalCount: response.data.pagination.totalCount
        }))
      }
    } catch (error: any) {
      console.error('Error loading products:', error)
      showErrorToast('Load Failed', error.message || 'Unable to load products')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproveClick = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    setApprovingProduct(product)
    setAdminPrice(product.basePrice.toString())
    setOriginalPrice(product.originalPrice?.toString() || '')

    if (product.variants && product.variants.length > 0) {
      const initialPrices: Record<string, string> = {}
      const initialOriginalPrices: Record<string, string> = {}
      product.variants.forEach(v => {
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
    if (!approvingProduct) return

    const hasVariants = approvingProduct.variants && approvingProduct.variants.length > 0

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
      const invalidVariants = approvingProduct.variants!.filter(v =>
        !variantPrices[v.id] || parseFloat(variantPrices[v.id]) <= 0
      )
      if (invalidVariants.length > 0) {
        showErrorToast('Invalid Prices', 'Please enter valid admin prices for all variants')
        return
      }

      const invalidOriginalPrices = approvingProduct.variants!.filter(v =>
        !variantOriginalPrices[v.id] || parseFloat(variantOriginalPrices[v.id]) <= 0
      )
      if (invalidOriginalPrices.length > 0) {
        showErrorToast('Invalid Prices', 'Please enter valid original prices for all variants')
        return
      }

      const invalidDiscounts = approvingProduct.variants!.filter(v =>
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
        approvingProduct.id,
        parseFloat(adminPrice),
        variantPricesNum,
        originalPrice ? parseFloat(originalPrice) : undefined,
        variantOriginalPricesNum && Object.keys(variantOriginalPricesNum).length > 0 ? variantOriginalPricesNum : undefined
      )

      if (response.success) {
        showSuccessToast('Product Approved', 'Product has been approved successfully')
        setShowApprovalModal(false)
        setApprovingProduct(null)
        loadProducts()
      }
    } catch (error: any) {
      showErrorToast('Approval Failed', error.message || 'Unable to approve product')
    }
  }

  const handleRejectProduct = async (productId: string) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (!reason || reason.trim() === '') {
      showErrorToast('Rejection Failed', 'Rejection reason is required')
      return
    }

    try {
      const response = await adminProductService.rejectProduct(productId, reason.trim())

      if (response.success) {
        showSuccessToast('Product Rejected', 'Product has been rejected successfully')
        loadProducts() // Reload products
      }
    } catch (error: any) {
      showErrorToast('Rejection Failed', error.message || 'Unable to reject product')
    }
  }

  const handleDeleteProduct = async (productId: string, productName: string) => {
    const confirmed = confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)
    if (!confirmed) return

    try {
      const response = await adminProductService.deleteProduct(productId)

      if (response.success) {
        showSuccessToast('Product Deleted', 'Product has been deleted successfully')
        loadProducts() // Reload products
      }
    } catch (error: any) {
      showErrorToast('Delete Failed', error.message || 'Unable to delete product')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Products Management</CardTitle>
          <Link href="/admin/dashboard/products/add">
            <Button className="bg-[#313131] text-white hover:bg-[#222222]">
              Add Product
            </Button>
          </Link>
        </div>
        
        {/* Search and Filters Row */}
        <div className="flex items-center space-x-3 mt-4">
          {/* Search Input */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by product name, SKU, or description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2">
            <Dropdown
              label=""
              value={filters.approvalStatus}
              placeholder="Filter by Approval"
              options={[
                { value: '', label: 'All Approvals' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'QC_APPROVED', label: 'QC Approved' },
                { value: 'REINSPECTION', label: 'Reinspection' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Rejected' }
              ]}
              onChange={(value) => setFilters(prev => ({ ...prev, approvalStatus: value as string }))}
            />
            <Dropdown
              label=""
              value={filters.status}
              placeholder="Filter by Status"
              options={[
                { value: '', label: 'All Status' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
                { value: 'OUT_OF_STOCK', label: 'Out of Stock' }
              ]}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value as string }))}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader className="bg-[#313131] text-white">
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Approval</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-700"></div>
                    <span className="ml-3 text-gray-500">Loading products...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  No products found
                </TableCell>
              </TableRow>
            ) : products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      {product.images?.[0]?.url ? (
                        <img
                          src={product.images[0].url}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">No Image</span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">ID: {product.id.slice(-8)}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium text-gray-900">{product.vendor.companyName}</div>
                    <div className="text-sm text-gray-500">{product.vendor.ownerName}</div>
                  </div>
                </TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium text-gray-900">
                      Vendor: {formatPrice(product.basePrice)}
                    </div>
                    {product.originalPrice && (
                      <div className="text-sm text-gray-500 line-through">
                        Original: {formatPrice(product.originalPrice)}
                      </div>
                    )}
                    {product.adminFixedPrice && (
                      <div className="text-sm text-green-600 font-medium">
                        Admin: {formatPrice(product.adminFixedPrice)}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={product.totalStock === 0 ? "text-red-600" : "text-gray-900"}>
                    {product.totalStock}
                  </span>
                </TableCell>
                <TableCell>{getStatusBadge(product.status)}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {getApprovalBadge(product.approvalStatus)}
                    {product.approvalStatus === 'REJECTED' && product.rejectionReason && (
                      <div className="text-xs text-red-600 max-w-32 truncate" title={product.rejectionReason}>
                        {product.rejectionReason}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{formatDate(new Date(product.createdAt))}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Link href={`/admin/dashboard/products/vendor-requests/view/${product.id}`}>
                      <Button variant="ghost" size="sm" className="hover:bg-gray-50">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>

                    {product.approvalStatus === 'QC_APPROVED' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-green-50 text-green-600"
                          onClick={() => handleApproveClick(product.id)}
                          title="Approve & Set Price"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {(product.approvalStatus === 'PENDING' || product.approvalStatus === 'QC_APPROVED') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-red-50 text-red-600"
                        onClick={() => handleRejectProduct(product.id)}
                        title="Reject"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}

                    <Link href={`/admin/dashboard/products/edit/${product.id}`}>
                      <Button variant="ghost" size="sm" className="hover:bg-gray-50">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-red-50 text-red-600"
                      onClick={() => handleDeleteProduct(product.id, product.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              Showing {products.length} of {pagination.totalCount} products
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
      </CardContent>

      {/* Approval Modal */}
      {showApprovalModal && approvingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Approve Product</h3>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Product: {approvingProduct.name}</p>
              <p className="text-sm text-gray-600">Vendor: {approvingProduct.vendor.companyName}</p>
              <p className="text-sm text-gray-500">Vendor Base Price: ₹{approvingProduct.basePrice}</p>
            </div>

            {/* Base Pricing - always shown */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Selling Price (₹) *
                </label>
                <div className="mb-2 text-sm text-gray-600">
                  Vendor Base Price: ₹{approvingProduct.basePrice}
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

            {/* Variant: per-variant admin prices */}
            {approvingProduct.variants && approvingProduct.variants.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Set Prices for Each Variant
                </label>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {approvingProduct.variants.map((variant) => (
                    <div key={variant.id} className="p-3 border border-gray-200 rounded-lg bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {variant.size} - {variant.color}
                          </p>
                          <p className="text-xs text-gray-500">
                            Vendor Price: ₹{variant.price} | Stock: {variant.stock}
                          </p>
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
                  setApprovingProduct(null)
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
    </Card>
  )
}