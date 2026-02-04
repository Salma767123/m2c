'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/UI/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Badge } from '@/components/UI/Badge'
import { 
  ArrowLeft, 
  Building2, 
  Globe, 
  Mail, 
  Phone, 
  MapPin, 
  Image, 
  FileText,
  User,
  Package,
  Factory,
  Award,
  Truck,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

// Import VendorHub components
import CompanyDetails from '@/components/VendorHub/CompanyDetails/CompanyDetails'
import WarehouseDetails from '@/components/VendorHub/WarehouseDetails/WarehouseDetails'
import OwnerProfile from '@/components/VendorHub/OwnerProfile/OwnerProfile'
import VendorTypeProducts from '@/components/VendorHub/VendorTypeProducts/VendorTypeProducts'
import ManufacturingFacilities from '@/components/VendorHub/ManufacturingFacilities/ManufacturingFacilities'
import CertificationsLogistics from '@/components/VendorHub/CertificationsLogistics/CertificationsLogistics'
import ContactTradeInfo from '@/components/VendorHub/ContactTradeInfo/ContactTradeInfo'
import ReviewSubmit from '@/components/VendorHub/ReviewSubmit/ReviewSubmit'

interface VendorFormData {
  // Company Details
  businessType: string
  companyName: string
  gstNumber: string
  email: string
  phone: string
  website: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  sameAsWarehouse: boolean
  logo: string | null
  logoFile: File | null
  gstDocument: string | null
  gstFile: File | null
  
  // Warehouse Details
  ownershipType: string
  warehouseAddress: string
  warehouseCity: string
  warehouseState: string
  warehouseZip: string
  warehouseCountry: string
  factoryImages: any[]
  routeMap: string | null
  mapLink: string
  
  // Owner Profile
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  yearEstablished: string
  employeeCount: string
  
  // Vendor Type & Products
  vendorType: string | string[]
  marketType: string
  selectedCategories: { [key: string]: string[] }
  expandedCategories: { [key: string]: boolean }
  
  // Manufacturing Facilities (if manufacturer)
  enabledFacilities: { [key: string]: boolean }
  facilityDetails: { [key: string]: any }
  
  // Certifications & Logistics
  selectedCertifications: string[]
  certificationFiles: { [key: string]: any }
  certificationExpiryDates: { [key: string]: string }
  packagingCapabilities: string
  warehousingCapacity: string
  logisticsPartners: string
  shippingMethods: string[]
  qualityControlProcess: string
  complianceStandards: string
  
  // Contact & Trade Info
  mainContact: {
    name: string
    designation: string
    email1: string
    email2?: string
    phone1: string
    phone2?: string
    department: string
  }
  alternateContacts: any[]
  hasImportExport: string
  importCountries: string[]
  exportCountries: string[]
  tradeLicenseNumber: string
  businessRegistrationNumber: string
  taxIdentificationNumber: string
  bankingDetails: {
    bankName: string
    accountNumber: string
    swiftCode: string
    iban: string
  }
  
  // Status
  status: 'active' | 'pending' | 'suspended'
  approvalStatus: 'approved' | 'pending' | 'rejected'
}

interface AddEditVendorProps {
  vendorId?: string
  mode: 'add' | 'edit'
}

const businessTypes = [
  { value: 'sole', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'llc', label: 'Limited Liability Company' }
]

export default function AddEditVendor({ vendorId, mode }: AddEditVendorProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<VendorFormData>({
    // Company Details
    businessType: '',
    companyName: '',
    gstNumber: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
    sameAsWarehouse: false,
    logo: null,
    logoFile: null,
    gstDocument: null,
    gstFile: null,
    
    // Warehouse Details
    ownershipType: '',
    warehouseAddress: '',
    warehouseCity: '',
    warehouseState: '',
    warehouseZip: '',
    warehouseCountry: 'India',
    factoryImages: [],
    routeMap: null,
    mapLink: '',
    
    // Owner Profile
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    yearEstablished: '',
    employeeCount: '',
    
    // Vendor Type & Products
    vendorType: [],
    marketType: '',
    selectedCategories: {},
    expandedCategories: {},
    
    // Manufacturing Facilities
    enabledFacilities: {},
    facilityDetails: {},
    
    // Certifications & Logistics
    selectedCertifications: [],
    certificationFiles: {},
    certificationExpiryDates: {},
    packagingCapabilities: '',
    warehousingCapacity: '',
    logisticsPartners: '',
    shippingMethods: [],
    qualityControlProcess: '',
    complianceStandards: '',
    
    // Contact & Trade Info
    mainContact: {
      name: '',
      designation: '',
      email1: '',
      email2: '',
      phone1: '',
      phone2: '',
      department: 'Sales'
    },
    alternateContacts: [],
    hasImportExport: 'no',
    importCountries: [],
    exportCountries: [],
    tradeLicenseNumber: '',
    businessRegistrationNumber: '',
    taxIdentificationNumber: '',
    bankingDetails: {
      bankName: '',
      accountNumber: '',
      swiftCode: '',
      iban: ''
    },
    
    // Status
    status: 'pending',
    approvalStatus: 'pending'
  })

  const steps = [
    { title: 'Company Details', icon: Building2 },
    { title: 'Warehouse Details', icon: MapPin },
    { title: 'Owner Profile', icon: User },
    { title: 'Vendor Type & Products', icon: Package },
    { title: 'Manufacturing Facilities', icon: Factory },
    { title: 'Certifications & Logistics', icon: Award },
    { title: 'Contact & Trade Info', icon: Phone },
    { title: 'Review & Submit', icon: CheckCircle }
  ]

  // Check if Manufacturing Facilities step should be included
  const isManufacturer = () => {
    const vendorTypes = formData.vendorType || []
    return Array.isArray(vendorTypes) ? vendorTypes.includes('manufacturer') : vendorTypes === 'manufacturer'
  }

  // Generate dynamic steps based on vendor type
  const getSteps = () => {
    if (isManufacturer()) {
      return steps // Include all steps including Manufacturing Facilities
    } else {
      // Skip Manufacturing Facilities step
      return steps.filter((_, index) => index !== 4)
    }
  }

  const filteredSteps = getSteps()

  // Map logical step to actual step index
  const getActualStepIndex = (logicalStep: number) => {
    if (isManufacturer()) {
      return logicalStep // No mapping needed
    } else {
      // Skip Manufacturing Facilities (index 4)
      if (logicalStep >= 4) {
        return logicalStep + 1 // Add 1 to account for skipped step
      }
      return logicalStep
    }
  }

  // Map actual step index to logical step
  const getLogicalStepIndex = (actualStep: number) => {
    if (isManufacturer()) {
      return actualStep // No mapping needed
    } else {
      // Skip Manufacturing Facilities (index 4)
      if (actualStep > 4) {
        return actualStep - 1 // Subtract 1 to account for skipped step
      }
      return actualStep
    }
  }

  useEffect(() => {
    if (mode === 'edit' && vendorId) {
      // Load vendor data for editing
      // This would typically fetch from an API
      console.log('Loading vendor data for ID:', vendorId)
    }
  }, [mode, vendorId])

  const updateFormData = (stepData: Partial<VendorFormData>) => {
    setFormData(prev => ({ ...prev, ...stepData }))
  }

  const nextStep = () => {
    const maxStep = filteredSteps.length - 1
    if (currentStep < maxStep) {
      // Special handling when moving from Vendor Type & Products step
      if (currentStep === 3) {
        // If not a manufacturer, skip Manufacturing Facilities
        if (!isManufacturer()) {
          setCurrentStep(4) // Go directly to Certifications & Logistics (logical step 4, which maps to actual step 5)
        } else {
          setCurrentStep(currentStep + 1) // Go to Manufacturing Facilities
        }
      } else {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      // Special handling when moving back from Certifications & Logistics
      if (currentStep === 4 && !isManufacturer()) {
        setCurrentStep(3) // Go back to Vendor Type & Products (skip Manufacturing Facilities)
      } else {
        setCurrentStep(currentStep - 1)
      }
    }
  }

  const goToStep = (step: number) => {
    setCurrentStep(step)
  }

  const handleSubmit = async () => {
    try {
      // Submit vendor data
      console.log('Submitting vendor data:', formData)
      
      // API call would go here
      // await createOrUpdateVendor(formData)
      
      router.push('/dashboard/vendors')
    } catch (error) {
      console.error('Error submitting vendor:', error)
    }
  }

  const renderStepContent = () => {
    const actualStepIndex = getActualStepIndex(currentStep)
    
    switch (actualStepIndex) {
      case 0:
        return <CompanyDetails onNext={nextStep} onUpdateData={updateFormData} data={formData} />
      case 1:
        return <WarehouseDetails onNext={nextStep} onPrev={prevStep} onUpdateData={updateFormData} data={formData} />
      case 2:
        return <OwnerProfile onNext={nextStep} onPrev={prevStep} onUpdateData={updateFormData} data={formData} />
      case 3:
        return <VendorTypeProducts onNext={nextStep} onPrev={prevStep} onUpdateData={updateFormData} data={formData} />
      case 4:
        return <ManufacturingFacilities onNext={nextStep} onPrev={prevStep} onUpdateData={updateFormData} data={formData} />
      case 5:
        return <CertificationsLogistics onNext={nextStep} onPrev={prevStep} onUpdateData={updateFormData} data={formData} />
      case 6:
        return <ContactTradeInfo onNext={nextStep} onPrev={prevStep} onUpdateData={updateFormData} data={formData} />
      case 7:
        return <AdminReviewSubmitStep formData={formData} onSubmit={handleSubmit} onGoToStep={(step) => goToStep(getLogicalStepIndex(step))} />
      default:
        return <CompanyDetails onNext={nextStep} onUpdateData={updateFormData} data={formData} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-full">
        {/* Left Sidebar - Progress Steps */}
        <div className="w-1/5 bg-white shadow-lg border-r border-gray-200 rounded-lg">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/vendors')}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold text-gray-900">
                {mode === 'add' ? 'Add New Vendor' : 'Edit Vendor'}
              </h2>
            </div>
            
            <div className="space-y-4">
              {filteredSteps.map((step, index) => {
                const Icon = step.icon
                return (
                  <div
                    key={index}
                    className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg transition-all duration-200 ${
                      index === currentStep
                        ? 'bg-gray-200 border-r-4 border-[#313131]'
                        : index < currentStep
                        ? 'bg-green-50 hover:bg-green-100'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => goToStep(index)}
                  >
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                        index === currentStep
                          ? 'bg-[#313131] text-white'
                          : index < currentStep
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {index < currentStep ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${
                          index === currentStep
                            ? 'text-[#313131]'
                            : index < currentStep
                            ? 'text-green-900'
                            : 'text-gray-600'
                        }`}
                      >
                        {step.title}
                      </p>
                      {index === currentStep && (
                        <p className="text-xs text-[#313131] mt-1">Current Step</p>
                      )}
                      {index < currentStep && (
                        <p className="text-xs text-green-600 mt-1">Completed</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Progress Summary */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm font-medium text-gray-900">
                  {Math.round(((currentStep) / (filteredSteps.length - 1)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#313131] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep) / (filteredSteps.length - 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 w-3/4">
          <div className="p-8">
            <div className="max-w-6xl mx-auto">
              {/* Step Header */}
              <div className="mb-8">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-[#313131] text-white rounded-full font-semibold">
                    {currentStep + 1}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{filteredSteps[currentStep].title}</h1>
                    <p className="text-gray-600">Step {currentStep + 1} of {filteredSteps.length}</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div
                    className="bg-[#313131] h-1 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / filteredSteps.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Step Content */}
              <div className="bg-white rounded-lg shadow-sm">
                {renderStepContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Admin-specific Review Submit Step
function AdminReviewSubmitStep({ 
  formData, 
  onSubmit, 
  onGoToStep 
}: { 
  formData: VendorFormData
  onSubmit: () => void
  onGoToStep: (step: number) => void 
}) {
  const [adminNotes, setAdminNotes] = useState('')
  const [initialStatus, setInitialStatus] = useState<'active' | 'pending' | 'suspended'>('pending')
  const [initialApprovalStatus, setInitialApprovalStatus] = useState<'approved' | 'pending' | 'rejected'>('pending')

  const handleAdminSubmit = () => {
    // Include admin-specific data
    const adminData = {
      ...formData,
      status: initialStatus,
      approvalStatus: initialApprovalStatus,
      adminNotes,
      createdBy: 'admin', // This would come from auth context
      createdAt: new Date().toISOString()
    }
    
    console.log('Admin creating vendor with data:', adminData)
    onSubmit()
  }

  return (
    <div className="space-y-6">
      {/* Admin Controls */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Admin Controls</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Initial Status</label>
            <select
              value={initialStatus}
              onChange={(e) => setInitialStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Approval Status</label>
            <select
              value={initialApprovalStatus}
              onChange={(e) => setInitialApprovalStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes</label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add any notes about this vendor registration..."
          />
        </div>
      </div>

      {/* Use the original ReviewSubmit component for data display */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <ReviewSubmit 
          onPrev={() => {}} 
          onGoToStep={onGoToStep} 
          data={formData} 
        />
      </div>

      {/* Admin Submit Button */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => onGoToStep(6)}>
          Back to Previous Step
        </Button>
        <Button
          onClick={handleAdminSubmit}
          className="bg-[#313131] text-white hover:bg-[#222222]"
        >
          Create Vendor Account
        </Button>
      </div>
    </div>
  )
}