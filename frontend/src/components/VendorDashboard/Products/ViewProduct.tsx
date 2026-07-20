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
  Tag,
  DollarSign,
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
import { CARE_INSTRUCTIONS, CareIcon, CATEGORY_COLORS, CATEGORY_BORDER } from './CareInstructionModal'
import { openDoc } from '@/lib/docViewerBus'

// Match the create form's dropdown labels so the view shows the same wording.
const UOM_LABELS: Record<string, string> = {
  pcs: 'Pieces (pcs)', meters: 'Meters', kg: 'Kilograms (kg)', yards: 'Yards',
  sets: 'Sets', rolls: 'Rolls', pairs: 'Pairs', dozen: 'Dozen',
}

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
      {/* Sticky top: breadcrumb + product header stay pinned while the content
          below scrolls. Negative margins bleed the background to the layout
          edges (matches the vendor dashboard's p-4/sm:p-6/lg:p-8 padding). */}
      <div className="sticky top-0 z-20 bg-slate-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-6 lg:-mt-8 pt-4 sm:pt-6 lg:pt-8 pb-4 space-y-4">
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
                        <Badge className="bg-blue-600 text-white text-xs shadow-sm">Primary</Badge>
                      </div>
                    )}
                  </button>
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

          {/* Basic Information — mirrors the create form's "Basic Info" tab */}
          <SpecSection icon={<Info className="h-4 w-4" />} title="Basic Information">
            {product.description && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {product.category && <InfoField label="Category" value={product.category} />}
              {product.uom && <InfoField label="Selling Unit (UOM)" value={UOM_LABELS[product.uom] || product.uom} />}
              {product.baseSku && <InfoField label="Base SKU" value={product.baseSku} />}
              {(product as any).singleUnitColor && (
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs font-medium text-slate-500 mb-1">Base Color</p>
                  <div className="flex items-center gap-2">
                    {(product as any).singleUnitColorHex && (
                      <span className="w-4 h-4 rounded border border-slate-200 shrink-0" style={{ backgroundColor: (product as any).singleUnitColorHex }} />
                    )}
                    <span className="text-sm font-medium text-slate-900">{(product as any).singleUnitColor}</span>
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

          {/* Fabric Type & Specifications — mirrors the "Fabric & Specs" tab */}
          {(() => {
          const fs = product.fabricSpecifications || {}
          const hasFabric = product.fabricType || product.material || fs.composition || fs.gsm || fs.weightValue || fs.length || fs.breadth || fs.weight || fs.weave || (fs.careInstructions?.length ?? 0) > 0
          if (!hasFabric) return null
          return (
            <SpecSection icon={<Layers className="h-4 w-4" />} title="Fabric Type & Specifications">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {product.fabricType && <InfoField icon={<Layers className="h-3.5 w-3.5" />} label="Fabric Type" value={product.fabricType} />}
                {product.material && <InfoField icon={<Package className="h-3.5 w-3.5" />} label="Material Description" value={product.material} />}
                {fs.composition && <InfoField label="Composition" value={fs.composition} />}
                {fs.weightValue && <InfoField icon={<Scale className="h-3.5 w-3.5" />} label="Weight" value={`${fs.weightValue} g`} />}
                {fs.length && <InfoField icon={<Ruler className="h-3.5 w-3.5" />} label="Length" value={`${fs.length} cm`} />}
                {fs.breadth && <InfoField icon={<Ruler className="h-3.5 w-3.5" />} label="Breadth" value={`${fs.breadth} cm`} />}
                {fs.gsm && <InfoField icon={<Scale className="h-3.5 w-3.5" />} label="GSM" value={`${fs.gsm} GSM`} />}
                {/* Legacy single-weight field for products created before the GSM fields existed. */}
                {!fs.gsm && !fs.weightValue && fs.weight && <InfoField icon={<Scale className="h-3.5 w-3.5" />} label="Weight" value={`${fs.weight}${fs.weightUnit ? ` ${fs.weightUnit}` : ''}`} />}
                {fs.weave && <InfoField label="Type of Weave" value={fs.weave} />}
              </div>

              {product.fabricSpecifications?.careInstructions && product.fabricSpecifications.careInstructions.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Care Instructions</p>
                  <div className="flex flex-wrap gap-2">
                    {product.fabricSpecifications.careInstructions.map((instruction: string, idx: number) => {
                      // Match the stored label back to the catalogue so we can
                      // show the same icon + category colour as the create form.
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
          )
          })()}

          {/* Size & Color Variants — mirrors the "Variants" tab */}
          {product.hasVariants && product.variants && product.variants.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-slate-500" />
                  Size & Color Variants
                  <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{product.variants.length}</span>
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {/* Base variant — Base Unit Pricing & Stock */}
                <div className="p-4 bg-blue-50/50">
                  <div className="flex items-center gap-3 mb-3">
                    {(product as any).singleUnitColorHex && (
                      <div className="w-8 h-8 rounded-lg border-2 border-blue-200 shadow-sm shrink-0" style={{ backgroundColor: (product as any).singleUnitColorHex }} />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Base Unit</p>
                      <p className="text-xs text-blue-600">Default variant</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(product as any).singleUnitColor && (
                      <div className="bg-white rounded-lg p-3 border border-slate-100">
                        <p className="text-xs font-medium text-slate-500 mb-1">Color</p>
                        <div className="flex items-center gap-2">
                          {(product as any).singleUnitColorHex && (
                            <span className="w-4 h-4 rounded border border-slate-200 shrink-0" style={{ backgroundColor: (product as any).singleUnitColorHex }} />
                          )}
                          <span className="text-sm font-medium text-slate-900">{(product as any).singleUnitColor}</span>
                        </div>
                      </div>
                    )}
                    {product.baseSku && <InfoField label="SKU" value={product.baseSku} />}
                    <InfoField label="Price" value={`₹${product.basePrice}`} />
                    <InfoField label="Stock Quantity" value={`${product.inventory?.baseStock ?? 0}`} />
                    {((product as any).lowStockThreshold ?? (product.inventory as any)?.lowStockThreshold) != null && (
                      <InfoField label="Low Stock Alert" value={`${(product as any).lowStockThreshold ?? (product.inventory as any)?.lowStockThreshold}`} />
                    )}
                  </div>
                </div>

                {/* Variants */}
                {product.variants.map((variant, idx) => (
                  <div key={variant.id || idx} className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {/* Variant image(s) — leftmost, before the color swatch / name / SKU. Click to open in the in-app viewer. */}
                      {variant.images && variant.images.length > 0 && (
                        <div className="flex gap-2 shrink-0">
                          {variant.images.map((imgUrl, imgIdx) => (
                            <button
                              type="button"
                              key={imgIdx}
                              onClick={() => imgUrl && openDoc(imgUrl, `${variant.size || ''} ${variant.color || ''}`.trim() || product.name, true)}
                              className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0 cursor-zoom-in hover:border-slate-400 transition-colors"
                            >
                              <Image src={imgUrl} alt={`${variant.size} ${variant.color}`} fill sizes="80px" className="object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                      {variant.colorHex && (
                        <div className="w-8 h-8 rounded-lg border-2 border-slate-200 shadow-sm shrink-0" style={{ backgroundColor: variant.colorHex }} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {(variant as any).variantName || variant.color || '—'}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">{variant.sku}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {(variant as any).variantName && <InfoField label="Variant Name" value={(variant as any).variantName} />}
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <p className="text-xs font-medium text-slate-500 mb-1">Color</p>
                        <div className="flex items-center gap-2">
                          {variant.colorHex && (
                            <span className="w-4 h-4 rounded border border-slate-200 shrink-0" style={{ backgroundColor: variant.colorHex }} />
                          )}
                          <span className="text-sm font-medium text-slate-900">{variant.color || '—'}</span>
                        </div>
                      </div>
                      <InfoField label="SKU" value={variant.sku} />
                      <InfoField label="Price" value={`₹${variant.price}`} />
                      <InfoField label="Stock Quantity" value={`${variant.stock ?? 0}`} />
                      {(variant as any).lowStockThreshold != null && (variant as any).lowStockThreshold !== '' && (
                        <InfoField label="Low Stock Alert" value={`${(variant as any).lowStockThreshold}`} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing Configuration — the vendor's own payout economics. The admin's
              MRP and discount are deliberately not shown (and not sent by the backend):
              together they reveal M2C's selling price. Tax + Total are what the vendor
              is actually paid per unit — base price plus their GST. */}
          <SpecSection icon={<DollarSign className="h-4 w-4" />} title="Pricing Configuration">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InfoField label="Base Price" value={`₹${product.basePrice}`} />
              <InfoField
                label="GST Rate"
                value={`${product.vendorGstRate ?? product.gstPercentage ?? 0}%`}
              />
              <InfoField
                label="Tax Amount"
                value={`₹${(product.vendorTaxAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              />
              <InfoField
                label="Total Amount"
                value={`₹${(product.vendorTotalAmount ?? product.basePrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              />
            </div>
          </SpecSection>

          {/* Stock Quantity Management — mirrors the "Inventory" tab */}
          {(() => {
            const baseStock = product.inventory?.baseStock ?? 0;
            const variantsStock = (product.variants || []).reduce((s, v) => s + (v.stock || 0), 0);
            // Total = base unit stock + every variant's stock. The backend's
            // stored totalStock can lag behind (it sometimes reflects variants
            // only), so compute it from the live parts for variant products.
            const totalStock = product.hasVariants ? baseStock + variantsStock : (product.totalStock ?? 0);
            return (
          <SpecSection icon={<Warehouse className="h-4 w-4" />} title="Stock Quantity Management">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InfoField label="Total Stock" value={`${totalStock} units`} />
              {product.hasVariants ? <InfoField label="Base Unit Stock" value={`${baseStock} units`} /> : null}
              {product.hasVariants && product.variants ? <InfoField label="Variants Stock" value={`${variantsStock} units`} /> : null}
              {((product as any).lowStockThreshold ?? (product.inventory as any)?.lowStockThreshold) != null && (
                <InfoField label="Low Stock Threshold" value={`${(product as any).lowStockThreshold ?? (product.inventory as any)?.lowStockThreshold}`} />
              )}
            </div>
          </SpecSection>
            );
          })()}

          {/* Dispatch Timeline Configuration — mirrors the "Shipping" tab */}
          {(product.dispatchTimeline || product.weight) && (
            <SpecSection icon={<Truck className="h-4 w-4" />} title="Dispatch Timeline Configuration">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {product.dispatchTimeline && <InfoField label="Processing Days" value={`${product.dispatchTimeline.processingDays}`} />}
                {product.dispatchTimeline && <InfoField label="Shipping Days" value={`${product.dispatchTimeline.shippingDays}`} />}
                {product.dispatchTimeline && <InfoField label="Total Days" value={`${product.dispatchTimeline.totalDays} days`} />}
                {product.weight && (
                  <InfoField
                    icon={<Scale className="h-3.5 w-3.5" />}
                    label="Shipping Weight"
                    value={`${product.weight}${(product as any).weightUnit ? ` ${(product as any).weightUnit}` : ''}`}
                  />
                )}
              </div>
            </SpecSection>
          )}
        </div>

        {/* Sidebar — sticks below the pinned header (top offset clears the
            sticky breadcrumb + product-title bar) while the main column scrolls. */}
        <div className="space-y-6 lg:sticky lg:top-[188px] lg:self-start">

          {/* Status & Availability — mirrors the create form's sidebar */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Tag className="h-4 w-4 text-slate-500" />
                Status &amp; Availability
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Product Status</p>
                <Badge className={`${getStatusColor(product.status)} text-xs`}>{product.status?.replace(/_/g, ' ')}</Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Availability</p>
                <p className="text-sm text-slate-900 mt-0.5 font-medium">{product.totalStock && product.totalStock > 0 ? 'In Stock' : 'Out of Stock'}</p>
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

/** Card wrapper matching the create form's section headings. */
function SpecSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <span className="text-slate-500">{icon}</span>
          {title}
        </h2>
      </div>
      <div className="p-4">{children}</div>
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
