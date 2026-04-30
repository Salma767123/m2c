'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/UI/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table'
import Dropdown from '@/components/UI/Dropdown'
import { ArrowLeft, Save, X, Upload, Package, Image as ImageIcon } from 'lucide-react'
import VariantImageModal from './VariantImageModal'
import Link from 'next/link'
import { showSuccessToast, showErrorToast, showWarningToast } from '@/lib/toast-utils'
import { gstSettingsService, type GSTSetting } from '@/services/gstSettingsService'

interface InventoryItem {
  id: string
  name: string
  sku: string
  category: string
  subcategory?: string
  description?: string
  currentStock: number
  hasProductCreated: boolean
  productId?: string
}

// Helper function to get color name from hex value
const getColorName = (hex: string): string => {
  const colorMap: { [key: string]: string } = {
    '#000000': 'Black',
    '#ffffff': 'White',
    '#808080': 'Gray',
    '#c0c0c0': 'Silver',
    '#ff0000': 'Red',
    '#00ff00': 'Green',
    '#0000ff': 'Blue',
    '#ffff00': 'Yellow',
    '#ff00ff': 'Magenta',
    '#00ffff': 'Cyan',
    '#800000': 'Maroon',
    '#008000': 'Dark Green',
    '#000080': 'Navy',
    '#808000': 'Olive',
    '#800080': 'Purple',
    '#008080': 'Teal',
    '#ffa500': 'Orange',
    '#ffc0cb': 'Pink',
    '#a52a2a': 'Brown',
    '#f5f5dc': 'Beige'
  }

  return colorMap[hex.toLowerCase()] || `Custom (${hex})`
}
const categorySubcategories: Record<string, string[]> = {
  'Bed Sheets': ['Cotton Sheets', 'Linen Sheets', 'Silk Sheets', 'Microfiber Sheets'],
  'Towels': ['Bath Towels', 'Hand Towels', 'Beach Towels', 'Kitchen Towels'],
  'Curtains': ['Blackout Curtains', 'Sheer Curtains', 'Thermal Curtains', 'Decorative Curtains'],
  'Pillows': ['Bed Pillows', 'Decorative Pillows', 'Travel Pillows', 'Memory Foam Pillows'],
  'Blankets': ['Wool Blankets', 'Cotton Blankets', 'Fleece Blankets', 'Electric Blankets']
}

const fabricTypes = [
  'Cotton', 'Linen', 'Silk', 'Polyester', 'Microfiber', 'Bamboo', 'Modal', 'Tencel', 'Wool', 'Cashmere'
]

const standardSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'King', 'Queen', 'Full', 'Twin', 'Custom']
const standardColors = ['White', 'Black', 'Gray', 'Navy', 'Beige', 'Brown', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple']

interface ProductVariant {
  id: string
  size: string
  color: string
  colorHex?: string // New field for color picker hex value
  sku: string
  price: number
  originalPrice?: number
  discount?: number
  stock: number
  images: string[]
}

interface ProductImage {
  id: string
  url: string
  alt: string
  isPrimary: boolean
  imageType: 'cover' | 'gallery' // New field to distinguish image types
}

interface FabricSpecification {
  type: string
  composition: string
  weight: string
  weave: string
  finish: string
  careInstructions: string[]
}

interface PricingTier {
  minQuantity: number
  maxQuantity?: number
  price: number
  discount?: number
}

interface ProductFormData {
  // Inventory Connection (NEW FLOW)
  inventoryItemId?: string // Link to inventory item
  isFromInventory: boolean // Whether this product is created from inventory

  // Vendor Information (NEW)
  vendorId?: string // Link to vendor
  vendorName?: string // Vendor name for display

  name: string
  description: string
  category: string
  subCategory: string

  // Pricing Information
  basePrice: number
  originalPrice?: number
  discount?: number // Discount percentage (e.g., 25 for 25% off)
  gstPercentage?: number // GST Percentage for the product

  // Basic Product Info - Size & Color
  singleUnitSize?: string
  singleUnitColor?: string
  singleUnitColorHex?: string

  // Product Rating & Reviews (for display/reference)
  rating?: number
  reviews?: number

  // Fabric & Specifications
  fabricType: string
  material: string // Main material description (e.g., "100% Organic Cotton")
  fabricSpecifications: FabricSpecification

  // Variants Management
  variants: ProductVariant[]
  hasVariants: boolean

  // Base Product Info (when no variants)
  baseSku: string

  // Images
  images: ProductImage[]

  // Stock Management
  totalStock: number
  lowStockThreshold: number
  trackInventory: boolean

  // Dispatch & Shipping
  dispatchTimeline: {
    processingDays: number
    shippingDays: number
    totalDays: number
  }

  // Additional Info
  uom: string
  tags: string[]
  dimensions?: string
  weight?: string
  inStock: boolean
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK'

  // Logistics Configuration
  logisticsConfig?: {
    unitWeight: number
    weightUom: string
    maxWeight: number
    dimensions: { length: number; width: number; height: number; unit: string } | null
    transportTypes: string[]
    weightRanges: Array<{ minWeight: number; maxWeight: number; recommendedTransport: string }>
    airDeliveryDays: number
    shipDeliveryDays: number
    airCostPerKg: number
    shipCostPerKg: number
    notes: string
  }
}

interface AddEditProductProps {
  productId?: string
  isEdit?: boolean
  inventoryId?: string // Pre-select an inventory item when coming from inventory page
  onProductNameLoad?: (name: string) => void
}

export default function AddEditProduct({ productId, isEdit = false, inventoryId, onProductNameLoad }: AddEditProductProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(isEdit)

  // State for dynamic data
  const [vendors, setVendors] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [categories, setCategories] = useState<string[]>([])
  const [vendorSubcategories, setVendorSubcategories] = useState<Record<string, string[]>>({}) // Store subcategories by category
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [isLoadingVendors, setIsLoadingVendors] = useState(true)
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isLoadingInventory, setIsLoadingInventory] = useState(false)

  // GST State
  const [gstRates, setGstRates] = useState<GSTSetting[]>([])
  const [isLoadingGst, setIsLoadingGst] = useState(false)

  const [formData, setFormData] = useState<ProductFormData>({
    // Inventory Connection (NEW)
    inventoryItemId: inventoryId || '',
    isFromInventory: !!inventoryId,

    // Vendor Information (NEW)
    vendorId: '',
    vendorName: '',

    name: '',
    description: '',
    category: '',
    subCategory: '',

    // Pricing Information
    basePrice: 0,
    originalPrice: undefined,
    discount: undefined,
    gstPercentage: undefined,

    // Basic Product Info - Size & Color
    singleUnitSize: '',
    singleUnitColor: '',
    singleUnitColorHex: '#000000',

    // Product Rating & Reviews
    rating: undefined,
    reviews: undefined,

    // Fabric & Specifications
    fabricType: '',
    material: '',
    fabricSpecifications: {
      type: '',
      composition: '',
      weight: '',
      weave: '',
      finish: '',
      careInstructions: []
    },

    // Variants Management
    variants: [],
    hasVariants: false,

    // Base Product Info
    baseSku: '',

    // Images
    images: [],

    // Stock Management
    totalStock: 0,
    lowStockThreshold: 10,
    trackInventory: true,

    // Dispatch & Shipping
    dispatchTimeline: {
      processingDays: 0,
      shippingDays: 0,
      totalDays: 0
    },

    // Additional Info
    uom: 'pcs',
    tags: [],
    dimensions: '',
    weight: '',
    inStock: true,
    status: 'ACTIVE',

    // Logistics Configuration
    logisticsConfig: {
      unitWeight: 0,
      weightUom: 'KG',
      maxWeight: 0,
      dimensions: null as { length: number; width: number; height: number; unit: string } | null,
      transportTypes: ['AIR', 'SHIP'] as string[],
      weightRanges: [
        { minWeight: 0, maxWeight: 50, recommendedTransport: 'AIR' },
        { minWeight: 50, maxWeight: 5000, recommendedTransport: 'SHIP' }
      ] as Array<{ minWeight: number; maxWeight: number; recommendedTransport: string }>,
      airDeliveryDays: 7,
      shipDeliveryDays: 30,
      airCostPerKg: 0,
      shipCostPerKg: 0,
      notes: ''
    }
  })

  const [selectedTag, setSelectedTag] = useState('')
  const [newCareInstruction, setNewCareInstruction] = useState('')
  const [activeTab, setActiveTab] = useState('basic')

  // Debug: Log category and subcategory changes
  useEffect(() => {
    console.log('=== FORM DATA CATEGORY/SUBCATEGORY CHANGED ===')
    console.log('Category:', formData.category)
    console.log('SubCategory:', formData.subCategory)
  }, [formData.category, formData.subCategory])

  // Debug: Log when categories are loaded
  useEffect(() => {
    console.log('=== CATEGORIES STATE CHANGED ===')
    console.log('Categories:', categories)
    console.log('Categories length:', categories.length)
    console.log('Subcategories map:', vendorSubcategories)
  }, [categories, vendorSubcategories])

  // Load vendors on mount (categories loaded per vendor)
  useEffect(() => {
    const loadVendors = async () => {
      try {
        // Load vendors
        setIsLoadingVendors(true)
        const { default: VendorService } = await import('@/services/vendorService')
        const vendorsResponse = await VendorService.getAllVendors({ status: 'APPROVED' })

        if (vendorsResponse.vendors) {
          setVendors(vendorsResponse.vendors.map(v => ({
            id: v.id,
            name: v.companyName,
            email: v.businessEmail
          })))
        }
      } catch (error) {
        console.error('Error loading vendors:', error)
        showErrorToast('Load Failed', 'Unable to load vendors')
      } finally {
        setIsLoadingVendors(false)
      }
    }

    loadVendors()
    loadVendors()

    // Load GST Rates
    const loadGstRates = async () => {
      setIsLoadingGst(true)
      try {
        const response = await gstSettingsService.getSettings()
        if (response.success) {
          setGstRates(response.data)
        }
      } catch (error) {
        console.error('Error fetching GST settings:', error)
      } finally {
        setIsLoadingGst(false)
      }
    }
    loadGstRates()
  }, [])

  // Predefined tag options
  const tagOptions = [
    { value: 'Featured', label: 'Featured' },
    { value: 'Top Selling', label: 'Top Selling' },
    { value: 'Best Seller', label: 'Best Seller' }
  ]
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<any>(null)
  // Auto-save functionality (optional)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    setHasUnsavedChanges(true)
  }, [formData])

  // Warn user about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const [newVariant, setNewVariant] = useState<Partial<ProductVariant>>({
    size: '',
    color: '',
    colorHex: '#000000',
    sku: '',
    price: 0,
    stock: 0,
    images: [] // New field for variant images
  })

  // State for variant image editing
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null)

  const handleVariantImagesUpdate = (variantId: string, newImages: string[]) => {
    updateVariant(variantId, 'images', newImages)
  }

  const getEditingVariant = () => {
    return formData.variants.find(v => v.id === editingVariantId)
  }

  // Load product data for editing
  useEffect(() => {
    if (isEdit && productId) {
      setIsLoadingData(true)

      // Fetch actual product data from API
      const loadProductData = async () => {
        try {
          const { adminProductService } = await import('@/services/adminProductService')
          const response = await adminProductService.getProduct(productId)

          if (response.success && response.data) {
            const product = response.data

            // Call callback to inform parent component about product name
            if (onProductNameLoad && product.name) {
              onProductNameLoad(product.name)
            }

            // Map API response to form data
            setFormData({
              inventoryItemId: product.inventory?.id || '',
              isFromInventory: !!product.inventory,

              // Vendor Information
              vendorId: product.vendorId,
              vendorName: product.vendor?.companyName || '',

              name: product.name,
              description: product.description,
              category: product.category,
              subCategory: product.subCategory || '',

              // Pricing Information
              basePrice: product.basePrice,
              originalPrice: product.originalPrice,
              discount: product.discount,
              gstPercentage: product.gstPercentage,

              // Basic Product Info - Size & Color
              singleUnitSize: product.singleUnitSize || '',
              singleUnitColor: product.singleUnitColor || '',
              singleUnitColorHex: product.singleUnitColorHex || '#000000',

              // Product Rating & Reviews
              rating: undefined,
              reviews: undefined,

              fabricType: product.fabricType || '',
              material: product.material || '',
              fabricSpecifications: product.fabricSpecifications || {
                type: '',
                composition: '',
                weight: '',
                weave: '',
                finish: '',
                careInstructions: []
              },

              variants: product.variants?.map(v => ({
                id: v.id,
                size: v.size,
                color: v.color,
                colorHex: v.colorHex || '#000000',
                sku: v.sku, // Use stored SKU
                price: v.price,
                stock: v.stock,
                images: v.images || []
              })) || [],
              hasVariants: product.hasVariants,

              baseSku: product.baseSku,

              // Map actual product images
              images: product.images?.map(img => ({
                id: img.id,
                url: img.url,
                alt: img.alt || product.name,
                isPrimary: img.isPrimary,
                imageType: img.imageType as 'cover' | 'gallery'
              })) || [],

              // For variant products, use base stock from inventory (not aggregate totalStock)
              totalStock: product.hasVariants && product.inventory?.baseStock !== undefined
                ? product.inventory.baseStock
                : product.totalStock,
              lowStockThreshold: product.lowStockThreshold,
              trackInventory: product.trackInventory,

              dispatchTimeline: product.dispatchTimeline || {
                processingDays: 0,
                shippingDays: 0,
                totalDays: 0
              },

              uom: product.uom || 'pcs',
              tags: product.tags || [],
              dimensions: product.dimensions,
              weight: product.weight,
              inStock: product.inStock,
              status: product.status || 'ACTIVE',
              logisticsConfig: product.logisticsConfig || {
                unitWeight: 0,
                weightUom: 'KG',
                maxWeight: 0,
                dimensions: null,
                transportTypes: ['AIR', 'SHIP'],
                weightRanges: [
                  { minWeight: 0, maxWeight: 50, recommendedTransport: 'AIR' },
                  { minWeight: 50, maxWeight: 5000, recommendedTransport: 'SHIP' }
                ],
                airDeliveryDays: 7,
                shipDeliveryDays: 30,
                airCostPerKg: 0,
                shipCostPerKg: 0,
                notes: ''
              }
            })

            // Set selected inventory item if exists
            if (product.inventory) {
              setSelectedInventoryItem({
                id: product.inventory.id,
                name: product.inventory.name,
                sku: product.inventory.sku,
                currentStock: product.inventory.currentStock,
                category: product.inventory.category
              })
            }

            // Load inventory items for the vendor when editing
            if (product.vendorId) {
              setIsLoadingInventory(true)
              try {
                const { default: inventoryService } = await import('@/services/inventoryService')
                const items = await inventoryService.adminGetInventoryByVendor(product.vendorId, false)
                setInventoryItems(items)
              } catch (error) {
                console.error('Error loading inventory items:', error)
                setInventoryItems([])
              } finally {
                setIsLoadingInventory(false)
              }

              // Load vendor-specific categories when editing
              setIsLoadingCategories(true)
              try {
                // Use axios instance instead of fetch for proper authentication
                const axiosInstance = (await import('@/lib/axios')).default
                const response = await axiosInstance.get(`/inventory/admin/vendor/${product.vendorId}/categories`)

                const vendorCategories = response.data.data.categories || []
                const vendorSubcats = response.data.data.subcategories || []

                // Set categories as names
                const categoryNames = vendorCategories.map((c: any) => c.name)
                if (product.category && !categoryNames.includes(product.category)) {
                  categoryNames.push(product.category)
                }
                setCategories(categoryNames)

                // Build subcategories map by category name
                const subcatsMap: Record<string, string[]> = {}
                vendorCategories.forEach((cat: any) => {
                  const catSubcats = vendorSubcats
                    .filter((sub: any) => sub.parentId === cat.id)
                    .map((sub: any) => sub.name)

                  // Ensure product's existing subcategory is in the map for its category
                  if (product.category === cat.name && product.subCategory && !catSubcats.includes(product.subCategory)) {
                    catSubcats.push(product.subCategory)
                  }

                  if (catSubcats.length > 0) {
                    subcatsMap[cat.name] = catSubcats
                  }
                })

                // If product category wasn't found in vendor categories, we still need its subcategory in the map
                if (product.category && product.subCategory && !subcatsMap[product.category]) {
                  subcatsMap[product.category] = [product.subCategory]
                }

                setVendorSubcategories(subcatsMap)
              } catch (error) {
                console.error('Error loading vendor categories:', error)
                setCategories([])
                setVendorSubcategories({})
              } finally {
                setIsLoadingCategories(false)
              }
            }
          }
        } catch (error: any) {
          console.error('Error loading product data:', error)
          showErrorToast('Failed to Load Product', error.message || 'Unable to load product data. Please try again.')
        } finally {
          setIsLoadingData(false)
        }
      }

      loadProductData()
    }
  }, [isEdit, productId])

  // Inventory Selection Functions
  const handleInventorySelect = (inventoryItem: InventoryItem) => {
    console.log('=== INVENTORY ITEM SELECTED ===')
    console.log('Inventory item:', inventoryItem)
    console.log('Available categories:', categories)
    console.log('Categories length:', categories.length)
    console.log('Available subcategories map:', vendorSubcategories)
    console.log('Inventory category:', inventoryItem.category)
    console.log('Inventory subcategory:', inventoryItem.subcategory)
    console.log('Is loading categories?', isLoadingCategories)

    // Warn if categories aren't loaded yet (shouldn't happen with disabled dropdown)
    if (categories.length === 0) {
      console.warn('⚠️ WARNING: Categories array is empty! This should not happen.')
      showWarningToast('Please Wait', 'Categories are still loading. Please try again in a moment.')
      return
    }

    // Field might be subcategory or subCategory in different contexts, handle both
    const invCategory = inventoryItem.category
    const invSubcategory = inventoryItem.subcategory || (inventoryItem as any).subCategory

    // Find the matching category with case-insensitive comparison and handle common plural/singular cases
    let matchedCategory = categories.find(
      cat => {
        const c1 = cat.toLowerCase()
        const c2 = invCategory.toLowerCase()
        return c1 === c2 || c1 === c2 + 's' || c2 === c1 + 's'
      }
    )

    console.log('Initially matched category:', matchedCategory)

    // If no match found, we'll use the inventory category but add it to our list so the dropdown shows it
    if (!matchedCategory && invCategory) {
      console.log('No matched category found, adding to list:', invCategory)
      setCategories(prev => [...new Set([...prev, invCategory])])
      matchedCategory = invCategory
    }

    // Find matching subcategory with case-insensitive comparison
    const categorySubcats = matchedCategory ? (vendorSubcategories[matchedCategory] || categorySubcategories[matchedCategory] || []) : []
    let matchedSubcategory = invSubcategory
      ? categorySubcats.find(sub => {
        const s1 = sub.toLowerCase()
        const s2 = invSubcategory.toLowerCase()
        return s1 === s2 || s1 === s2 + 's' || s2 === s1 + 's'
      })
      : ''

    console.log('Available subcategories for matching:', categorySubcats)
    console.log('Matched subcategory (case-corrected):', matchedSubcategory)

    // Ensure the inventory subcategory is in our local categories map so it shows in the dropdown
    if (!matchedSubcategory && invSubcategory && matchedCategory) {
      console.log('Subcategory mismatch, adding inventory subcategory to map:', invSubcategory)
      setVendorSubcategories(prev => ({
        ...prev,
        [matchedCategory!]: [...new Set([...(prev[matchedCategory!] || []), invSubcategory])]
      }))
      matchedSubcategory = invSubcategory
    }

    setSelectedInventoryItem(inventoryItem)
    setFormData(prev => {
      const newData = {
        ...prev,
        inventoryItemId: inventoryItem.id,
        isFromInventory: true,
        description: inventoryItem.description || '',
        category: matchedCategory || invCategory || '',
        subCategory: matchedSubcategory || invSubcategory || '',
        baseSku: inventoryItem.sku,
        totalStock: inventoryItem.currentStock
      }

      console.log('Final choice - Category:', newData.category, 'SubCategory:', newData.subCategory)
      return newData
    })
  }

  const clearInventorySelection = () => {
    setSelectedInventoryItem(null)
    setFormData(prev => ({
      ...prev,
      inventoryItemId: '',
      isFromInventory: false,
      name: '',
      description: '',
      category: '',
      subCategory: '', // Also clear subcategory
      baseSku: '',
      totalStock: 0
    }))
  }

  // Vendor Selection Functions
  const handleVendorSelect = async (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId)
    if (vendor) {
      setFormData(prev => ({
        ...prev,
        vendorId: vendor.id,
        vendorName: vendor.name,
        category: '', // Reset category when vendor changes
        subCategory: '' // Reset subcategory when vendor changes
      }))

      // Load vendor-specific categories FIRST (before inventory items)
      setIsLoadingCategories(true)
      try {
        console.log('=== FETCHING VENDOR CATEGORIES ===')
        console.log('Vendor ID:', vendorId)

        // Use axios instance instead of fetch for proper authentication
        const { default: axiosInstance } = await import('@/lib/axios')
        const response = await axiosInstance.get(`/inventory/admin/vendor/${vendorId}/categories`)

        console.log('Response data:', response.data)

        const vendorCategories = response.data.data.categories || []
        const vendorSubcats = response.data.data.subcategories || []

        console.log('=== LOADED VENDOR CATEGORIES ===')
        console.log('Categories:', vendorCategories)
        console.log('Subcategories:', vendorSubcats)

        // Set categories as names
        const categoryNames = vendorCategories.map((c: any) => c.name)
        setCategories(categoryNames)

        // Build subcategories map by category name
        const subcatsMap: Record<string, string[]> = {}
        vendorCategories.forEach((cat: any) => {
          // Find subcategories that belong to this category
          const catSubcats = vendorSubcats
            .filter((sub: any) => sub.parentId === cat.id)
            .map((sub: any) => sub.name)

          if (catSubcats.length > 0) {
            subcatsMap[cat.name] = catSubcats
          }
        })

        setVendorSubcategories(subcatsMap)
        console.log('Loaded vendor categories:', categoryNames)
        console.log('Loaded vendor subcategories map:', subcatsMap)
      } catch (error: any) {
        console.error('Error loading vendor categories:', error)
        console.error('Error response:', error.response?.data)
        showErrorToast('Load Failed', 'Unable to load categories for this vendor')
        setCategories([])
        setVendorSubcategories({})
      } finally {
        setIsLoadingCategories(false)
      }

      // Load inventory items for the selected vendor AFTER categories are loaded
      setIsLoadingInventory(true)
      try {
        const { default: inventoryService } = await import('@/services/inventoryService')
        const items = await inventoryService.adminGetInventoryByVendor(vendorId, false)
        console.log('=== LOADED INVENTORY ITEMS ===')
        console.log('Items:', items)
        setInventoryItems(items)
      } catch (error) {
        console.error('Error loading inventory items:', error)
        showErrorToast('Load Failed', 'Unable to load inventory items for this vendor')
        setInventoryItems([])
      } finally {
        setIsLoadingInventory(false)
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target

    // Handle dispatchTimeline with auto-calculation FIRST (before generic dot notation)
    if (name.startsWith('dispatchTimeline.')) {
      const field = name.replace('dispatchTimeline.', '')
      const numValue = parseInt(value) || 0
      setFormData(prev => ({
        ...prev,
        dispatchTimeline: {
          ...prev.dispatchTimeline,
          [field]: numValue,
          totalDays: field === 'processingDays'
            ? numValue + prev.dispatchTimeline.shippingDays
            : field === 'shippingDays'
              ? prev.dispatchTimeline.processingDays + numValue
              : prev.dispatchTimeline.totalDays
        }
      }))
    } else if (name.includes('.')) {
      // Handle other nested object updates (e.g., fabricSpecifications.type)
      const [parent, child] = name.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof ProductFormData] as any,
          [child]: value
        }
      }))
    } else {
      setFormData(prev => {
        const updated = {
          ...prev,
          [name]: type === 'number' ? parseFloat(value) || 0 :
            type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }

        return updated
      })
    }
  }

  const addVariant = () => {
    if (newVariant.size && newVariant.color && newVariant.sku) {
      const variant: ProductVariant = {
        id: Date.now().toString(),
        size: newVariant.size!,
        color: newVariant.color!,
        colorHex: newVariant.colorHex || '#000000',
        sku: newVariant.sku!,
        price: newVariant.price || 0,
        originalPrice: newVariant.originalPrice || undefined,
        discount: newVariant.discount || undefined,
        stock: newVariant.stock || 0,
        images: newVariant.images || []
      }

      setFormData(prev => ({
        ...prev,
        variants: [...prev.variants, variant]
      }))

      setNewVariant({ size: '', color: '', colorHex: '#000000', sku: '', price: 0, stock: 0, images: [] })
    }
  }

  const removeVariant = (variantId: string) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter(v => v.id !== variantId)
    }))
  }

  const updateVariant = (variantId: string, field: keyof ProductVariant, value: any) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map(v => {
        if (v.id === variantId) {
          // If updating colorHex, also update color name
          if (field === 'colorHex') {
            return {
              ...v,
              [field]: value,
              color: getColorName(value)
            }
          }
          return { ...v, [field]: value }
        }
        return v
      })
    }))
  }

  const handleVariantImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showWarningToast('File Too Large', 'Please select an image under 5MB.')
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        setNewVariant(prev => ({
          ...prev,
          images: [event.target?.result as string] // Overwrite with new single image
        }))
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Care Instructions Functions
  const addCareInstruction = () => {
    if (newCareInstruction.trim()) {
      setFormData(prev => ({
        ...prev,
        fabricSpecifications: {
          ...prev.fabricSpecifications,
          careInstructions: [...prev.fabricSpecifications.careInstructions, newCareInstruction.trim()]
        }
      }))
      setNewCareInstruction('')
    }
  }

  const removeCareInstruction = (instruction: string) => {
    setFormData(prev => ({
      ...prev,
      fabricSpecifications: {
        ...prev.fabricSpecifications,
        careInstructions: prev.fabricSpecifications.careInstructions.filter(i => i !== instruction)
      }
    }))
  }

  const addTag = () => {
    if (selectedTag && !formData.tags.includes(selectedTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, selectedTag]
      }))
      setSelectedTag('')
    }
  }

  // Image handling functions
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, imageType: 'cover' | 'gallery' = 'gallery') => {
    const files = e.target.files
    if (!files) return

    // Check file size limits FIRST - before any other processing
    const oversizedFiles = Array.from(files).filter(file => file.size > 10 * 1024 * 1024) // 10MB limit
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => f.name).join(', ')
      showWarningToast('File Too Large', `The following file(s) exceed 10MB limit: ${fileNames}`)
      e.target.value = '' // Reset input immediately
      return
    }

    // Check limits before processing
    if (imageType === 'cover') {
      const existingCoverImages = formData.images.filter(img => img.imageType === 'cover')
      if (existingCoverImages.length >= 1) {
        showWarningToast('Cover Image Limit', 'Only one cover image is allowed. Please remove the existing cover image first.')
        e.target.value = '' // Reset input
        return
      }
      if (files.length > 1) {
        showWarningToast('Single Image Only', 'Please select only one image for cover image.')
        e.target.value = '' // Reset input
        return
      }
    }

    if (imageType === 'gallery') {
      const existingGalleryImages = formData.images.filter(img => img.imageType === 'gallery')
      const remainingSlots = 3 - existingGalleryImages.length

      if (remainingSlots <= 0) {
        showWarningToast('Gallery Limit Reached', 'Maximum 3 gallery images allowed. Please remove some images first.')
        e.target.value = '' // Reset input
        return
      }

      if (files.length > remainingSlots) {
        showWarningToast('Too Many Images', `You can only add ${remainingSlots} more gallery image${remainingSlots > 1 ? 's' : ''}.`)
        e.target.value = '' // Reset input
        return
      }
    }

    // Process files (all validations passed)
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const newImage: ProductImage = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          url: event.target?.result as string,
          alt: file.name,
          isPrimary: imageType === 'cover',
          imageType: imageType
        }

        setFormData(prev => ({
          ...prev,
          images: [...prev.images, newImage]
        }))
      }
      reader.readAsDataURL(file)
    })

    // Reset input
    e.target.value = ''
  }

  const setCoverImage = (imageId: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map(img => ({
        ...img,
        isPrimary: img.id === imageId,
        imageType: img.id === imageId ? 'cover' : img.imageType
      }))
    }))
  }

  const setImageType = (imageId: string, imageType: 'cover' | 'gallery') => {
    // Check limits before changing type
    if (imageType === 'cover') {
      const existingCoverImages = formData.images.filter(img => img.imageType === 'cover' && img.id !== imageId)
      if (existingCoverImages.length >= 1) {
        showWarningToast('Cover Image Limit', 'Only one cover image is allowed. Please remove the existing cover image first.')
        return
      }
    }

    if (imageType === 'gallery') {
      const existingGalleryImages = formData.images.filter(img => img.imageType === 'gallery' && img.id !== imageId)
      if (existingGalleryImages.length >= 3) {
        showWarningToast('Gallery Limit Reached', 'Maximum 3 gallery images allowed.')
        return
      }
    }

    setFormData(prev => ({
      ...prev,
      images: prev.images.map(img => {
        if (img.id === imageId) {
          return {
            ...img,
            imageType: imageType,
            isPrimary: imageType === 'cover' ? true : false
          }
        }
        // If setting another image as cover, remove cover status from others
        if (imageType === 'cover' && img.imageType === 'cover') {
          return {
            ...img,
            imageType: 'gallery',
            isPrimary: false
          }
        }
        return img
      })
    }))
  }

  const removeImage = (imageId: string) => {
    setFormData(prev => {
      const updatedImages = prev.images.filter(img => img.id !== imageId)
      // If we removed the cover image, make the first gallery image the cover if available
      if (updatedImages.length > 0 && !updatedImages.some(img => img.imageType === 'cover')) {
        const firstGalleryImage = updatedImages.find(img => img.imageType === 'gallery')
        if (firstGalleryImage) {
          firstGalleryImage.imageType = 'cover'
          firstGalleryImage.isPrimary = true
        }
      }
      return {
        ...prev,
        images: updatedImages
      }
    })
  }

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const handleSaveDraft = async () => {
    setIsLoading(true)
    try {
      // Save as draft
      console.log('Saving draft:', formData)
      showSuccessToast('Draft Saved', 'Your product draft has been saved.')
      setHasUnsavedChanges(false)
    } catch (error) {
      showErrorToast('Save Failed', 'Unable to save draft.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Basic validation
    if (!formData.name.trim()) {
      showErrorToast('Validation Error', 'Product name is required.')
      return
    }

    if (!formData.category) {
      showErrorToast('Validation Error', 'Please select a category.')
      return
    }

    if (!formData.vendorId) {
      showErrorToast('Validation Error', 'Please select a vendor.')
      return
    }

    if (!isEdit && !formData.inventoryItemId) {
      showErrorToast('Validation Error', 'Please select an inventory item.')
      return
    }

    // Pricing validation
    if (formData.basePrice <= 0) {
      showErrorToast('Validation Error', 'Please enter a valid base price.')
      return
    }

    if (formData.hasVariants && formData.variants.length === 0) {
      showErrorToast('Validation Error', 'Please add at least one variant or disable variants.')
      return
    }

    setIsLoading(true)

    try {
      const { adminProductService } = await import('@/services/adminProductService')

      if (isEdit && productId) {
        // Update existing product
        const response = await adminProductService.updateProduct(productId, formData)

        if (response.success) {
          showSuccessToast('Product Updated', 'Product has been updated successfully.')
          setHasUnsavedChanges(false)
          router.push('/admin/dashboard/products')
        }
      } else {
        // Create new product
        const response = await adminProductService.createProduct(formData)

        if (response.success) {
          showSuccessToast('Product Created', 'Product has been created successfully.')
          setHasUnsavedChanges(false)
          router.push('/admin/dashboard/products')
        }
      }
    } catch (error: any) {
      console.error('Error saving product:', error)
      showErrorToast('Save Failed', error.message || 'Unable to save product. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while fetching data
  if (isLoadingData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin/dashboard/products">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Products
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
          </div>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"></div>
              <span className="ml-3 text-gray-600">Loading product data...</span>
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
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Product' : 'Add New Product'}
          </h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'basic', label: 'Basic Info' },
                { id: 'fabric', label: 'Fabric & Specs' },
                { id: 'variants', label: 'Variants' },
                { id: 'pricing', label: 'Pricing' },
                { id: 'inventory', label: 'Inventory' },
                { id: 'shipping', label: 'Shipping' },
                { id: 'logistics', label: 'Logistics' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                    ? 'border-gray-700 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Basic Information Tab */}
            {activeTab === 'basic' && (
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* Vendor Selection */}
                  <div>
                    <Dropdown
                      label="Vendor *"
                      value={formData.vendorId || ''}
                      options={vendors.map(vendor => ({
                        value: vendor.id,
                        label: `${vendor.name} (${vendor.email})`
                      }))}
                      placeholder={isLoadingVendors ? "Loading vendors..." : "Select Vendor"}
                      onChange={(value) => handleVendorSelect(value as string)}
                      disabled={isLoadingVendors || isEdit}
                    />
                    {formData.vendorName && (
                      <p className="text-xs text-gray-500 mt-1">Selected: {formData.vendorName}</p>
                    )}
                    {isEdit && (
                      <p className="text-xs text-blue-600 mt-1">ℹ️ Vendor cannot be changed when editing</p>
                    )}
                  </div>

                  {/* Inventory Selection */}
                  <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                    <h4 className="font-medium text-blue-900 mb-3">Select Inventory Item</h4>
                    <p className="text-sm text-blue-800 mb-4">
                      Choose an inventory item to create a detailed product with variants
                    </p>

                    {!formData.vendorId ? (
                      <p className="text-sm text-gray-600 italic">
                        Please select a vendor first to view their inventory items
                      </p>
                    ) : isLoadingCategories ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
                        <span className="ml-3 text-sm text-blue-700">Loading categories...</span>
                      </div>
                    ) : !selectedInventoryItem ? (
                      <div className="space-y-3">
                        {isLoadingInventory ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
                            <span className="ml-3 text-sm text-blue-700">Loading inventory items...</span>
                          </div>
                        ) : inventoryItems.length === 0 ? (
                          <p className="text-sm text-gray-600 italic py-2">
                            No available inventory items for this vendor
                          </p>
                        ) : (
                          <>
                            <Dropdown
                              label="Available Inventory Items"
                              value=""
                              options={inventoryItems
                                .filter(item => !item.hasProductCreated)
                                .map(item => ({
                                  value: item.id,
                                  label: `${item.name} (${item.sku}) - Stock: ${item.currentStock}`
                                }))}
                              placeholder={isLoadingCategories ? "Loading categories first..." : "Select an inventory item"}
                              onChange={(value) => {
                                const item = inventoryItems.find(i => i.id === value)
                                if (item) handleInventorySelect(item)
                              }}
                              disabled={isLoadingCategories}
                            />
                            {isLoadingCategories ? (
                              <p className="text-xs text-blue-700">
                                Please wait for categories to load before selecting an inventory item
                              </p>
                            ) : (
                              <p className="text-xs text-blue-700">
                                Only inventory items without existing products are shown
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white border border-blue-300 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h5 className="font-medium text-gray-900">{selectedInventoryItem.name}</h5>
                            <p className="text-sm text-gray-600">SKU: {selectedInventoryItem.sku}</p>
                            <p className="text-sm text-gray-600">Category: {selectedInventoryItem.category}</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={clearInventorySelection}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Change
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Current Stock:</span>
                            <span className="font-medium ml-2">{selectedInventoryItem.currentStock}</span>
                          </div>
                        </div>
                        <Link href={`/admin/dashboard/inventory/edit/${selectedInventoryItem.id}`}>
                          <Button variant="outline" size="sm" className="mt-3">
                            Edit Inventory Item
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Inventory Item Name (when from inventory) */}
                  {formData.isFromInventory && selectedInventoryItem && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Inventory Item Name
                      </label>
                      <input
                        type="text"
                        value={selectedInventoryItem.name}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                        placeholder="Inventory item name"
                      />
                      <p className="text-xs text-gray-500 mt-1">Reference from inventory item</p>
                    </div>
                  )}

                  {/* Product Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      disabled={!formData.vendorId || (!isEdit && !formData.inventoryItemId)}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent ${(!formData.vendorId || (!isEdit && !formData.inventoryItemId)) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                      placeholder={!formData.vendorId ? "Please select a vendor first" : (!isEdit && !formData.inventoryItemId) ? "Please select an inventory item first" : formData.isFromInventory ? "Enter a unique product name" : "Enter product name"}
                    />
                    {!formData.vendorId && (
                      <p className="text-xs text-red-500 mt-1">Select a vendor before entering the product name</p>
                    )}
                    {formData.vendorId && !isEdit && !formData.inventoryItemId && (
                      <p className="text-xs text-red-500 mt-1">Select an inventory item before entering the product name</p>
                    )}
                    {formData.vendorId && formData.isFromInventory && (
                      <p className="text-xs text-gray-500 mt-1">Create a unique product name (can be different from inventory item name)</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                      placeholder="Enhance the product description with detailed information"
                    />
                    {formData.isFromInventory && (
                      <p className="text-xs text-gray-500 mt-1">You can enhance the basic description from inventory</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Dropdown
                        label="Category *"
                        value={formData.category}
                        options={categories}
                        placeholder={
                          !formData.vendorId
                            ? "Select vendor first"
                            : isLoadingCategories
                              ? "Loading categories..."
                              : categories.length === 0
                                ? "No categories available"
                                : "Select Category"
                        }
                        onChange={(value) => setFormData(prev => ({ ...prev, category: value as string, subCategory: '' }))}
                        disabled={!formData.vendorId || isLoadingCategories || formData.isFromInventory}
                      />
                      {!formData.vendorId && (
                        <p className="text-xs text-gray-500 mt-1 italic">Please select a vendor first</p>
                      )}
                      {formData.isFromInventory && formData.vendorId && (
                        <p className="text-xs text-gray-500 mt-1">From inventory item</p>
                      )}
                    </div>
                    <div>
                      <Dropdown
                        label="Sub-Category *"
                        value={formData.subCategory}
                        options={formData.category ? (vendorSubcategories[formData.category] || categorySubcategories[formData.category] || []) : []}
                        placeholder="Select Sub-Category"
                        onChange={(value) => setFormData(prev => ({ ...prev, subCategory: value as string }))}
                        disabled={!formData.category}
                      />
                    </div>
                  </div>



                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selling Unit (UOM)
                      </label>
                      <Dropdown
                        label=""
                        value={formData.uom}
                        options={[
                          { value: 'pcs', label: 'Pieces (pcs)' },
                          { value: 'meters', label: 'Meters' },
                          { value: 'kg', label: 'Kilograms (kg)' },
                          { value: 'yards', label: 'Yards' },
                          { value: 'sets', label: 'Sets' },
                          { value: 'rolls', label: 'Rolls' },
                          { value: 'pairs', label: 'Pairs' },
                          { value: 'dozen', label: 'Dozen' },
                        ]}
                        placeholder="Select UOM"
                        onChange={(value) => setFormData(prev => ({ ...prev, uom: value as string }))}
                      />
                      <p className="text-xs text-gray-500 mt-1">How this product is sold to customers</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Display Dimensions
                      </label>
                      <input
                        type="text"
                        name="dimensions"
                        value={formData.dimensions}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                        placeholder="e.g., 230x250 cm"
                      />
                      <p className="text-xs text-gray-500 mt-1">Shown on product page. For shipping dimensions, use Logistics tab.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Display Weight
                      </label>
                      <input
                        type="text"
                        name="weight"
                        value={formData.weight}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                        placeholder="e.g., 1.2 kg"
                      />
                      <p className="text-xs text-gray-500 mt-1">Shown on product page. For shipping weight, use Logistics tab.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Base SKU
                      </label>
                      <input
                        type="text"
                        name="baseSku"
                        value={formData.baseSku}
                        onChange={handleInputChange}
                        disabled={formData.isFromInventory}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent ${formData.isFromInventory ? 'bg-gray-100 text-gray-600' : ''
                          }`}
                        placeholder="e.g., CS-001"
                      />
                      {formData.isFromInventory && (
                        <p className="text-xs text-gray-500 mt-1">From inventory SKU</p>
                      )}
                    </div>
                  </div>

                  {/* Size and Color */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Size
                      </label>
                      <Dropdown
                        value={formData.singleUnitSize || ''}
                        options={standardSizes}
                        placeholder="Select Size"
                        onChange={(value) => setFormData(prev => ({ ...prev, singleUnitSize: value as string }))}
                      />
                      <p className="text-xs text-gray-500 mt-1">Primary size for this product</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Color
                      </label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={formData.singleUnitColorHex || '#000000'}
                            onChange={(e) => {
                              const hex = e.target.value
                              setFormData(prev => ({
                                ...prev,
                                singleUnitColorHex: hex,
                                singleUnitColor: getColorName(hex)
                              }))
                            }}
                            className="w-10 h-10 border border-gray-300 rounded-md cursor-pointer"
                            title="Pick a color"
                          />
                          <input
                            type="text"
                            value={formData.singleUnitColor || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, singleUnitColor: e.target.value }))}
                            placeholder="Color name"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                          />
                        </div>
                        <p className="text-xs text-gray-500">Primary color for this product</p>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Dropdown
                            value={selectedTag}
                            options={tagOptions}
                            onChange={(value) => setSelectedTag(value as string)}
                            placeholder="Select a tag"
                          />
                        </div>
                        <Button type="button" onClick={addTag} className="bg-gray-900 text-white">
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      {formData.tags.length === 0 && (
                        <p className="text-xs text-gray-500">No tags added yet. Select from the dropdown above.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fabric & Specifications Tab */}
            {activeTab === 'fabric' && (
              <Card>
                <CardHeader>
                  <CardTitle>Fabric Type & Specifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Dropdown
                      label="Fabric Type *"
                      value={formData.fabricType}
                      options={fabricTypes}
                      placeholder="Select Fabric Type"
                      onChange={(value) => setFormData(prev => ({ ...prev, fabricType: value as string }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Material Description
                    </label>
                    <input
                      type="text"
                      name="material"
                      value={formData.material}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                      placeholder="e.g., 100% Organic Cotton"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Composition
                      </label>
                      <input
                        type="text"
                        name="fabricSpecifications.composition"
                        value={formData.fabricSpecifications.composition}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                        placeholder="e.g., 100% Cotton"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Weight (GSM)
                      </label>
                      <input
                        type="text"
                        name="fabricSpecifications.weight"
                        value={formData.fabricSpecifications.weight}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                        placeholder="e.g., 200 GSM"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Weave
                      </label>
                      <input
                        type="text"
                        name="fabricSpecifications.weave"
                        value={formData.fabricSpecifications.weave}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                        placeholder="e.g., Percale, Sateen"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Finish
                      </label>
                      <input
                        type="text"
                        name="fabricSpecifications.finish"
                        value={formData.fabricSpecifications.finish}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                        placeholder="e.g., Pre-shrunk, Mercerized"
                      />
                    </div>
                  </div>

                  {/* Care Instructions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Care Instructions
                    </label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCareInstruction}
                          onChange={(e) => setNewCareInstruction(e.target.value)}
                          placeholder="Add care instruction"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCareInstruction())}
                        />
                        <Button type="button" onClick={addCareInstruction} className="bg-gray-900 text-white">
                          Add
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {formData.fabricSpecifications.careInstructions.map((instruction) => (
                          <div
                            key={instruction}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                          >
                            <span className="text-sm">{instruction}</span>
                            <button
                              type="button"
                              onClick={() => removeCareInstruction(instruction)}
                              className="text-gray-700 hover:text-red-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Variants Tab */}
            {activeTab === 'variants' && (
              <Card>
                <CardHeader>
                  <CardTitle>Size & Color Variants</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="hasVariants"
                      checked={formData.hasVariants}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    <label className="text-sm font-medium text-gray-900">
                      This product has variants (different sizes/colors)
                    </label>
                  </div>

                  {formData.hasVariants && (
                    <>
                      {/* Add New Variant */}
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 bg-gradient-to-br from-gray-50 to-white hover:border-gray-400 transition-colors">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-2 bg-gray-900 rounded-lg">
                            <Package className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">Add New Variant</h4>
                            <p className="text-sm text-gray-600">Create a new product variant with specific attributes</p>
                          </div>
                        </div>

                        {/* Variant Details - Two Row Layout */}
                        <div className="space-y-6">
                          {/* First Row: Basic Attributes */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">Size *</label>
                              <Dropdown
                                value={newVariant.size || ''}
                                options={standardSizes}
                                placeholder="Select Size"
                                onChange={(value) => setNewVariant(prev => ({ ...prev, size: value as string }))}
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">Color *</label>
                              <div className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg bg-white">
                                <input
                                  type="color"
                                  value={newVariant.colorHex || '#000000'}
                                  onChange={(e) => {
                                    const hex = e.target.value
                                    setNewVariant(prev => ({
                                      ...prev,
                                      colorHex: hex,
                                      color: getColorName(hex)
                                    }))
                                  }}
                                  className="w-10 h-10 border border-gray-300 rounded-md cursor-pointer"
                                  title="Pick a color"
                                />
                                <input
                                  type="text"
                                  value={newVariant.color || ''}
                                  onChange={(e) => setNewVariant(prev => ({ ...prev, color: e.target.value }))}
                                  placeholder="Color name"
                                  className="flex-1 px-0 py-0 border-0 focus:outline-none focus:ring-0 text-sm bg-transparent"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">SKU *</label>
                              <input
                                type="text"
                                value={newVariant.sku}
                                onChange={(e) => setNewVariant(prev => ({ ...prev, sku: e.target.value }))}
                                placeholder="e.g., CS-Q-BLK"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm bg-white"
                              />
                            </div>
                          </div>

                          {/* Second Row: Pricing & Inventory & Image */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">Price *</label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">₹</span>
                                <input
                                  type="number"
                                  value={newVariant.price}
                                  onChange={(e) => setNewVariant(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                                  placeholder="0.00"
                                  step="0.01"
                                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm bg-white"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">Stock Quantity *</label>
                              <input
                                type="number"
                                value={newVariant.stock}
                                onChange={(e) => setNewVariant(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                                placeholder="0"
                                min="0"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm bg-white"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">Variant Image</label>
                              <div className="flex items-center gap-3">
                                <div className="relative w-12 h-12 bg-gray-100 rounded-lg border border-gray-300 overflow-hidden flex-shrink-0">
                                  {newVariant.images && newVariant.images.length > 0 ? (
                                    <img
                                      src={newVariant.images[0]}
                                      alt="Variant"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400">
                                      <Upload className="w-5 h-5" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <input
                                    type="file"
                                    id="variant-image-upload"
                                    accept="image/*"
                                    onChange={handleVariantImageUpload}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor="variant-image-upload"
                                    className="inline-block px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                                  >
                                    {newVariant.images && newVariant.images.length > 0 ? 'Change Image' : 'Choose Image'}
                                  </label>
                                  {newVariant.images && newVariant.images.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setNewVariant(prev => ({ ...prev, images: [] }))}
                                      className="ml-2 text-xs text-red-600 hover:text-red-800"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="flex justify-end pt-4 border-t border-gray-200">
                            <Button
                              type="button"
                              onClick={addVariant}
                              disabled={!newVariant.size || !newVariant.color || !newVariant.sku || !newVariant.price}
                              className="bg-gray-900 text-white hover:bg-black disabled:bg-gray-400 disabled:cursor-not-allowed px-6 py-2.5 font-medium"
                            >
                              <Package className="h-4 w-4 mr-2" />
                              Add Variant
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Existing Variants */}
                      {formData.variants.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-900">Current Variants ({formData.variants.length})</h4>
                            <div className="text-xs text-gray-600">
                              Total Stock: <span className="font-semibold text-gray-900">{formData.variants.reduce((sum, v) => sum + v.stock, 0)}</span>
                            </div>
                          </div>

                          {/* Variants Table */}
                          <div className="overflow-x-auto border border-gray-300 rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Image</TableHead>
                                  <TableHead>Size</TableHead>
                                  <TableHead>Color</TableHead>
                                  <TableHead>SKU</TableHead>
                                  <TableHead>Price</TableHead>
                                  <TableHead>Stock</TableHead>
                                  <TableHead className="text-center">Action</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {formData.variants.map((variant, idx) => (
                                  <TableRow key={variant.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100'}>
                                    <TableCell>
                                      <button
                                        type="button"
                                        onClick={() => setEditingVariantId(variant.id || null)}
                                        className="w-10 h-10 bg-gray-100 rounded border border-gray-200 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all relative group"
                                        title="Manage images"
                                      >
                                        {variant.images && variant.images.length > 0 ? (
                                          <img src={variant.images[0]} alt={variant.sku} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="flex items-center justify-center h-full text-gray-300">
                                            <Package className="w-4 h-4" />
                                          </div>
                                        )}

                                        {/* Overlay indicator */}
                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                          <ImageIcon className="w-4 h-4 text-white drop-shadow-sm" />
                                        </div>
                                      </button>
                                    </TableCell>
                                    <TableCell>
                                      <select
                                        value={variant.size}
                                        onChange={(e) => updateVariant(variant.id, 'size', e.target.value)}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-700 bg-white"
                                      >
                                        {standardSizes.map(s => (
                                          <option key={s} value={s}>{s}</option>
                                        ))}
                                      </select>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="color"
                                          value={variant.colorHex || '#CCCCCC'}
                                          onChange={(e) => updateVariant(variant.id, 'colorHex', e.target.value)}
                                          className="w-6 h-6 rounded border border-gray-300 cursor-pointer"
                                          title="Click to change color"
                                        />
                                        <div className="flex flex-col">
                                          <input
                                            type="text"
                                            value={variant.color}
                                            onChange={(e) => updateVariant(variant.id, 'color', e.target.value)}
                                            className="text-gray-900 text-sm font-medium bg-transparent border-none p-0 focus:outline-none focus:ring-1 focus:ring-gray-300 rounded px-1"
                                            placeholder="Color name"
                                          />
                                          <span className="text-gray-500 text-xs">{variant.colorHex || '#CCCCCC'}</span>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <input
                                        type="text"
                                        value={variant.sku}
                                        onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs font-mono focus:outline-none focus:ring-1 focus:ring-gray-700 bg-white"
                                        placeholder="SKU"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <div className="relative">
                                        <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">₹</span>
                                        <input
                                          type="number"
                                          value={variant.price}
                                          onChange={(e) => updateVariant(variant.id, 'price', parseFloat(e.target.value) || 0)}
                                          className="w-full pl-5 pr-2 py-1.5 border border-gray-300 rounded-md text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-gray-700 bg-white"
                                          step="0.01"
                                          min="0"
                                        />
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <input
                                        type="number"
                                        value={variant.stock}
                                        onChange={(e) => updateVariant(variant.id, 'stock', parseInt(e.target.value) || 0)}
                                        className={`w-20 px-2 py-1.5 border rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-gray-700 bg-white ${variant.stock > 20 ? 'border-green-300 text-green-800' :
                                          variant.stock > 5 ? 'border-yellow-300 text-yellow-800' :
                                            'border-red-300 text-red-800'
                                          }`}
                                        min="0"
                                      />
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <button
                                        type="button"
                                        onClick={() => removeVariant(variant.id)}
                                        className="text-gray-600 hover:text-red-600 p-1 inline-block"
                                        title="Remove variant"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Variant Summary */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                              <p className="text-xs text-gray-600 mb-1">Total Variants</p>
                              <p className="text-2xl font-bold text-gray-900">{formData.variants.length}</p>
                            </div>
                            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                              <p className="text-xs text-gray-600 mb-1">Total Stock</p>
                              <p className="text-2xl font-bold text-gray-900">{formData.variants.reduce((sum, v) => sum + v.stock, 0)}</p>
                            </div>
                            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                              <p className="text-xs text-gray-600 mb-1">Price Range</p>
                              <p className="text-2xl font-bold text-gray-900">
                                ₹{Math.min(...formData.variants.map(v => v.price)).toFixed(2)} - ₹{Math.max(...formData.variants.map(v => v.price)).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {formData.variants.length === 0 && (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-300">
                          <p className="text-gray-600 mb-2">No variants added yet</p>
                          <p className="text-sm text-gray-500">Add your first variant above to get started</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Base / Single Unit Pricing Section */}
                  <div className="border-2 border-gray-300 rounded-lg p-6 bg-gray-50">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Package className="h-5 w-5 text-gray-700" />
                      {formData.hasVariants ? 'Base Unit Pricing & Stock' : 'Single Unit Pricing & Stock'}
                    </h4>
                    <p className="text-sm text-gray-600 mb-6">
                      {formData.hasVariants
                        ? 'Set the price and stock for the base/default unit of this product (not covered by variants).'
                        : 'Set the price and stock for this product.'}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Base Price *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-500">₹</span>
                          <input
                            type="number"
                            name="basePrice"
                            value={formData.basePrice}
                            onChange={handleInputChange}
                            required
                            min="0"
                            step="0.01"
                            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {formData.hasVariants ? 'Base Unit Stock *' : 'Stock Quantity *'}
                        </label>
                        <input
                          type="number"
                          name="totalStock"
                          value={formData.totalStock}
                          onChange={handleInputChange}
                          required
                          readOnly={isEdit}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${isEdit ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                          placeholder="0"
                        />
                        {isEdit && (
                          <p className="text-[10px] text-amber-600 mt-1">Manage stock via Inventory</p>
                        )}
                      </div>
                    </div>

                    {formData.hasVariants && (
                      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
                        <div className="flex justify-between items-center">
                          <div className="space-y-1">
                            <span className="text-blue-800 font-semibold block">Total Aggregate Stock:</span>
                            <span className="text-xs text-blue-600">Base Unit ({formData.totalStock}) + All Variants ({formData.variants.reduce((sum, v) => sum + v.stock, 0)})</span>
                          </div>
                          <div className="text-right">
                            <span className="text-3xl font-bold text-blue-900">
                              {formData.totalStock + formData.variants.reduce((sum, v) => sum + v.stock, 0)}
                            </span>
                            <span className="text-sm font-medium text-blue-800 ml-1">Units</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {!formData.hasVariants && formData.basePrice > 0 && (
                      <div className="mt-4 p-4 bg-white border border-gray-300 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Selling Price:</span>
                          <span className="text-2xl font-bold text-gray-900">₹{formData.basePrice.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing Tab */}
            {activeTab === 'pricing' && (
              <Card>
                <CardHeader>
                  <CardTitle>Pricing Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* GST Selection */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Tax Configuration</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Dropdown
                          label="GST Rate"
                          value={formData.gstPercentage?.toString() || ''}
                          options={[
                            { value: '', label: 'Select GST Rate' },
                            ...gstRates.filter(rate => rate.isActive).map(rate => ({
                              value: rate.percentage.toString(),
                              label: `${rate.percentage}% - ${rate.description || 'GST'}`
                            }))
                          ]}
                          onChange={(value) => setFormData(prev => ({
                            ...prev,
                            gstPercentage: value ? parseFloat(value as string) : undefined
                          }))}
                          placeholder={isLoadingGst ? "Loading rates..." : "Select GST Rate"}
                          disabled={isLoadingGst}
                        />
                        <p className="text-xs text-gray-500 mt-1">Select the applicable GST rate for this product</p>
                        {!formData.gstPercentage && (
                          <p className="text-xs text-red-500 mt-1">GST Rate is required</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Single Price Section */}
                  <div className="border-2 border-gray-300 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Single Unit Pricing</h4>

                    {/* Pricing Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Base Price *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-500">₹</span>
                          <input
                            type="number"
                            name="basePrice"
                            value={formData.basePrice}
                            onChange={handleInputChange}
                            required
                            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                            placeholder="0"
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-1">Price for single unit</p>
                      </div>
                    </div>
                  </div>

                  {/* Variant Pricing Section */}
                  {formData.hasVariants && formData.variants.length > 0 && (
                    <div className="border-2 border-gray-300 rounded-lg p-6">
                      <h4 className="font-semibold text-gray-900 mb-4">Variant Pricing</h4>
                      <p className="text-sm text-gray-600 mb-4">Set individual pricing for each variant. Original price and discount are optional — used to show strikethrough pricing to customers.</p>
                      <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {formData.variants.map((variant) => (
                          <div key={variant.id} className="p-4 border border-gray-200 rounded-lg bg-white">
                            <div className="flex items-center gap-2 mb-3">
                              <div
                                className="w-5 h-5 rounded-full border border-gray-300"
                                style={{ backgroundColor: variant.colorHex || '#ccc' }}
                              />
                              <span className="text-sm font-medium text-gray-900">
                                {variant.size} - {variant.color}
                              </span>
                              <span className="text-xs text-gray-500 font-mono">({variant.sku})</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Selling Price (₹) *
                                </label>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">₹</span>
                                  <input
                                    type="number"
                                    value={variant.price}
                                    onChange={(e) => updateVariant(variant.id, 'price', parseFloat(e.target.value) || 0)}
                                    className="w-full pl-6 pr-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                    step="0.01"
                                    min="0"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Inventory Tab */}
            {activeTab === 'inventory' && (
              <Card>
                <CardHeader>
                  <CardTitle>Stock Quantity Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="trackInventory"
                      checked={formData.trackInventory}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-gray-700 focus:ring-gray-700"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Track inventory for this product
                    </label>
                  </div>

                  {formData.trackInventory && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {formData.hasVariants ? 'Total Aggregate Stock (Autofilled)' : 'Total Stock Quantity'} {!isEdit && '*'}
                          </label>
                          <input
                            type="number"
                            name="totalStock"
                            value={formData.hasVariants
                              ? formData.totalStock + formData.variants.reduce((sum, v) => sum + v.stock, 0)
                              : formData.totalStock
                            }
                            onChange={handleInputChange}
                            required={!isEdit}
                            readOnly={isEdit || formData.hasVariants}
                            min="0"
                            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent ${isEdit || formData.hasVariants ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                              }`}
                          />
                          {formData.hasVariants && !isEdit && (
                            <p className="text-xs text-blue-600 mt-1">
                              Calculated as: Base ({formData.totalStock}) + Variants ({formData.variants.reduce((sum, v) => sum + v.stock, 0)})
                            </p>
                          )}
                          {isEdit ? (
                            <p className="text-xs text-amber-600 mt-1">
                              🔒 Stock cannot be changed here. Use <strong>Inventory → Update Stock</strong>.
                            </p>
                          ) : !formData.hasVariants && (
                            <p className="text-xs text-slate-500 mt-1">
                              Opening stock for this product.
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Low Stock Threshold
                          </label>
                          <input
                            type="number"
                            name="lowStockThreshold"
                            value={formData.lowStockThreshold}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                          />
                        </div>
                      </div>

                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Shipping Tab */}
            {activeTab === 'shipping' && (
              <Card>
                <CardHeader>
                  <CardTitle>Dispatch Timeline Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Processing Days *
                      </label>
                      <input
                        type="number"
                        name="dispatchTimeline.processingDays"
                        value={formData.dispatchTimeline.processingDays}
                        onChange={handleInputChange}
                        required
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Days to prepare order</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Shipping Days *
                      </label>
                      <input
                        type="number"
                        name="dispatchTimeline.shippingDays"
                        value={formData.dispatchTimeline.shippingDays}
                        onChange={handleInputChange}
                        required
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Days for delivery</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Total Days
                      </label>
                      <input
                        type="number"
                        value={formData.dispatchTimeline.totalDays}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                      />
                      <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Delivery Timeline Summary</h4>
                    <p className="text-sm text-blue-800">
                      Orders will be processed in <strong>{formData.dispatchTimeline.processingDays} day(s)</strong> and
                      delivered within <strong>{formData.dispatchTimeline.totalDays} day(s)</strong> from order confirmation.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Logistics Tab */}
            {activeTab === 'logistics' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Shipping Weight Configuration</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Used for shipping cost calculation. Different from the display weight in Basic Info.</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Shipping Weight per Unit *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.logisticsConfig?.unitWeight || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            logisticsConfig: { ...prev.logisticsConfig!, unitWeight: parseFloat(e.target.value) || 0 }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                          placeholder="e.g. 0.5"
                        />
                        <p className="text-xs text-gray-500 mt-1">Weight per single unit</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Shipping Weight Unit *</label>
                        <select
                          value={formData.logisticsConfig?.weightUom || 'KG'}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            logisticsConfig: { ...prev.logisticsConfig!, weightUom: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                        >
                          <option value="KG">Kilogram (KG)</option>
                          <option value="GRAM">Gram (g)</option>
                          <option value="TON">Ton</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Max Shippable Weight</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.logisticsConfig?.maxWeight || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            logisticsConfig: { ...prev.logisticsConfig!, maxWeight: parseFloat(e.target.value) || 0 }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                          placeholder="e.g. 5000"
                        />
                        <p className="text-xs text-gray-500 mt-1">Max weight per order (in {formData.logisticsConfig?.weightUom || 'KG'})</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Shipping Dimensions</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Exact dimensions for shipping cost (CBM/volumetric). Different from the display dimensions in Basic Info.</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Length</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.logisticsConfig?.dimensions?.length || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            logisticsConfig: {
                              ...prev.logisticsConfig!,
                              dimensions: {
                                ...(prev.logisticsConfig?.dimensions || { length: 0, width: 0, height: 0, unit: 'CM' }),
                                length: parseFloat(e.target.value) || 0
                              }
                            }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Width</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.logisticsConfig?.dimensions?.width || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            logisticsConfig: {
                              ...prev.logisticsConfig!,
                              dimensions: {
                                ...(prev.logisticsConfig?.dimensions || { length: 0, width: 0, height: 0, unit: 'CM' }),
                                width: parseFloat(e.target.value) || 0
                              }
                            }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Height</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.logisticsConfig?.dimensions?.height || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            logisticsConfig: {
                              ...prev.logisticsConfig!,
                              dimensions: {
                                ...(prev.logisticsConfig?.dimensions || { length: 0, width: 0, height: 0, unit: 'CM' }),
                                height: parseFloat(e.target.value) || 0
                              }
                            }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                        <select
                          value={formData.logisticsConfig?.dimensions?.unit || 'CM'}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            logisticsConfig: {
                              ...prev.logisticsConfig!,
                              dimensions: {
                                ...(prev.logisticsConfig?.dimensions || { length: 0, width: 0, height: 0, unit: 'CM' }),
                                unit: e.target.value
                              }
                            }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                        >
                          <option value="CM">CM</option>
                          <option value="IN">Inches</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Transport Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Available Transport Types</label>
                      <div className="flex gap-4">
                        {['AIR', 'SHIP'].map((type) => (
                          <label key={type} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.logisticsConfig?.transportTypes?.includes(type) || false}
                              onChange={(e) => {
                                setFormData(prev => {
                                  const types = prev.logisticsConfig?.transportTypes || [];
                                  const updated = e.target.checked
                                    ? [...types, type]
                                    : types.filter((t: string) => t !== type);
                                  return { ...prev, logisticsConfig: { ...prev.logisticsConfig!, transportTypes: updated.length > 0 ? updated : [type] } };
                                });
                              }}
                              className="w-4 h-4 text-gray-700 border-gray-300 rounded focus:ring-gray-700"
                            />
                            <span className="text-sm font-medium text-gray-700">{type === 'AIR' ? 'Air Freight' : 'Sea Freight'}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Air Delivery Days</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.logisticsConfig?.airDeliveryDays || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            logisticsConfig: { ...prev.logisticsConfig!, airDeliveryDays: parseInt(e.target.value) || 7 }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ship Delivery Days</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.logisticsConfig?.shipDeliveryDays || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            logisticsConfig: { ...prev.logisticsConfig!, shipDeliveryDays: parseInt(e.target.value) || 30 }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Air Cost per KG</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.logisticsConfig?.airCostPerKg || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            logisticsConfig: { ...prev.logisticsConfig!, airCostPerKg: parseFloat(e.target.value) || 0 }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                          placeholder="e.g. 100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ship Cost per KG</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.logisticsConfig?.shipCostPerKg || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            logisticsConfig: { ...prev.logisticsConfig!, shipCostPerKg: parseFloat(e.target.value) || 0 }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                          placeholder="e.g. 20"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Weight Range Rules</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">Define weight ranges to auto-recommend transport type. Weights are in KG (normalized).</p>
                    <div className="space-y-3">
                      {(formData.logisticsConfig?.weightRanges || []).map((range: { minWeight: number; maxWeight: number; recommendedTransport: string }, idx: number) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="flex-1">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={range.minWeight}
                              onChange={(e) => {
                                setFormData(prev => {
                                  const ranges = [...(prev.logisticsConfig?.weightRanges || [])];
                                  ranges[idx] = { ...ranges[idx], minWeight: parseFloat(e.target.value) || 0 };
                                  return { ...prev, logisticsConfig: { ...prev.logisticsConfig!, weightRanges: ranges } };
                                });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-700"
                              placeholder="Min KG"
                            />
                          </div>
                          <span className="text-gray-400 text-sm">to</span>
                          <div className="flex-1">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={range.maxWeight}
                              onChange={(e) => {
                                setFormData(prev => {
                                  const ranges = [...(prev.logisticsConfig?.weightRanges || [])];
                                  ranges[idx] = { ...ranges[idx], maxWeight: parseFloat(e.target.value) || 0 };
                                  return { ...prev, logisticsConfig: { ...prev.logisticsConfig!, weightRanges: ranges } };
                                });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-700"
                              placeholder="Max KG"
                            />
                          </div>
                          <select
                            value={range.recommendedTransport}
                            onChange={(e) => {
                              setFormData(prev => {
                                const ranges = [...(prev.logisticsConfig?.weightRanges || [])];
                                ranges[idx] = { ...ranges[idx], recommendedTransport: e.target.value };
                                return { ...prev, logisticsConfig: { ...prev.logisticsConfig!, weightRanges: ranges } };
                              });
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-700"
                          >
                            <option value="AIR">Air</option>
                            <option value="SHIP">Ship</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => {
                                const ranges = (prev.logisticsConfig?.weightRanges || []).filter((_: unknown, i: number) => i !== idx);
                                return { ...prev, logisticsConfig: { ...prev.logisticsConfig!, weightRanges: ranges } };
                              });
                            }}
                            className="text-red-500 hover:text-red-700 text-sm font-medium px-2"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => {
                          const ranges = [...(prev.logisticsConfig?.weightRanges || []), { minWeight: 0, maxWeight: 100, recommendedTransport: 'SHIP' }];
                          return { ...prev, logisticsConfig: { ...prev.logisticsConfig!, weightRanges: ranges } };
                        });
                      }}
                      className="text-sm text-gray-700 hover:text-gray-900 font-medium border border-gray-300 rounded-md px-4 py-2 hover:bg-gray-50 transition-colors"
                    >
                      + Add Weight Range
                    </button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Customer-Facing Logistics Notes</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">This note will be visible to customers on the product page.</p>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={formData.logisticsConfig?.notes || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        logisticsConfig: { ...prev.logisticsConfig!, notes: e.target.value }
                      }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                      placeholder="e.g., Bulk orders above 50 KG ship via sea freight for best rates. Air freight available for urgent orders."
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Status & Availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Dropdown
                    label="Product Status"
                    value={formData.status}
                    options={[
                      { value: 'ACTIVE', label: 'Active' },
                      { value: 'INACTIVE', label: 'Inactive' },
                      { value: 'OUT_OF_STOCK', label: 'Out of Stock' }
                    ]}
                    onChange={(value) => setFormData(prev => ({ ...prev, status: value as 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' }))}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="inStock"
                    checked={formData.inStock}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-gray-700 focus:ring-gray-700"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    In Stock
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product Images</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Cover Image Upload */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Cover Image (1 image only)</h4>
                    <div
                      className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors cursor-pointer bg-blue-50"
                      onClick={() => document.getElementById('cover-image-upload')?.click()}
                    >
                      <Upload className="mx-auto h-8 w-8 text-blue-400" />
                      <p className="mt-1 text-sm text-blue-600">Upload Cover Image</p>
                      <p className="text-xs text-blue-500">PNG, JPG, GIF up to 10MB</p>
                      <input
                        id="cover-image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, 'cover')}
                      />
                    </div>
                  </div>

                  {/* Gallery Images Upload */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Gallery Images (Max 3 images)</h4>
                    <div
                      className="border-2 border-dashed border-green-300 rounded-lg p-4 text-center hover:border-green-400 transition-colors cursor-pointer bg-green-50"
                      onClick={() => document.getElementById('gallery-image-upload')?.click()}
                    >
                      <Upload className="mx-auto h-8 w-8 text-green-400" />
                      <p className="mt-1 text-sm text-green-600">Upload Gallery Images</p>
                      <p className="text-xs text-green-500">PNG, JPG, GIF up to 10MB each</p>
                      <input
                        id="gallery-image-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, 'gallery')}
                      />
                    </div>
                  </div>

                  {/* Image Preview Grid */}
                  {formData.images.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Images</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {formData.images.map((image) => (
                          <div key={image.id} className="relative group">
                            <img
                              src={image.url}
                              alt={image.alt}
                              className="w-full h-20 object-cover rounded border"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setImageType(image.id, image.imageType === 'cover' ? 'gallery' : 'cover')}
                                className="text-white text-xs bg-blue-600 px-2 py-1 rounded hover:bg-blue-700"
                              >
                                {image.imageType === 'cover' ? 'Set Gallery' : 'Set Cover'}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeImage(image.id)}
                                className="text-white hover:text-red-300"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="absolute top-1 left-1">
                              {image.imageType === 'cover' ? (
                                <div className="bg-blue-600 text-white text-xs px-1 rounded">Cover</div>
                              ) : (
                                <div className="bg-green-600 text-white text-xs px-1 rounded">Gallery</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {formData.vendorName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Vendor:</span>
                    <span className="font-medium">{formData.vendorName}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Variants:</span>
                  <span className="font-medium">{formData.variants.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Stock:</span>
                  <span className="font-medium">
                    {formData.hasVariants
                      ? formData.variants.reduce((sum, v) => sum + v.stock, 0)
                      : formData.totalStock
                    }
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Price Range:</span>
                  <span className="font-medium">
                    {formData.hasVariants && formData.variants.length > 0
                      ? `₹${Math.min(...formData.variants.map(v => v.price))} - ₹${Math.max(...formData.variants.map(v => v.price))}`
                      : `₹${formData.basePrice}`
                    }
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Dispatch Time:</span>
                  <span className="font-medium">{formData.dispatchTimeline.totalDays} days</span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#313131] text-white hover:bg-[#222222]"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Saving...' : (isEdit ? 'Update Product' : 'Create Product')}
                </Button>

                {!isEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={isLoading}
                    className="w-full"
                  >
                    Save as Draft
                  </Button>
                )}

                <Link href="/admin/dashboard/products" className="block">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>

                {hasUnsavedChanges && (
                  <p className="text-xs text-amber-600 text-center">
                    You have unsaved changes
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {editingVariantId && (
        <VariantImageModal
          isOpen={!!editingVariantId}
          onClose={() => setEditingVariantId(null)}
          variantData={{
            id: editingVariantId,
            size: getEditingVariant()?.size || '',
            color: getEditingVariant()?.color || '',
            images: getEditingVariant()?.images || []
          }}
          onUpdateImages={handleVariantImagesUpdate}
        />
      )}
    </div>
  )
}