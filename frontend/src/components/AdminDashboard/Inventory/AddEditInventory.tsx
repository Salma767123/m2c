'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/UI/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { ArrowLeft, Save, Package, AlertTriangle, Plus } from 'lucide-react'
import Link from 'next/link'
import Dropdown from '@/components/UI/Dropdown'
import axiosInstance from '@/lib/axios'

interface InventoryFormData {
  // Basic Product Info (Primary Data)
  name: string
  sku: string
  category: string
  subcategory: string
  description: string
  manufacturingDate?: string // New field for manufacturing date
  
  // Vendor Information (NEW)
  vendorId?: string // Link to vendor
  vendorName?: string // Vendor name for display
  
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

interface Category {
  id: string
  name: string
  slug: string
  subcategories?: Array<{
    id: string
    name: string
    slug: string
  }>
}

// Remove hardcoded categories - will fetch from backend
// const categories = [
//   'Kitchen Linen', 'Bath Linen', 'Bed Linen', 'Table Linen', 'Towels', 'Aprons', 'Curtains', 'Blankets', 'Pillows'
// ]

// Mock vendors data - will be replaced with API call
// const mockVendors = [
//   { id: '1', name: 'Cotton Mills Ltd', email: 'contact@cottonmills.com', status: 'active' },
//   { id: '2', name: 'Textile Pro Industries', email: 'info@textilepro.com', status: 'active' },
//   { id: '3', name: 'Home Decor Inc', email: 'sales@homedecor.com', status: 'active' },
//   { id: '4', name: 'Sleep Comfort Co', email: 'orders@sleepcomfort.com', status: 'active' },
//   { id: '5', name: 'Warm Textiles', email: 'support@warmtextiles.com', status: 'active' },
//   { id: '6', name: 'Luxury Linens Co', email: 'hello@luxurylinens.com', status: 'active' }
// ]

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
  const [vendors, setVendors] = useState<Array<{ id: string; companyName: string; email: string; status: string }>>([])
  const [isLoadingVendors, setIsLoadingVendors] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [subcategories, setSubcategories] = useState<Array<{ id: string; name: string; slug: string }>>([])
  const [selectedCategoryName, setSelectedCategoryName] = useState('')
  
  // Track original stock for edit mode
  const [originalStock, setOriginalStock] = useState<number>(0)
  
  // Stock change reason modal
  const [showStockReasonModal, setShowStockReasonModal] = useState(false)
  const [stockChangeReason, setStockChangeReason] = useState('')
  const [pendingFormData, setPendingFormData] = useState<InventoryFormData | null>(null)

