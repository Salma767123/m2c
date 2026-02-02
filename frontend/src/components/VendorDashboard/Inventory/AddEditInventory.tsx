'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/UI/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { ArrowLeft, Save, Package, AlertTriangle, Plus } from 'lucide-react'
import Link from 'next/link'
import Dropdown from '@/components/UI/Dropdown'

interface InventoryFormData {
  // Basic Product Info (Primary Data)
  name: string
  sku: string
  category: string
  description: string
  manufacturingDate?: string // New field for manufacturing date
  
  // Inventory Management
  currentStock: number
  minStock: number
  location: string
  
  // Product Status
  status: 'active' | 'inactive'
  trackInventory: boolean
  
  // Additional Info - Source Type
  sourceType: 'supplier' | 'manufacture' | null // New field to track source type
  supplier?: string
  lastRestocked?: string
  notes?: string
  
  // Product Creation Status
  hasProductCreated: boolean // Whether this inventory item has been used to create a product
  productId?: string // Link to created product
}

interface AddEditInventoryProps {
  inventoryId?: string
  isEdit?: boolean
}

const categories = [
  'Kitchen Linen', 'Bath Linen', 'Bed Linen', 'Table Linen', 'Towels', 'Aprons', 'Curtains', 'Blankets', 'Pillows'
]

const locations = [
  'Main Warehouse - Section A', 
  'Main Warehouse - Section B', 
  'Storage Room 1', 
  'Storage Room 2', 
  'Display Area'
]

