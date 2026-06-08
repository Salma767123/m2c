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
  sku: string
  size: string
  color: string
  colorHex?: string | null
  price: number
  stock: number
  images?: string[]
}

export interface ProductDetailVendor {
  id?: string
  companyName?: string
  ownerName?: string
  email?: string
  businessEmail?: string
  businessPhone?: string
  factoryCity?: string | null
  factoryState?: string | null
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
  images?: ProductImage[]
  variants?: ProductVariant[]
  vendor?: ProductDetailVendor
  assignedQc?: AssignedQcSummary | null
}