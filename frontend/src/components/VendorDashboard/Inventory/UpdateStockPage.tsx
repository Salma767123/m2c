'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Badge } from '@/components/UI/Badge'
import { Package, TrendingUp, TrendingDown, ArrowLeft, Loader2, Save } from 'lucide-react'
import axiosInstance from '@/lib/axios'
import inventoryService from '@/services/inventoryService'
import { toast } from '@/hooks/use-toast'
import Image from 'next/image'

interface InventoryItem {
  id: string
  name: string
  sku: string
  category: string
  subcategory?: string
  currentStock: number
  baseStock: number // Now required field for base stock
  lowStockAlert: number
  status: string
  lastRestocked: string | null
  hasProductCreated: boolean
  productId?: string
}

interface ProductVariant {
  id: string
  size: string
  color: string
  colorHex?: string
  sku: string
  price: number
  stock: number
  images: string[]
}

interface Product {
  id: string
  name: string
  images: Array<{
    url: string
    alt: string
    isPrimary: boolean
  }>
  hasVariants: boolean
  variants: ProductVariant[]
  totalStock: number
  baseStock?: number
  singleUnitSize?: string
  singleUnitColor?: string
  singleUnitColorHex?: string
}

interface UpdateStockPageProps {
  inventoryId: string
}