export default function AddEditInventory({ inventoryId, isEdit = false }: AddEditInventoryProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(isEdit)

  const [formData, setFormData] = useState<InventoryFormData>({
    name: '',
    sku: '',
    category: '',
    description: '',
    manufacturingDate: '',
    
    currentStock: 0,
    minStock: 5,
    location: '',
    
    status: 'active',
    trackInventory: true,
    
    sourceType: null,
    supplier: '',
    lastRestocked: '',
    notes: '',
    
    hasProductCreated: false,
    productId: ''
  })

  // Auto-generate SKU from name and category
  const generateSKU = (name: string, category: string) => {
    const namePrefix = name.split(' ').map(word => word.charAt(0)).join('').toUpperCase()
    const categoryPrefix = category.split(' ').map(word => word.charAt(0)).join('').toUpperCase()
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `${categoryPrefix}-${namePrefix}-${randomNum}`
  }

  // Load inventory data for editing
  useEffect(() => {
    if (isEdit && inventoryId) {
      setIsLoadingData(true)
      
      const loadInventoryData = async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Mock inventory data
          setFormData({
            name: 'Cotton Kitchen Towel',
            sku: 'KL-CKT-001',
            category: 'Kitchen Linen',
            description: 'High-quality cotton kitchen towel with excellent absorbency',
            manufacturingDate: '2024-01-10',
            
            currentStock: 45,
            minStock: 10,
            location: 'Main Warehouse - Section A',
            
            status: 'active',
            trackInventory: true,
            
            sourceType: 'supplier',
            supplier: 'Cotton Mills Ltd',
            lastRestocked: '2024-01-15',
            notes: 'Popular item, restock regularly',
            
            hasProductCreated: false,
            productId: ''
          })
        } catch (error) {
          console.error('Error loading inventory data:', error)
        } finally {
          setIsLoadingData(false)
        }
      }

      loadInventoryData()
    }
  }, [isEdit, inventoryId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : 
               type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
      // Auto-generate SKU when name or category changes
      ...(name === 'name' && prev.category && { sku: generateSKU(value, prev.category) })
    }))
  }

  const handleDropdownChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Auto-generate SKU when category changes
      ...(name === 'category' && prev.name && { sku: generateSKU(prev.name, value) })
    }))
  }

  const handleSourceTypeChange = (sourceType: 'supplier' | 'manufacture') => {
    setFormData(prev => {
      // If clicking the same type that's already selected, deselect it
      if (prev.sourceType === sourceType) {
        return {
          ...prev,
          sourceType: null,
          supplier: '',
          lastRestocked: '',
          // Clear any source-specific data
          notes: prev.notes // Keep general notes
        }
      }
      
      // If selecting a different type, automatically close previous and open new
      return {
        ...prev,
        sourceType: sourceType,
        // Always clear supplier field when switching (fresh start)
        supplier: '',
        // Clear lastRestocked for fresh start
        lastRestocked: ''
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (isEdit) {
        console.log('Updating inventory item:', inventoryId, formData)
        // API call: PUT /api/vendor/inventory/${inventoryId}
      } else {
        console.log('Creating inventory item:', formData)
        // API call: POST /api/vendor/inventory
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      router.push('/vendor/dashboard/inventory')
    } catch (error) {
      console.error('Error saving inventory item:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProduct = () => {
    // Navigate to product creation with this inventory item pre-selected
    router.push(`/vendor/dashboard/products/add?inventoryId=${inventoryId}`)
  }

  if (isLoadingData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/vendor/dashboard/inventory">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Inventory
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-[#222222]">Loading...</h1>
          </div>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#222222]"></div>
              <span className="ml-3 text-slate-600">Loading inventory data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-[#222222]">
            {isEdit ? 'Edit Inventory Item' : 'Add New Inventory Item'}
          </h1>
        </div>
      </div>
 
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Basic Product Information */}
            <Card className="border border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-[#222222]">Basic Product Information</CardTitle>
                <p className="text-sm text-slate-600">This will be the master product data</p>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#222222] focus:border-[#222222]"
                    placeholder="Enter product name"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Dropdown
                      id="category"
                      label="Category *"
                      value={formData.category}
                      options={categories}
                      placeholder="Select Category"
                      onChange={(value) => handleDropdownChange('category', value as string)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      SKU * <span className="text-xs text-slate-500">(Auto-generated)</span>
                    </label>
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#222222] focus:border-[#222222]"
                      placeholder="Auto-generated or custom SKU"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Product Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#222222] focus:border-[#222222]"
                    placeholder="Basic product description"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Stock Management */}
            <Card className="border border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-[#222222]">Stock Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Current Stock *
                    </label>
                    <input
                      type="number"
                      name="currentStock"
                      value={formData.currentStock}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#222222] focus:border-[#222222]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Minimum Stock *
                    </label>
                    <input
                      type="number"
                      name="minStock"
                      value={formData.minStock}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#222222] focus:border-[#222222]"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="trackInventory"
                      checked={formData.trackInventory}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-[#222222] focus:ring-[#222222]"
                    />
                    <label className="ml-2 text-sm text-slate-700">
                      Track inventory for this item
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card className="border border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-[#222222]">Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                
                {/* Source Type Selection */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Product Source Type
                    <span className="text-xs text-slate-500 ml-2">(Select one option)</span>
                  </label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        formData.sourceType === 'supplier' 
                          ? 'border-gray-800 bg-gray-100 shadow-sm' 
                          : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                      onClick={() => handleSourceTypeChange('supplier')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                          formData.sourceType === 'supplier' 
                            ? 'border-gray-800 bg-gray-800' 
                            : 'border-gray-300'
                        }`}>
                          {formData.sourceType === 'supplier' && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900">Supplier</h4>
                          <p className="text-sm text-slate-600">Product sourced from external supplier</p>
                        </div>
                      </div>
                    </div>

                    <div 
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        formData.sourceType === 'manufacture' 
                          ? 'border-gray-800 bg-gray-100 shadow-sm' 
                          : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                      onClick={() => handleSourceTypeChange('manufacture')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                          formData.sourceType === 'manufacture' 
                            ? 'border-gray-800 bg-gray-800' 
                            : 'border-gray-300'
                        }`}>
                          {formData.sourceType === 'manufacture' && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900">Manufacture</h4>
                          <p className="text-sm text-slate-600">Product manufactured in-house</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conditional Fields Based on Source Type */}
                {formData.sourceType === 'supplier' && (
                  <div className="space-y-4 p-4 bg-gray-50 border border-gray-300 rounded-lg animate-in slide-in-from-top-2 duration-300">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-gray-800 rounded-full mr-2"></span>
                      Supplier Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Supplier Name *
                        </label>
                        <input
                          type="text"
                          name="supplier"
                          value={formData.supplier}
                          onChange={handleInputChange}
                          required={formData.sourceType === 'supplier'}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors ${
                            formData.sourceType === 'supplier' && !formData.supplier 
                              ? 'border-red-300 bg-red-50' 
                              : 'border-gray-200'
                          }`}
                          placeholder="Enter supplier name"
                        />
                        {formData.sourceType === 'supplier' && !formData.supplier && (
                          <p className="text-xs text-red-600 mt-1">Supplier name is required</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Last Restocked
                        </label>
                        <input
                          type="date"
                          name="lastRestocked"
                          value={formData.lastRestocked}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {formData.sourceType === 'manufacture' && (
                  <div className="space-y-4 p-4 bg-gray-50 border border-gray-300 rounded-lg animate-in slide-in-from-top-2 duration-300">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-gray-800 rounded-full mr-2"></span>
                      Manufacturing Information
                    </h4>
                    <div className="text-sm text-gray-700 mb-4 space-y-2">
                      <div className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-gray-600 rounded-full mr-2"></span>
                        <span>This product is manufactured in-house</span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-gray-600 rounded-full mr-2"></span>
                        <span>Full control over quality and production timeline</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Manufacturing Date
                        </label>
                        <input
                          type="date"
                          name="manufacturingDate"
                          value={formData.manufacturingDate}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Last Restocked
                        </label>
                        <input
                          type="date"
                          name="lastRestocked"
                          value={formData.lastRestocked}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes - Always visible */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#222222] focus:border-[#222222]"
                    placeholder="Any additional notes about this inventory item..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="border border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-[#222222]">Status & Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div>
                  <Dropdown
                    id="status"
                    label="Status"
                    value={formData.status}
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' }
                    ]}
                    onChange={(value) => handleDropdownChange('status', value as string)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Product Creation Status */}
            <Card className="border border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-[#222222]">Product Status</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {formData.hasProductCreated ? (
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-700">
                      <Package className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">Product Created</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      This inventory item has been used to create a product with variants.
                    </p>
                    <Link href={`/vendor/dashboard/products/edit/${formData.productId}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        View Product
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center text-slate-600">
                      <Package className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">No Product Created</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      After saving this inventory item, you can create a detailed product with variants.
                    </p>
                    {isEdit && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={handleCreateProduct}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Product
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stock Alert */}
            {formData.currentStock <= formData.minStock && (
              <Card className="border border-yellow-200">
                <CardHeader className="bg-yellow-50 border-b border-yellow-200">
                  <CardTitle className="flex items-center text-yellow-700">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Stock Alert
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-sm text-yellow-700">
                    Current stock ({formData.currentStock}) is at or below minimum threshold ({formData.minStock}).
                    Consider restocking soon.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card className="border border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-[#222222]">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Current Stock:</span>
                  <span className="font-medium text-[#222222]">
                    {formData.currentStock} units
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Min Stock Level:</span>
                  <span className="font-medium text-[#222222]">
                    {formData.minStock} units
                  </span>
                </div>
                {formData.sourceType && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Source Type:</span>
                    <span className="font-medium text-gray-800">
                      {formData.sourceType === 'supplier' ? 'Supplier' : 'Manufacture'}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="border border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-[#222222]">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#222222] text-white hover:bg-[#313131]"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Saving...' : (isEdit ? 'Update Item' : 'Create Item')}
                </Button>
                <Link href="/vendor/dashboard/inventory" className="block">
                  <Button type="button" variant="outline" className="w-full hover:bg-gray-50 hover:border-gray-200">
                    Cancel
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}