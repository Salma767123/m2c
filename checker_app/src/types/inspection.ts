export interface Vendor {
  id: string
  name: string
  location: string
  recentPO: string
  status: 'active' | 'pending' | 'review'
  contactPerson: {
    name: string
    designation: string
    phone: string
    email: string
  }
  factory: {
    name: string
    address: string
    manager: string
    managerPhone: string
    workingHours: string
  }
  performance: {
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
