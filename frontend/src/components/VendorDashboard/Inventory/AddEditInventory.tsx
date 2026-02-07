'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/UI/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { ArrowLeft, Save, Package, AlertTriangle, Plus } from 'lucide-react'
import Link from 'next/link'
import Dropdown from '@/components/UI/Dropdown'
import inventoryService, { CreateInventoryData, VendorCategories } from '@/services/inventoryService'

interface InventoryFormData {
  // Basic Product Info (Primary Data)
  name: string
  sku: string
  category: string
  subcategory: string
  description: string
  manufacturingDate?: string // New field for manufacturing date
  
  // Inventory Management
  currentStock: number
  minStock: number
  location: string
  
  // Product Status
  status: 'active' | 'inactive'
  
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

// Default locations - these can be made dynamic later if needed
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
  const [isLoadingData, setIsLoadingData] = useState(isEdit && !!inventoryId)
  const [vendorCategories, setVendorCategories] = useState<Array<{id?: string; name: string; slug?: string}>>([])
  const [vendorSubcategories, setVendorSubcategories] = useState<Array<{id: string; name: string; slug: string}>>([])
  const [filteredSubcategories, setFilteredSubcategories] = useState<Array<{id: string; name: string; slug: string}>>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)

  const [formData, setFormData] = useState<InventoryFormData>({
    name: '',
    sku: '',
    category: '',
    subcategory: '',
    description: '',
    manufacturingDate: '',
    
    currentStock: 0,
    minStock: 5,
    location: '',
    
    status: 'active',
    
    sourceType: null,
    supplier: '',
    lastRestocked: '',
    notes: '',
    
    hasProductCreated: false,
    productId: ''
  })

  // Load vendor's selected categories
  useEffect(() => {
    const loadVendorCategories = async () => {
      try {
        setIsLoadingCategories(true)
        
        // Check if vendor is logged in
        if (typeof window === 'undefined') return;
        
        const vendorToken = localStorage.getItem('vendorToken')
        if (!vendorToken) {
          console.log('No vendor token found, redirecting to login')
          router.push('/vendor')
          return
        }
        
        const categoriesData = await inventoryService.getVendorCategories()
        setVendorCategories(categoriesData.categories)
        setVendorSubcategories(categoriesData.subcategories)
      } catch (error: any) {
        console.error('Error loading vendor categories:', error)
        if (error.response?.status === 401) {
          alert('Authentication required. Please login again.')
          router.push('/vendor')
        } else {
          alert('Failed to load categories. Using default categories.')
          // Fallback to some default categories if API fails
          setVendorCategories([
            { name: 'Kitchen Linen' },
            { name: 'Bath Linen' },
            { name: 'Bed Linen' },
            { name: 'Table Linen' },
            { name: 'Towels' }
          ])
        }
      } finally {
        setIsLoadingCategories(false)
      }
    }

    loadVendorCategories()
  }, [router])

  // Update filtered subcategories when vendor subcategories change
  useEffect(() => {
    if (formData.category) {
      // For now, show all subcategories since we don't have parent-child relationship data
      // In a real implementation, you'd filter based on the selected category
      setFilteredSubcategories(vendorSubcategories)
    } else {
      setFilteredSubcategories([])
    }
  }, [vendorSubcategories, formData.category])

  // Load inventory data for editing
  useEffect(() => {
    if (isEdit && inventoryId) {
      setIsLoadingData(true)
      
      const loadInventoryData = async () => {
        try {
          const inventoryItem = await inventoryService.getItem(inventoryId)
          const formattedData = inventoryService.formatForForm(inventoryItem)
          setFormData(formattedData)
        } catch (error: any) {
          console.error('Error loading inventory data:', error)
          if (error.response?.status === 404) {
            alert('Inventory item not found')
            router.push('/vendor/dashboard/inventory')
          } else if (error.response?.status === 401) {
            alert('Authentication required. Please login again.')
            router.push('/vendor')
          } else {
            alert('Failed to load inventory data: ' + error.message)
          }
        } finally {
          setIsLoadingData(false)
        }
      }

      loadInventoryData()
    } else {
      // If we're in edit mode but no inventoryId, set loading to false
      if (isEdit && !inventoryId) {
        setIsLoadingData(false)
      }
    }
  }, [isEdit, inventoryId, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : 
               type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleDropdownChange = (name: string, value: string) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      }
      
      // Reset subcategory when category changes
      if (name === 'category') {
        newData.subcategory = ''
      }
      
      return newData
    })
    
    // Filter subcategories when category changes
    if (name === 'category') {
      // For now, show all subcategories since we don't have parent-child relationship data
      // In a real implementation, you'd filter based on the selected category
      setFilteredSubcategories(vendorSubcategories)
    }
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
    
    // Client-side validation
    if (formData.sourceType === 'supplier' && !formData.supplier?.trim()) {
      alert('Supplier name is required when supplier is selected as source type.')
      return
    }
    
    setIsLoading(true)

    try {
      const apiData = inventoryService.formatForAPI(formData)
      
      if (isEdit && inventoryId) {
        console.log('Updating inventory item:', inventoryId, apiData)
        await inventoryService.updateItem(inventoryId, apiData)
        console.log('✅ Inventory item updated successfully')
      } else {
        console.log('Creating inventory item:', apiData)
        const createdItem = await inventoryService.createItem(apiData as CreateInventoryData)
        console.log('✅ Inventory item created successfully:', createdItem.id)
      }
      
      router.push('/vendor/dashboard/inventory')
    } catch (error: any) {
      console.error('❌ Error saving inventory item:', error)
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        alert(error.response.data.message || 'Invalid data provided')
      } else if (error.response?.status === 401) {
        alert('Authentication required. Please login again.')
        router.push('/vendor')
      } else {
        alert('Failed to save inventory item. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProduct = () => {
    // Navigate to product creation with this inventory item pre-selected
    router.push(`/vendor/dashboard/products/add?inventoryId=${inventoryId}`)
  }

  if (isLoadingData || isLoadingCategories) {
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
              <span className="ml-3 text-slate-600">
                {isLoadingData ? 'Loading inventory data...' : 'Loading categories...'}
              </span>
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
                      options={vendorCategories.map(cat => cat.name)}
                      placeholder={isLoadingCategories ? "Loading categories..." : "Select Category"}
                      onChange={(value) => handleDropdownChange('category', value as string)}
                    />
                    {isLoadingCategories && (
                      <p className="text-xs text-slate-500 mt-1">Loading your selected categories...</p>
                    )}
                    {!isLoadingCategories && vendorCategories.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        No categories found. Please update your vendor profile to add product categories.
                      </p>
                    )}
                  </div>
                  <div>
                    <Dropdown
                      id="subcategory"
                      label="Subcategory"
                      value={formData.subcategory}
                      options={filteredSubcategories.map(sub => sub.name)}
                      placeholder={formData.category ? "Select Subcategory" : "Select category first"}
                      onChange={(value) => handleDropdownChange('subcategory', value as string)}
                    />
                    {formData.category && filteredSubcategories.length === 0 && (
                      <p className="text-xs text-slate-500 mt-1">No subcategories available for this category</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div></div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      SKU *
                    </label>
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#222222] focus:border-[#222222]"
                      placeholder="Enter SKU"
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
                    <span className="text-xs text-slate-500 ml-2">(Optional - Select one if applicable)</span>
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
                  
                  {!formData.sourceType && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700">
                        💡 You can skip this section if you don't want to specify a source type. 
                        Select "Supplier" if you purchase from external vendors, or "Manufacture" if you make the products yourself.
                      </p>
                    </div>
                  )}
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
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors ${
                            formData.sourceType === 'supplier' && !formData.supplier?.trim()
                              ? 'border-red-300 bg-red-50' 
                              : 'border-gray-200'
                          }`}
                          placeholder="Enter supplier name"
                        />
                        {formData.sourceType === 'supplier' && !formData.supplier?.trim() && (
                          <p className="text-xs text-red-600 mt-1">Supplier name is required when supplier is selected</p>
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