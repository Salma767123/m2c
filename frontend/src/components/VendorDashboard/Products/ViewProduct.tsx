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
  User, 
  Tag, 
  DollarSign,
  FileText,
  Image as ImageIcon,
  Layers,
  Warehouse,
  MapPin,
  Clock
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
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'out_of_stock':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getApprovalColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6" aria-label="Breadcrumb">
          <div className="flex items-center space-x-2">
            <Link href="/vendor/dashboard" className="hover:text-gray-900 transition-colors duration-200 hover:underline">
              Dashboard
            </Link>
            <span className="text-gray-400">/</span>
            <Link href="/vendor/dashboard/products" className="hover:text-gray-900 transition-colors duration-200 hover:underline">
              Products
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium" aria-current="page">
              Loading...
            </span>
          </div>
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
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6" aria-label="Breadcrumb">
          <div className="flex items-center space-x-2">
            <Link href="/vendor/dashboard" className="hover:text-gray-900 transition-colors duration-200 hover:underline">
              Dashboard
            </Link>
            <span className="text-gray-400">/</span>
            <Link href="/vendor/dashboard/products" className="hover:text-gray-900 transition-colors duration-200 hover:underline">
              Products
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium" aria-current="page">
              Product Not Found
            </span>
          </div>
        </nav>

        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Product not found</p>
            <p className="text-sm text-gray-400">The requested product could not be found.</p>
            <Button 
              onClick={() => router.push('/vendor/dashboard/products')}
              className="mt-4"
            >
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
      <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6" aria-label="Breadcrumb">
        <div className="flex items-center space-x-2">
          <Link href="/vendor/dashboard" className="hover:text-gray-900 transition-colors duration-200 hover:underline">
            Dashboard
          </Link>
          <span className="text-gray-400">/</span>
          <Link href="/vendor/dashboard/products" className="hover:text-gray-900 transition-colors duration-200 hover:underline">
            Products
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium" aria-current="page">
            {product.name}
          </span>
        </div>
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
            {product.approvalStatus?.toLowerCase() || 'pending'}
          </Badge>
          <Link href={`/vendor/dashboard/products/${productId}/edit`}>
            <Button className="bg-gray-900 text-white hover:bg-black">
              <Edit className="h-4 w-4 mr-2" />
              Edit Product
            </Button>
          </Link>
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
          {product.fabricSpecifications && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Layers className="h-5 w-5 mr-2" />
                  Fabric Specifications
                </CardTitle>
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
                  {product.fabricSpecifications.composition && (
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500">Composition</span>
                      <span className="text-gray-900">{product.fabricSpecifications.composition}</span>
                    </div>
                  )}
                  {product.fabricSpecifications.weight && (
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-500">Weight</span>
                      <span className="text-gray-900">{product.fabricSpecifications.weight}</span>
                    </div>
                  )}
                </div>

                {product.fabricSpecifications.careInstructions && product.fabricSpecifications.careInstructions.length > 0 && (
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
              </CardContent>
            </Card>
          )}
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
                  <p className="text-sm font-medium text-gray-900">Base Price</p>
                  <p className="text-lg font-bold text-gray-900">₹{product.basePrice.toFixed(2)}</p>
                  {product.originalPrice && product.originalPrice !== product.basePrice && (
                    <p className="text-sm text-gray-500 line-through">₹{product.originalPrice.toFixed(2)}</p>
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
                <Package className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Base SKU</p>
                  <p className="text-sm text-gray-600 font-mono">{product.baseSku}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Stock Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Warehouse className="h-5 w-5 mr-2" />
                Stock Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Total Stock</p>
                <p className={`text-2xl font-bold ${
                  (product.hasVariants && product.variants 
                    ? product.variants.reduce((sum, v) => sum + v.stock, 0)
                    : product.totalStock
                  ) === 0 ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {product.hasVariants && product.variants 
                    ? product.variants.reduce((sum, v) => sum + v.stock, 0)
                    : product.totalStock
                  }
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-900">Low Stock Threshold</p>
                <p className="text-gray-600">{product.lowStockThreshold}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-900">Variants</p>
                <p className="text-gray-600">
                  {product.hasVariants ? `${product.variants?.length || 0} variants` : 'No variants'}
                </p>
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
                        <div className="flex items-center">
                          <span className="font-medium text-gray-500">Color:</span>
                          <div className="flex items-center ml-2">
                            {variant.colorHex && (
                              <div 
                                className="w-3 h-3 rounded border border-gray-300 mr-1"
                                style={{ backgroundColor: variant.colorHex }}
                              ></div>
                            )}
                            <span className="text-gray-900">{variant.color}</span>
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Price:</span>
                          <span className="ml-2 text-gray-900">₹{variant.price.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Stock:</span>
                          <span className={`ml-2 ${variant.stock === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            {variant.stock}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium text-gray-500">SKU:</span>
                          <span className="ml-2 text-gray-900 font-mono text-xs">{variant.sku}</span>
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
    </div>
  )
}