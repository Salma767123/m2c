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
import VendorDataSummary from '@/components/VendorHub/ReviewSubmit/VendorDataSummary'

interface VendorFormData {
  // Company Details
  businessType: string
  companyName: string
  gstNumber: string
  /** Type-specific regulatory ID — IEC / CIN / Deed details / LLPIN. */
  companyIdNumber: string
  /** PAN Number — required across all 4 supported business types. */
  panNumber: string
  email: string
  email2: string
  phone: string
  landlineNumber: string
  phoneNumber2: string
  website: string
  address: string
  /** Optional address detail lines collected on Step 1. */
  addressLine2: string
  addressLine3: string
  landmark: string
  city: string
  state: string
  zipCode: string
  country: string
  /** Factory ownership — owned / rented / lease. Mirrored to warehouse
   *  `ownershipType` when "Same as warehouse" is checked. */
  factoryOwnershipType: string
  sameAsWarehouse: boolean
  logo: string | null
  logoFile: File | null
  gstDocument: string | null
  gstFile: File | null
  /** PAN Card certificate upload. */
  panCardDocument: string | null
  panCardFile: File | null
  /** Type-specific business certificate (IEC / CIN / Deed / LLPIN). */
  typeCertDocument: string | null
  typeCertFile: File | null
  /** Login password for the vendor account (collected on Step 1). */
  password: string

  // Warehouse Details
  ownershipType: string
  warehouseAddress: string
  /** Warehouse address detail lines collected on Step 2. */
  warehouseAddressLine2: string
  warehouseAddressLine3: string
  warehouseLandmark: string
  warehouseCity: string
  warehouseState: string
  warehouseZip: string
  warehouseCountry: string
  factoryImages: any[]
  mapLink: string

  // Owner Profile
  ownerName: string
  /** Owner designation chip — Proprietor / CEO / Director / etc. */
  designation: string
  ownerEmail: string
  ownerEmail2: string
  ownerPhone: string
  ownerPhone2: string
  ownerLandline: string
  /** Full ISO date — preferred over legacy yearEstablished. */
  businessStartDate: string
  yearEstablished: string
  employeeCount: string
  additionalOwners: any[]

