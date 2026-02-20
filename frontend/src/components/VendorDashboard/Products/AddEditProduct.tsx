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
import { categories } from '@/components/mockData/products'
import { useToast } from '@/hooks/use-toast'
import { showSuccessToast, showErrorToast, showWarningToast } from '@/lib/toast-utils'
import { productService, type ProductFormData as ServiceProductFormData } from '@/services/productService'
import { gstSettingsService, type GSTSetting } from '@/services/gstSettingsService'

// Mock data for inventory items (these would come from API)
const mockInventoryItems = [
  {
    id: '1',
    name: 'Cotton Kitchen Towel',
    sku: 'KL-CKT-001',
    category: 'Kitchen Linen',
    description: 'High-quality cotton kitchen towel with excellent absorbency',
    costPrice: 6.50,
    sellingPrice: 12.99,
    currentStock: 45,
    hasProductCreated: false
  },
  {
    id: '2',
    name: 'Handwoven Bath Towel',
    sku: 'BL-HBT-002',
    category: 'Bath Linen',
    description: 'Luxurious handwoven bath towel',
    costPrice: 12.00,
    sellingPrice: 24.99,
    currentStock: 25,
    hasProductCreated: false
  },
  {
    id: '3',
    name: 'Premium Bed Sheet Set',
    sku: 'BL-PBS-003',
    category: 'Bed Linen',
    description: 'Premium quality bed sheet set',
    costPrice: 45.00,
    sellingPrice: 89.99,
    currentStock: 15,
    hasProductCreated: true // Already has a product created
  }
]
const categorySubcategories: Record<string, string[]> = {
  'Kitchen Towels': ['Dish Towels', 'Tea Towels', 'Paper Towel Alternatives', 'Microfiber Towels'],
  'Bath Towels': ['Large Towels', 'Hand Towels', 'Washcloths', 'Beach Towels'],
  'Hand Towels': ['Guest Towels', 'Decorative Towels', 'Quick-Dry Towels'],
  'Aprons': ['Kitchen Aprons', 'Bib Aprons', 'Waist Aprons', 'Chef Aprons'],
  'Table Linens': ['Table Runners', 'Placemats', 'Napkins', 'Tablecloths'],
  'Decorative Textiles': ['Wall Hangings', 'Cushion Covers', 'Throws', 'Curtains']
}

const fabricTypes = [
  'Cotton', 'Linen', 'Silk', 'Polyester', 'Microfiber', 'Bamboo', 'Modal', 'Tencel', 'Wool', 'Cashmere'
]

const standardSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'King', 'Queen', 'Full', 'Twin', 'Custom']
const standardColors = ['White', 'Black', 'Gray', 'Navy', 'Beige', 'Brown', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple']

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

interface ProductVariant {
  id?: string
  size: string
  color: string
  colorHex?: string // New field for color picker hex value
  sku: string
  price: number
  stock: number
  images: string[]
}

interface ProductImage {
  id?: string
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

interface ProductFormData {
  // Inventory Connection (NEW FLOW)
  inventoryItemId?: string // Link to inventory item
  isFromInventory: boolean // Whether this product is created from inventory

  name: string
  description: string
  category: string
  subCategory: string

  // Pricing Information (inherited from inventory)
  basePrice: number
  originalPrice?: number
  discount?: number
  gstPercentage?: number

  // Basic Product Info - Size & Color
  singleUnitSize?: string
  singleUnitColor?: string
  singleUnitColorHex?: string

  // Product Rating & Reviews (for display/reference)
  rating?: number
  reviews?: number

  // Fabric & Specifications
  fabricType: string
  material: string
  fabricSpecifications: FabricSpecification

  // Variants Management
  variants: ProductVariant[]
  hasVariants: boolean

  // Base Product Info (when no variants)
  baseSku: string

  // Images
  images: ProductImage[]

  // Stock Management (linked to inventory)
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
  tags: string[]
  dimensions?: string
  weight?: string
  inStock: boolean
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK'
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedAt?: string
  approvedBy?: string
  rejectionReason?: string
}

interface AddEditProductProps {
  productId?: string
  isEdit?: boolean
  inventoryId?: string // Pre-select an inventory item when coming from inventory page
}

export default function AddEditProduct({ productId, isEdit = false, inventoryId }: AddEditProductProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(isEdit)
  const [availableInventoryItems, setAvailableInventoryItems] = useState<any[]>([])
  const [isLoadingInventory, setIsLoadingInventory] = useState(false)

  const [formData, setFormData] = useState<ProductFormData>({
    // Inventory Connection (NEW)
    inventoryItemId: inventoryId || '',
    isFromInventory: !!inventoryId,

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
    tags: [],
    dimensions: '',
    weight: '',
    inStock: true,
    status: 'ACTIVE'
  })

  const [selectedTag, setSelectedTag] = useState('')
  const [newCareInstruction, setNewCareInstruction] = useState('')
  const [activeTab, setActiveTab] = useState('basic')

  // Predefined tag options
  const tagOptions = [
    { value: 'Featured', label: 'Featured' },
    { value: 'Top Selling', label: 'Top Selling' },
    { value: 'Best Seller', label: 'Best Seller' }
  ]
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<any>(null)

  // GST State
  const [gstRates, setGstRates] = useState<GSTSetting[]>([])
  const [isLoadingGst, setIsLoadingGst] = useState(false)

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
    stock: 0
  })

  const [editingVariantId, setEditingVariantId] = useState<string | null>(null)

  const handleVariantImageUpdate = (variantId: string, newImages: string[]) => {
    // Custom logic to update variant images using the existing updateVariant helper if needed,
    // but updateVariant updates a single field. Let's reuse updateVariant.
    updateVariant(variantId, 'images', newImages)
  }

  const getEditingVariant = () => {
    return formData.variants.find(v => v.id === editingVariantId)
  }

  // Load available inventory items
  useEffect(() => {
    const loadAvailableInventory = async () => {
      if (!isEdit) {
        setIsLoadingInventory(true)
        try {
          const response = await productService.getAvailableInventoryItems()
          if (response.success && response.data) {
            setAvailableInventoryItems(response.data)
          }
        } catch (error) {
          console.error('Error loading inventory items:', error)
          showErrorToast('Load Failed', 'Unable to load inventory items')
        } finally {
          setIsLoadingInventory(false)
        }
      }
    }

    loadAvailableInventory()

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
  }, [isEdit])

  // Load product data for editing
  useEffect(() => {
    if (isEdit && productId) {
      setIsLoadingData(true)

      // Load product data from API
      const loadProductData = async () => {
        try {
          const response = await productService.getProduct(productId)
          if (response.success && response.data) {
            const product = response.data
            setFormData({
              inventoryItemId: product.inventoryItemId || '',
              isFromInventory: product.isFromInventory || false,

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
              singleUnitSize: (product as any).singleUnitSize || '',
              singleUnitColor: (product as any).singleUnitColor || '',
              singleUnitColorHex: (product as any).singleUnitColorHex || '#000000',

              // Product Rating & Reviews
              rating: product.rating,
              reviews: product.reviews,

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

              variants: product.variants || [],
              hasVariants: product.hasVariants,

              baseSku: product.baseSku,

              images: product.images || [],

              totalStock: product.totalStock,
              lowStockThreshold: product.lowStockThreshold,
              trackInventory: product.trackInventory,

              dispatchTimeline: product.dispatchTimeline || {
                processingDays: 0,
                shippingDays: 0,
                totalDays: 0
              },

              tags: product.tags || [],
              dimensions: product.dimensions || '',
              weight: product.weight || '',
              inStock: product.inStock,
              status: product.status,
              approvalStatus: product.approvalStatus,
              approvedAt: product.approvedAt,
              approvedBy: product.approvedBy,
              rejectionReason: product.rejectionReason
            })

            // Set selected inventory item if connected
            if (product.inventory) {
              setSelectedInventoryItem({
                id: product.inventory.id,
                name: product.inventory.name,
                sku: product.inventory.sku,
                currentStock: product.inventory.currentStock,
                category: product.inventory.category || product.category
              })
            }
          }
        } catch (error) {
          console.error('Error loading product data:', error)
          showErrorToast('Failed to Load Product', 'Unable to load product data. Please try again.')
        } finally {
          setIsLoadingData(false)
        }
      }

      loadProductData()
    } else if (inventoryId) {
      // Pre-fill from inventory selection
      const inventoryItem = availableInventoryItems.find(item => item.id === inventoryId)
      if (inventoryItem) {
        setSelectedInventoryItem(inventoryItem)
        setFormData(prev => ({
          ...prev,
          inventoryItemId: inventoryId,
          isFromInventory: true,
          name: '', // Leave product name empty for user to fill
          description: inventoryItem.description || '',
          category: inventoryItem.category,
          subCategory: inventoryItem.subcategory || '', // Set subcategory from inventory
          baseSku: inventoryItem.sku,
          basePrice: 0, // Will need to be set by user
          totalStock: inventoryItem.currentStock
        }))
      }
    }
  }, [isEdit, productId, inventoryId, availableInventoryItems])

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
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 0 :
          type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      }))
    }
  }

  // Inventory Selection Functions
  const handleInventorySelect = (inventoryItem: any) => {
    setSelectedInventoryItem(inventoryItem)
    setFormData(prev => ({
      ...prev,
      inventoryItemId: inventoryItem.id,
      isFromInventory: true,
      name: '', // Leave product name empty for user to fill
      description: inventoryItem.description || '',
      category: inventoryItem.category,
      subCategory: inventoryItem.subcategory || '', // Set subcategory from inventory
      baseSku: inventoryItem.sku,
      basePrice: 0, // Will need to be set by user since inventory doesn't have selling price
      totalStock: inventoryItem.currentStock
    }))
  }

  const clearInventorySelection = () => {
    setSelectedInventoryItem(null)
    setFormData(prev => ({
      ...prev,
      inventoryItemId: '',
      isFromInventory: false,
      name: '', // Clear product name
      description: '',
      category: '',
      subCategory: '', // Clear subcategory as well
      baseSku: '',
      basePrice: 0,
      totalStock: 0
    }))
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
        stock: newVariant.stock || 0,
        images: []
      }

      setFormData(prev => ({
        ...prev,
        variants: [...prev.variants, variant]
      }))

      setNewVariant({ size: '', color: '', colorHex: '#000000', sku: '', price: 0, stock: 0 })
    }
  }

  const removeVariant = (variantId: string | undefined) => {
    if (!variantId) return; // Guard against undefined id

    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter(v => v.id !== variantId)
    }))
  }

  const updateVariant = (variantId: string | undefined, field: keyof ProductVariant, value: any) => {
    if (!variantId) return; // Guard against undefined id

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

  const setCoverImage = (imageId: string | undefined) => {
    if (!imageId) return; // Guard against undefined id

    setFormData(prev => ({
      ...prev,
      images: prev.images.map(img => ({
        ...img,
        isPrimary: img.id === imageId,
        imageType: img.id === imageId ? 'cover' : img.imageType
      }))
    }))
  }

  const setImageType = (imageId: string | undefined, imageType: 'cover' | 'gallery') => {
    if (!imageId) return; // Guard against undefined id

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

  const removeImage = (imageId: string | undefined) => {
    if (!imageId) return; // Guard against undefined id

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

    // Pricing validation
    if (!formData.hasVariants && formData.basePrice <= 0) {
      showErrorToast('Validation Error', 'Please enter a valid base price.')
      return
    }

    if (formData.hasVariants && formData.variants.length === 0) {
      showErrorToast('Validation Error', 'Please add at least one variant or disable variants.')
      return
    }

    setIsLoading(true)

    try {
      let response
      if (isEdit && productId) {
        response = await productService.updateProduct(productId, formData)
        if (response.success) {
          showSuccessToast('Product Updated', 'Your product has been updated successfully.')
        }
      } else {
        response = await productService.createProduct(formData)
        if (response.success) {
          showSuccessToast('Product Created', 'Your product has been created successfully.')
        }
      }

      // Redirect back to products list
      router.push('/vendor/dashboard/products')
      setHasUnsavedChanges(false)
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
            <Link href="/vendor/dashboard/products">
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
        <div className="mb-4">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-6">
              {[
                { id: 'basic', label: 'Basic Info' },
                { id: 'fabric', label: 'Fabric & Specs' },
                { id: 'variants', label: 'Variants' },
                { id: 'pricing', label: 'Pricing' },
                { id: 'inventory', label: 'Inventory' },
                { id: 'shipping', label: 'Shipping' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-base ${activeTab === tab.id
                    ? 'border-gray-700 text-white bg-gray-900 rounded-t-md p-2'
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

                  {/* Inventory Selection */}
                  <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                    <h4 className="font-medium text-blue-900 mb-3">Select Inventory Item</h4>
                    <p className="text-sm text-blue-800 mb-4">
                      Choose an inventory item to create a detailed product with variants
                    </p>

                    {!selectedInventoryItem ? (
                      <div className="space-y-3">
                        <Dropdown
                          label="Available Inventory Items"
                          value=""
                          options={availableInventoryItems.map(item => ({
                            value: item.id,
                            label: `${item.name} (${item.sku}) - Stock: ${item.currentStock}`
                          }))}
                          placeholder={isLoadingInventory ? "Loading inventory..." : "Select an inventory item"}
                          onChange={(value) => {
                            const item = availableInventoryItems.find(i => i.id === value)
                            if (item) handleInventorySelect(item)
                          }}
                          disabled={isLoadingInventory}
                        />
                        <p className="text-xs text-blue-700">
                          Only inventory items without existing products are shown
                        </p>
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
                          <div>
                            <span className="text-gray-600">Base Price:</span>
                            <span className="font-medium ml-2">${selectedInventoryItem.sellingPrice}</span>
                          </div>
                        </div>
                        <Link href={`/vendor/dashboard/inventory/edit/${selectedInventoryItem.id}`}>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                      placeholder={formData.isFromInventory ? "Enter a unique product name" : "Enter product name"}
                    />
                    {formData.isFromInventory && (
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
                        options={
                          formData.isFromInventory && selectedInventoryItem?.category && !categories.includes(selectedInventoryItem.category)
                            ? [...categories, selectedInventoryItem.category]
                            : categories
                        }
                        placeholder="Select Category"
                        onChange={(value) => setFormData(prev => ({ ...prev, category: value as string, subCategory: '' }))}
                        disabled={formData.isFromInventory && !isEdit}
                      />
                      {formData.isFromInventory && !isEdit && (
                        <p className="text-xs text-gray-500 mt-1">From inventory item</p>
                      )}
                    </div>
                    <div>
                      <Dropdown
                        label="Sub-Category *"
                        value={formData.subCategory}
                        options={
                          formData.category
                            ? (
                              formData.isFromInventory && selectedInventoryItem?.subcategory && selectedInventoryItem.category === formData.category
                                ? [selectedInventoryItem.subcategory, ...(categorySubcategories[formData.category] || []).filter(sub => sub !== selectedInventoryItem.subcategory)]
                                : categorySubcategories[formData.category] || []
                            )
                            : []
                        }
                        placeholder="Select Sub-Category"
                        onChange={(value) => setFormData(prev => ({ ...prev, subCategory: value as string }))}
                        disabled={formData.isFromInventory && !isEdit}
                      />
                      {formData.isFromInventory && !isEdit && (
                        <p className="text-xs text-gray-500 mt-1">From inventory item</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dimensions
                      </label>
                      <input
                        type="text"
                        name="dimensions"
                        value={formData.dimensions}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                        placeholder="e.g., 230x250 cm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Weight
                      </label>
                      <input
                        type="text"
                        name="weight"
                        value={formData.weight}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                        placeholder="e.g., 1.2 kg"
                      />
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
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 bg-linear-to-br from-gray-50 to-white hover:border-gray-400 transition-colors">
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

                          {/* Second Row: Pricing & Inventory */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                  <TableHead>Size</TableHead>
                                  <TableHead>Color</TableHead>
                                  <TableHead>SKU</TableHead>
                                  <TableHead>Price</TableHead>
                                  <TableHead>Stock</TableHead>
                                  <TableHead className="text-center">Image</TableHead>
                                  <TableHead className="text-center">Action</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {formData.variants.map((variant, idx) => (
                                  <TableRow key={variant.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100'}>
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
                                        onClick={() => setEditingVariantId(variant.id || null)}
                                        className={`p-1 inline-flex items-center gap-1 transition-colors ${variant.images && variant.images.length > 0
                                          ? 'text-blue-600 hover:text-blue-800'
                                          : 'text-gray-400 hover:text-gray-600'
                                          }`}
                                        title={variant.images && variant.images.length > 0 ? "Change image" : "Add image"}
                                        disabled={!variant.id}
                                      >
                                        <ImageIcon className="h-4 w-4" />
                                        <span className="text-xs font-medium">
                                          {variant.images && variant.images.length > 0 ? 'Edit' : 'Add'}
                                        </span>
                                      </button>
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

                  {!formData.hasVariants && (
                    <div className="border-2 border-gray-300 rounded-lg p-6 bg-gray-50">
                      <h4 className="font-semibold text-gray-900 mb-4">Single Unit Pricing</h4>
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
                              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Stock Quantity *
                          </label>
                          <input
                            type="number"
                            name="totalStock"
                            value={formData.totalStock}
                            onChange={handleInputChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      {formData.basePrice > 0 && (
                        <div className="mt-4 p-4 bg-white border border-gray-300 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">Selling Price:</span>
                            <span className="text-2xl font-bold text-gray-900">₹{formData.basePrice.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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

                  {/* Single Unit Pricing Section */}
                  <div className="border-2 border-gray-300 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-2 h-2 bg-gray-800 rounded-full mr-2"></span>
                      Product Pricing
                    </h4>

                    {/* Pricing Configuration */}
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Original Price (Optional)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-500">₹</span>
                          <input
                            type="number"
                            name="originalPrice"
                            value={formData.originalPrice || ''}
                            onChange={handleInputChange}
                            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                            placeholder="0"
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-1">For showing discount</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Discount %
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            name="discount"
                            value={formData.discount || ''}
                            onChange={handleInputChange}
                            max="100"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-2 text-gray-500">%</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">Auto-calculated if original price set</p>
                      </div>
                    </div>

                    {/* Single Unit Summary */}
                    {formData.basePrice > 0 && (
                      <div className="p-4 bg-white border border-gray-300 rounded-lg mb-4">
                        <h5 className="font-medium text-gray-900 mb-3">Single Unit Configuration</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Base Price:</span>
                            <span className="font-medium ml-2">₹{formData.basePrice.toFixed(2)}</span>
                          </div>
                          {formData.originalPrice && formData.originalPrice > formData.basePrice && (
                            <div>
                              <span className="text-gray-600">Discount:</span>
                              <span className="font-medium text-green-600 ml-2">
                                {Math.round(((formData.originalPrice - formData.basePrice) / formData.originalPrice) * 100)}% off
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Price Summary */}
                    {formData.basePrice > 0 && (
                      <div className="p-4 bg-white border border-gray-300 rounded-lg">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Selling Price</p>
                            <p className="text-2xl font-bold text-gray-900">₹{formData.basePrice.toFixed(2)}</p>
                          </div>
                          {formData.originalPrice && formData.originalPrice > formData.basePrice && (
                            <>
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Original Price</p>
                                <p className="text-2xl font-bold text-gray-400 line-through">₹{formData.originalPrice.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 mb-1">You Save</p>
                                <p className="text-2xl font-bold text-green-600">
                                  ₹{(formData.originalPrice - formData.basePrice).toFixed(2)}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
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
                            Total Stock Quantity *
                          </label>
                          <input
                            type="number"
                            name="totalStock"
                            value={formData.totalStock}
                            onChange={handleInputChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                          />
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Inventory Connection Status */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Connection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {formData.isFromInventory && selectedInventoryItem ? (
                  <div className="space-y-3">
                    <div className="flex items-center text-green-600">
                      <Package className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">Connected to Inventory</span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p><strong>Item:</strong> {selectedInventoryItem.name}</p>
                      <p><strong>SKU:</strong> {selectedInventoryItem.sku}</p>
                      <p><strong>Stock:</strong> {selectedInventoryItem.currentStock} units</p>
                    </div>
                    <Link href={`/vendor/dashboard/inventory/edit/${selectedInventoryItem.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        Manage Stock
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-600">
                      <Package className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">No Inventory Connection</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      This product is not connected to an inventory item. Stock will be managed separately.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

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

                {/* Approval Status Display (Read-only) */}
                {isEdit && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Approval Status
                    </label>
                    <div className={`px-3 py-2 rounded-lg border text-sm ${formData.approvalStatus === 'APPROVED'
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : formData.approvalStatus === 'PENDING'
                        ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                        : formData.approvalStatus === 'REJECTED'
                          ? 'bg-red-50 border-red-200 text-red-800'
                          : 'bg-gray-50 border-gray-200 text-gray-800'
                      }`}>
                      {formData.approvalStatus?.toLowerCase() || 'pending'}
                      {formData.approvalStatus === 'REJECTED' && formData.rejectionReason && (
                        <div className="mt-1 text-xs">
                          Reason: {formData.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>
                )}

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
                <p className="text-sm text-gray-600">Upload cover image and gallery images for your product</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">

                  {/* Cover Image Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">Cover Image</h4>
                      <span className="text-xs text-gray-500">1 image only</span>
                    </div>

                    {/* Cover Image Upload */}
                    {formData.images.filter(img => img.imageType === 'cover').length === 0 ? (
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors cursor-pointer bg-gray-50"
                        onClick={() => document.getElementById('cover-image-upload')?.click()}
                      >
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-1 text-sm text-gray-600">Upload Cover Image</p>
                        <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                        <input
                          id="cover-image-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, 'cover')}
                        />
                      </div>
                    ) : (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                        <p className="text-sm text-green-800">✓ Cover image uploaded</p>
                        <p className="text-xs text-green-600">Upload limit: 1/1</p>
                      </div>
                    )}

                    {/* Cover Image Preview */}
                    {formData.images.filter(img => img.imageType === 'cover').map((image) => (
                      <div key={image.id} className="relative group">
                        <img
                          src={image.url}
                          alt={image.alt}
                          className="w-full h-32 object-cover rounded border-2 border-gray-800"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => removeImage(image.id)}
                            className="text-white hover:text-red-300 bg-red-600 p-2 rounded-full"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="absolute top-2 left-2 bg-gray-800 text-white text-xs px-2 py-1 rounded">
                          Cover Image
                        </div>
                      </div>
                    ))}

                    {formData.images.filter(img => img.imageType === 'cover').length === 0 && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-800">⚠️ Cover image is recommended for better product visibility</p>
                      </div>
                    )}
                  </div>

                  {/* Gallery Images Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">Gallery Images</h4>
                      <span className="text-xs text-gray-500">
                        {formData.images.filter(img => img.imageType === 'gallery').length}/3 images
                      </span>
                    </div>

                    {/* Gallery Images Upload */}
                    {formData.images.filter(img => img.imageType === 'gallery').length < 3 ? (
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors cursor-pointer"
                        onClick={() => document.getElementById('gallery-images-upload')?.click()}
                      >
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-1 text-sm text-gray-600">Upload Gallery Images</p>
                        <p className="text-xs text-gray-500">
                          {3 - formData.images.filter(img => img.imageType === 'gallery').length} slot{3 - formData.images.filter(img => img.imageType === 'gallery').length > 1 ? 's' : ''} remaining • Multiple selection allowed
                        </p>
                        <input
                          id="gallery-images-upload"
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, 'gallery')}
                        />
                      </div>
                    ) : (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                        <p className="text-sm text-green-800">✓ Gallery images full</p>
                        <p className="text-xs text-green-600">Upload limit: 3/3 reached</p>
                      </div>
                    )}

                    {/* Gallery Images Preview */}
                    {formData.images.filter(img => img.imageType === 'gallery').length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {formData.images.filter(img => img.imageType === 'gallery').map((image) => (
                          <div key={image.id} className="relative group">
                            <img
                              src={image.url}
                              alt={image.alt}
                              className="w-full h-20 object-cover rounded border"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-1">
                              {formData.images.filter(img => img.imageType === 'cover').length === 0 && (
                                <button
                                  type="button"
                                  onClick={() => setImageType(image.id, 'cover')}
                                  className="text-white text-xs bg-gray-800 px-1 py-1 rounded hover:bg-gray-700"
                                >
                                  Cover
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeImage(image.id)}
                                className="text-white hover:text-red-300 bg-red-600 p-1 rounded"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="absolute top-1 left-1 bg-gray-600 text-white text-xs px-1 rounded">
                              Gallery
                            </div>
                          </div>
                        ))}

                        {/* Empty slots visualization */}
                        {Array.from({ length: 3 - formData.images.filter(img => img.imageType === 'gallery').length }).map((_, index) => (
                          <div key={`empty-${index}`} className="w-full h-20 border-2 border-dashed border-gray-200 rounded flex items-center justify-center">
                            <span className="text-xs text-gray-400">Empty</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {formData.images.filter(img => img.imageType === 'gallery').length === 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <div key={`placeholder-${index}`} className="w-full h-20 border-2 border-dashed border-gray-200 rounded flex items-center justify-center">
                            <span className="text-xs text-gray-400">Empty</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Image Summary */}
                  <div className="pt-3 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-600">Cover Images</p>
                        <p className="text-lg font-bold text-gray-900">
                          {formData.images.filter(img => img.imageType === 'cover').length}/1
                        </p>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-600">Gallery Images</p>
                        <p className="text-lg font-bold text-gray-900">
                          {formData.images.filter(img => img.imageType === 'gallery').length}/3
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 text-center">
                      <p className="text-xs text-gray-500">
                        Total: {formData.images.length} image{formData.images.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Image Guidelines */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h5 className="font-medium text-blue-900 mb-2 text-sm">📸 Image Guidelines</h5>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• <strong>Cover Image:</strong> 1 image only - main product photo (square format recommended)</li>
                      <li>• <strong>Gallery Images:</strong> Maximum 3 images - different angles, details, usage examples</li>
                      <li>• Use high-quality images with good lighting</li>
                      <li>• Recommended: 1000x1000px or higher resolution</li>
                      <li>• Maximum file size: 10MB per image</li>
                      <li>• Multi-select supported for gallery images</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
                      ? `$${Math.min(...formData.variants.map(v => v.price))} - $${Math.max(...formData.variants.map(v => v.price))}`
                      : `$${formData.basePrice}`
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

                <Link href="/vendor/dashboard/products" className="block">
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
          onUpdateImages={handleVariantImageUpdate}
        />
      )}
    </div>
  )
}