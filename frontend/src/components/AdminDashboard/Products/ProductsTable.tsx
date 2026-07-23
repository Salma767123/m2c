'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/UI/Card"
import { Button } from "@/components/UI/Button"
import Link from 'next/link'
import { Badge } from "@/components/UI/Badge"
import ApproveProductModal, { type ApprovableProduct } from "./ApproveProductModal"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/UI/Table"
import { Eye, Edit, Trash2, CheckCircle, XCircle, Filter, ChevronLeft, ChevronRight, Package, Clock, ShieldCheck, AlertTriangle } from "lucide-react"
import { formatDate, formatPrice } from "@/lib/utils"
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import Dropdown from '@/components/UI/Dropdown'
import DateRangeCalendar from '@/components/Shared/DateRangeCalendar'
import { adminProductService, AdminProductCounts } from '@/services/adminProductService'
import { hasPermission } from '@/lib/auth'
import DeleteConfirmModal from '@/components/UI/DeleteConfirmModal'

interface Product {
  id: string
  name: string
  category: string
  basePrice: number
  originalPrice?: number
  adminFixedPrice?: number // Admin's fixed price
  priceINR?: number | null
  priceUSD?: number | null
  priceVisibility?: string
  hasVariants?: boolean
  totalStock: number
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK'
  approvalStatus: 'PENDING' | 'QC_APPROVED' | 'APPROVED' | 'REJECTED' | 'REINSPECTION' | 'NEGOTIATION'
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

const getStatusBadge = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return <Badge className="bg-green-50 text-green-700 border border-green-200">Active</Badge>
    case "INACTIVE":
      return <Badge className="bg-slate-50 text-slate-700 border border-slate-200">Inactive</Badge>
    case "OUT_OF_STOCK":
      return <Badge className="bg-red-50 text-red-700 border border-red-200">Out of Stock</Badge>
    default:
      return <Badge className="bg-slate-50 text-slate-700 border border-slate-200">Unknown</Badge>
  }
}

const getApprovalBadge = (status: string) => {
  switch (status) {
    case "APPROVED":
      return <Badge className="bg-green-50 text-green-700 border border-green-200">Approved</Badge>
    case "QC_APPROVED":
      return <Badge className="bg-blue-50 text-blue-700 border border-blue-200">QC Approved</Badge>
    case "REINSPECTION":
      return <Badge className="bg-orange-50 text-orange-700 border border-orange-200">Reinspection</Badge>
    case "PENDING":
      return <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200">Pending</Badge>
    case "REJECTED":
      return <Badge className="bg-red-50 text-red-700 border border-red-200">Rejected</Badge>
    default:
      return <Badge className="bg-slate-50 text-slate-700 border border-slate-200">Unknown</Badge>
  }
}