  // Vendor Type & Products
  vendorType: string | string[]
  marketType: string | string[]
  selectedCategories: { [key: string]: string[] }
  expandedCategories: { [key: string]: boolean }
  categoryRemarks?: string
  productPhotos: any[]
  /** Per-category products from Step 4 — { catId: [{ id, name, photos }] }. */
  categoryProducts: { [key: string]: unknown[] }
  /** User-defined custom categories from Step 4. */
  additionalCategories: unknown[]

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
    photo?: string | null
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
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [isLoadingVendorData, setIsLoadingVendorData] = useState(mode === 'edit')
  const [formData, setFormData] = useState<VendorFormData>({
    // Company Details
    businessType: '',
    companyName: '',
    gstNumber: '',
    companyIdNumber: '',
    panNumber: '',
    email: '',
    email2: '',
    phone: '',
    landlineNumber: '',
    phoneNumber2: '',
    website: '',
    address: '',
    addressLine2: '',
    addressLine3: '',
    landmark: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
    factoryOwnershipType: '',
    sameAsWarehouse: false,
    logo: null,
    logoFile: null,
    gstDocument: null,
    gstFile: null,
    panCardDocument: null,
    panCardFile: null,
    typeCertDocument: null,
    typeCertFile: null,
    password: '',

    // Warehouse Details
    ownershipType: '',
    warehouseAddress: '',
    warehouseAddressLine2: '',
    warehouseAddressLine3: '',
    warehouseLandmark: '',
    warehouseCity: '',
    warehouseState: '',
    warehouseZip: '',
    warehouseCountry: 'India',
    factoryImages: [],
    mapLink: '',

    // Owner Profile
    ownerName: '',
    designation: '',
    ownerEmail: '',
    ownerEmail2: '',
    ownerPhone: '',
    ownerPhone2: '',
    ownerLandline: '',
    businessStartDate: '',
    yearEstablished: '',
    employeeCount: '',
    additionalOwners: [],

    // Vendor Type & Products
    vendorType: [],
    marketType: [],
    selectedCategories: {},
    expandedCategories: {},
    categoryRemarks: '',
    productPhotos: [],
    categoryProducts: {},
    additionalCategories: [],

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
      department: 'Sales',
      photo: null
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
      loadVendorData(vendorId)
    }
  }, [mode, vendorId])

  const loadVendorData = async (id: string) => {
    try {
      setIsLoadingVendorData(true)
      console.log('Loading vendor data for ID:', id)

      // Import VendorService dynamically to avoid circular dependencies
      const VendorService = (await import('@/services/vendorService')).default
      const { categoryService } = await import('@/services/categoryService')

      const response = await VendorService.getVendorById(id)
      const vendor = response.vendor

      let allCategories: any[] = []
      try {
        const categoriesResponse = await categoryService.getCategoryTree({ status: 'ACTIVE', includeInactive: false })
        allCategories = categoriesResponse.data || []
      } catch (err) {
        console.error('Failed to load categories for vendor mapping', err)
      }

      const mappedSelectedCategories: { [key: string]: string[] } = {}
      if (vendor.productCategories && Array.isArray(vendor.productCategories)) {
        vendor.productCategories.forEach((catId: string) => {
          const category = allCategories.find((c: any) => c.id === catId || c.name === catId)
          if (category) {
            const categoryId = category.id
            if (vendor.productTypes && Array.isArray(vendor.productTypes)) {
              const validSubNames = category.subcategories?.map((s: any) => s.name) || []
              const subCategoriesForThisCategory = vendor.productTypes.filter((t: string) => validSubNames.includes(t))
              mappedSelectedCategories[categoryId] = [...new Set(subCategoriesForThisCategory)] as string[]
            } else {
              mappedSelectedCategories[categoryId] = []
            }
          } else {
            // Unmapped categories
            mappedSelectedCategories[catId] = []
          }
        })
      }

      console.log('Vendor data loaded:', vendor)

      // Map companyType from backend enum to form value
      const companyTypeMap: Record<string, string> = {
        'SOLE_PROPRIETORSHIP': 'sole',
        'PARTNERSHIP': 'partnership',
        'CORPORATION': 'corporation',
        'LLC': 'llc',
      }

      // Parse mainContact from backend (stored as JSON)
      const mainContactData = vendor.mainContact || {}

      // Resolve uploaded document URLs by type so the form can preview
      // existing files. Each registration cert (PAN / business reg) lands
      // as a VendorDocument row keyed by `type`.
      const findDocUrl = (type: string): string | null =>
        vendor.documents?.find((doc: { type: string; documentUrl: string }) => doc.type === type)?.documentUrl || null;

      // Map vendor data to form structure
      setFormData({
        // Company Details
        businessType: (vendor.companyType && companyTypeMap[vendor.companyType]) || 'corporation',
        companyName: vendor.companyName || '',
        gstNumber: vendor.gstNumber || '',
        companyIdNumber: vendor.companyIdNumber || '',
        panNumber: vendor.panNumber || '',
        email: vendor.businessEmail || vendor.email || '',
        email2: vendor.businessEmail2 || '',
        phone: vendor.businessPhone || '',
        landlineNumber: vendor.landlineNumber || '',
        phoneNumber2: vendor.phoneNumber2 || '',
        website: vendor.website || '',
        address: vendor.businessAddress || '',
        addressLine2: vendor.addressLine2 || '',
        addressLine3: vendor.addressLine3 || '',
        landmark: vendor.landmark || '',
        city: vendor.businessCity || '',
        state: vendor.businessState || '',
        zipCode: vendor.businessZipCode || '',
        country: vendor.businessCountry || 'India',
        factoryOwnershipType: vendor.factoryOwnershipType || '',
        sameAsWarehouse: false,
        logo: vendor.companyLogo || null,
        logoFile: null,
        gstDocument: findDocUrl('GST_CERTIFICATE'),
        gstFile: null,
        panCardDocument: findDocUrl('PAN_CARD'),
        panCardFile: null,
        typeCertDocument: findDocUrl('COMPANY_REGISTRATION'),
        typeCertFile: null,
        // Password is never returned by the server — left empty in edit mode.
        // Admins should not be able to read/edit existing passwords from here.
        password: '',

        // Warehouse Details
        ownershipType: vendor.ownershipType || 'owned',
        warehouseAddress: vendor.warehouseAddress || '',
        warehouseAddressLine2: vendor.warehouseAddressLine2 || '',
        warehouseAddressLine3: vendor.warehouseAddressLine3 || '',
        warehouseLandmark: vendor.warehouseLandmark || '',
        warehouseCity: vendor.warehouseCity || '',
        warehouseState: vendor.warehouseState || '',
        warehouseZip: vendor.warehouseZipCode || '',
        warehouseCountry: vendor.warehouseCountry || 'India',
        factoryImages: vendor.documents?.filter((doc: any) => doc.type === 'OTHER' && doc.name.includes('Factory')).map((doc: any, index: number) => ({
          url: doc.documentUrl,
          name: doc.name || `Factory Image ${index + 1}`,
          id: doc.id || `existing-${index}`,
          isExisting: true,
        })) || [],
        mapLink: vendor.mapLink || '',

        // Owner Profile
        ownerName: vendor.ownerName || '',
        designation: vendor.designation || '',
        ownerEmail: vendor.ownerEmail || '',
        ownerEmail2: vendor.ownerEmail2 || '',
        ownerPhone: vendor.ownerPhone || '',
        ownerPhone2: vendor.ownerPhone2 || '',
        ownerLandline: vendor.ownerLandline || '',
        businessStartDate: vendor.businessStartDate
          ? new Date(vendor.businessStartDate).toISOString().split('T')[0]
          : '',
        yearEstablished: vendor.establishedYear?.toString() || '',
        employeeCount: vendor.annualTurnover || '',
        additionalOwners: vendor.additionalOwners || [],

        // Vendor Type & Products
        // Prefer the new multi-select `vendorTypes` array when present; fall
        // back to the legacy single-enum mapping for older rows.
        vendorType: Array.isArray(vendor.vendorTypes) && vendor.vendorTypes.length > 0
          ? vendor.vendorTypes
          : vendor.vendorType === 'TEXTILE_MANUFACTURER' ? ['manufacturer'] : ['trader'],
        marketType: vendor.primaryMarkets || [],
        categoryProducts: (vendor.categoryProducts as { [key: string]: unknown[] }) || {},
        additionalCategories: vendor.additionalCategories || [],
        selectedCategories: mappedSelectedCategories,
        expandedCategories: {},
        categoryRemarks: vendor.categoryRemarks || '',
        productPhotos: vendor.documents?.filter((doc: any) => doc.type === 'OTHER' && doc.name.startsWith('Product Photo')).map((doc: any, index: number) => ({
          url: doc.documentUrl,
          name: doc.name || `Product Photo ${index + 1}`,
          id: doc.id || `existing-product-${index}`,
          preview: doc.documentUrl,
          isExisting: true,
        })) || [],

        // Manufacturing Facilities
        enabledFacilities: vendor.enabledFacilities || {},
        facilityDetails: vendor.facilityDetails || {},

        // Certifications & Logistics
        selectedCertifications: vendor.certifications?.map((cert: any) => {
          return cert.name.toLowerCase();
        }) || [],
        certificationFiles: vendor.certifications?.reduce((acc: any, cert: any) => {
          if (cert.documentUrl) {
            const certId = cert.name.toLowerCase();
            acc[certId] = {
              url: cert.documentUrl,
              name: cert.documentUrl.split('/').pop() || `${cert.name} Certificate`,
              size: 0,
              type: cert.documentUrl.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
              isExisting: true,
            };
          }
          return acc;
        }, {}) || {},
        certificationExpiryDates: vendor.certifications?.reduce((acc: any, cert: any) => {
          if (cert.expiryDate) {
            const certId = cert.name.toLowerCase();
            acc[certId] = new Date(cert.expiryDate).toISOString().split('T')[0]
          }
          return acc
        }, {}) || {},
        packagingCapabilities: vendor.packagingCapabilities || '',
        warehousingCapacity: vendor.storageCapacity || '',
        logisticsPartners: vendor.logisticsPartners || '',
        shippingMethods: vendor.shippingMethods || [],
        qualityControlProcess: vendor.qualityControl || '',
        complianceStandards: vendor.complianceStandards || '',

        // Contact & Trade Info
        mainContact: {
          name: mainContactData.name || vendor.ownerName || '',
          designation: mainContactData.designation || 'Owner',
          email1: mainContactData.email1 || vendor.ownerEmail || '',
          email2: mainContactData.email2 || '',
          phone1: mainContactData.phone1 || vendor.ownerPhone || '',
          phone2: mainContactData.phone2 || '',
          department: mainContactData.department || 'Management',
          photo: mainContactData.photo || vendor.ownerPhoto || null
        },
        alternateContacts: vendor.alternateContacts || [],
        // Treat either flag as "yes" so the FE chip reflects any kind of
        // international trade experience the vendor declared.
        hasImportExport: (vendor.importExperience || vendor.exportExperience) ? 'yes' : 'no',
        importCountries: vendor.importCountries || [],
        exportCountries: vendor.exportCountries || [],
        tradeLicenseNumber: vendor.tradeLicenseNumber || '',
        businessRegistrationNumber: vendor.businessRegistrationNumber || '',
        taxIdentificationNumber: vendor.taxIdentificationNumber || '',
        // Bank detail load — match the columns the backend now writes
        // (swiftCode → swiftCode column, NOT ifscCode). Older rows may
        // still have a SWIFT value mistakenly stored as `ifscCode` from
        // the pre-Step-7-fix era; fall back to that so legacy data still
        // populates the form correctly.
        bankingDetails: vendor.bankDetails ? {
          bankName: vendor.bankDetails.bankName || '',
          accountNumber: vendor.bankDetails.accountNumber || '',
          swiftCode: vendor.bankDetails.swiftCode || vendor.bankDetails.ifscCode || '',
          iban: vendor.bankDetails.iban || '',
        } : {
          bankName: '',
          accountNumber: '',
          swiftCode: '',
          iban: '',
        },

        // Status
        status: vendor.status?.toLowerCase() as 'active' | 'pending' | 'suspended' || 'pending',
        approvalStatus: vendor.status === 'APPROVED' ? 'approved' : vendor.status === 'REJECTED' ? 'rejected' : 'pending'
      })

      // Mark all steps as completed for edit mode
      setCompletedSteps([0, 1, 2, 3, 4, 5, 6, 7])

    } catch (error) {
      console.error('Error loading vendor data:', error)

      // Show error toast
      const { toast } = await import('@/hooks/use-toast')
      toast({
        title: 'Error',
        description: 'Failed to load vendor data. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingVendorData(false)
    }
  }

  const updateFormData = (stepData: Partial<VendorFormData>) => {
    setFormData(prev => ({ ...prev, ...stepData }))
  }

  const nextStep = () => {
    const maxStep = filteredSteps.length - 1
    if (currentStep < maxStep) {
      // Mark current step as completed
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps(prev => [...prev, currentStep])
      }

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

  const goToStep = async (step: number) => {
    // Only allow navigation to current step or completed steps
    // Do NOT allow jumping to next step without completing current one
    const canNavigate = step === currentStep || completedSteps.includes(step)

    if (canNavigate) {
      setCurrentStep(step)
    } else {
      // Show warning toast
      const { toast } = await import('@/hooks/use-toast')
      toast({
        title: 'Step Locked',
        description: 'Please complete the current section before proceeding to this step.',
        variant: 'destructive'
      })
    }
  }

  const handleSubmit = async () => {
    try {
      console.log('Submitting vendor data:', formData)

      if (mode === 'edit' && vendorId) {
        // Update existing vendor
        const VendorService = (await import('@/services/vendorService')).default
        console.log('Calling updateVendorById with vendorId:', vendorId)
        const response = await VendorService.updateVendorById(vendorId, formData)
        console.log('Update response:', response)

        // Show success message using toast instead of alert
        const { toast } = await import('@/hooks/use-toast')
        toast({
          title: 'Success',
          description: 'Vendor updated successfully!',
        })

        // Wait a bit before redirecting so user sees the success message
        await new Promise(resolve => setTimeout(resolve, 1000))
      } else {
        // Create new vendor from admin panel
        const VendorService = (await import('@/services/vendorService')).default
        console.log('Creating new vendor from admin panel')
        const response = await VendorService.createVendorByAdmin(formData)
        console.log('Create response:', response)

        const { toast } = await import('@/hooks/use-toast')
        toast({
          title: 'Success',
          description: 'Vendor created successfully!',
        })

        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      router.push('/admin/dashboard/vendors')
    } catch (error: any) {
      console.error('Error submitting vendor:', error)
      console.error('Error details:', error.response?.data || error.message)

      const { toast } = await import('@/hooks/use-toast')
      toast({
        title: 'Error',
        description: error?.message || error?.response?.data?.error || 'Failed to save vendor',
        variant: 'destructive'
      })

      throw error // Re-throw to let the loading state know there was an error
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
        return <AdminReviewSubmitStep formData={formData} onSubmit={handleSubmit} onGoToStep={(step) => goToStep(getLogicalStepIndex(step))} mode={mode} />
      default:
        return <CompanyDetails onNext={nextStep} onUpdateData={updateFormData} data={formData} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isLoadingVendorData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-(--z-modal-backdrop)">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700 mb-4"></div>
            <p className="text-gray-700 font-medium">Loading vendor data...</p>
          </div>
        </div>
      )}
      <div className="flex h-full">
        {/* Left Sidebar — Progress Steps. Fixed 272px width per DESIGN.md
            sidebar spec, matching VendorPanel (public registration flow). */}
        <div className="w-68 bg-white shadow-lg border-r border-gray-200 rounded-lg">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin/dashboard/vendors')}
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
                const isCompleted = completedSteps.includes(index)
                const isCurrent = index === currentStep
                const isAccessible = isCurrent || isCompleted
                const isLocked = !isAccessible

                return (
                  <div
                    key={index}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${isCurrent
                      ? 'bg-brand-50/50 border-r-4 border-brand-500 cursor-pointer'
                      : isCompleted
                        ? 'bg-success-50 hover:bg-success-50/70 cursor-pointer'
                        : 'bg-gray-50 opacity-60 cursor-not-allowed'
                      }`}
                    onClick={() => goToStep(index)}
                  >
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${isCurrent
                        ? 'bg-brand-500 text-white'
                        : isCompleted
                          ? 'bg-success-500 text-white'
                          : 'bg-gray-300 text-gray-500'
                        }`}
                    >
                      {isCompleted ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : isLocked ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${isCurrent
                          ? 'text-brand-700'
                          : isCompleted
                            ? 'text-success-700'
                            : 'text-gray-400'
                          }`}
                      >
                        {step.title}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-brand-600 mt-1">Current Step</p>
                      )}
                      {isCompleted && (
                        <p className="text-xs text-success-500 mt-1">Completed</p>
                      )}
                      {isLocked && (
                        <p className="text-xs text-gray-400 mt-1">Locked</p>
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
                  className="bg-linear-to-r from-brand-500 to-brand-600 h-2 rounded-full transition-all duration-300"
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
                  <div className="flex items-center justify-center w-10 h-10 bg-brand-500 text-white rounded-full font-semibold">
                    {currentStep + 1}
                  </div>
                  <div>
                    <h1 className="text-headline-md text-gray-900">{filteredSteps[currentStep].title}</h1>
                    <p className="text-gray-600">Step {currentStep + 1} of {filteredSteps.length}</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div
                    className="bg-brand-500 h-1 rounded-full transition-all duration-300"
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
  onGoToStep,
  mode
}: {
  formData: VendorFormData
  onSubmit: () => void
  onGoToStep: (step: number) => void
  mode: 'add' | 'edit'
}) {
  const [adminNotes, setAdminNotes] = useState('')
  const [initialStatus, setInitialStatus] = useState<'active' | 'pending' | 'suspended'>(formData.status || 'pending')
  const [initialApprovalStatus, setInitialApprovalStatus] = useState<'approved' | 'pending' | 'rejected'>(formData.approvalStatus || 'pending')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAdminSubmit = async () => {
    if (isSubmitting) return // Prevent double submission

    setIsSubmitting(true)
    try {
      // Include admin-specific data
      const adminData = {
        ...formData,
        status: initialStatus,
        approvalStatus: initialApprovalStatus,
        adminNotes,
        createdBy: 'admin', // This would come from auth context
        createdAt: new Date().toISOString()
      }

      console.log(`Admin ${mode === 'edit' ? 'updating' : 'creating'} vendor with data:`, adminData)
      await onSubmit()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Admin Controls */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Admin Controls</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
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
            placeholder="Add any notes about this vendor..."
          />
        </div>
      </div>

      {/* Shared read-only vendor summary — same component the public
          ReviewSubmit (Step 8) uses, so admin + vendor review surfaces
          stay field-identical by construction. */}
      <VendorDataSummary data={formData} onGoToStep={onGoToStep} />

      {/* Admin Submit Button */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => onGoToStep(6)}
          disabled={isSubmitting}
        >
          Back to Previous Step
        </Button>
        <Button
          onClick={handleAdminSubmit}
          disabled={isSubmitting}
          className="bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {mode === 'edit' ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            mode === 'edit' ? 'Update Vendor' : 'Create Vendor Account'
          )}
        </Button>
      </div>
    </div>
  )
}