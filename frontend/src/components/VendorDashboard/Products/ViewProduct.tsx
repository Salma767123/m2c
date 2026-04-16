'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
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
    } catch (error: any) {
      console.error('Error loading product:', error)
      showErrorToast('Load Failed', error.message || 'Unable to load product details')
      router.push('/vendor/dashboard/products')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'out_of_stock': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getApprovalColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'qc_approved': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'reinspection': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link href="/vendor/dashboard" className="hover:text-gray-900 hover:underline">Dashboard</Link>
          <span className="text-gray-400">/</span>
          <Link href="/vendor/dashboard/products" className="hover:text-gray-900 hover:underline">Products</Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium">Loading...</span>
        </nav>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"></div>
          <span className="ml-3 text-gray-600">Loading product details...</span>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link href="/vendor/dashboard" className="hover:text-gray-900 hover:underline">Dashboard</Link>
          <span className="text-gray-400">/</span>
          <Link href="/vendor/dashboard/products" className="hover:text-gray-900 hover:underline">Products</Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium">Product Not Found</span>
        </nav>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Product not found</p>
            <Button onClick={() => router.push('/vendor/dashboard/products')} className="mt-4">
              Back to Products
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
        <Link href="/vendor/dashboard" className="hover:text-gray-900 hover:underline">Dashboard</Link>
        <span className="text-gray-400">/</span>
        <Link href="/vendor/dashboard/products" className="hover:text-gray-900 hover:underline">Products</Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 font-medium">{product.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/vendor/dashboard/products')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-gray-600">Product Details</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className={getStatusColor(product.status)}>
            {product.status?.toLowerCase().replace('_', ' ')}
          </Badge>
          <Badge className={getApprovalColor(product.approvalStatus || 'pending')}>
            {product.approvalStatus?.toLowerCase().replace('_', ' ') || 'pending'}
          </Badge>
          {product.approvalStatus !== 'APPROVED' && (
            <Link href={`/vendor/dashboard/products/${productId}/edit`}>
              <Button className="bg-gray-900 text-white hover:bg-black">
                <Edit className="h-4 w-4 mr-2" />
                Edit Product
              </Button>
            </Link>
          )}
          {product.approvalStatus === 'APPROVED' && (
            <span className="text-xs text-gray-500 italic">Approved — only admin can edit</span>
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
                Product Images (General)
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
                      {image.isPrimary && (
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-blue-100 text-blue-800 text-xs">Primary</Badge>
                        </div>
                      )}
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

          {/* Product Variants with Images */}
          {product.hasVariants && product.variants && product.variants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Layers className="h-5 w-5 mr-2" />
                  Product Variants ({product.variants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Base Variant Stock */}
                  <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {(product as any).singleUnitColorHex && (
                          <div
                            className="w-10 h-10 rounded border-2 border-blue-300 shadow-sm"
                            style={{ backgroundColor: (product as any).singleUnitColorHex }}
                            title={(product as any).singleUnitColor || 'Base'}
                          />
                        )}
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            Base Unit {(product as any).singleUnitSize && (product as any).singleUnitColor ? `(${(product as any).singleUnitSize} - ${(product as any).singleUnitColor})` : ''}
                          </h4>
                          <p className="text-xs text-blue-600 font-medium">Base / Default Variant</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">₹{product.basePrice}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs text-gray-500 mb-1">Vendor Price</p>
                        <p className="text-sm font-semibold text-gray-900">₹{product.basePrice}</p>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs text-gray-500 mb-1">Stock</p>
                        <p className="text-sm font-semibold text-blue-700">{product.inventory?.baseStock ?? 0} units</p>
                      </div>
                    </div>
                  </div>

                  {/* Individual Variants */}
                  {product.variants.map((variant, index) => (
                    <div key={variant.id || index} className="p-4 border rounded-lg bg-gray-50">
                      {/* Variant Details */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {variant.colorHex && (
                            <div
                              className="w-10 h-10 rounded border-2 border-gray-300 shadow-sm"
                              style={{ backgroundColor: variant.colorHex }}
                              title={variant.color}
                            />
                          )}
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {variant.size} - {variant.color}
                            </h4>
                            <p className="text-xs text-gray-500 font-mono">{variant.sku}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">₹{variant.price}</p>
                        </div>
                      </div>

                      {/* Variant Info Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white p-3 rounded border">
                          <p className="text-xs text-gray-500 mb-1">Vendor Price</p>
                          <p className="text-sm font-semibold text-gray-900">₹{variant.price}</p>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <p className="text-xs text-gray-500 mb-1">Stock</p>
                          <p className="text-sm font-semibold text-gray-900">{variant.stock} units</p>
                        </div>
                      </div>

                      {/* Variant Images */}
                      {variant.images && variant.images.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Variant Images</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {variant.images.map((imageUrl, imgIndex) => (
                              <div key={imgIndex} className="relative aspect-square rounded-lg overflow-hidden border bg-white">
                                <Image
                                  src={imageUrl}
                                  alt={`${variant.size} - ${variant.color} - Image ${imgIndex + 1}`}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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

          {/* Material Information */}
          <Card>
            <CardHeader>
              <CardTitle>Material Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {product.fabricType && (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-500">Fabric Type</span>
                    <span className="text-gray-900">{product.fabricType}</span>
                  </div>
                )}
                {product.material && (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-500">Material</span>
                    <span className="text-gray-900">{product.material}</span>
                  </div>
                )}
                {product.fabricSpecifications?.composition && (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-500">Composition</span>
                    <span className="text-gray-900">{product.fabricSpecifications.composition}</span>
                  </div>
                )}
                {product.fabricSpecifications?.weight && (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-500">Weight</span>
                    <span className="text-gray-900">{product.fabricSpecifications.weight}</span>
                  </div>
                )}
                {product.baseSku && (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-500">Base SKU</span>
                    <span className="text-gray-900 font-mono">{product.baseSku}</span>
                  </div>
                )}
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
                {product.dispatchTimeline && (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-500">Dispatch Timeline</span>
                    <span className="text-gray-900">
                      {product.dispatchTimeline.totalDays} days
                      ({product.dispatchTimeline.processingDays} processing + {product.dispatchTimeline.shippingDays} shipping)
                    </span>
                  </div>
                )}
              </div>

              {product.fabricSpecifications?.careInstructions && product.fabricSpecifications.careInstructions.length > 0 && (
                <div className="mt-4">
                  <span className="text-sm font-medium text-gray-500">Care Instructions</span>
                  <ul className="mt-1 space-y-1">
                    {product.fabricSpecifications.careInstructions.map((instruction, index) => (
                      <li key={index} className="text-gray-900 text-sm flex items-center">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                        {instruction}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {product.tags && product.tags.length > 0 && (
                <div className="mt-4">
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
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* Product Info */}
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Created Date</p>
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
                  {product.originalPrice && product.originalPrice > product.basePrice && (
                    <p className="text-sm text-gray-500 line-through">Original: ₹{product.originalPrice}</p>
                  )}
                  {product.discount && (
                    <p className="text-sm text-green-600">{product.discount}% off</p>
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
                  {product.hasVariants && product.variants && (
                    <p className="text-xs text-gray-500">
                      Base: {product.inventory?.baseStock ?? 0} units | Variants: {product.variants.reduce((sum, v) => sum + (v.stock || 0), 0)} units
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {product.hasVariants ? `${product.variants?.length || 0} variants` : 'No variants'}
                  </p>
                </div>
              </div>

              {/* Approval Status */}
              {product.approvalStatus === 'APPROVED' && product.approvedAt && (
                <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Product Approved</p>
                    <p className="text-sm text-green-700">
                      Approved on {new Date(product.approvedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}

              {product.approvalStatus === 'REJECTED' && product.rejectionReason && (
                <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <X className="h-4 w-4 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900">Product Rejected</p>
                    <p className="text-sm text-red-700 mt-1">
                      <span className="font-medium">Reason:</span> {product.rejectionReason}
                    </p>
                  </div>
                </div>
              )}

              {product.approvalStatus === 'PENDING' && (
                <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <Package className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Pending Review</p>
                    <p className="text-sm text-yellow-700">
                      Your product is under review by admin.
                    </p>
                  </div>
                </div>
              )}

              {product.approvalStatus === 'QC_APPROVED' && (
                <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                  <Check className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">QC Approved</p>
                    <p className="text-sm text-blue-700">
                      Waiting for admin final approval.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
