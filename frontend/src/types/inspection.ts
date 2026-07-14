// Unified data types for inspections and vendors

export interface Vendor {
  id: string
  name: string
  location: string
  submittedDate?: string
  assignedDate?: string
  createdAtRaw?: string
  recentPO?: string
  status: string
  inspectionStatus?: string | null
  state?: string | null
  contactPerson?: {
    name: string
    designation: string
    phone: string
    email: string
  }
  factory?: {
    name: string
    address: string
    manager: string
    managerPhone: string
    workingHours: string
  }
  performance?: {
    totalInspections: number
    passRate: number
    averageScore: number
    onTimeDelivery: number
  }
}

export interface ScheduledInspection {
  id: number
  vendor: Vendor
  po: string
  scheduledDate: string
  scheduledTime: string
  priority: 'high' | 'medium' | 'low'
  itemsCount: number
  estimatedDuration: string
  client: string
  items: InspectionItem[]
  requirements: string[]
  documents: Document[]
}

export interface InspectionItem {
  id: number
  itemName: string
  description: string
  quantity: number
  inspectionQuantity: number
  specifications: string
  aqlLevel: string
}

export interface Document {
  name: string
  status: 'received' | 'pending' | 'not-required'
}

export interface RecentInspection {
  id: number
  vendor: string
  po: string
  status: 'passed' | 'failed' | 'pending'
  date: string
}

// ============================
// QC Checker — Product Detail
// Shared between qcCheckerService.getProductDetails response and the
// ProductDetail component so the contract is a single source of truth.
// ============================

export interface ProductImage {
  url: string
  alt?: string
  isPrimary?: boolean
  sortOrder?: number
}

export interface ProductVariant {
  id: string
  variantName?: string
  sku: string
  size: string
  color: string
  colorHex?: string | null
  price: number
  stock: number
  lowStockThreshold?: number | null
  images?: string[]
}

export interface ProductDetailVendor {
  id?: string
  companyName?: string
  ownerName?: string
  email?: string
  businessEmail?: string
  businessEmail2?: string | null
  businessPhone?: string
  phoneNumber2?: string | null
  factoryAddress?: string | null
  factoryCity?: string | null
  factoryState?: string | null
  factoryZipCode?: string | null
  factoryCountry?: string | null
}

export interface AssignedQcSummary {
  name?: string
  email?: string
}

export interface ProductDetailData {
  id: string
  name: string
  baseSku: string
  category: string
  subCategory?: string | null
  basePrice: number
  totalStock: number
  description?: string | null
  approvalStatus: string
  approvedAt?: string | null
  approvedBy?: string | null
  rejectionReason?: string | null
  qcInspectionData?: Record<string, unknown> | null
  inspectionCycleNumber?: number
  previousInspectionData?: Array<{
    cycleNumber: number
    data: Record<string, unknown>
    rejectionReason?: string
    reviewedAt?: string
    reviewedBy?: string
  }>
  createdAt: string
  updatedAt?: string | null
  // Product fields
  uom?: string | null
  singleUnitColor?: string | null
  singleUnitColorHex?: string | null
  dimensions?: string | null
  dimensionUnit?: string | null
  weight?: string | null
  weightUnit?: string | null
  tags?: string[]
  lowStockThreshold?: number | null
  // Fabric & Specifications
  fabricType?: string | null
  material?: string | null
  fabricSpecifications?: Record<string, unknown> | null
  // Dispatch & Shipping
  dispatchTimeline?: {
    processingDays: number
    shippingDays: number
    totalDays: number
  } | null
  // Logistics
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
  } | null
  images?: ProductImage[]
  variants?: ProductVariant[]
  vendor?: ProductDetailVendor
  assignedQc?: AssignedQcSummary | null
}