'use client'

import { useState, useEffect } from 'react'
import { convertINRtoUSD } from '@/lib/currency'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/UI/Button'
import { Badge } from '@/components/UI/Badge'
import Dropdown from '@/components/UI/Dropdown'
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
  Warehouse,
  UserCheck,
  CheckCircle,
  Info,
  Ruler,
  Scale,
  Truck,
} from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import Image from 'next/image'
import { adminProductService, type AdminProduct } from '@/services/adminProductService'
import { CARE_INSTRUCTIONS, CareIcon, CATEGORY_COLORS, CATEGORY_BORDER } from '@/components/VendorDashboard/Products/CareInstructionModal'
import qcCheckerService from '@/services/qcCheckerService'
import { formatCheckerName } from '@/lib/checkerUtils'
import { hasPermission } from '@/lib/auth'
import { openDoc } from '@/lib/docViewerBus'

/** Card wrapper matching the vendor product-view page's section headings. */
function SpecSection({ icon, title, action, children }: { icon: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <span className="text-slate-500">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

/** Reusable label/value field block (gray box) for the specification grids. */
function InfoField({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
      <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mb-1">
        {icon ? <span className="text-slate-400">{icon}</span> : null}
        {label}
      </p>
      <div className="text-sm font-medium text-slate-900">{value}</div>
    </div>
  )
}

/** Color swatch + name field block — matches the vendor variant cards. */
function ColorField({ label = 'Color', color, hex }: { label?: string; color?: string | null; hex?: string | null }) {
  if (!color) return null
  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        {hex && <span className="w-4 h-4 rounded border border-slate-200 shrink-0" style={{ backgroundColor: hex }} />}
        <span className="text-sm font-medium text-slate-900">{color}</span>
        {hex && <span className="text-xs text-slate-500 font-mono uppercase ml-auto">{hex}</span>}
      </div>
    </div>
  )
}

interface VendorProductRequestViewProps {
  requestId: string
  /**
   * Which module this detail page is opened from. Drives the breadcrumb, the
   * back button, and post-action redirects so the same product-detail view can
   * serve both "All Products" (catalog) and "Vendor Requests" (approval queue).
   */
  context?: 'vendor-requests' | 'all-products'
}

export default function VendorProductRequestView({ requestId, context = 'vendor-requests' }: VendorProductRequestViewProps) {
  const router = useRouter()
  const isAllProducts = context === 'all-products'
  const backHref = isAllProducts ? '/admin/dashboard/products' : '/admin/dashboard/products/vendor-requests'
  const backLabel = isAllProducts ? 'Back to Products' : 'Back to Requests'
  const [product, setProduct] = useState<AdminProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [adminPrice, setAdminPrice] = useState('')
  const [originalPrice, setOriginalPrice] = useState('')
  const [priceINR, setPriceINR] = useState('')
  const [priceUSD, setPriceUSD] = useState('')
  const [originalPriceINR, setOriginalPriceINR] = useState('')
  const [originalPriceUSD, setOriginalPriceUSD] = useState('')
  const [priceVisibility, setPriceVisibility] = useState<'IN_ONLY' | 'COM_ONLY' | 'BOTH'>('BOTH')
  const [variantPrices, setVariantPrices] = useState<Record<string, string>>({})
  const [variantOriginalPrices, setVariantOriginalPrices] = useState<Record<string, string>>({})
  const [variantPricesINR, setVariantPricesINR] = useState<Record<string, string>>({})
  const [variantPricesUSD, setVariantPricesUSD] = useState<Record<string, string>>({})
  const [variantOriginalPricesINR, setVariantOriginalPricesINR] = useState<Record<string, string>>({})
  const [variantOriginalPricesUSD, setVariantOriginalPricesUSD] = useState<Record<string, string>>({})
  const [variantVisibilities, setVariantVisibilities] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState(false)
  const [qcCheckers, setQcCheckers] = useState<{ id: string; name: string }[]>([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedQcChecker, setSelectedQcChecker] = useState<string>('')
  // Subcategory the admin assigns at approval time (for the website listing).
  const [subCategory, setSubCategory] = useState('')
  const [subcategoryOptions, setSubcategoryOptions] = useState<string[]>([])

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
          setOriginalPrice(response.data.originalPrice?.toString() || '')

          // Initialize multi-currency prices
          setPriceINR(response.data.priceINR?.toString() || (response.data.adminFixedPrice || response.data.basePrice).toString())
          setPriceUSD(response.data.priceUSD?.toString() || '')
          setPriceVisibility(response.data.priceVisibility || 'BOTH')

          // Initialize variant prices if product has variants
          if (response.data.hasVariants && response.data.variants) {
            const initialVariantPrices: Record<string, string> = {}
            const initialVariantOriginalPrices: Record<string, string> = {}
            const initialVariantPricesINR: Record<string, string> = {}
            const initialVariantPricesUSD: Record<string, string> = {}
            const initialVariantVisibilities: Record<string, string> = {}
            response.data.variants.forEach(variant => {
              initialVariantPrices[variant.id] = (variant.adminFixedPrice || variant.price).toString()
              initialVariantOriginalPrices[variant.id] = variant.originalPrice?.toString() || ''
              initialVariantPricesINR[variant.id] = (variant as any).priceINR?.toString() || (variant.adminFixedPrice || variant.price).toString()
              initialVariantPricesUSD[variant.id] = (variant as any).priceUSD?.toString() || ''
              initialVariantVisibilities[variant.id] = (variant as any).priceVisibility || 'BOTH'
            })
            setVariantPrices(initialVariantPrices)
            setVariantOriginalPrices(initialVariantOriginalPrices)
            setVariantPricesINR(initialVariantPricesINR)
            setVariantPricesUSD(initialVariantPricesUSD)
            setVariantVisibilities(initialVariantVisibilities)
          }
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

  // Load active QC checkers for the assign/reassign dropdown.
  useEffect(() => {
    qcCheckerService.getAllQCCheckers({ status: 'ACTIVE' })
      .then((res) => { if (res.success && res.data) setQcCheckers(res.data) })
      .catch(() => { /* dropdown simply stays empty */ })
  }, [])

  const openAssignModal = () => {
    setSelectedQcChecker(product?.assignedQcId ?? '')
    setShowAssignModal(true)
  }

  const handleAssignQC = async () => {
    if (!product || !selectedQcChecker) { showErrorToast('Validation Error', 'Please select a QC Checker'); return }
    const wasReassign = Boolean(product.assignedQcId)
    try {
      setActionLoading(true)
      const response = await adminProductService.assignQCChecker(product.id, selectedQcChecker)
      if (response.success) {
        showSuccessToast(
          wasReassign ? 'QC Checker Reassigned' : 'QC Checker Assigned',
          wasReassign ? 'The product has been reassigned to a new Quality Checker.' : 'The product has been assigned for inspection.'
        )
        setShowAssignModal(false)
        setSelectedQcChecker('')
        // Refresh so the assigned checker + status reflect the change.
        const refreshed = await adminProductService.getProduct(requestId)
        if (refreshed.success && refreshed.data) setProduct(refreshed.data)
      }
    } catch (error: any) {
      showErrorToast(wasReassign ? 'Reassignment Failed' : 'Assignment Failed', error.message || 'Unable to assign QC Checker.')
    } finally {
      setActionLoading(false)
    }
  }

  // Load subcategory options for this product's category so the admin can
  // assign one at approval time. Sourced from the vendor's resolved category
  // tree (same endpoint the admin Edit-Product screen uses). Custom categories
  // have no master subcategories, so options come back empty and the field is
  // then optional.
  useEffect(() => {
    if (!product?.vendorId || !product?.category) return
    let cancelled = false
    const loadSubcategories = async () => {
      try {
        const { default: axiosInstance } = await import('@/lib/axios')
        const response = await axiosInstance.get(`/inventory/admin/vendor/${product.vendorId}/categories`)
        const cats = response.data?.data?.categories || []
        const subs = response.data?.data?.subcategories || []
        const matched = cats.find((c: any) => (c.name || '').toLowerCase() === product.category.toLowerCase())
        const options = matched
          ? subs.filter((s: any) => s.parentId === matched.id).map((s: any) => s.name)
          : []
        if (!cancelled) setSubcategoryOptions(options)
      } catch (error) {
        console.error('Error loading subcategory options:', error)
        if (!cancelled) setSubcategoryOptions([])
      } finally {
        if (!cancelled) setSubCategory(product.subCategory || '')
      }
    }
    loadSubcategories()
    return () => { cancelled = true }
  }, [product?.vendorId, product?.category, product?.subCategory])

  const handleApprove = async () => {
    if (!product) return

    // Validate base admin price (required for all products)
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

    // Validate variant prices if product has variants
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      const invalidVariants = product.variants.filter(v =>
        !variantPrices[v.id] || parseFloat(variantPrices[v.id]) <= 0
      )

      if (invalidVariants.length > 0) {
        showErrorToast('Invalid Prices', 'Please enter valid admin prices for all variants')
        return
      }

      const invalidOriginalPrices = product.variants.filter(v =>
        !variantOriginalPrices[v.id] || parseFloat(variantOriginalPrices[v.id]) <= 0
      )

      if (invalidOriginalPrices.length > 0) {
        showErrorToast('Invalid Prices', 'Please enter valid original prices for all variants')
        return
      }

      const invalidDiscounts = product.variants.filter(v =>
        parseFloat(variantOriginalPrices[v.id]) <= parseFloat(variantPrices[v.id])
      )

      if (invalidDiscounts.length > 0) {
        showErrorToast('Invalid Prices', 'Original price must be greater than admin price for all variants')
        return
      }
    }

    // Require a subcategory when the category actually offers options to choose
    // from (custom categories have none, so the field stays optional there).
    if (subcategoryOptions.length > 0 && !subCategory) {
      showErrorToast('Subcategory Required', 'Please select a subcategory for this product')
      return
    }

    try {
      setActionLoading(true)

      // Prepare the request based on product type
      const variantPricesNum = product.hasVariants && product.variants
        ? Object.fromEntries(
          Object.entries(variantPrices).map(([id, price]) => [id, parseFloat(price)])
        )
        : undefined

      const variantOriginalPricesNum = product.hasVariants && product.variants
        ? Object.fromEntries(
          Object.entries(variantOriginalPrices)
            .filter(([, price]) => price && parseFloat(price) > 0)
            .map(([id, price]) => [id, parseFloat(price)])
        )
        : undefined

      // Prepare multi-currency data
      const variantPricesINRNum = product.hasVariants && product.variants
        ? Object.fromEntries(
          Object.entries(variantPricesINR)
            .filter(([, price]) => price && parseFloat(price) > 0)
            .map(([id, price]) => [id, parseFloat(price)])
        )
        : undefined

      const variantPricesUSDNum = product.hasVariants && product.variants
        ? Object.fromEntries(
          Object.entries(variantPricesUSD)
            .filter(([, price]) => price && parseFloat(price) > 0)
            .map(([id, price]) => [id, parseFloat(price)])
        )
        : undefined

      const response = await adminProductService.approveProduct(
        product.id,
        parseFloat(adminPrice),
        variantPricesNum,
        originalPrice ? parseFloat(originalPrice) : undefined,
        variantOriginalPricesNum && Object.keys(variantOriginalPricesNum).length > 0 ? variantOriginalPricesNum : undefined,
        {
          priceINR: priceINR ? parseFloat(priceINR) : undefined,
          priceUSD: priceUSD ? parseFloat(priceUSD) : undefined,
          originalPriceINR: originalPriceINR ? parseFloat(originalPriceINR) : undefined,
          originalPriceUSD: originalPriceUSD ? parseFloat(originalPriceUSD) : undefined,
          priceVisibility,
          variantPricesINR: variantPricesINRNum && Object.keys(variantPricesINRNum).length > 0 ? variantPricesINRNum : undefined,
          variantPricesUSD: variantPricesUSDNum && Object.keys(variantPricesUSDNum).length > 0 ? variantPricesUSDNum : undefined,
          variantOriginalPricesINR: Object.keys(variantOriginalPricesINR).length > 0
            ? Object.fromEntries(Object.entries(variantOriginalPricesINR).filter(([, v]) => v).map(([id, v]) => [id, parseFloat(v)]))
            : undefined,
          variantOriginalPricesUSD: Object.keys(variantOriginalPricesUSD).length > 0
            ? Object.fromEntries(Object.entries(variantOriginalPricesUSD).filter(([, v]) => v).map(([id, v]) => [id, parseFloat(v)]))
            : undefined,
          variantVisibilities: Object.keys(variantVisibilities).length > 0 ? variantVisibilities : undefined,
        },
        subCategory || undefined
      )

      if (response.success) {
        showSuccessToast('Product Approved', 'The vendor product has been approved and is now live.')
        setShowApprovalModal(false)
        // Update local state
        setProduct(prev => prev ? {
          ...prev,
          approvalStatus: 'APPROVED',
          approvedAt: new Date().toISOString(),
          adminFixedPrice: parseFloat(adminPrice),
          subCategory: subCategory || prev.subCategory
        } : null)
        // Optionally redirect back to requests list
        setTimeout(() => {
          router.push(backHref)
        }, 1500)
      }
    } catch (error: any) {
      console.error('Error approving product:', error)
      if (error?.code === 'CATEGORY_PENDING_REVIEW') {
        // This page has no inline category-resolution control (the shared
        // ApproveProductModal does) — point the admin at the review queue.
        showErrorToast(
          'Category Needs Review',
          `${error.message} Resolve it in Catalog → Categories → "Pending Review", then approve again.`,
        )
      } else {
        showErrorToast('Approval Failed', error.message || 'Unable to approve product.')
      }
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
          router.push(backHref)
        }, 1500)
      }
    } catch (error: any) {
      console.error('Error rejecting product:', error)
      showErrorToast('Rejection Failed', error.message || 'Unable to reject product.')
    } finally {
      setActionLoading(false)
    }
  }

  const getProductStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-50 text-green-700 border border-green-200'
      case 'inactive': return 'bg-slate-50 text-slate-700 border border-slate-200'
      case 'out_of_stock': return 'bg-red-50 text-red-700 border border-red-200'
      default: return 'bg-slate-50 text-slate-700 border border-slate-200'
    }
  }

  // Standard vendor-status colours (matches the status colours used across the admin).
  const getVendorStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
      case 'ACTIVE': return 'bg-green-50 text-green-700 border border-green-200'
      case 'PENDING':
      case 'UNDER_REVIEW': return 'bg-yellow-50 text-yellow-700 border border-yellow-200'
      case 'REJECTED':
      case 'SUSPENDED': return 'bg-red-50 text-red-700 border border-red-200'
      default: return 'bg-slate-50 text-slate-700 border border-slate-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200'
      case 'qc_approved':
        return 'bg-blue-50 text-blue-700 border border-blue-200'
      case 'reinspection':
        return 'bg-orange-50 text-orange-700 border border-orange-200'
      case 'approved':
        return 'bg-green-50 text-green-700 border border-green-200'
      case 'rejected':
        return 'bg-red-50 text-red-700 border border-red-200'
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700"></div>
        <span className="ml-3 text-slate-600">Loading product details...</span>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Product not found</p>
          <p className="text-sm text-slate-400">The requested vendor product could not be found.</p>
          <Button
            onClick={() => router.push(backHref)}
            className="mt-4"
          >
            {backLabel}
          </Button>
        </div>
      </div>
    )
  }

  const allImages = product.images?.filter((img) => img.url) || []

  return (
    <div className="space-y-6">
      {/* Sticky top: breadcrumb + header — matches the vendor product-view page */}
      <div className="sticky top-0 z-20 bg-slate-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-6 lg:-mt-8 pt-4 sm:pt-6 lg:pt-8 pb-4 space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-slate-600" aria-label="Breadcrumb">
        <Link href="/admin/dashboard" className="hover:text-slate-900 transition-colors hover:underline">Dashboard</Link>
        <span className="text-slate-400">/</span>
        <Link href="/admin/dashboard/products" className="hover:text-slate-900 transition-colors hover:underline">Products</Link>
        <span className="text-slate-400">/</span>
        <Link href={backHref} className="hover:text-slate-900 transition-colors hover:underline">{isAllProducts ? 'All Products' : 'Vendor Requests'}</Link>
        <span className="text-slate-400">/</span>
        <span className="text-slate-900 font-medium" aria-current="page">{product?.name || 'View Request'}</span>
      </nav>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(backHref)}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors shrink-0"
              aria-label={backLabel}
            >
              <ArrowLeft className="h-4 w-4 text-slate-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{product.name}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge className={`${getProductStatusColor(product.status)} text-xs`}>{product.status?.replace(/_/g, ' ')}</Badge>
                {product.baseSku && (
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">SKU: {product.baseSku}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
          {/* All Products is the read-only catalog view — the approve / reject /
              re-inspection decision lives on the QC report (Vendor Requests) view. */}
          {!isAllProducts && (product.approvalStatus === 'PENDING' || product.approvalStatus === 'QC_APPROVED' || product.approvalStatus === 'REINSPECTION' || product.approvalStatus === 'REJECTED') && (
            <>
              {product.approvalStatus === 'QC_APPROVED' ? (
                hasPermission('vendor_product_requests:approve') && (
                  <Button
                    onClick={() => setShowApprovalModal(true)}
                    disabled={actionLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {actionLoading ? 'Processing...' : 'Approve'}
                  </Button>
                )
              ) : product.approvalStatus === 'REINSPECTION' ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-orange-600 border-orange-200">
                    Awaiting QC Re-Inspection
                  </Badge>
                  {hasPermission('vendor_product_requests:assign_qc') ? (
                    <Button
                      onClick={openAssignModal}
                      disabled={actionLoading}
                      variant="outline"
                      className="border-orange-300 text-orange-600 hover:bg-orange-50"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      {product.assignedQcId ? 'Reassign QC Checker' : 'Assign QC Checker'}
                    </Button>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">QC checker must complete re-inspection</span>
                  )}
                </div>
              ) : product.approvalStatus === 'REJECTED' ? (
                hasPermission('reinspection_review:view') && (
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = `/admin/dashboard/reinspection-review/product/${product.id}`}
                    className="border-brand-300 text-brand-600 hover:bg-brand-50"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Review &amp; Re-Inspect
                  </Button>
                )
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                    Waiting for QC Approval
                  </Badge>
                  {hasPermission('vendor_product_requests:assign_qc') ? (
                    <Button
                      onClick={openAssignModal}
                      disabled={actionLoading}
                      className="bg-brand-500 hover:bg-brand-600 text-white"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      {product.assignedQcId ? 'Reassign QC Checker' : 'Assign QC Checker'}
                    </Button>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">QC must approve first</span>
                  )}
                </div>
              )}
              {product.approvalStatus === 'PENDING' && hasPermission('vendor_product_requests:approve') && (
                <Button
                  variant="outline"
                  onClick={() => setShowRejectionModal(true)}
                  disabled={actionLoading}
                  className="border-red-300 text-red-600 hover:bg-red-50 ml-3"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              )}
            </>
          )}
          </div>
        </div>
      </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Images — gallery (matches the vendor product-view page) */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-slate-500" />
                {product.hasVariants ? 'Product Images (General)' : 'Product Images'}
                {allImages.length > 0 && (
                  <span className="text-xs font-normal text-slate-500">({allImages.length})</span>
                )}
              </h2>
            </div>
            <div className="p-4">
              {allImages.length > 0 ? (
                <div className="space-y-3">
                  {/* Main image — click to open in the in-app viewer */}
                  <button
                    type="button"
                    onClick={() => allImages[selectedImage]?.url && openDoc(allImages[selectedImage].url, allImages[selectedImage]?.alt || product.name, true)}
                    className="relative w-full h-64 sm:h-72 md:h-80 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 cursor-zoom-in group"
                  >
                    <Image
                      src={allImages[selectedImage]?.url}
                      alt={allImages[selectedImage]?.alt || product.name}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-contain"
                    />
                    {allImages[selectedImage]?.isPrimary && (
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-brand-500 text-white text-xs shadow-sm">Primary</Badge>
                      </div>
                    )}
                  </button>
                  {/* Thumbnails */}
                  {allImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {allImages.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedImage(idx)}
                          className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                            selectedImage === idx
                              ? 'border-brand-500 ring-1 ring-brand-500/40'
                              : 'border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                  <div className="text-center py-8 text-slate-500">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                    <p>No images available</p>
                  </div>
                )}
              </div>
            </div>

          {/* Basic Information — mirrors the vendor product-view page */}
          <SpecSection icon={<Info className="h-4 w-4" />} title="Basic Information">
            {product.description && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {product.category && <InfoField label="Category" value={product.category} />}
              {product.uom && <InfoField label="Selling Unit (UOM)" value={product.uom} />}
              {product.baseSku && <InfoField label="Base SKU" value={product.baseSku} />}
              {product.singleUnitColor && (
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs font-medium text-slate-500 mb-1">Base Color</p>
                  <div className="flex items-center gap-2">
                    {product.singleUnitColorHex && (
                      <span className="w-4 h-4 rounded border border-slate-200 shrink-0" style={{ backgroundColor: product.singleUnitColorHex }} />
                    )}
                    <span className="text-sm font-medium text-slate-900">{product.singleUnitColor}</span>
                    {product.singleUnitColorHex && (
                      <span className="text-xs text-slate-500 font-mono uppercase ml-auto">{product.singleUnitColorHex}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            {product.tags && product.tags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {product.tags.map((tag, idx) => (
                    <span key={idx} className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </SpecSection>

          {/* Fabric Type & Specifications */}
          {(product.fabricType || product.material || product.fabricSpecifications) && (
            <SpecSection icon={<Layers className="h-4 w-4" />} title="Fabric Type & Specifications">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {product.fabricType && <InfoField icon={<Layers className="h-3.5 w-3.5" />} label="Fabric Type" value={product.fabricType} />}
                {product.material && <InfoField icon={<Package className="h-3.5 w-3.5" />} label="Material Description" value={product.material} />}
                {(() => {
                  const fs = product.fabricSpecifications || {}
                  const rows: Array<{ label: string; value: string; icon?: React.ReactNode }> = []
                  if (fs.composition) rows.push({ label: 'Composition', value: String(fs.composition) })
                  if (fs.weightValue) rows.push({ label: 'Weight', value: `${fs.weightValue} g`, icon: <Scale className="h-3.5 w-3.5" /> })
                  if (fs.length) rows.push({ label: 'Length', value: `${fs.length} cm`, icon: <Ruler className="h-3.5 w-3.5" /> })
                  if (fs.breadth) rows.push({ label: 'Breadth', value: `${fs.breadth} cm`, icon: <Ruler className="h-3.5 w-3.5" /> })
                  if (fs.gsm) rows.push({ label: 'GSM', value: `${fs.gsm} GSM`, icon: <Scale className="h-3.5 w-3.5" /> })
                  else if (!fs.weightValue && fs.weight) rows.push({ label: 'Weight', value: `${fs.weight}${fs.weightUnit ? ` ${fs.weightUnit}` : ''}`, icon: <Scale className="h-3.5 w-3.5" /> })
                  if (fs.weave) rows.push({ label: 'Type of Weave', value: String(fs.weave) })
                  return rows.map((r) => <InfoField key={r.label} icon={r.icon} label={r.label} value={r.value} />)
                })()}
              </div>
              {/* Care Instructions — same chips as the vendor product-view page */}
              {(((product.fabricSpecifications as any)?.careInstructions as string[] | undefined)?.length ?? 0) > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Care Instructions</p>
                  <div className="flex flex-wrap gap-2">
                    {((product.fabricSpecifications as any).careInstructions as string[]).map((instruction, idx) => {
                      const match = CARE_INSTRUCTIONS.find((c) => c.label === instruction)
                      if (!match) {
                        return (
                          <span key={idx} className="inline-flex items-center text-xs px-2.5 py-1.5 bg-slate-50 text-slate-700 rounded-lg border border-slate-200">
                            {instruction}
                          </span>
                        )
                      }
                      const iconColor = CATEGORY_COLORS[match.category] || 'text-slate-500'
                      const chipStyle = CATEGORY_BORDER[match.category] || 'border-slate-200 bg-slate-50 text-slate-700'
                      return (
                        <span key={idx} className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border ${chipStyle}`}>
                          <span className={iconColor}>
                            <CareIcon paths={match.paths} className="w-4 h-4" />
                          </span>
                          {match.label}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </SpecSection>
          )}

          {/* Variants with Images */}
          {product.hasVariants && product.variants && product.variants.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-slate-500" />
                  Size &amp; Color Variants
                  <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{product.variants.length}</span>
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {/* Base variant */}
                <div className="p-4 bg-brand-50/40">
                  <div className="flex items-center gap-3 mb-3">
                    {product.singleUnitColorHex && (
                      <div className="w-8 h-8 rounded-lg border-2 border-brand-200 shadow-sm shrink-0" style={{ backgroundColor: product.singleUnitColorHex }} />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Base Unit</p>
                      <p className="text-xs text-brand-600">Default variant</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <ColorField color={product.singleUnitColor} hex={product.singleUnitColorHex} />
                    {product.baseSku && <InfoField label="SKU" value={product.baseSku} />}
                    <InfoField label="Vendor Price" value={`₹${product.basePrice}`} />
                    {product.originalPrice && <InfoField label="Original Price" value={<span className="line-through text-slate-500">₹{product.originalPrice}</span>} />}
                    {product.adminFixedPrice && <InfoField label="Admin Price" value={<span className="text-green-600">₹{product.adminFixedPrice}</span>} />}
                    <InfoField label="Stock Quantity" value={`${product.inventory?.baseStock ?? 0} units`} />
                    {product.priceINR && <InfoField label="INR Price" value={`₹${product.priceINR.toLocaleString()}`} />}
                    {product.priceUSD && <InfoField label="USD Price" value={`$${product.priceUSD.toFixed(2)}`} />}
                  </div>
                </div>

                {/* Variants */}
                {product.variants.map((variant, index) => (
                  <div key={variant.id || index} className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {/* Variant image(s) — leftmost, before the color swatch / name / SKU. Click to open in the in-app viewer. */}
                      {variant.images && variant.images.length > 0 && (
                        <div className="flex gap-2 shrink-0">
                          {variant.images.map((imageUrl, imgIndex) => (
                            <button
                              type="button"
                              key={imgIndex}
                              onClick={() => imageUrl && openDoc(imageUrl, `${variant.size || ''} ${variant.color || ''}`.trim() || product.name, true)}
                              className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0 cursor-zoom-in hover:border-slate-400 transition-colors"
                            >
                              <Image src={imageUrl} alt={`${variant.color || 'variant'}`} fill sizes="80px" className="object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                      {variant.colorHex && (
                        <div className="w-8 h-8 rounded-lg border-2 border-slate-200 shadow-sm shrink-0" style={{ backgroundColor: variant.colorHex }} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {variant.variantName?.trim() || [variant.size, variant.color].filter(Boolean).join(' - ') || 'Variant'}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">{variant.sku}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {variant.variantName && <InfoField label="Variant Name" value={variant.variantName} />}
                      <ColorField color={variant.color} hex={variant.colorHex} />
                      <InfoField label="SKU" value={variant.sku} />
                      <InfoField label="Vendor Price" value={`₹${variant.price}`} />
                      {variant.originalPrice && <InfoField label="Original Price" value={<span className="line-through text-slate-500">₹{variant.originalPrice}</span>} />}
                      {variant.adminFixedPrice && <InfoField label="Admin Price" value={<span className="text-green-600">₹{variant.adminFixedPrice}</span>} />}
                      <InfoField label="Stock Quantity" value={`${variant.stock ?? 0} units`} />
                      {variant.lowStockThreshold != null && <InfoField label="Low Stock Alert" value={<span className="text-amber-700">{variant.lowStockThreshold} units</span>} />}
                      {(variant as any).priceINR && <InfoField label="INR Price" value={`₹${(variant as any).priceINR.toLocaleString()}`} />}
                      {(variant as any).priceUSD && <InfoField label="USD Price" value={`$${(variant as any).priceUSD.toFixed(2)}`} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dispatch Timeline — mirrors the vendor product-view page */}
          {(product.dispatchTimeline || product.weight) && (
            <SpecSection icon={<Truck className="h-4 w-4" />} title="Dispatch Timeline Configuration">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {product.dispatchTimeline && <InfoField label="Processing Days" value={`${product.dispatchTimeline.processingDays}`} />}
                {product.dispatchTimeline && <InfoField label="Shipping Days" value={`${product.dispatchTimeline.shippingDays}`} />}
                {product.dispatchTimeline && <InfoField label="Total Days" value={`${product.dispatchTimeline.totalDays} days`} />}
                {product.weight && <InfoField icon={<Scale className="h-3.5 w-3.5" />} label="Shipping Weight" value={`${product.weight}${(product as any).weightUnit ? ` ${(product as any).weightUnit}` : ''}`} />}
              </div>
            </SpecSection>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:sticky lg:top-[188px] lg:self-start">
          {/* Request Info */}
          <SpecSection icon={<Calendar className="h-4 w-4" />} title="Request Information">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Submitted Date</p>
                  <p className="text-sm text-slate-600">
                    {new Date(product.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              {/* Pricing, Category and Stock & Variants are shown in the main
                  content (Basic Information + Product Variants), so they're not
                  duplicated here. */}
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

              {/* Assigned QC Checker */}
              {product.assignedQc && (
                <div className="flex items-center space-x-3">
                  <UserCheck className="h-4 w-4 text-brand-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">QC Checker</p>
                    <p className="text-sm text-slate-600">{product.assignedQc.name}</p>
                    <p className="text-xs text-slate-500">{product.assignedQc.email}</p>
                  </div>
                </div>
              )}
            </div>
          </SpecSection>

          {/* QC Inspection Summary */}
          {product.qcInspectionData && (
            <SpecSection icon={<CheckCircle className="h-4 w-4" />} title="QC Inspection Summary">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {(() => {
                    const decision = product.qcInspectionData.inspectionStatus || product.approvalStatus;
                    if (!decision) return null;
                    const isApproved = decision === 'Approved' || product.approvalStatus === 'QC_APPROVED' || product.approvalStatus === 'APPROVED';
                    const isRejected = decision === 'Rejected' || product.approvalStatus === 'REJECTED';
                    const cls = isApproved ? 'bg-green-50 text-green-800' : isRejected ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800';
                    return (
                      <div className={`p-2 rounded text-center ${cls}`}>
                        <p className="text-[10px] text-slate-500">Decision</p>
                        <p className="text-xs font-semibold">{product.qcInspectionData.inspectionStatus || decision}</p>
                      </div>
                    );
                  })()}
                  {(product.qcInspectionData.serviceStartDate || product.qcInspectionData.inspectionDate) && (
                    <div className="p-2 rounded bg-slate-50 text-center">
                      <p className="text-[10px] text-slate-500">Inspected</p>
                      <p className="text-xs font-semibold text-slate-800">{product.qcInspectionData.serviceStartDate || product.qcInspectionData.inspectionDate}</p>
                    </div>
                  )}
                </div>
                {product.qcInspectionData.serviceType && (
                  <p className="text-xs text-slate-600">Type: {product.qcInspectionData.serviceType}</p>
                )}

                {/* Findings summary — computed from the real inspection data */}
                {(() => {
                  const fd = product.qcInspectionData as any;
                  const verifs = fd.productVerifications && typeof fd.productVerifications === 'object' ? Object.values(fd.productVerifications) : [];
                  const verifiedCount = (verifs as any[]).filter((v) => v?.ok === true).length;
                  const issueCount = (verifs as any[]).filter((v) => v?.ok === false).length;
                  const pkg = Array.isArray(fd.packagingItems) ? fd.packagingItems : [];
                  const allTests = (Array.isArray(fd.testGroups) ? fd.testGroups : []).flatMap((g: any) => Array.isArray(g.tests) ? g.tests : []);
                  const passed = allTests.filter((t: any) => t.pass).length;
                  const failed = allTests.filter((t: any) => t.fail).length;
                  const crit = Number(fd.criticalDefects || 0), maj = Number(fd.majorDefects || 0), min = Number(fd.minorDefects || 0);
                  const rows: [string, string, boolean][] = [
                    ['Fields verified', `${verifiedCount}/${(verifs as any[]).length}`, false],
                    ['Verification issues', issueCount ? String(issueCount) : 'None', issueCount > 0],
                    ['Packaging items', String(pkg.length), false],
                    ['On-site tests', allTests.length ? `${passed} pass · ${failed} fail` : '—', failed > 0],
                    ['Defects (C/Ma/Mi)', `${crit} / ${maj} / ${min}`, crit > 0 || maj > 0],
                  ];
                  if ((verifs as any[]).length === 0 && pkg.length === 0 && allTests.length === 0) return null;
                  return (
                    <div>
                      <p className="text-[10px] font-medium text-slate-500 mb-1.5">Inspection Findings</p>
                      <div className="space-y-1">
                        {rows.map(([label, value, warn]) => (
                          <div key={label} className="flex items-center justify-between text-xs">
                            <span className="text-slate-600">{label}</span>
                            <span className={`px-1.5 py-0.5 rounded font-semibold ${warn ? 'text-red-700 bg-red-50' : 'text-slate-700 bg-slate-50'}`}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {product.qcInspectionData.reviewerRemarks && (
                  <div className="p-2 bg-slate-50 rounded">
                    <p className="text-[10px] font-medium text-slate-500 mb-1">Reviewer Remarks</p>
                    <p className="text-xs text-slate-700">{product.qcInspectionData.reviewerRemarks}</p>
                  </div>
                )}

                {product.inspectionCycleNumber && product.inspectionCycleNumber > 1 ? (
                  <p className="text-xs text-amber-600 font-medium">Inspection Cycle #{product.inspectionCycleNumber}</p>
                ) : null}
              </div>
            </SpecSection>
          )}

          {/* Vendor Details */}
          <SpecSection icon={<User className="h-4 w-4" />} title="Vendor Information">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-900">{product.vendor.companyName}</p>
                <p className="text-xs text-slate-500">{product.vendor.ownerName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Owner Name</p>
                <p className="text-sm text-slate-600">{product.vendor.ownerName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Contact</p>
                <p className="text-sm text-slate-600">{product.vendor.businessEmail}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Status</p>
                <Badge className={getVendorStatusColor(product.vendor.status)}>
                  {product.vendor.status}
                </Badge>
              </div>
            </div>
          </SpecSection>

          {/* Logistics Configuration */}
          {product.logisticsConfig && (
            <SpecSection icon={<Truck className="h-4 w-4" />} title="Logistics">
              <div className="space-y-3">
                {(() => {
                  const lc = product.logisticsConfig!
                  return (
                    <>
                      <div>
                        <p className="text-sm font-medium text-slate-900">Shipping Weight per Unit</p>
                        <p className="text-sm text-slate-600">{lc.unitWeight} {lc.weightUom}</p>
                      </div>
                      {lc.maxWeight > 0 && (
                        <div>
                          <p className="text-sm font-medium text-slate-900">Max Shippable Weight</p>
                          <p className="text-sm text-slate-600">{lc.maxWeight} {lc.weightUom}</p>
                        </div>
                      )}
                      {lc.dimensions && (
                        <div>
                          <p className="text-sm font-medium text-slate-900">Shipping Dimensions</p>
                          <p className="text-sm text-slate-600">{lc.dimensions.length} × {lc.dimensions.width} × {lc.dimensions.height} {lc.dimensions.unit}</p>
                        </div>
                      )}
                      {lc.transportTypes.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-slate-900">Transport Types</p>
                          <p className="text-sm text-slate-600">{lc.transportTypes.join(', ')}</p>
                        </div>
                      )}
                      {lc.transportTypes.includes('AIR') && lc.airDeliveryDays > 0 && (
                        <div>
                          <p className="text-sm font-medium text-slate-900">Air Delivery Days</p>
                          <p className="text-sm text-slate-600">{lc.airDeliveryDays} days</p>
                        </div>
                      )}
                      {lc.transportTypes.includes('SHIP') && lc.shipDeliveryDays > 0 && (
                        <div>
                          <p className="text-sm font-medium text-slate-900">Ship Delivery Days</p>
                          <p className="text-sm text-slate-600">{lc.shipDeliveryDays} days</p>
                        </div>
                      )}
                      {lc.airCostPerKg > 0 && (
                        <div>
                          <p className="text-sm font-medium text-slate-900">Air Cost per {lc.weightUom}</p>
                          <p className="text-sm text-slate-600">₹{lc.airCostPerKg}</p>
                        </div>
                      )}
                      {lc.shipCostPerKg > 0 && (
                        <div>
                          <p className="text-sm font-medium text-slate-900">Ship Cost per {lc.weightUom}</p>
                          <p className="text-sm text-slate-600">₹{lc.shipCostPerKg}</p>
                        </div>
                      )}
                      {lc.weightRanges.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-slate-900">Weight Range Rules</p>
                          <ul className="mt-1 space-y-0.5">
                            {lc.weightRanges.map((wr, i) => (
                              <li key={i} className="text-sm text-slate-600">
                                {wr.minWeight}–{wr.maxWeight} {lc.weightUom} → {wr.recommendedTransport}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {lc.notes && (
                        <div>
                          <p className="text-sm font-medium text-slate-900">Logistics Notes</p>
                          <p className="text-sm text-slate-600">{lc.notes}</p>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </SpecSection>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            {/* Header */}
            <div className="mb-5">
              <h3 className="text-xl font-bold text-slate-900">Approve Product Request</h3>
              <p className="text-sm text-slate-500 mt-1">Set the final pricing customers will see, then approve the product.</p>
            </div>

            {/* Product summary */}
            <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-brand-100 bg-brand-50/40 px-4 py-3 text-sm">
              <span className="font-bold text-slate-900">{product.name}</span>
              <span className="text-brand-300">·</span>
              <span className="text-slate-600">{product.vendor.companyName}</span>
            </div>

            {/* ── Category & Listing ─────────────────────────────────────────── */}
            <section className="mb-6">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-500 mb-3">Category &amp; Listing</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">Category</label>
                  <input
                    type="text"
                    value={product.category || '—'}
                    readOnly
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed text-sm"
                  />
                  <p className="text-xs text-slate-400 mt-1">Selected by the vendor.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Subcategory {subcategoryOptions.length > 0 && <span className="text-brand-500">*</span>}
                  </label>
                  <select
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    disabled={actionLoading || subcategoryOptions.length === 0}
                  >
                    <option value="">
                      {subcategoryOptions.length === 0 ? 'No subcategories for this category' : 'Select subcategory'}
                    </option>
                    {subcategoryOptions.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">Assigned for the website listing.</p>
                </div>
              </div>
            </section>

            {/* ── Base Pricing ───────────────────────────────────────────────── */}
            <section className="mb-6">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-500 mb-3">Base Pricing (INR)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-slate-800">Admin Selling Price (₹) <span className="text-brand-500">*</span></label>
                    <span className="text-xs text-slate-400">Base ₹{product.basePrice}</span>
                  </div>
                  <input
                    type="number"
                    value={adminPrice || ''}
                    onChange={(e) => setAdminPrice(e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                    placeholder="Enter selling price"
                    step="0.01"
                    min="0"
                    disabled={actionLoading}
                  />
                  <p className="text-xs text-slate-400 mt-1">Final price customers see.</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-slate-800">Original Price (₹) <span className="text-brand-500">*</span></label>
                    {originalPrice && parseFloat(originalPrice) > parseFloat(adminPrice) && (
                      <span className="text-xs font-semibold text-emerald-600">
                        {Math.round(((parseFloat(originalPrice) - parseFloat(adminPrice)) / parseFloat(adminPrice)) * 100)}% off
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={originalPrice || ''}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                    placeholder="Enter original price"
                    step="0.01"
                    min="0"
                    disabled={actionLoading}
                  />
                  <p className="text-xs text-slate-400 mt-1">Struck-through to show the discount.</p>
                </div>
              </div>
            </section>

            {/* ── Currency Pricing (brand-tinted) ────────────────────────────── */}
            <section className="mb-6 rounded-xl border border-brand-100 bg-brand-50/40 p-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-600">Currency Pricing</h4>
              <p className="text-xs text-slate-500 mt-0.5 mb-3">.com prices auto-convert from INR at the live exchange rate.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 border border-brand-100/70">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Selling Price (.in)</p>
                  <p className="text-lg font-bold text-slate-900">₹{adminPrice || '—'}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-brand-100/70">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Selling Price (.com)</p>
                  <p className="text-lg font-bold text-slate-900">{adminPrice ? `$${convertINRtoUSD(parseFloat(adminPrice)).toFixed(2)}` : '—'}</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">Auto-calculated</p>
                </div>
              </div>

              {/* Original Prices (MRP) */}
              <div className="mt-4 pt-4 border-t border-brand-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">Original Prices (MRP)</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="view-original-inr" className="block text-xs font-semibold text-slate-700 mb-1">Original ₹ (MRP)</label>
                    <input
                      id="view-original-inr"
                      type="number"
                      value={originalPriceINR || ''}
                      onChange={(e) => setOriginalPriceINR(e.target.value)}
                      onFocus={(e) => e.currentTarget.select()}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors duration-200 text-sm"
                      placeholder="MRP for .in"
                      step="0.01"
                      min="0"
                      disabled={actionLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Original $ (MRP)</label>
                    <div className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-600">
                      {originalPriceINR ? `$${convertINRtoUSD(parseFloat(originalPriceINR)).toFixed(2)}` : 'Auto'}
                    </div>
                    <p className="text-[10px] text-emerald-600 mt-1">Auto-calculated</p>
                  </div>
                  <div>
                    <label htmlFor="view-display-on" className="block text-xs font-semibold text-slate-700 mb-1">Display On</label>
                    <select
                      id="view-display-on"
                      value={priceVisibility}
                      onChange={(e) => setPriceVisibility(e.target.value as 'IN_ONLY' | 'COM_ONLY' | 'BOTH')}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors duration-200 text-sm"
                      disabled={actionLoading}
                    >
                      <option value="BOTH">Both (.in & .com)</option>
                      <option value="IN_ONLY">.in only (India)</option>
                      <option value="COM_ONLY">.com only (Global)</option>
                    </select>
                  </div>
                </div>
              </div>

              <p className="text-xs text-brand-600/80 mt-3">INR/USD prices override the admin selling price for their region. Original prices show as strikethrough.</p>
            </section>

            {/* Variant Prices - shown only when product has variants */}
            {product.hasVariants && product.variants && product.variants.length > 0 && (
              <section className="mb-6">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-500 mb-1">Variant Pricing</h4>
                <p className="text-xs text-slate-500 mb-3">Set the selling &amp; original price for each variant — discount % auto-calculates.</p>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {product.variants.map((variant) => (
                    <div key={variant.id} className="p-3 border border-slate-200 rounded-lg bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          {variant.colorHex ? (
                            <span className="w-7 h-7 rounded-md border border-slate-300 shadow-sm shrink-0" style={{ backgroundColor: variant.colorHex }} title={variant.colorHex} />
                          ) : (
                            <span className="w-7 h-7 rounded-md border border-dashed border-slate-300 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {variant.variantName?.trim() || variant.color || [variant.size, variant.color].filter(Boolean).join(' - ') || 'Variant'}
                              </p>
                              {variant.color && <span className="text-xs text-slate-500">{variant.color}</span>}
                              {variant.colorHex && <span className="text-[10px] font-mono uppercase text-slate-400">{variant.colorHex}</span>}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Vendor ₹{variant.price} · Stock: {variant.stock}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Admin Price (₹) *
                          </label>
                          <input
                            type="number"
                            value={variantPrices[variant.id] || ''}
                            onChange={(e) => setVariantPrices(prev => ({
                              ...prev,
                              [variant.id]: e.target.value
                            }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent text-sm"
                            placeholder="Selling price"
                            step="0.01"
                            min="0"
                            disabled={actionLoading}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Original Price (₹) *
                          </label>
                          <input
                            type="number"
                            value={variantOriginalPrices[variant.id] || ''}
                            onChange={(e) => setVariantOriginalPrices(prev => ({
                              ...prev,
                              [variant.id]: e.target.value
                            }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent text-sm"
                            placeholder="Original price"
                            step="0.01"
                            min="0"
                            disabled={actionLoading}
                          />
                          {variantOriginalPrices[variant.id] && variantPrices[variant.id] && parseFloat(variantOriginalPrices[variant.id]) > parseFloat(variantPrices[variant.id]) && (
                            <p className="text-xs text-green-600 mt-1">
                              {Math.round(((parseFloat(variantOriginalPrices[variant.id]) - parseFloat(variantPrices[variant.id])) / parseFloat(variantPrices[variant.id])) * 100)}% off
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Variant Currency Preview */}
                      <div className="mt-3 p-2.5 rounded-lg border border-brand-100 bg-brand-50/40">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-brand-600 mb-1.5">Currency Pricing</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white rounded-md p-2 border border-brand-100/70">
                            <p className="text-[10px] text-slate-400">Price (.in)</p>
                            <p className="text-sm font-bold text-slate-900">₹{variantPrices[variant.id] || variant.price || '—'}</p>
                          </div>
                          <div className="bg-white rounded-md p-2 border border-brand-100/70">
                            <p className="text-[10px] text-slate-400">Price (.com)</p>
                            <p className="text-sm font-bold text-slate-900">{(variantPrices[variant.id] || variant.price) ? `$${convertINRtoUSD(parseFloat(variantPrices[variant.id] || String(variant.price))).toFixed(2)}` : '—'}</p>
                            <p className="text-[8px] text-emerald-600">Auto-calculated</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowApprovalModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApprove}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {actionLoading ? 'Approving...' : 'Approve Product'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {/* Assign / Reassign QC Checker Modal */}
      {showAssignModal && (() => {
        const currentQcId = product?.assignedQcId ?? ''
        const isReassign = Boolean(currentQcId)
        const isUnchanged = isReassign && selectedQcChecker === currentQcId
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">{isReassign ? 'Reassign QC Checker' : 'Assign QC Checker'}</h3>
                <button type="button" onClick={() => { setShowAssignModal(false); setSelectedQcChecker('') }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                {isReassign ? 'Select a different Quality Checker to take over inspection of this product.' : 'Select a Quality Checker to inspect this product before it can be approved.'}
              </p>
              {isReassign && product?.assignedQc?.name && (
                <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Currently assigned</div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium text-slate-900">{product.assignedQc.name}</span>
                    {product.assignedQc.checkerId && (
                      <span className="text-xs font-mono text-slate-400">({product.assignedQc.checkerId})</span>
                    )}
                  </div>
                </div>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">QC Checker</label>
                <Dropdown
                  value={selectedQcChecker}
                  onChange={(v) => setSelectedQcChecker(v as string)}
                  placeholder="Select a QC Checker"
                  options={qcCheckers.map(qc => ({ value: qc.id, label: formatCheckerName(qc) }))}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowAssignModal(false); setSelectedQcChecker('') }}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={handleAssignQC} disabled={!selectedQcChecker || isUnchanged || actionLoading}
                  title={isUnchanged ? 'Select a different QC Checker to reassign' : undefined}
                  className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed">
                  {actionLoading ? 'Saving...' : isReassign ? 'Reassign' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {showRejectionModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Reject Product Request</h3>
            <p className="text-slate-600 mb-4">
              Please provide a reason for rejecting this product request. The vendor will be notified.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rejection Reason
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent"
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