export default function ProductsTable() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    approvalStatus: '',
    status: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  })
  const [searchInput, setSearchInput] = useState('') // Separate state for input
  const [counts, setCounts] = useState<AdminProductCounts>({
    total: 0, PENDING: 0, QC_APPROVED: 0, APPROVED: 0, REJECTED: 0, REINSPECTION: 0
  })
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10
  })
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvingProduct, setApprovingProduct] = useState<Product | null>(null)

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
        ...(filters.search && { search: filters.search }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo })
      }

      const response = await adminProductService.getAllProducts(params)

      if (response.success) {
        setProducts(response.data.products)
        if (response.data.counts) setCounts(response.data.counts)
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
    // The shared ApproveProductModal initialises its own pricing state from the product.
    setApprovingProduct(product)
    setShowApprovalModal(true)
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

  const handleDeleteClick = (productId: string, productName: string) => {
    setDeleteTarget({ id: productId, name: productName })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      const response = await adminProductService.deleteProduct(deleteTarget.id)
      if (response.success) {
        showSuccessToast('Product Deleted', 'Product has been deleted successfully')
        loadProducts()
      }
    } catch (error: any) {
      showErrorToast('Delete Failed', error.message || 'Unable to delete product')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const handleMetricClick = (key: string) => {
    setFilters(prev => ({ ...prev, approvalStatus: prev.approvalStatus === key ? '' : key }))
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  const metricCards = [
    { key: '',             label: 'All Products',   subtitle: 'Total submissions',  count: counts.total,       Icon: Package,       iconBg: 'bg-brand-50',   iconColor: 'text-brand-500',   countColor: 'text-slate-900',   activeClass: 'border-brand-400 bg-brand-50/50' },
    { key: 'PENDING',      label: 'Pending',        subtitle: 'Awaiting review',    count: counts.PENDING,     Icon: Clock,         iconBg: 'bg-amber-50',   iconColor: 'text-amber-500',   countColor: 'text-amber-700',   activeClass: 'border-amber-400 bg-amber-50/60' },
    { key: 'QC_APPROVED',  label: 'QC Approved',    subtitle: 'Ready for approval', count: counts.QC_APPROVED, Icon: ShieldCheck,   iconBg: 'bg-blue-50',    iconColor: 'text-blue-500',    countColor: 'text-blue-700',    activeClass: 'border-blue-400 bg-blue-50/60' },
    { key: 'APPROVED',     label: 'Approved',       subtitle: 'Live on platform',   count: counts.APPROVED,    Icon: CheckCircle,   iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', countColor: 'text-emerald-700', activeClass: 'border-emerald-400 bg-emerald-50/60' },
    { key: 'REJECTED',     label: 'Rejected',       subtitle: 'Declined requests',  count: counts.REJECTED,    Icon: XCircle,       iconBg: 'bg-red-50',     iconColor: 'text-red-500',     countColor: 'text-red-700',     activeClass: 'border-red-400 bg-red-50/60' },
    { key: 'REINSPECTION', label: 'Re-Inspection',  subtitle: 'Needs re-review',    count: counts.REINSPECTION,Icon: AlertTriangle, iconBg: 'bg-orange-50',  iconColor: 'text-orange-500',  countColor: 'text-orange-700',  activeClass: 'border-orange-400 bg-orange-50/60' },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Products Management</CardTitle>
          {hasPermission('all_products:create') && (
            <Link href="/admin/dashboard/products/add">
              <Button className="bg-brand-500 text-white hover:bg-brand-600">
                Add Product
              </Button>
            </Link>
          )}
        </div>
        
        {/* Metric Cards — click a card to filter by approval status */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">
          {metricCards.map(({ key, label, subtitle, count, Icon, iconBg, iconColor, countColor, activeClass }) => {
            const isActive = filters.approvalStatus === key
            return (
              <button
                key={key || 'all'}
                type="button"
                onClick={() => handleMetricClick(key)}
                className={`text-left bg-white border rounded-2xl shadow-xs transition-all duration-200 hover:shadow-sm group ${isActive ? activeClass : 'border-slate-200/80 hover:border-slate-300'}`}
              >
                <div className="flex flex-row items-center justify-between px-4 pt-4 pb-2">
                  <span className="text-sm font-medium text-slate-500">{label}</span>
                  <div className={`p-1.5 rounded-lg ${isActive ? iconBg.replace('50', '100') : iconBg} transition-transform duration-150 group-hover:scale-110`}>
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                  </div>
                </div>
                <div className="px-4 pb-4">
                  <div className={`text-2xl font-bold ${countColor}`}>{count}</div>
                  <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
                </div>
              </button>
            )
          })}
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
                className="w-full px-4 py-2 pl-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400"
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
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
            <DateRangeCalendar
              from={filters.dateFrom}
              to={filters.dateTo}
              placeholder="Created Date"
              onChange={(f, t) => {
                setFilters(prev => ({ ...prev, dateFrom: f, dateTo: t }))
                setPagination(prev => ({ ...prev, currentPage: 1 }))
              }}
            />
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
          <TableHeader className="!bg-brand-500/[0.06] !border-0 [&_tr]:border-b [&_tr]:border-brand-100/50 [&_th]:!text-brand-500/60 [&_th]:font-bold [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:h-11">
            <TableRow className="!bg-brand-500/[0.06] hover:!bg-brand-500/[0.06]">
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
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-700"></div>
                    <span className="ml-3 text-slate-500">Loading products...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                  No products found
                </TableCell>
              </TableRow>
            ) : products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                      {product.images?.[0]?.url ? (
                        <img
                          src={product.images[0].url}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <span className="text-slate-400 text-xs">No Image</span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{product.name}</div>
                      <div className="text-sm text-slate-500">{product.vendor.companyName}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium text-slate-900">{product.vendor.companyName}</div>
                    <div className="text-sm text-slate-500">{product.vendor.ownerName}</div>
                  </div>
                </TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium text-slate-900">
                      Vendor: {formatPrice(product.basePrice)}
                    </div>
                    {product.originalPrice && (
                      <div className="text-sm text-slate-500 line-through">
                        Original: {formatPrice(product.originalPrice)}
                      </div>
                    )}
                    {product.adminFixedPrice && (
                      <div className="text-sm text-green-600 font-medium">
                        Admin: {formatPrice(product.adminFixedPrice)}
                      </div>
                    )}
                    {(product.priceINR || product.priceUSD) && (
                      <div className="text-xs text-blue-600 mt-0.5">
                        {product.priceINR ? `₹${product.priceINR.toLocaleString()}` : ''}
                        {product.priceINR && product.priceUSD ? ' / ' : ''}
                        {product.priceUSD ? `$${product.priceUSD.toFixed(2)}` : ''}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={product.totalStock === 0 ? "text-red-600" : "text-slate-900"}>
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
                    {hasPermission('all_products:view') && (
                      <Link href={`/admin/dashboard/products/view/${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}--${product.id}`}>
                        <Button variant="ghost" size="sm" title="View Details" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}

                    {product.approvalStatus === 'QC_APPROVED' && hasPermission('all_products:approve') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                        onClick={() => handleApproveClick(product.id)}
                        title="Approve & Set Price"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}

                    {(product.approvalStatus === 'PENDING' || product.approvalStatus === 'QC_APPROVED') && hasPermission('all_products:approve') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                        onClick={() => handleRejectProduct(product.id)}
                        title="Reject"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}

                    {hasPermission('all_products:edit') && (
                      <Link href={`/admin/dashboard/products/edit/${product.id}`}>
                        <Button variant="ghost" size="sm" title="Edit Product" className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                    {hasPermission('all_products:delete') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Delete Product"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                        onClick={() => handleDeleteClick(product.id, product.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-end gap-3 text-sm mt-4">
            <div className="flex items-center gap-1">
              <button onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))} disabled={pagination.currentPage === 1} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
              {getPageRange(pagination.currentPage, pagination.totalPages).map((p, i) => p === '…' ? (<span key={`e-${i}`} className="px-2 text-slate-400">…</span>) : (<button key={`p-${p}`} onClick={() => setPagination(prev => ({ ...prev, currentPage: p as number }))} aria-current={p === pagination.currentPage ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === pagination.currentPage ? 'bg-brand-500 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
              <button onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))} disabled={pagination.currentPage === pagination.totalPages} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </CardContent>

      <ApproveProductModal
        product={approvingProduct as unknown as ApprovableProduct}
        open={showApprovalModal}
        onClose={() => { setShowApprovalModal(false); setApprovingProduct(null) }}
        onApproved={loadProducts}
      />
      <DeleteConfirmModal
        show={!!deleteTarget}
        title="Delete Product"
        itemName={deleteTarget?.name}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Card>
  )
}