export default function UpdateStockPage({ inventoryId }: UpdateStockPageProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [inventoryItem, setInventoryItem] = useState<InventoryItem | null>(null)
  const [product, setProduct] = useState<Product | null>(null)

  // Stock update form state
  const [newStock, setNewStock] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<{ newStock?: string; reason?: string }>({})

  // Variant stock updates
  const [variantStocks, setVariantStocks] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchInventoryData()
  }, [inventoryId])

  const fetchInventoryData = async () => {
    try {
      setIsLoading(true)

      // Fetch inventory item
      const inventoryResponse = await axiosInstance.get(`/inventory/${inventoryId}`)

      if (inventoryResponse.data.success) {
        const item = inventoryResponse.data.data
        setInventoryItem(item)
        // Use baseStock from backend
        setNewStock(item.baseStock.toString())

        // If product exists, fetch product details with variants
        if (item.hasProductCreated && item.productId) {
          const productResponse = await axiosInstance.get(`/products/${item.productId}`)

          if (productResponse.data.success) {
            const productData = productResponse.data.data
            setProduct(productData)

            // Initialize variant stocks
            if (productData.hasVariants && productData.variants && productData.variants.length > 0) {
              const initialStocks: Record<string, number> = {}
              let variantSum = 0
              productData.variants.forEach((v: ProductVariant) => {
                const s = parseInt(v.stock?.toString()) || 0
                initialStocks[v.id] = s
                variantSum += s
              })
              setVariantStocks(initialStocks)

              // Use the backend baseStock
              const bStockValue = item.baseStock

              setNewStock(bStockValue.toString())
            } else {
              // Use baseStock from backend
              setNewStock(item.baseStock.toString())
              setVariantStocks({})
            }
          }
        } else {
          // Use baseStock from backend
          setNewStock(item.baseStock.toString())
        }
      }
    } catch (error: any) {
      console.error('Error fetching inventory data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load inventory data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const validate = () => {
    const newErrors: { newStock?: string; reason?: string } = {}

    // Base stock validation - only if user changed it? No, if it's there, check it.
    // If hasVariants, we might want to allow empty base stock update if it hasn't changed.
    // But for simplicity, let's validate it if it's visible.

    // Check if base stock has changed
    const baseStockChanged = inventoryItem && parseInt(newStock) !== inventoryItem.baseStock

    if (baseStockChanged || !product?.hasVariants) {
      if (!newStock || newStock.trim() === '') {
        newErrors.newStock = 'Stock quantity is required'
      } else if (parseInt(newStock) < 0) {
        newErrors.newStock = 'Stock cannot be negative'
      } else if (isNaN(parseInt(newStock))) {
        newErrors.newStock = 'Please enter a valid number'
      }
    }

    if (!reason || reason.trim() === '') {
      newErrors.reason = 'Reason is required'
    } else if (reason.trim().length < 5) {
      newErrors.reason = 'Reason must be at least 5 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate() || !inventoryItem) {
      return
    }

    try {
      setIsSaving(true)

      // 1. Update Variant Stocks if applicable
      if (product?.hasVariants) {
        await axiosInstance.put(`/products/${product.id}/variants/stock`, {
          variants: Object.entries(variantStocks).map(([variantId, stock]) => ({
            variantId,
            stock
          })),
          reason: reason.trim(),
          notes: notes.trim() || undefined
        })
      }

      // 2. Update base inventory stock
      // Use baseStock from database
      const currentBaseStock = inventoryItem.baseStock
      const baseStockChanged = parseInt(newStock) !== currentBaseStock

      if (baseStockChanged || !product?.hasVariants) {
        await inventoryService.updateStock(inventoryId, {
          currentStock: parseInt(newStock),
          reason: reason.trim(),
          notes: notes.trim() || undefined
        })
      }

      toast({
        title: 'Success',
        description: 'Stock updated successfully'
      })

      router.push('/vendor/dashboard/inventory')
    } catch (error: any) {
      console.error('Error updating stock:', error)
      const errorMessage = error.message ||
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Failed to update stock'

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleVariantStockChange = (variantId: string, value: string) => {
    const numValue = parseInt(value) || 0
    setVariantStocks(prev => ({
      ...prev,
      [variantId]: numValue < 0 ? 0 : numValue
    }))
  }

  const calculateTotalVariantStock = () => {
    return Object.values(variantStocks).reduce((sum, stock) => sum + stock, 0)
  }

  const getAggregateStock = () => {
    const vSum = calculateTotalVariantStock()
    const bStock = parseInt(newStock) || 0
    return vSum + bStock
  }

  // Calculate the difference from the ORIGINAL aggregate stock
  // This ensures that when the page loads, the difference is 0.
  const stockDifference = getAggregateStock() - (inventoryItem?.currentStock || 0)

  const isIncrease = stockDifference > 0
  const isDecrease = stockDifference < 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    )
  }

  if (!inventoryItem) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900">Inventory item not found</p>
          <Button onClick={() => router.push('/vendor/dashboard/inventory')} className="mt-4">
            Back to Inventory
          </Button>
        </div>
      </div>
    )
  }

  const primaryImage = product?.images?.find(img => img.isPrimary)?.url || product?.images?.[0]?.url

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/vendor/dashboard/inventory')}
            className="hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#222222]">Update Stock</h1>
            <p className="text-slate-600">Manage inventory stock levels</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Product Information */}
        <Card className="lg:col-span-1 border border-gray-200">
          <CardHeader className="bg-gray-50 border-b border-gray-200">
            <CardTitle className="text-[#222222]">Product Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {/* Product Image */}
            {primaryImage && (
              <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100">
                <Image
                  src={primaryImage}
                  alt={inventoryItem.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-500">Product Name</label>
                <p className="text-base font-semibold text-[#222222]">{inventoryItem.name}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-500">SKU</label>
                <p className="text-base font-mono text-[#222222]">{inventoryItem.sku}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-500">Category</label>
                <p className="text-base text-[#222222]">
                  {inventoryItem.category}
                  {inventoryItem.subcategory && ` / ${inventoryItem.subcategory}`}
                </p>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-500">Current Stock</span>
                  <span className="text-2xl font-bold text-[#222222]">
                    {product?.hasVariants ? product.totalStock : inventoryItem.currentStock}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm font-medium text-slate-500">Min Stock</span>
                  <span className="text-base text-slate-600">{inventoryItem.lowStockAlert}</span>
                </div>
              </div>

              {product?.hasVariants && (
                <div className="pt-3 border-t border-gray-200">
                  <Badge className="bg-blue-100 text-blue-800">
                    Has {product.variants.length} Variants
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stock Update Form */}
        <Card className="lg:col-span-2 border border-gray-200">
          <CardHeader className="bg-gray-50 border-b border-gray-200">
            <CardTitle className="text-[#222222]">
              {product?.hasVariants ? 'Update Variant Stocks' : 'Update Stock Quantity'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Variant Stock Updates */}
              {product?.hasVariants && product.variants.length > 0 && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-slate-700">
                    Variant Stock Levels <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    {product.variants.map((variant) => (
                      <div
                        key={variant.id}
                        className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                      >
                        {/* Variant Image */}
                        {variant.images && variant.images.length > 0 && (
                          <div className="relative w-16 h-16 rounded-md overflow-hidden bg-gray-100 shrink-0">
                            <Image
                              src={variant.images[0]}
                              alt={`${variant.size} - ${variant.color}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}

                        {/* Variant Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#222222]">{variant.size}</span>
                            <span className="text-gray-400">•</span>
                            <div className="flex items-center gap-2">
                              {variant.colorHex && (
                                <div
                                  className="w-4 h-4 rounded-full border border-gray-300"
                                  style={{ backgroundColor: variant.colorHex }}
                                />
                              )}
                              <span className="text-slate-700">{variant.color}</span>
                            </div>
                          </div>
                          <p className="text-sm text-slate-500 font-mono">{variant.sku}</p>
                          <p className="text-sm text-slate-600">Current: {variant.stock} units</p>
                        </div>

                        {/* Stock Input */}
                        <div className="w-32">
                          <input
                            type="number"
                            value={variantStocks[variant.id] || 0}
                            onChange={(e) => handleVariantStockChange(variant.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#222222] focus:border-transparent"
                            min="0"
                            disabled={isSaving}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total Stock Summary */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">Total Stock</span>
                      <span className="text-xl font-bold text-[#222222]">
                        {calculateTotalVariantStock()} units
                      </span>
                    </div>

                  </div>
                </div>
              )}

              {/* Base/Total Stock Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {product?.hasVariants ? (
                    <span>
                      Base Variant Stock
                      {product.singleUnitSize && product.singleUnitColor && (
                        <span className="ml-1 text-slate-500 font-normal">
                          ({product.singleUnitSize} - {product.singleUnitColor})
                          {product.singleUnitColorHex && (
                            <span
                              className="inline-block w-3 h-3 rounded-full ml-1 border border-gray-200 align-middle"
                              style={{ backgroundColor: product.singleUnitColorHex }}
                            />
                          )}
                        </span>
                      )}
                    </span>
                  ) : 'New Stock Quantity'} <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col gap-1 mb-2">
                  {product?.hasVariants && (
                    <p className="text-xs text-slate-500">
                      Update the stock for the base/default variant (Inventory Stock).
                    </p>
                  )}
                </div>
                <input
                  type="number"
                  value={newStock}
                  onChange={(e) => {
                    setNewStock(e.target.value)
                    setErrors({ ...errors, newStock: undefined })
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#222222] focus:border-transparent ${errors.newStock ? 'border-red-500' : 'border-gray-200'
                    }`}
                  placeholder="Enter stock quantity"
                  min="0"
                  disabled={isSaving}
                />
                {errors.newStock && (
                  <p className="mt-1 text-sm text-red-600">{errors.newStock}</p>
                )}

                {/* Stock Change Indicator for Total Aggregate Stock */}
                {stockDifference !== 0 && !isNaN(stockDifference) && (
                  <div
                    className={`flex items-center space-x-2 p-3 mt-2 rounded-lg ${isIncrease ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}
                  >
                    {isIncrease ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : (
                      <TrendingDown className="h-5 w-5" />
                    )}
                    <span className="font-medium">
                      {isIncrease ? '+' : ''}
                      {stockDifference} units
                    </span>
                    <span className="text-sm">({isIncrease ? 'Increase' : 'Decrease'})</span>
                  </div>
                )}
              </div>

              {/* Reason Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reason for Change <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value)
                    setErrors({ ...errors, reason: undefined })
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#222222] focus:border-transparent resize-none ${errors.reason ? 'border-red-500' : 'border-gray-200'
                    }`}
                  placeholder="e.g., New shipment received, Damaged items removed, Inventory correction"
                  rows={3}
                  disabled={isSaving}
                />
                {errors.reason && <p className="mt-1 text-sm text-red-600">{errors.reason}</p>}
                <p className="mt-1 text-xs text-slate-500">Minimum 5 characters required</p>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#222222] focus:border-transparent resize-none"
                  placeholder="Any additional information..."
                  rows={2}
                  disabled={isSaving}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  onClick={() => router.push('/vendor/dashboard/inventory')}
                  variant="outline"
                  className="flex-1 hover:bg-gray-50"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#222222] hover:bg-[#313131] text-white"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Stock
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div >
  )
}
