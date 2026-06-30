'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/UI/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { ArrowLeft, Save, Package, AlertTriangle, Plus } from 'lucide-react'
import Link from 'next/link'
import Dropdown from '@/components/UI/Dropdown'
import inventoryService, { CreateInventoryData, VendorCategories } from '@/services/inventoryService'
import { showErrorToast } from '@/lib/toast-utils'

interface InventoryFormData {
  // Basic Product Info (Primary Data)
  name: string
  sku: string
  category: string
  subcategory: string
  description: string
  manufacturingDate?: string // New field for manufacturing date

  // Inventory Management
  currentStock: number // Current stock quantity
  lowStockAlert: number
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
  fromProductCreation?: boolean
  returnTo?: string
}

// Default locations - these can be made dynamic later if needed
const locations = [
  'Main Warehouse - Section A',
  'Main Warehouse - Section B',
  'Storage Room 1',
  'Storage Room 2',
  'Display Area'
]

// Calendar-exact duration between two date strings, e.g. "1 Year / 2 Months / 23 Days".
// Returns '' when either date is missing/invalid or end < start.
const calcDateRangeDuration = (startDate: string, endDate: string): string => {
  if (!startDate || !endDate) return ''
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return ''

  let years = end.getFullYear() - start.getFullYear()
  let months = end.getMonth() - start.getMonth()
  let days = end.getDate() - start.getDate()

  if (days < 0) {
    months -= 1
    days += new Date(end.getFullYear(), end.getMonth(), 0).getDate()
  }
  if (months < 0) {
    years -= 1
    months += 12
  }
  if (days < 0) days = 0
  if (months < 0) months = 0
  if (years < 0) years = 0

  const part = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  return [
    years > 0 ? part(years, 'Year') : '',
    months > 0 ? part(months, 'Month') : '',
    days > 0 ? part(days, 'Day') : '',
  ].filter(Boolean).join(' / ') || '0 Days'
}

