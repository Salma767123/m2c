'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/UI/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table'
import Dropdown from '@/components/UI/Dropdown'
import { ArrowLeft, Save, X, Upload } from 'lucide-react'
import Link from 'next/link'
import { categories } from '@/components/mockData/products'
import { showSuccessToast, showErrorToast, showWarningToast } from '@/lib/toast-utils'

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

// Mock vendors data
const mockVendors = [
  { id: '1', name: 'Cotton Mills Ltd', email: 'contact@cottonmills.com', status: 'active' },
  { id: '2', name: 'Textile Pro Industries', email: 'info@textilepro.com', status: 'active' },
  { id: '3', name: 'Home Decor Inc', email: 'sales@homedecor.com', status: 'active' },
  { id: '4', name: 'Sleep Comfort Co', email: 'orders@sleepcomfort.com', status: 'active' },
  { id: '5', name: 'Warm Textiles', email: 'support@warmtextiles.com', status: 'active' },
  { id: '6', name: 'Luxury Linens Co', email: 'hello@luxurylinens.com', status: 'active' }
]

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
  
  // Pricing Configuration
  pricingTiers: PricingTier[]
  bulkPricingEnabled: boolean
  singleUnitPricingEnabled: boolean // New field for flexible pricing
  
  // Stock Management
  totalStock: number
  lowStockThreshold: number
  trackInventory: boolean
  
  // Order Configuration
  minimumOrderQuantity: number
  maximumOrderQuantity?: number
  
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
  status: 'active' | 'pending' | 'suspended' | 'out_of_stock'
}

interface AddEditProductProps {
  productId?: string
  isEdit?: boolean
  inventoryId?: string // Pre-select an inventory item when coming from inventory page
}

