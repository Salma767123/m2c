'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Badge } from '@/components/UI/Badge'
import {
  ArrowLeft,
  Edit,
  Package,
  Calendar,
  Tag,
  DollarSign,
  FileText,
  Image as ImageIcon,
  Layers,
  Warehouse,
  Check,
  X,
  Truck,
  Info,
  Ruler,
  Scale,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { productService, type Product } from '@/services/productService'
import { showErrorToast } from '@/lib/toast-utils'

interface ViewProductProps {
  productId: string
}

export default function ViewProduct({ productId }: ViewProductProps) {
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)

  useEffect(() => {
    if (productId) {
      loadProduct()
    }
  }, [productId])

  const loadProduct = async () => {
    setIsLoading(true)
    try {
      const response = await productService.getProduct(productId)
      if (response.success && response.data) {
        setProduct(response.data)
      } else {
        showErrorToast('Product Not Found', 'The requested product could not be found')
        router.push('/vendor/dashboard/products')
      }
    } catch (error) {
      console.error('Error loading product:', error)
      showErrorToast('Load Failed', 'Unable to load product details')
      router.push('/vendor/dashboard/products')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive': return 'bg-slate-100 text-slate-800 border-slate-200'
      case 'out_of_stock': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  const getApprovalColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200'
      case 'qc_approved': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      case 'reinspection': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center space-x-2 text-sm text-slate-600">
          <Link href="/vendor/dashboard" className="hover:text-slate-900 hover:underline">Dashboard</Link>
          <span className="text-slate-400">/</span>
          <Link href="/vendor/dashboard/products" className="hover:text-slate-900 hover:underline">Products</Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-400">Loading...</span>
        </nav>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700"></div>
          <span className="ml-3 text-slate-600">Loading product details...</span>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center space-x-2 text-sm text-slate-600">
          <Link href="/vendor/dashboard" className="hover:text-slate-900 hover:underline">Dashboard</Link>
          <span className="text-slate-400">/</span>
          <Link href="/vendor/dashboard/products" className="hover:text-slate-900 hover:underline">Products</Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-900 font-medium">Not Found</span>
        </nav>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium text-lg">Product not found</p>
            <Button onClick={() => router.push('/vendor/dashboard/products')} className="mt-4">
              Back to Products
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const allImages = product.images?.filter(img => img.url) || []

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-slate-600">
        <Link href="/vendor/dashboard" className="hover:text-slate-900 hover:underline">Dashboard</Link>
        <span className="text-slate-400">/</span>
        <Link href="/vendor/dashboard/products" className="hover:text-slate-900 hover:underline">Products</Link>
        <span className="text-slate-400">/</span>
        <span className="text-slate-900 font-medium truncate max-w-50">{product.name}</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/vendor/dashboard/products')}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-slate-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{product.name}</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge className={`${getStatusColor(product.status)} text-xs`}>
                  {product.status?.replace(/_/g, ' ')}
                </Badge>
                <Badge className={`${getApprovalColor(product.approvalStatus || 'pending')} text-xs`}>
                  {product.approvalStatus?.replace(/_/g, ' ') || 'Pending'}
                </Badge>
                {product.baseSku && (
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    SKU: {product.baseSku}
                  </span>
                )}
              </div>
            </div>
          </div>
          {product.approvalStatus !== 'APPROVED' ? (
            <Link href={`/vendor/dashboard/products/${productId}/edit`}>
              <Button className="bg-brand-500 text-white hover:bg-brand-600">
                <Edit className="h-4 w-4 mr-2" />
                Edit Product
              </Button>
            </Link>
          ) : (
            <span className="text-xs text-slate-500 italic bg-slate-50 px-3 py-2 rounded-lg border">
              Approved — only admin can edit
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Product Images — Gallery */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-slate-500" />
                Product Images
                {allImages.length > 0 && (
                  <span className="text-xs font-normal text-slate-500">({allImages.length})</span>
                )}
              </h2>
            </div>
            <div className="p-4">
              {allImages.length > 0 ? (
                <div className="space-y-3">
                  {/* Main image */}
                  <div className="relative aspect-4/3 rounded-lg overflow-hidden bg-slate-50 border border-slate-100">
                    <Image
                      src={allImages[selectedImage]?.url}
                      alt={allImages[selectedImage]?.alt || product.name}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-contain"
                    />
                    {allImages[selectedImage]?.isPrimary && (
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-blue-600 text-white text-xs shadow-sm">Primary</Badge>
                      </div>
                    )}
                  </div>
                  {/* Thumbnails */}
                  {allImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {allImages.map((img, idx) => (
                        <button
                          key={idx}
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
                <div className="text-center py-12 text-slate-400">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-sm">No images available</p>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                Product Description
              </h2>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          </div>

          {/* Material & Specifications */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Info className="h-4 w-4 text-slate-500" />
                Specifications
              </h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {product.fabricType && (
                  <InfoField icon={<Layers className="h-3.5 w-3.5" />} label="Fabric Type" value={product.fabricType} />
                )}
                {product.material && (
                  <InfoField icon={<Package className="h-3.5 w-3.5" />} label="Material" value={product.material} />
                )}
                {product.fabricSpecifications?.composition && (
                  <InfoField label="Composition" value={product.fabricSpecifications.composition} />
                )}
                {product.fabricSpecifications?.weight && (
                  <InfoField icon={<Scale className="h-3.5 w-3.5" />} label="Fabric Weight" value={product.fabricSpecifications.weight} />
                )}
                {product.dimensions && (
                  <InfoField icon={<Ruler className="h-3.5 w-3.5" />} label="Dimensions" value={product.dimensions} />
                )}
                {product.weight && (
                  <InfoField icon={<Scale className="h-3.5 w-3.5" />} label="Weight" value={product.weight} />
                )}
                {product.uom && (
                  <InfoField label="Unit of Measure" value={product.uom} />
                )}
                {product.dispatchTimeline && (
                  <InfoField
                    icon={<Truck className="h-3.5 w-3.5" />}
                    label="Dispatch Timeline"
                    value={`${product.dispatchTimeline.totalDays} days (${product.dispatchTimeline.processingDays}P + ${product.dispatchTimeline.shippingDays}S)`}
                  />
                )}
              </div>

              {product.fabricSpecifications?.careInstructions && product.fabricSpecifications.careInstructions.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Care Instructions</p>
                  <div className="flex flex-wrap gap-2">
                    {product.fabricSpecifications.careInstructions.map((instruction: string, idx: number) => (
                      <span key={idx} className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                        {instruction}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {product.tags && product.tags.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.tags.map((tag, idx) => (
                      <span key={idx} className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Variants */}
          {product.hasVariants && product.variants && product.variants.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-slate-500" />
                  Variants
                  <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{product.variants.length}</span>
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {/* Base variant */}
                <div className="p-4 bg-blue-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {(product as any).singleUnitColorHex && (
                        <div className="w-8 h-8 rounded-lg border-2 border-blue-200 shadow-sm shrink-0" style={{ backgroundColor: (product as any).singleUnitColorHex }} />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Base Unit
                          {(product as any).singleUnitSize && (product as any).singleUnitColor
                            ? ` — ${(product as any).singleUnitSize} / ${(product as any).singleUnitColor}`
                            : ''}
                        </p>
                        <p className="text-xs text-blue-600">Default variant</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">₹{product.basePrice}</p>
                      <p className="text-xs text-slate-500">{product.inventory?.baseStock ?? 0} in stock</p>
                    </div>
                  </div>
                </div>

                {/* Variants */}
                {product.variants.map((variant, idx) => (
                  <div key={variant.id || idx} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {variant.colorHex && (
                          <div className="w-8 h-8 rounded-lg border-2 border-slate-200 shadow-sm shrink-0" style={{ backgroundColor: variant.colorHex }} />
                        )}
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{variant.size} / {variant.color}</p>
                          <p className="text-xs text-slate-500 font-mono">{variant.sku}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">₹{variant.price}</p>
                        <p className="text-xs text-slate-500">{variant.stock} in stock</p>
                      </div>
                    </div>
                    {/* Variant Images */}
                    {variant.images && variant.images.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {variant.images.map((imgUrl, imgIdx) => (
                          <div key={imgIdx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0">
                            <Image src={imgUrl} alt={`${variant.size} ${variant.color}`} fill sizes="56px" className="object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* Pricing */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-slate-500" />
                Pricing
              </h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Vendor Price</span>
                <span className="text-lg font-bold text-slate-900">₹{product.basePrice}</span>
              </div>
              {product.originalPrice && product.originalPrice > product.basePrice ? (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Original (MRP)</span>
                  <span className="text-sm text-slate-400 line-through">₹{product.originalPrice}</span>
                </div>
              ) : null}
              {product.discount ? (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Discount</span>
                  <span className="text-sm font-semibold text-green-600">{product.discount}% OFF</span>
                </div>
              ) : null}
              {product.gstPercentage ? (
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-sm text-slate-500">GST</span>
                  <span className="text-sm text-slate-700">{product.gstPercentage}%</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Category & Stock */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Tag className="h-4 w-4 text-slate-500" />
                Details
              </h2>
            </div>
            <div className="p-4 space-y-4">
              {product.baseSku && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Base SKU</p>
                  <p className="text-sm text-slate-900 mt-0.5 font-mono">{product.baseSku}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Category</p>
                <p className="text-sm text-slate-900 mt-0.5">{product.category}</p>
                {product.subCategory && (
                  <p className="text-xs text-slate-500">{product.subCategory}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Stock</p>
                <p className="text-sm text-slate-900 mt-0.5 font-semibold">{product.totalStock} units total</p>
                {product.hasVariants && product.variants ? (
                  <p className="text-xs text-slate-500">
                    Base: {product.inventory?.baseStock ?? 0} &middot; Variants: {product.variants.reduce((sum, v) => sum + (v.stock || 0), 0)}
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Created</p>
                <p className="text-sm text-slate-900 mt-0.5">
                  {new Date(product.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          {/* Approval Status */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Check className="h-4 w-4 text-slate-500" />
                Approval Status
              </h2>
            </div>
            <div className="p-4">
              {product.approvalStatus === 'APPROVED' && product.approvedAt ? (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Check className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-semibold text-green-900">Approved</p>
                  </div>
                  <p className="text-xs text-green-700">
                    Approved on {new Date(product.approvedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              ) : product.approvalStatus === 'REJECTED' && product.rejectionReason ? (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 mb-1">
                    <X className="h-4 w-4 text-red-600" />
                    <p className="text-sm font-semibold text-red-900">Rejected</p>
                  </div>
                  <p className="text-xs text-red-700 mt-1">
                    <span className="font-medium">Reason:</span> {product.rejectionReason}
                  </p>
                </div>
              ) : product.approvalStatus === 'QC_APPROVED' ? (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Check className="h-4 w-4 text-blue-600" />
                    <p className="text-sm font-semibold text-blue-900">QC Approved</p>
                  </div>
                  <p className="text-xs text-blue-700">Waiting for admin final approval.</p>
                </div>
              ) : product.approvalStatus === 'REINSPECTION' ? (
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-4 w-4 text-orange-600" />
                    <p className="text-sm font-semibold text-orange-900">Re-Inspection Required</p>
                  </div>
                  <p className="text-xs text-orange-700">Product needs to be re-inspected.</p>
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-4 w-4 text-yellow-600" />
                    <p className="text-sm font-semibold text-yellow-900">Pending Review</p>
                  </div>
                  <p className="text-xs text-yellow-700">Your product is under review by admin.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Reusable field block for the Specifications grid */
function InfoField({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
      <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mb-1">
        {icon ? <span className="text-slate-400">{icon}</span> : null}
        {label}
      </p>
      <p className="text-sm font-medium text-slate-900">{value}</p>
    </div>
  )
}
