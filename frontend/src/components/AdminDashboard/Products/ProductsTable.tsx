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
  adminFixedPrice?: number // Admin's fixed price
  totalStock: number
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK'
  approvalStatus: 'PENDING' | 'QC_APPROVED' | 'APPROVED' | 'REJECTED'
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
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10
  })

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

  const handleApproveProduct = async (productId: string) => {
    const adminPrice = prompt('Enter the admin fixed price for this product:')
    if (!adminPrice || adminPrice.trim() === '' || parseFloat(adminPrice) <= 0) {
      showErrorToast('Invalid Price', 'Please enter a valid admin price')
      return
    }

    try {
      const response = await adminProductService.approveProduct(productId, parseFloat(adminPrice))

      if (response.success) {
        showSuccessToast('Product Approved', 'Product has been approved successfully')
        loadProducts() // Reload products
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"></div>
            <span className="ml-3 text-gray-600">Loading products...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Products Management</CardTitle>
          <div className="flex items-center space-x-4">
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
            <Link href="/admin/dashboard/products/add">
              <Button className="bg-[#313131] text-white hover:bg-[#222222]">
                Add Product
              </Button>
            </Link>
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
            {products.map((product) => (
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
                          onClick={() => handleApproveProduct(product.id)}
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

        {products.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No products found
          </div>
        )}

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
    </Card>
  )
}