export default function AddEditProduct({ productId, isEdit = false, inventoryId }: AddEditProductProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(isEdit)
  
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
    
    // Pricing Configuration
    pricingTiers: [{ minQuantity: 1, price: 0 }],
    bulkPricingEnabled: false,
    singleUnitPricingEnabled: true,
    
    // Stock Management
    totalStock: 0,
    lowStockThreshold: 10,
    trackInventory: true,
    
    // Order Configuration
    minimumOrderQuantity: 1,
    maximumOrderQuantity: undefined,
    
    // Dispatch & Shipping
    dispatchTimeline: {
      processingDays: 1,
      shippingDays: 3,
      totalDays: 4
    },
    
    // Additional Info
    tags: [],
    dimensions: '',
    weight: '',
    inStock: true,
    status: 'pending'
  })

  const [newTag, setNewTag] = useState('')
  const [newCareInstruction, setNewCareInstruction] = useState('')
  const [activeTab, setActiveTab] = useState('basic')
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
    stock: 0
  })

  // Load product data for editing
  useEffect(() => {
    if (isEdit && productId) {
      setIsLoadingData(true)
      
      // Simulate API call to fetch product data
      const loadProductData = async () => {
        try {
          // In a real app, you'd fetch from your API
          // For now, we'll simulate loading
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Mock product data for editing
          setFormData({
            inventoryItemId: '1',
            isFromInventory: true,
            
            // Vendor Information
            vendorId: '1',
            vendorName: 'Cotton Mills Ltd',
            
            name: 'Premium Cotton Bed Sheet Set',
            description: 'Luxurious 100% cotton bed sheet set with superior comfort and durability',
            category: categories[0],
            subCategory: 'Cotton Sheets',
            
            // Pricing Information
            basePrice: 89.99,
            originalPrice: 99.99,
            discount: 10,
            
            // Product Rating & Reviews
            rating: 4.5,
            reviews: 128,
            
            fabricType: 'Cotton',
            material: '100% Organic Cotton',
            fabricSpecifications: {
              type: 'Cotton',
              composition: '100% Cotton',
              weight: '200 GSM',
              weave: 'Percale',
              finish: 'Pre-shrunk',
              careInstructions: ['Machine wash cold', 'Tumble dry low', 'Iron if needed']
            },
            
            variants: [
              {
                id: '1',
                size: 'Queen',
                color: 'White',
                colorHex: '#FFFFFF',
                sku: 'CS-Q-WHT-001',
                price: 89.99,
                stock: 25,
                images: []
              },
              {
                id: '2',
                size: 'King',
                color: 'White',
                colorHex: '#FFFFFF',
                sku: 'CS-K-WHT-001',
                price: 99.99,
                stock: 15,
                images: []
              }
            ],
            hasVariants: true,
            
            baseSku: 'CS-001',
            
            images: [],
            
            pricingTiers: [
              { minQuantity: 1, maxQuantity: 9, price: 89.99 },
              { minQuantity: 10, maxQuantity: 49, price: 79.99, discount: 11 },
              { minQuantity: 50, price: 69.99, discount: 22 }
            ],
            bulkPricingEnabled: true,
            singleUnitPricingEnabled: true,
            
            totalStock: 40,
            lowStockThreshold: 5,
            trackInventory: true,
            
            minimumOrderQuantity: 2,
            maximumOrderQuantity: 100,
            
            dispatchTimeline: {
              processingDays: 2,
              shippingDays: 5,
              totalDays: 7
            },
            
            tags: ['premium', 'cotton', 'bedding'],
            dimensions: '230x250 cm',
            weight: '1.2 kg',
            inStock: true,
            status: 'active'
          })
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
      const inventoryItem = mockInventoryItems.find(item => item.id === inventoryId)
      if (inventoryItem) {
        setSelectedInventoryItem(inventoryItem)
        setFormData(prev => ({
          ...prev,
          inventoryItemId: inventoryId,
          isFromInventory: true,
          name: inventoryItem.name,
          description: inventoryItem.description,
          category: inventoryItem.category,
          baseSku: inventoryItem.sku,
          basePrice: inventoryItem.sellingPrice,
          totalStock: inventoryItem.currentStock
        }))
      }
    }
  }, [isEdit, productId, inventoryId])

  // Inventory Selection Functions
  const handleInventorySelect = (inventoryItem: any) => {
    setSelectedInventoryItem(inventoryItem)
    setFormData(prev => ({
      ...prev,
      inventoryItemId: inventoryItem.id,
      isFromInventory: true,
      name: inventoryItem.name,
      description: inventoryItem.description,
      category: inventoryItem.category,
      baseSku: inventoryItem.sku,
      basePrice: inventoryItem.sellingPrice,
      totalStock: inventoryItem.currentStock
    }))
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
      baseSku: '',
      basePrice: 0,
      totalStock: 0
    }))
  }

  // Vendor Selection Functions
  const handleVendorSelect = (vendorId: string) => {
    const vendor = mockVendors.find(v => v.id === vendorId)
    if (vendor) {
      setFormData(prev => ({
        ...prev,
        vendorId: vendor.id,
        vendorName: vendor.name
      }))
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (name.includes('.')) {
      // Handle nested object updates (e.g., fabricSpecifications.type)
      const [parent, child] = name.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof ProductFormData] as any,
          [child]: value
        }
      }))
    } else if (name.includes('dispatchTimeline.')) {
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
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 0 : 
                 type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      }))
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

  // Pricing Tier Functions
  const addPricingTier = () => {
    setFormData(prev => ({
      ...prev,
      pricingTiers: [...prev.pricingTiers, { minQuantity: 1, price: 0 }]
    }))
  }

  const removePricingTier = (index: number) => {
    setFormData(prev => ({
      ...prev,
      pricingTiers: prev.pricingTiers.filter((_, i) => i !== index)
    }))
  }

  const updatePricingTier = (index: number, field: keyof PricingTier, value: any) => {
    setFormData(prev => ({
      ...prev,
      pricingTiers: prev.pricingTiers.map((tier, i) => 
        i === index ? { ...tier, [field]: value } : tier
      )
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
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  // Image handling functions
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, imageType: 'cover' | 'gallery' = 'gallery') => {
    const files = e.target.files
    if (!files) return

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

    // Process files
    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showWarningToast('File Too Large', `${file.name} is larger than 10MB`)
        return
      }

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
    
    // Pricing validation
    if (!formData.singleUnitPricingEnabled && !formData.bulkPricingEnabled) {
      showErrorToast('Validation Error', 'Please select at least one pricing strategy.')
      return
    }
    
    if (formData.singleUnitPricingEnabled && formData.basePrice <= 0) {
      showErrorToast('Validation Error', 'Please enter a valid base price for single unit pricing.')
      return
    }
    
    if (formData.bulkPricingEnabled && formData.pricingTiers.some(tier => tier.price <= 0)) {
      showErrorToast('Validation Error', 'Please enter valid prices for all bulk pricing tiers.')
      return
    }
    
    if (formData.hasVariants && formData.variants.length === 0) {
      showErrorToast('Validation Error', 'Please add at least one variant or disable variants.')
      return
    }

    setIsLoading(true)

    try {
      if (isEdit) {
        console.log('Updating product:', productId, formData)
        // API call: PUT /api/products/${productId}
        showSuccessToast('Product Updated', 'Your product has been updated successfully.')
      } else {
        console.log('Creating product:', formData)
        // API call: POST /api/products
        showSuccessToast('Product Created', 'Your product has been created successfully.')
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Redirect back to products list
      router.push('/admin/dashboard/products')
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Error saving product:', error)
      showErrorToast('Save Failed', 'Unable to save product. Please try again.')
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
                { id: 'shipping', label: 'Shipping' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
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
                      options={mockVendors.map(vendor => ({
                        value: vendor.id,
                        label: `${vendor.name} (${vendor.email})`
                      }))}
                      placeholder="Select Vendor"
                      onChange={(value) => handleVendorSelect(value as string)}
                    />
                    {formData.vendorName && (
                      <p className="text-xs text-gray-500 mt-1">Selected: {formData.vendorName}</p>
                    )}
                  </div>
                  
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
                          options={mockInventoryItems
                            .filter(item => !item.hasProductCreated)
                            .map(item => ({
                              value: item.id,
                              label: `${item.name} (${item.sku}) - Stock: ${item.currentStock}`
                            }))}
                          placeholder="Select an inventory item"
                          onChange={(value) => {
                            const item = mockInventoryItems.find(i => i.id === value)
                            if (item) handleInventorySelect(item)
                          }}
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
                        <Link href={`/admin/dashboard/inventory/edit/${selectedInventoryItem.id}`}>
                          <Button variant="outline" size="sm" className="mt-3">
                            Edit Inventory Item
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Product Details (Auto-filled or Manual) */}
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
                      disabled={formData.isFromInventory}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent ${
                        formData.isFromInventory ? 'bg-gray-100 text-gray-600' : ''
                      }`}
                      placeholder="Enter product name"
                    />
                    {formData.isFromInventory && (
                      <p className="text-xs text-gray-500 mt-1">Auto-filled from inventory item</p>
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
                        placeholder="Select Category"
                        onChange={(value) => setFormData(prev => ({ ...prev, category: value as string, subCategory: '' }))}
                      />
                      {formData.isFromInventory && (
                        <p className="text-xs text-gray-500 mt-1">From inventory item</p>
                      )}
                    </div>
                    <div>
                      <Dropdown
                        label="Sub-Category *"
                        value={formData.subCategory}
                        options={formData.category ? categorySubcategories[formData.category] || [] : []}
                        placeholder="Select Sub-Category"
                        onChange={(value) => setFormData(prev => ({ ...prev, subCategory: value as string }))}
                      />
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
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent ${
                          formData.isFromInventory ? 'bg-gray-100 text-gray-600' : ''
                        }`}
                        placeholder="e.g., CS-001"
                      />
                      {formData.isFromInventory && (
                        <p className="text-xs text-gray-500 mt-1">From inventory SKU</p>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Add a tag"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        />
                        <Button type="button" onClick={addTag} className="bg-gray-900 text-white">
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
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
                      <div className="border-2 border-gray-300 rounded-lg p-6 bg-gray-50">
                        <h4 className="font-semibold text-gray-900 mb-4">Add New Variant</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Size *</label>
                            <Dropdown
                              value={newVariant.size || ''}
                              options={standardSizes}
                              placeholder="Select Size"
                              onChange={(value) => setNewVariant(prev => ({ ...prev, size: value as string }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Color *</label>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={newVariant.colorHex || '#000000'}
                                  onChange={(e) => {
                                    const hex = e.target.value
                                    setNewVariant(prev => ({ 
                                      ...prev, 
                                      colorHex: hex,
                                      color: getColorName(hex) // Auto-generate color name
                                    }))
                                  }}
                                  className="w-8 h-8 border border-gray-300 rounded-md cursor-pointer"
                                  title="Pick a color"
                                />
                                <input
                                  type="text"
                                  value={newVariant.color || ''}
                                  onChange={(e) => setNewVariant(prev => ({ ...prev, color: e.target.value }))}
                                  placeholder="Color name"
                                  className="flex-1 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">SKU *</label>
                            <input
                              type="text"
                              value={newVariant.sku}
                              onChange={(e) => setNewVariant(prev => ({ ...prev, sku: e.target.value }))}
                              placeholder="e.g., CS-Q-BLK"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Price *</label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-gray-500 text-sm">₹</span>
                              <input
                                type="number"
                                value={newVariant.price}
                                onChange={(e) => setNewVariant(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                                placeholder="0"
                                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Stock *</label>
                            <input
                              type="number"
                              value={newVariant.stock}
                              onChange={(e) => setNewVariant(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                              placeholder="0"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button 
                              type="button" 
                              onClick={addVariant}
                              className="w-full bg-gray-900 text-white hover:bg-black"
                            >
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
                                  <TableHead className="text-center">Action</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {formData.variants.map((variant, idx) => (
                                  <TableRow key={variant.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100'}>
                                    <TableCell className="text-gray-900 font-medium">{variant.size}</TableCell>
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
                                    <TableCell className="text-gray-700 font-mono text-xs">{variant.sku}</TableCell>
                                    <TableCell className="text-gray-900 font-semibold">₹{variant.price.toFixed(2)}</TableCell>
                                    <TableCell>
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        variant.stock > 20 ? 'bg-green-100 text-green-800' :
                                        variant.stock > 5 ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                      }`}>
                                        {variant.stock} units
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <button
                                        type="button"
                                        onClick={() => removeVariant(variant.id)}
                                        className="text-gray-600 hover:text-red-600 p-1 inline-block"
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
                              min="0"
                              step="0.01"
                              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                              placeholder="0.00"
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
                            min="0"
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
                  {/* Single Price Section */}
                  <div className="border-2 border-gray-300 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Single Unit Pricing</h4>
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

                  {/* Bulk Pricing Section */}
                  <div className="border-2 border-gray-300 rounded-lg p-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <input
                        type="checkbox"
                        id="bulkPricingEnabled"
                        name="bulkPricingEnabled"
                        checked={formData.bulkPricingEnabled}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                      <label htmlFor="bulkPricingEnabled" className="text-sm font-medium text-gray-900">
                        Enable Bulk Pricing Tiers
                      </label>
                    </div>

                    {formData.bulkPricingEnabled && (
                      <div className="space-y-4">
                        {/* Pricing Tiers Table */}
                        <div className="overflow-x-auto border border-gray-300 rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Quantity Range</TableHead>
                                <TableHead>Price per Unit</TableHead>
                                <TableHead>Discount %</TableHead>
                                <TableHead>Savings per Unit</TableHead>
                                <TableHead className="text-center">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {formData.pricingTiers.map((tier, index) => {
                                const savings = formData.basePrice - tier.price
                                const discountPercent = formData.basePrice > 0 
                                  ? ((savings / formData.basePrice) * 100).toFixed(1)
                                  : 0
                                
                                return (
                                  <TableRow key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100'}>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          value={tier.minQuantity}
                                          onChange={(e) => updatePricingTier(index, 'minQuantity', parseInt(e.target.value) || 1)}
                                          min="1"
                                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                        />
                                        <span className="text-gray-600 text-sm">to</span>
                                        <input
                                          type="number"
                                          value={tier.maxQuantity || ''}
                                          onChange={(e) => updatePricingTier(index, 'maxQuantity', e.target.value ? parseInt(e.target.value) : undefined)}
                                          min="1"
                                          placeholder="∞"
                                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                        />
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="relative">
                                        <span className="absolute left-2 top-2 text-gray-500 text-sm">₹</span>
                                        <input
                                          type="number"
                                          value={tier.price}
                                          onChange={(e) => updatePricingTier(index, 'price', parseFloat(e.target.value) || 0)}
                                          min="0"
                                          step="0.01"
                                          className="w-full pl-6 pr-2 py-1 border border-gray-300 rounded text-sm"
                                        />
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-gray-900 font-semibold">{discountPercent}%</TableCell>
                                    <TableCell className="text-gray-900 font-semibold">₹{savings.toFixed(2)}</TableCell>
                                    <TableCell className="text-center">
                                      {formData.pricingTiers.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => removePricingTier(index)}
                                          className="text-gray-600 hover:text-red-600 p-1 inline-block"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Add Tier Button */}
                        <Button 
                          type="button" 
                          onClick={addPricingTier}
                          className="w-full bg-gray-900 text-white hover:bg-black"
                        >
                          + Add Pricing Tier
                        </Button>

                        {/* Bulk Pricing Example */}
                        <div className="p-4 bg-white border border-gray-300 rounded-lg">
                          <p className="text-xs font-medium text-gray-700 mb-2">Bulk Pricing Example:</p>
                          <div className="space-y-1 text-xs text-gray-600">
                            {formData.pricingTiers.map((tier, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span>
                                  {tier.minQuantity} - {tier.maxQuantity ? tier.maxQuantity : '∞'} units:
                                </span>
                                <span className="font-medium text-gray-900">
                                  ₹{tier.price.toFixed(2)} each
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {!formData.bulkPricingEnabled && (
                      <div className="p-4 bg-white border border-gray-300 rounded-lg text-center">
                        <p className="text-sm text-gray-600">
                          Enable bulk pricing to offer discounts for larger orders
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Pricing Strategy Tips */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-medium text-amber-900 mb-2">💡 Pricing Tips</h4>
                    <ul className="text-sm text-amber-800 space-y-1">
                      <li>• Set competitive base prices to attract customers</li>
                      <li>• Use bulk pricing to encourage larger orders</li>
                      <li>• Typical bulk discounts: 5-10% for 10+ units, 10-15% for 50+ units</li>
                      <li>• Ensure bulk prices still maintain healthy profit margins</li>
                    </ul>
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Minimum Order Quantity *
                          </label>
                          <input
                            type="number"
                            name="minimumOrderQuantity"
                            value={formData.minimumOrderQuantity}
                            onChange={handleInputChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Maximum Order Quantity
                          </label>
                          <input
                            type="number"
                            name="maximumOrderQuantity"
                            value={formData.maximumOrderQuantity || ''}
                            onChange={handleInputChange}
                            placeholder="No limit"
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
                      { value: 'pending', label: 'Pending' },
                      { value: 'active', label: 'Active' },
                      { value: 'suspended', label: 'Suspended' },
                      { value: 'out_of_stock', label: 'Out of Stock' }
                    ]}
                    onChange={(value) => setFormData(prev => ({ ...prev, status: value as 'active' | 'pending' | 'suspended' | 'out_of_stock' }))}
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
                  <span className="text-gray-600">Min Order Qty:</span>
                  <span className="font-medium">{formData.minimumOrderQuantity}</span>
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
    </div>
  )
}