  const [formData, setFormData] = useState<InventoryFormData>({
    name: '',
    sku: '',
    category: '',
    subcategory: '',
    description: '',
    manufacturingDate: '',
    
    // Vendor Information (NEW)
    vendorId: '',
    vendorName: '',
    
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

  // Load inventory data for editing
  useEffect(() => {
    if (isEdit && inventoryId && !isLoadingCategories && categories.length > 0) {
      setIsLoadingData(true)
      
      const loadInventoryData = async () => {
        try {
          console.log('Loading inventory data for ID:', inventoryId)
          
          // Fetch actual inventory data from API
          const response = await axiosInstance.get(`/inventory/admin/all?limit=1000`)
          const inventoryItems = response.data.data.items || []
          const item = inventoryItems.find((inv: any) => inv.id === inventoryId)
          
          if (!item) {
            console.error('Inventory item not found')
            alert('Inventory item not found')
            router.push('/admin/dashboard/inventory')
            return
          }

          console.log('Loaded inventory item:', item)
          console.log('Available categories:', categories)
          
          // Store original stock for comparison
          setOriginalStock(item.currentStock || 0)
          
          // Find the category to get its ID
          const categoryMatch = categories.find(c => 
            c.name.toLowerCase() === item.category?.toLowerCase() || c.id === item.category
          )
          const categoryId = categoryMatch?.id || ''
          
          console.log('Category match:', categoryMatch, 'ID:', categoryId)
          
          // If category is found, load its subcategories
          if (categoryMatch && categoryMatch.subcategories) {
            setSubcategories(categoryMatch.subcategories)
            setSelectedCategoryName(categoryMatch.name)
          }
          
          // Find subcategory ID if it exists
          let subcategoryId = ''
          if (item.subcategory && categoryMatch?.subcategories) {
            const subcategoryMatch = categoryMatch.subcategories.find(
              (sc: any) => sc.name.toLowerCase() === item.subcategory?.toLowerCase() || sc.id === item.subcategory
            )
            subcategoryId = subcategoryMatch?.id || ''
            console.log('Subcategory match:', subcategoryMatch, 'ID:', subcategoryId)
          }
          
          setFormData({
            name: item.name || '',
            sku: item.sku || '',
            category: categoryId,
            subcategory: subcategoryId,
            description: item.description || '',
            manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate).toISOString().split('T')[0] : '',
            
            // Vendor Information
            vendorId: item.vendorId || '',
            vendorName: item.vendor?.companyName || '',
            
            currentStock: item.currentStock || 0,
            minStock: item.minStock || 5,
            location: item.location || '',
            
            status: item.status?.toLowerCase() === 'active' ? 'active' : 'inactive',
            trackInventory: true,
            
            sourceType: item.sourceType?.toLowerCase() as 'supplier' | 'manufacture' | null,
            supplier: item.supplier || '',
            lastRestocked: item.lastRestocked ? new Date(item.lastRestocked).toISOString().split('T')[0] : '',
            notes: item.notes || '',
            
            hasProductCreated: item.hasProductCreated || false,
            productId: item.productId || ''
          })
          
          console.log('Form data set with category:', categoryId, 'subcategory:', subcategoryId, 'vendor:', item.vendorId)
        } catch (error) {
          console.error('Error loading inventory data:', error)
          alert('Failed to load inventory data')
        } finally {
          setIsLoadingData(false)
        }
      }

      loadInventoryData()
    }
  }, [isEdit, inventoryId, categories, isLoadingCategories, router])

  // Fetch vendors from API
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setIsLoadingVendors(true)
        
        const response = await axiosInstance.get('/vendors/all', {
          params: { limit: 1000 }
        })
        
        console.log('Fetched vendors response:', response.data)
        
        // Filter for approved vendors only
        const approvedVendors = (response.data.vendors || []).filter((v: any) => v.status === 'APPROVED')
        console.log('Approved vendors:', approvedVendors)
        
        setVendors(approvedVendors)
      } catch (error: any) {
        console.error('Error fetching vendors:', error)
        console.error('Error details:', error.response?.data || error.message)
        setVendors([])
      } finally {
        setIsLoadingVendors(false)
      }
    }

    fetchVendors()
  }, [])

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true)
        
        const response = await axiosInstance.get('/categories/tree', {
          params: { 
            status: 'ACTIVE',
            includeInactive: false 
          }
        })
        
        console.log('Fetched categories response:', response.data)
        setCategories(response.data.data || [])
      } catch (error: any) {
        console.error('Error fetching categories:', error)
        console.error('Error details:', error.response?.data || error.message)
        setCategories([])
      } finally {
        setIsLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [])

  // Auto-generate SKU from name and category - REMOVED (Manual entry only)
  // const generateSKU = (name: string, categoryName: string, subcategoryName?: string) => {
  //   if (!name || !categoryName) return ''
  //   
  //   const namePrefix = name.split(' ').slice(0, 2).map(word => word.charAt(0)).join('').toUpperCase()
  //   const categoryPrefix = categoryName.split(' ').map(word => word.charAt(0)).join('').toUpperCase()
  //   const subcategoryPrefix = subcategoryName ? subcategoryName.split(' ').map(word => word.charAt(0)).join('').toUpperCase() : ''
  //   const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  //   
  //   if (subcategoryPrefix) {
  //     return `${categoryPrefix}-${subcategoryPrefix}-${namePrefix}-${randomNum}`
  //   }
  //   return `${categoryPrefix}-${namePrefix}-${randomNum}`
  // }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : 
               type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
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

  const handleDropdownChange = (name: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [name]: value }
      
      // Handle category change
      if (name === 'category') {
        const selectedCategory = categories.find(c => c.id === value)
        if (selectedCategory) {
          setSelectedCategoryName(selectedCategory.name)
          setSubcategories(selectedCategory.subcategories || [])
          updated.subcategory = '' // Reset subcategory when category changes
        }
      }
      
      return updated
    })
  }

  // Vendor Selection Functions
  const handleVendorSelect = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId)
    if (vendor) {
      setFormData(prev => ({
        ...prev,
        vendorId: vendor.id,
        vendorName: vendor.companyName
      }))
    }
  }

  const handleCreateProduct = () => {
    // Navigate to product creation with this inventory item pre-selected
    router.push(`/admin/dashboard/products/add?inventoryId=${inventoryId}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.name.trim()) {
      console.error('Product name is required')
      return
    }
    
    if (!formData.category) {
      console.error('Category is required')
      return
    }
    
    if (!formData.vendorId) {
      console.error('Vendor selection is required')
      return
    }
    
    if (!formData.sku.trim()) {
      console.error('SKU is required')
      return
    }
    
    // Check if stock changed in edit mode
    if (isEdit && formData.currentStock !== originalStock) {
      // Show reason modal
      setPendingFormData(formData)
      setShowStockReasonModal(true)
      return
    }
    
    // Proceed with normal save
    await saveInventory(formData, null)
  }

  const saveInventory = async (data: InventoryFormData, stockReason: string | null) => {
    setIsLoading(true)

    try {
      // Get category and subcategory names for submission
      const categoryName = categories.find(c => c.id === data.category)?.name || data.category
      const subcategoryName = subcategories.find(s => s.id === data.subcategory)?.name || data.subcategory
      
      const submitData = {
        ...data,
        category: categoryName,
        subcategory: subcategoryName,
        status: data.status?.toUpperCase() as 'ACTIVE' | 'INACTIVE',
        sourceType: data.sourceType?.toUpperCase() as 'SUPPLIER' | 'MANUFACTURE' | null
      }
      
      if (isEdit && inventoryId) {
        console.log('=== UPDATING INVENTORY ===')
        console.log('Inventory ID:', inventoryId)
        console.log('Stock changed:', data.currentStock !== originalStock)
        console.log('Original stock:', originalStock)
        console.log('New stock:', data.currentStock)
        console.log('Stock reason:', stockReason)
        
        // If stock changed, update it separately with reason via admin endpoint
        if (data.currentStock !== originalStock && stockReason) {
          console.log('Updating stock with reason via PATCH /inventory/admin/' + inventoryId + '/stock')
          await axiosInstance.patch(`/inventory/admin/${inventoryId}/stock`, {
            currentStock: data.currentStock,
            reason: stockReason,
            notes: data.notes
          })
          
          // Update other fields (excluding stock)
          const { currentStock, ...otherData } = submitData
          if (Object.keys(otherData).length > 0) {
            console.log('Updating other fields via PUT /inventory/admin/' + inventoryId)
            await axiosInstance.put(`/inventory/admin/${inventoryId}`, otherData)
          }
        } else {
          // No stock change, update normally
          console.log('Updating all fields via PUT /inventory/admin/' + inventoryId)
          await axiosInstance.put(`/inventory/admin/${inventoryId}`, submitData)
        }
        
        console.log('✅ Inventory item updated successfully')
      } else {
        console.log('=== CREATING INVENTORY ===')
        console.log('Submit data:', submitData)
        
        // Ensure vendorId is included for creation
        if (!submitData.vendorId) {
          throw new Error('Vendor ID is required')
        }
        
        console.log('Creating via POST /inventory/admin')
        await axiosInstance.post('/inventory/admin', submitData)
        console.log('✅ Inventory item created successfully')
      }
      
      router.push('/admin/dashboard/inventory')
    } catch (error: any) {
      console.error('❌ Error saving inventory item:', error)
      console.error('Error response:', error.response)
      console.error('Error data:', error.response?.data)
      
      // Better error handling
      if (error.response?.data?.message) {
        alert(error.response.data.message)
      } else if (error.message) {
        alert(error.message)
      } else {
        alert('Failed to save inventory item')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleStockReasonSubmit = async () => {
    if (!stockChangeReason.trim() || stockChangeReason.trim().length < 5) {
      alert('Please provide a reason (minimum 5 characters)')
      return
    }
    
    if (!pendingFormData) return
    
    setShowStockReasonModal(false)
    await saveInventory(pendingFormData, stockChangeReason)
    setStockChangeReason('')
    setPendingFormData(null)
  }

  // Show loading state while fetching data
  if (isLoadingData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin/dashboard/inventory">
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
                
                {/* Vendor Selection */}
                <div>
                  <Dropdown
                    id="vendor"
                    label="Vendor *"
                    value={formData.vendorId || ''}
                    options={vendors.map(vendor => ({
                      value: vendor.id,
                      label: `${vendor.companyName} (${vendor.email})`
                    }))}
                    placeholder={isLoadingVendors ? "Loading vendors..." : vendors.length === 0 ? "No vendors available" : "Select Vendor"}
                    onChange={(value) => handleVendorSelect(value as string)}
                    disabled={isLoadingVendors || vendors.length === 0}
                  />
                  {formData.vendorName && (
                    <p className="text-xs text-slate-500 mt-1">Selected: {formData.vendorName}</p>
                  )}
                  {!isLoadingVendors && vendors.length === 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      No approved vendors found. Please approve vendors in the Vendors section first.
                    </p>
                  )}
                  {isLoadingVendors && (
                    <p className="text-xs text-slate-500 mt-1">Loading vendors from database...</p>
                  )}
                </div>

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
                      options={categories.map(cat => ({
                        value: cat.id,
                        label: cat.name
                      }))}
                      placeholder={isLoadingCategories ? "Loading categories..." : "Select Category"}
                      onChange={(value) => handleDropdownChange('category', value as string)}
                      disabled={isLoadingCategories}
                    />
                  </div>
                  <div>
                    <Dropdown
                      id="subcategory"
                      label="Subcategory"
                      value={formData.subcategory}
                      options={subcategories.map(sub => ({
                        value: sub.id,
                        label: sub.name
                      }))}
                      placeholder={!formData.category ? "Select category first" : subcategories.length === 0 ? "No subcategories" : "Select Subcategory"}
                      onChange={(value) => handleDropdownChange('subcategory', value as string)}
                      disabled={!formData.category || subcategories.length === 0}
                    />
                  </div>
                </div>

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
                    placeholder="Enter unique SKU code"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Enter a unique SKU code for this inventory item
                  </p>
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
                    <Link href={`/admin/dashboard/products/edit/${formData.productId}`}>
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
                {formData.vendorName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Vendor:</span>
                    <span className="font-medium text-[#222222]">{formData.vendorName}</span>
                  </div>
                )}
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
                <Link href="/admin/dashboard/inventory" className="block">
                  <Button type="button" variant="outline" className="w-full hover:bg-gray-50 hover:border-gray-200">
                    Cancel
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* Stock Change Reason Modal */}
      {showStockReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Stock Change Reason Required</h3>
              <p className="text-sm text-gray-600 mt-1">
                Stock changed from {originalStock} to {formData.currentStock} units
              </p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for stock change <span className="text-red-500">*</span>
              </label>
              <textarea
                value={stockChangeReason}
                onChange={(e) => setStockChangeReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="e.g., New shipment received, Damaged items removed, Inventory correction"
                rows={4}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 5 characters required</p>
            </div>
            <div className="p-6 border-t border-gray-200 flex space-x-3">
              <Button
                type="button"
                onClick={() => {
                  setShowStockReasonModal(false)
                  setStockChangeReason('')
                  setPendingFormData(null)
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleStockReasonSubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!stockChangeReason.trim() || stockChangeReason.trim().length < 5}
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}