export default function AddEditInventory({ inventoryId, isEdit = false, fromProductCreation = false, returnTo }: AddEditInventoryProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(isEdit && !!inventoryId)
  const [vendorCategories, setVendorCategories] = useState<Array<{ id?: string; name: string; slug?: string }>>([])
  const [vendorSubcategories, setVendorSubcategories] = useState<Array<{ id: string; name: string; slug: string; parentId?: string }>>([])
  const [filteredSubcategories, setFilteredSubcategories] = useState<Array<{ id: string; name: string; slug: string; parentId?: string }>>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)

  const [linkedProductApproved, setLinkedProductApproved] = useState(false)

  // Track original stock for edit mode
  const [originalStock, setOriginalStock] = useState<number>(0)

  // Stock change reason modal
  const [showStockReasonModal, setShowStockReasonModal] = useState(false)
  const [stockChangeReason, setStockChangeReason] = useState('')
  const [pendingFormData, setPendingFormData] = useState<InventoryFormData | null>(null)

  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState<InventoryFormData>({
    name: '',
    sku: '',
    category: '',
    subcategory: '',
    description: '',
    manufacturingDate: '',

    currentStock: 0,
    lowStockAlert: 5,
    location: '',

    status: 'active',

    sourceType: null,
    supplier: '',
    lastRestocked: '',
    notes: '',

    hasProductCreated: false,
    productId: ''
  })

  // Today (local) as YYYY-MM-DD — used to block future dates in date pickers.
  const todayStr = (() => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })()

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
        console.log('Loaded vendor categories:', categoriesData.categories)

        // Store categories with their subcategories
        setVendorCategories(categoriesData.categories)

        // Store all subcategories with parent reference
        // We need to map subcategories to their parent categories
        const allSubcategoriesWithParent: Array<{ id: string; name: string; slug: string; parentId?: string }> = []

        // If categories have subcategories nested, extract them
        categoriesData.categories.forEach((cat: any) => {
          if (cat.subcategories && Array.isArray(cat.subcategories)) {
            cat.subcategories.forEach((sub: any) => {
              allSubcategoriesWithParent.push({
                ...sub,
                parentId: cat.id
              })
            })
          }
        })

        // If subcategories are provided separately, use them
        if (categoriesData.subcategories && categoriesData.subcategories.length > 0) {
          setVendorSubcategories(categoriesData.subcategories)
        } else {
          setVendorSubcategories(allSubcategoriesWithParent as any)
        }
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

  // Update filtered subcategories when category changes
  useEffect(() => {
    if (formData.category) {
      // Find the selected category
      const selectedCategory = vendorCategories.find(cat => cat.name === formData.category)

      if (selectedCategory && selectedCategory.id) {
        // Filter subcategories that belong to this category
        const filtered = vendorSubcategories.filter((sub: any) => sub.parentId === selectedCategory.id)
        setFilteredSubcategories(filtered)
        console.log(`Filtered ${filtered.length} subcategories for category: ${formData.category}`)
      } else {
        // If category doesn't have an ID, show all subcategories (fallback for legacy data)
        setFilteredSubcategories(vendorSubcategories)
      }
    } else {
      setFilteredSubcategories([])
    }
  }, [vendorSubcategories, formData.category, vendorCategories])

  // Debug: Log when formData.category or vendorCategories change
  useEffect(() => {
    console.log('Current formData.category:', formData.category)
    console.log('Available vendor categories:', vendorCategories.map(c => c.name))
    console.log('Category match found:', vendorCategories.some(c => c.name === formData.category))
  }, [formData.category, vendorCategories])

  // Preview the auto-generated SKU on the create form so the vendor can see it.
  useEffect(() => {
    if (isEdit) return
    let cancelled = false
    inventoryService
      .getNextSku()
      .then((sku) => { if (!cancelled) setFormData((prev) => (prev.sku ? prev : { ...prev, sku })) })
      .catch(() => { /* preview is best-effort; the real SKU is assigned on save */ })
    return () => { cancelled = true }
  }, [isEdit])

  // Load inventory data for editing (only after categories are loaded)
  useEffect(() => {
    if (isEdit && inventoryId && !isLoadingCategories) {
      setIsLoadingData(true)

      const loadInventoryData = async () => {
        try {
          const inventoryItem = await inventoryService.getItem(inventoryId)
          console.log('Loaded inventory item:', inventoryItem)

          // Check if linked product is approved
          if (inventoryItem.hasProductCreated && inventoryItem.productApprovalStatus === 'APPROVED') {
            setLinkedProductApproved(true)
          }

          const formattedData = inventoryService.formatForForm(inventoryItem)
          console.log('Formatted data:', formattedData)
          console.log('Category from inventory:', formattedData.category)

          // Normalize category to match vendor categories (case-insensitive)
          if (formattedData.category && vendorCategories.length > 0) {
            const matchingCategory = vendorCategories.find(
              cat => cat.name.toLowerCase() === formattedData.category.toLowerCase()
            )
            if (matchingCategory) {
              formattedData.category = matchingCategory.name
              console.log('Normalized category to:', matchingCategory.name)
            } else {
              console.warn('No matching category found for:', formattedData.category)
            }
          }

          // Normalize subcategory to match vendor subcategories (case-insensitive)
          if (formattedData.subcategory && vendorSubcategories.length > 0) {
            const matchingSubcategory = vendorSubcategories.find(
              sub => sub.name.toLowerCase() === formattedData.subcategory.toLowerCase()
            )
            if (matchingSubcategory) {
              formattedData.subcategory = matchingSubcategory.name
              console.log('Normalized subcategory to:', matchingSubcategory.name)
            } else {
              console.warn('No matching subcategory found for:', formattedData.subcategory)
            }
          }

          setFormData(formattedData)
          // Store original stock for comparison
          setOriginalStock(inventoryItem.currentStock)
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
  }, [isEdit, inventoryId, router, isLoadingCategories, vendorCategories, vendorSubcategories])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target

    setFormData(prev => {
      const next = {
        ...prev,
        [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) :
          type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      }
      // Changing the manufacturing date can invalidate an already-picked
      // "Last Restocked" that now falls before it — clear it so the user re-picks.
      if (name === 'manufacturingDate' && next.lastRestocked && value && next.lastRestocked < value) {
        next.lastRestocked = ''
      }
      return next
    })
    clearError(name)
    if (name === 'manufacturingDate') clearError('lastRestocked')
  }

  const clearError = (name: string) => {
    setErrors(prev => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const validate = (data: InventoryFormData): Record<string, string> => {
    const e: Record<string, string> = {}
    if (!data.name?.trim()) e.name = 'Product name is required'
    // SKU is auto-generated server-side — not entered by the vendor.
    if (!data.category?.trim()) e.category = 'Category is required'
    if (data.lowStockAlert === undefined || data.lowStockAlert === null || isNaN(data.lowStockAlert) || data.lowStockAlert < 5) {
      e.lowStockAlert = 'Enter a valid low stock alert (5 or more)'
    }
    if (
      data.sourceType === 'manufacture' &&
      data.manufacturingDate &&
      data.lastRestocked &&
      data.lastRestocked < data.manufacturingDate
    ) {
      e.lastRestocked = 'Last Restocked cannot be earlier than the Manufacturing Date'
    }
    if (data.manufacturingDate && data.manufacturingDate > todayStr) {
      e.manufacturingDate = 'Manufacturing Date cannot be in the future'
    }
    if (data.lastRestocked && data.lastRestocked > todayStr) {
      e.lastRestocked = 'Last Restocked cannot be in the future'
    }
    return e
  }

  const handleDropdownChange = (name: string, value: string) => {
    clearError(name)
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
      const selectedCategory = vendorCategories.find(cat => cat.name === value)

      if (selectedCategory && selectedCategory.id) {
        // Filter subcategories that belong to this category
        const filtered = vendorSubcategories.filter((sub: any) => sub.parentId === selectedCategory.id)
        setFilteredSubcategories(filtered)
        console.log(`Filtered ${filtered.length} subcategories for category: ${value}`)
      } else {
        // If category doesn't have an ID, show all subcategories (fallback for legacy data)
        setFilteredSubcategories(vendorSubcategories)
      }
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
    const validationErrors = validate(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      const firstField = Object.keys(validationErrors)[0]
      showErrorToast('Validation Error', validationErrors[firstField])
      setTimeout(() => {
        const el = document.getElementById(`vf-${firstField}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        else window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 60)
      return
    }
    setErrors({})

    // Stock is no longer set at inventory creation step. It's set when a product is created.

    // Proceed with normal save
    await saveInventory(formData, null)
  }

  const saveInventory = async (data: InventoryFormData, stockReason: string | null) => {
    setIsLoading(true)

    try {
      const apiData = inventoryService.formatForAPI(data)
      if (isEdit && inventoryId) {
        const apiData = inventoryService.formatForAPI(data)
        await inventoryService.updateItem(inventoryId, apiData)
        console.log('✅ Inventory item updated successfully')
      } else {
        const apiData = inventoryService.formatForAPI(data)
        const createdItem = await inventoryService.createItem(apiData as CreateInventoryData)
        console.log('✅ Inventory item created successfully:', createdItem.id)
      }

      router.push('/vendor/dashboard/inventory')
    } catch (error: any) {
      console.error('❌ Error saving inventory item:', error)

      // The axios interceptor normalizes errors to { message, status, data }
      const status = error?.status ?? error?.response?.status
      const message = error?.message || error?.data?.message || error?.response?.data?.message

      // Handle specific error cases
      if (status === 401) {
        alert('Authentication required. Please login again.')
        router.push('/vendor')
      } else if (status === 400) {
        alert(message || 'Invalid data provided')
      } else {
        alert(message || 'Failed to save inventory item. Please try again.')
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
            <h1 className="text-2xl font-bold text-slate-900">Loading...</h1>
          </div>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
              <span className="ml-3 text-slate-600">
                {isLoadingData ? 'Loading inventory data...' : 'Loading categories...'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Guard: block vendor from editing inventory when linked product is approved
  if (isEdit && linkedProductApproved) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/vendor/dashboard/inventory">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Inventory
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <Package className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Inventory Editing Restricted</h2>
            <p className="text-sm text-slate-600">
              This inventory item is linked to an approved product and cannot be edited. Only admin can modify inventory for approved products.
            </p>
            <Link href="/vendor/dashboard/inventory">
              <Button className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Inventory
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-slate-50 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {fromProductCreation && returnTo && (
              <Link href={returnTo}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Product
                </Button>
              </Link>
            )}
            <h1 className="text-2xl font-bold text-slate-900">
              {isEdit ? 'Edit Inventory Item' : 'Add New Inventory Item'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href={fromProductCreation && returnTo ? returnTo : '/vendor/dashboard/inventory'} className="shrink-0">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              form="inventory-form"
              disabled={isLoading}
              className="bg-brand-500 text-white hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : (isEdit ? 'Update Item' : 'Create Item')}
            </Button>
          </div>
        </div>
      </div>

      <form id="inventory-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Basic Product Information */}
            <Card className="border border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-slate-900">Basic Product Information</CardTitle>
                <p className="text-sm text-slate-600">This will be the master product data</p>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Product Name *
                    </label>
                    <input
                      id="vf-name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        errors.name
                          ? 'border-red-500 bg-red-50/40 focus:ring-red-500/40 focus:border-red-500'
                          : 'border-slate-200 focus:ring-brand-500/40 focus:border-brand-500'
                      }`}
                      placeholder="Enter product name"
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      SKU
                    </label>
                    <input
                      id="vf-sku"
                      type="text"
                      name="sku"
                      value={formData.sku}
                      readOnly
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed"
                      placeholder={isEdit ? '' : 'Auto-generated on save'}
                    />
                    <p className="mt-1 text-xs text-slate-500">Auto-generated &amp; permanent — not editable.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div id="vf-category" className={errors.category ? 'rounded-lg ring-2 ring-red-500/40' : ''}>
                      <Dropdown
                        id="category"
                        label="Category *"
                        value={formData.category}
                        options={vendorCategories.map(cat => cat.name)}
                        placeholder={isLoadingCategories ? "Loading categories..." : "Select Category"}
                        onChange={(value) => handleDropdownChange('category', value as string)}
                      />
                    </div>
                    {errors.category && <p className="text-xs text-red-600 mt-1">{errors.category}</p>}
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
                      label="Subcategory *"
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

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Product Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                    placeholder="Basic product description"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Stock Management Card - Only Low Stock Alert */}
            <Card className="border border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-slate-900">Stock Settings</CardTitle>
                <p className="text-sm text-slate-600">Opening stock is set when a product is created. Manage stock from the Inventory section.</p>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="p-3 bg-brand-50 border border-brand-200 rounded-lg">
                  <p className="text-sm text-brand-700">
                    ℹ️ The opening stock quantity will be set when you create a product from this inventory item. After that, stock is managed via the <strong>Update Stock</strong> action in the Inventory page.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Low Stock Alert *
                  </label>
                  <input
                    id="vf-lowStockAlert"
                    type="number"
                    name="lowStockAlert"
                    value={formData.lowStockAlert || ''}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.lowStockAlert
                        ? 'border-red-500 bg-red-50/40 focus:ring-red-500/40 focus:border-red-500'
                        : 'border-slate-200 focus:ring-brand-500/40 focus:border-brand-500'
                    }`}
                    placeholder="e.g. 5"
                    min="5"
                  />
                  {errors.lowStockAlert
                    ? <p className="text-xs text-red-600 mt-1">{errors.lowStockAlert}</p>
                    : <p className="text-xs text-slate-500 mt-1">You will be notified when stock falls below this number.</p>}
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card className="border border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-slate-900">Additional Information</CardTitle>
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
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${formData.sourceType === 'supplier'
                        ? 'border-slate-800 bg-slate-100 shadow-sm'
                        : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                        }`}
                      onClick={() => handleSourceTypeChange('supplier')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${formData.sourceType === 'supplier'
                          ? 'border-slate-800 bg-brand-600'
                          : 'border-slate-300'
                          }`}>
                          {formData.sourceType === 'supplier' && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900">Trader</h4>
                          <p className="text-sm text-slate-600">Product sourced from external trader</p>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${formData.sourceType === 'manufacture'
                        ? 'border-slate-800 bg-slate-100 shadow-sm'
                        : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                        }`}
                      onClick={() => handleSourceTypeChange('manufacture')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${formData.sourceType === 'manufacture'
                          ? 'border-slate-800 bg-brand-600'
                          : 'border-slate-300'
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
                    <div className="p-3 bg-brand-50 border border-brand-200 rounded-lg">
                      <p className="text-sm text-brand-700">
                        💡 You can skip this section if you don't want to specify a source type.
                        Select "Trader" if you purchase from external vendors, or "Manufacture" if you make the products yourself.
                      </p>
                    </div>
                  )}
                </div>

                {/* Conditional Fields Based on Source Type */}
                {formData.sourceType === 'supplier' && (
                  <div className="space-y-4 p-4 bg-slate-50 border border-slate-300 rounded-lg animate-in slide-in-from-top-2 duration-300">
                    <h4 className="font-medium text-slate-900 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-brand-600 rounded-full mr-2"></span>
                      Trader Information
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Last Restocked
                        </label>
                        <input
                          type="date"
                          name="lastRestocked"
                          value={formData.lastRestocked}
                          onChange={handleInputChange}
                          max={todayStr}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${errors.lastRestocked
                            ? 'border-red-500 bg-red-50/40 focus:ring-red-500/40 focus:border-red-500'
                            : 'border-slate-200 focus:ring-brand-500/40 focus:border-slate-500'
                          }`}
                        />
                        {errors.lastRestocked && (
                          <p className="text-xs text-red-600 mt-1">{errors.lastRestocked}</p>
                        )}
                        {formData.lastRestocked && !errors.lastRestocked && (() => {
                          const age = calcDateRangeDuration(formData.lastRestocked!, todayStr)
                          return age ? (
                            <div className="mt-2 flex min-h-[36px] w-full items-center rounded-lg border border-slate-200 bg-white px-4 py-2">
                              <span className="text-xs text-slate-500 mr-2">Time Since Last Restock:</span>
                              <span className="text-sm font-bold tracking-tight text-brand-500">{age}</span>
                            </div>
                          ) : null
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {formData.sourceType === 'manufacture' && (
                  <div className="space-y-4 p-4 bg-slate-50 border border-slate-300 rounded-lg animate-in slide-in-from-top-2 duration-300">
                    <h4 className="font-medium text-slate-900 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-brand-600 rounded-full mr-2"></span>
                      Manufacturing Information
                    </h4>
                    <div className="text-sm text-slate-700 mb-4 space-y-2">
                      <div className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2"></span>
                        <span>This product is manufactured in-house</span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-2"></span>
                        <span>Full control over quality and production timeline</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Manufacturing Date
                        </label>
                        <input
                          id="vf-manufacturingDate"
                          type="date"
                          name="manufacturingDate"
                          value={formData.manufacturingDate}
                          onChange={handleInputChange}
                          max={todayStr}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${errors.manufacturingDate
                            ? 'border-red-500 bg-red-50/40 focus:ring-red-500/40 focus:border-red-500'
                            : 'border-slate-200 focus:ring-brand-500/40 focus:border-slate-500'
                            }`}
                        />
                        {errors.manufacturingDate && (
                          <p className="text-xs text-red-600 mt-1">{errors.manufacturingDate}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Last Restocked
                        </label>
                        <input
                          id="vf-lastRestocked"
                          type="date"
                          name="lastRestocked"
                          value={formData.lastRestocked}
                          onChange={handleInputChange}
                          min={formData.manufacturingDate || undefined}
                          max={todayStr}
                          disabled={!formData.manufacturingDate}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed ${errors.lastRestocked
                            ? 'border-red-500 bg-red-50/40 focus:ring-red-500/40 focus:border-red-500'
                            : 'border-slate-200 focus:ring-brand-500/40 focus:border-slate-500'
                            }`}
                        />
                        {errors.lastRestocked ? (
                          <p className="text-xs text-red-600 mt-1">{errors.lastRestocked}</p>
                        ) : (
                          <p className="text-xs text-slate-500 mt-1">
                            Select the Manufacturing Date first; it can&apos;t be earlier than that.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Duration between Manufacturing Date and Last Restocked */}
                    {formData.manufacturingDate && formData.lastRestocked && !errors.lastRestocked && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Duration
                        </label>
                        <div className="flex min-h-[40px] w-full items-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
                          {(() => {
                            const d = calcDateRangeDuration(formData.manufacturingDate!, formData.lastRestocked!)
                            return d ? (
                              <span className="text-sm font-bold tracking-tight text-brand-500">{d}</span>
                            ) : (
                              <span className="text-sm text-slate-400">—</span>
                            )
                          })()}
                        </div>
                      </div>
                    )}
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                    placeholder="Any additional notes about this inventory item..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="border border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-slate-900">Status & Settings</CardTitle>
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
            <Card className="border border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-slate-900">Product Status</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {formData.hasProductCreated ? (
                  <div className="space-y-3">
                    <div className="flex items-center text-slate-700">
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

            {/* Stock Alert - now based on lowStockAlert vs currentStock from inventory */}
            {formData.lowStockAlert > 0 && (
              <Card className="border border-brand-100">
                <CardContent className="p-4">
                  <p className="text-sm text-brand-700">
                    📋 You will be alerted when stock drops below <strong>{formData.lowStockAlert}</strong> units.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card className="border border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-slate-900">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Low Stock Alert:</span>
                  <span className="font-medium text-slate-900">
                    {formData.lowStockAlert} units
                  </span>
                </div>
                {formData.sourceType && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Source Type:</span>
                    <span className="font-medium text-slate-800">
                      {formData.sourceType === 'supplier' ? 'Trader' : 'Manufacture'}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="border border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-slate-900">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-brand-500 text-white hover:bg-[#313131]"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Saving...' : (isEdit ? 'Update Item' : 'Create Item')}
                </Button>
                <Link href="/vendor/dashboard/inventory" className="block">
                  <Button type="button" variant="outline" className="w-full hover:bg-slate-50 hover:border-slate-200">
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
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Stock Change Reason Required</h3>
              <p className="text-sm text-slate-600 mt-1">
                Stock changed from {originalStock} to {formData.currentStock} units
              </p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reason for stock change <span className="text-red-500">*</span>
              </label>
              <textarea
                value={stockChangeReason}
                onChange={(e) => setStockChangeReason(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                placeholder="e.g., New shipment received, Damaged items removed, Inventory correction"
                rows={4}
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-1">Minimum 5 characters required</p>
            </div>
            <div className="p-6 border-t border-slate-200 flex space-x-3">
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
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white"
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