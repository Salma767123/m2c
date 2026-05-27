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
  // Slot-keyed Record in edit mode (`{ nameBoard: {file,url,name}, ... }`)
  // mirroring WarehouseDetails state. Pre-fill defaults to empty `{}`; the
  // component's normaliseFactoryImages also tolerates the legacy array shape
  // for backwards compatibility during the migration window.
  factoryImages: Record<string, { file: File | null; url: string; name: string; isExisting?: boolean }> | any[]
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
  /** User-defined custom certs (Step 6 "other certifications") — name +
   *  optional description. Persisted as VendorCertification rows with
   *  `isCustom: true`. Kept separate from the catalog-id `selectedCertifications`
   *  list so reloads don't pollute the chip set with phantom entries. */
  otherCertifications: Array<{ id: string; name: string; description?: string }>

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
    factoryImages: {},
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
    otherCertifications: [],
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
    { title: 'Company Details', icon: Building2 },             // 0
    { title: 'Warehouse Details', icon: MapPin },              // 1
    { title: 'Owner Profile', icon: User },                    // 2
    { title: 'Vendor Type & Products', icon: Package },        // 3
    { title: 'Manufacturing Facilities', icon: Factory },      // 4 — skipped when non-manufacturer
    { title: 'Certifications & Logistics', icon: Award },      // 5
    { title: 'Contact & Trade Info', icon: Phone },            // 6
    { title: 'Review & Submit', icon: CheckCircle }            // 7
  ]

  const MANUFACTURING_STEP_INDEX = 4

  const isManufacturer = () => {
    const vendorTypes = formData.vendorType || []
    return Array.isArray(vendorTypes) ? vendorTypes.includes('manufacturer') : vendorTypes === 'manufacturer'
  }

  // All 8 steps are always rendered in the sidebar for a stable step count.
  // Manufacturing Facilities is auto-skipped at nav-time once Step 4
  // (Vendor Type) is saved with no manufacturer selection.
  const isStepSkipped = (index: number) =>
    index === MANUFACTURING_STEP_INDEX &&
    completedSteps.includes(3) &&
    !isManufacturer()

  const findAdjacent = (from: number, dir: 1 | -1) => {
    let next = from + dir
    while (next >= 0 && next < steps.length && isStepSkipped(next)) {
      next += dir
    }
    return next
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

      // Parse mainContact from backend (stored as JSON)
      const mainContactData = vendor.mainContact || {}

      // Resolve uploaded document URLs by type so the form can preview
      // existing files. Each registration cert (PAN / business reg) lands
      // as a VendorDocument row keyed by `type`.
      const findDocUrl = (type: string): string | null =>
        vendor.documents?.find((doc: { type: string; documentUrl: string }) => doc.type === type)?.documentUrl || null;

      // Reverse of backend CERT_NAME_MAP — friendly name (as stored in DB) →
      // form chip id. The old code did `cert.name.toLowerCase()` which only
      // worked for single-word certs; multi-word names ("SMETA / Sedex",
      // "ISO 9001", "ISO 14001", "Fair Trade") would silently fail to match
      // any chip and lose their file + expiry on every reload, and on save
      // the existing-URL preservation key didn't match either → admin save
      // wiped the certificate document. Keep this in sync with the backend
      // `CERT_NAME_MAP` (vendorController.js) and the CERTIFICATIONS catalog
      // (CertificationsLogistics.tsx).
      const CATALOG_NAME_TO_CHIP: Record<string, string> = {
        'OEKO-TEX': 'oeko-tex',
        'GOTS': 'gots',
        'GRS': 'grs',
        'SMETA / Sedex': 'smeta',
        'ISO 9001': 'iso-9001',
        'ISO 14001': 'iso-14001',
        'BSCI': 'bsci',
        'FSC': 'fsc',
        'Fair Trade': 'fair-trade',
        'WRAP': 'wrap',
        'BCI': 'bci',
      };
      const allCerts = vendor.certifications || [];
      const catalogCerts = allCerts.filter((c: any) => !c.isCustom);
      const customCerts = allCerts.filter((c: any) => c.isCustom);

      const reloadedSelectedCertifications: string[] = [];
      const reloadedCertificationFiles: Record<string, any> = {};
      const reloadedCertificationExpiryDates: Record<string, string> = {};
      catalogCerts.forEach((cert: any) => {
        const chipId = CATALOG_NAME_TO_CHIP[cert.name];
        if (!chipId) return; // unmappable legacy row — skip rather than corrupt the chip set
        reloadedSelectedCertifications.push(chipId);
        if (cert.documentUrl) {
          reloadedCertificationFiles[chipId] = {
            url: cert.documentUrl,
            name: cert.documentUrl.split('/').pop() || `${cert.name} Certificate`,
            size: 0,
            type: cert.documentUrl.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
            isExisting: true,
          };
        }
        if (cert.expiryDate) {
          reloadedCertificationExpiryDates[chipId] = new Date(cert.expiryDate).toISOString().split('T')[0];
        }
      });

      // Custom certs (Step 6 "other certifications"). Carry the vendor-typed
      // name + description back into the form so admins see what was originally
      // submitted instead of an empty list. The certificate FILE and
      // EXPIRY DATE for each custom cert also need to land in the shared
      // `certificationFiles` and `certificationExpiryDates` maps — those
      // are keyed by `cert.id` (not chip id) for custom rows; the form's
      // JSX looks them up via `formData.certificationFiles[other.id]` etc.
      // Without this, custom certs reloaded with the upload tile empty and
      // the expiry date blank even though both were saved to the DB.
      const reloadedOtherCertifications = customCerts.map((c: any, i: number) => {
        const certId = c.id || `custom-${i}`;
        if (c.documentUrl) {
          reloadedCertificationFiles[certId] = {
            url: c.documentUrl,
            name: c.documentUrl.split('/').pop() || `${c.name} Certificate`,
            size: 0,
            type: c.documentUrl.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
            isExisting: true,
          };
        }
        if (c.expiryDate) {
          reloadedCertificationExpiryDates[certId] = new Date(c.expiryDate).toISOString().split('T')[0];
        }
        return {
          id: certId,
          name: c.name,
          description: c.description || '',
        };
      });

      // Map vendor data to form structure
      setFormData({
        // Company Details
        // Read the Step 1 chip selection from the raw `businessType` column.
        // Fall back to '' (no chip selected) for legacy rows that pre-date
        // this column — the form will leave the chip unselected.
        businessType: vendor.businessType || '',
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
        // `sameAsWarehouse` has no DB column — it's a UI-only mirror flag
        // captured at registration time. Restore it for the edit form by
        // comparing the company-address columns against the warehouse-address
        // columns: when every field matches, the vendor effectively had the
        // box ticked during registration. If the admin later changes any
        // warehouse field to differ from the company address, the derived
        // flag will (correctly) come back as false on the next reload.
        sameAsWarehouse: (() => {
          const eq = (a: any, b: any) => (a || '') === (b || '');
          return (
            !!vendor.businessAddress &&
            eq(vendor.businessAddress, vendor.warehouseAddress) &&
            eq((vendor as any).addressLine2, (vendor as any).warehouseAddressLine2) &&
            eq((vendor as any).addressLine3, (vendor as any).warehouseAddressLine3) &&
            eq((vendor as any).landmark, (vendor as any).warehouseLandmark) &&
            eq(vendor.businessCity, vendor.warehouseCity) &&
            eq(vendor.businessState, vendor.warehouseState) &&
            eq(vendor.businessZipCode, vendor.warehouseZipCode) &&
            eq(vendor.businessCountry, vendor.warehouseCountry) &&
            eq((vendor as any).factoryOwnershipType, vendor.ownershipType)
          );
        })(),
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
        // Reverse map: descriptive document name → slot id. Mirrors
        // FACTORY_SLOT_LABEL_MAP in backend/controllers/vendorController.js
        // and FACTORY_IMAGE_SLOTS in WarehouseDetails.tsx; keep all three in
        // sync if new slots are added.
        // Build slot-keyed Record so WarehouseDetails renders existing photos
        // back into their original slots. Legacy rows named "Factory Image N"
        // (pre-slot era) collapse into the `others` slot so they remain
        // visible and replaceable.
        factoryImages: (() => {
          const slotByName: Record<string, string> = {
            'Factory Name Board': 'nameBoard',
            'Factory Front View': 'frontView',
            'Factory Back View': 'backView',
            'Factory Left View': 'leftView',
            'Factory Right View': 'rightView',
            'Factory Road View': 'roadView',
            'Factory Interior': 'insideFactory',
            'Factory Image (Other)': 'others',
          };
          const record: Record<string, { file: File | null; url: string; name: string; isExisting: boolean }> = {};
          const factoryDocs = vendor.documents?.filter(
            (doc: any) => doc.type === 'OTHER' && doc.name?.includes('Factory'),
          ) || [];
          factoryDocs.forEach((doc: any) => {
            const slotId = slotByName[doc.name] || 'others';
            // Don't overwrite a slot that already has a more-specific match;
            // legacy fallback into `others` only fills if `others` is empty.
            if (!record[slotId]) {
              record[slotId] = {
                file: null,
                url: doc.documentUrl,
                name: doc.name,
                isExisting: true,
              };
            }
          });
          return record;
        })(),
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
        // Read the headcount range from its own column. (The old code
        // pointed at `annualTurnover` — a stale proxy from before the
        // dedicated `employeeCount` column existed.)
        employeeCount: vendor.employeeCount || '',
        additionalOwners: vendor.additionalOwners || [],

        // Vendor Type & Products
        // Prefer the new multi-select `vendorTypes` array when present; fall
        // back to deriving from the role/legacy enums for older rows.
        // Reverse-map by priority:
        //   1. vendorTypes array (the canonical multi-select column)
        //   2. companyType enum (vendor role — set since the role-vs-structure split)
        //   3. vendorType legacy enum (single-value, only useful for TEXTILE_MANUFACTURER)
        //   4. [] — leaves the chips unselected for unmappable legacy values
        //      (TRADER / DISTRIBUTOR / WHOLESALER / RETAILER have no chip equivalent).
        vendorType: (() => {
          if (Array.isArray(vendor.vendorTypes) && vendor.vendorTypes.length > 0) {
            return vendor.vendorTypes;
          }
          const roleEnumToChip: Record<string, string> = {
            'MANUFACTURER': 'manufacturer',
            'IMPORTER': 'importer',
            'EXPORTER': 'exporter',
          };
          const roleChip = roleEnumToChip[(vendor as any).companyType];
          if (roleChip) return [roleChip];
          if (vendor.vendorType === 'TEXTILE_MANUFACTURER') return ['manufacturer'];
          return [];
        })(),
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

        // Certifications & Logistics — built above from a split on
        // `isCustom`, with catalog certs reverse-mapped to chip ids via
        // CATALOG_NAME_TO_CHIP so multi-word names match correctly.
        selectedCertifications: reloadedSelectedCertifications,
        certificationFiles: reloadedCertificationFiles,
        certificationExpiryDates: reloadedCertificationExpiryDates,
        otherCertifications: reloadedOtherCertifications,
        packagingCapabilities: vendor.packagingCapabilities || '',
        warehousingCapacity: vendor.storageCapacity || '',
        logisticsPartners: vendor.logisticsPartners || '',
        shippingMethods: vendor.shippingMethods || [],
        qualityControlProcess: vendor.qualityControl || '',
        complianceStandards: vendor.complianceStandards || '',

        // Contact & Trade Info — spread the stored JSON FIRST so every field
        // the registration form persisted (firstName / middleName / lastName /
        // customDesignation / customDepartment / landline / etc.) flows back
        // into the edit form. Then layer the owner-derived fallbacks on top
        // for the required core fields so an empty `mainContact` JSON still
        // resolves to a usable contact.
        mainContact: {
          ...mainContactData,
          name: mainContactData.name || vendor.ownerName || '',
          designation: mainContactData.designation || 'Owner',
          email1: mainContactData.email1 || vendor.ownerEmail || '',
          email2: mainContactData.email2 || '',
          phone1: mainContactData.phone1 || vendor.ownerPhone || '',
          phone2: mainContactData.phone2 || '',
          department: mainContactData.department || 'Management',
          photo: mainContactData.photo || vendor.ownerPhoto || null,
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
    if (currentStep < steps.length - 1) {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps(prev => [...prev, currentStep])
      }
      setCurrentStep(findAdjacent(currentStep, 1))
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(findAdjacent(currentStep, -1))
    }
  }

  const goToStep = async (step: number) => {
    if (isStepSkipped(step)) return

    // Allow navigation to current step or completed steps.
    const canNavigate = step === currentStep || completedSteps.includes(step)

    if (canNavigate) {
      setCurrentStep(step)
    } else {
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
    switch (currentStep) {
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
        return <AdminReviewSubmitStep formData={formData} onSubmit={handleSubmit} onGoToStep={goToStep} mode={mode} />
      default:
        return <CompanyDetails onNext={nextStep} onUpdateData={updateFormData} data={formData} />
    }
  }

  return (
    // The admin dashboard layout (frontend/src/app/admin/dashboard/layout.tsx)
    // already provides a scrollable `<main className="flex-1 overflow-y-auto">`
    // for the page content; no extra `min-h-screen` or `overflow-*` is needed
    // here. NOTE: setting `overflow-x-hidden` on this div looks defensive but
    // is actually harmful — when only one axis is explicitly `hidden`, the
    // browser implicitly switches the other axis to `auto`, which adds a
    // SECOND vertical scrollbar inside the already-scrolling admin <main>.
    <div className="bg-gray-50">
      {isLoadingVendorData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-(--z-modal-backdrop)">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700 mb-4"></div>
            <p className="text-gray-700 font-medium">Loading vendor data...</p>
          </div>
        </div>
      )}
      {/* `items-start` so the sidebar doesn't stretch to match the (usually
          much taller) form content — that's what caused a giant empty white
          band BELOW the sidebar's actual content. `h-full` was removed because
          the parent no longer has a height (we dropped min-h-screen) and a
          stretched-to-zero flex container would otherwise collapse the steps
          sidebar height. */}
      <div className="flex items-start">
        {/* Left Sidebar — Progress Steps. Styled to match the public
            registration flow (VendorPanel.tsx) so admin Add/Edit feels like
            the same wizard, with the admin-specific Back button + title
            wired in at the top. Sticky to the admin <main>'s scroll edge
            so the steps stay visible while the form scrolls. */}
        {(() => {
          const visibleStepCount = steps.filter((_, i) => !isStepSkipped(i)).length
          const completedVisibleCount = completedSteps.filter(i => !isStepSkipped(i)).length
          const inProgressCredit =
            !isStepSkipped(currentStep) && !completedSteps.includes(currentStep) ? 0.4 : 0
          const progressPercent = Math.min(
            100,
            Math.round(((completedVisibleCount + inProgressCredit) / visibleStepCount) * 100),
          )
          return (
        <aside className="hidden md:flex flex-col w-68 bg-white border-r border-gray-100 sticky top-0 self-start h-screen shrink-0 z-(--z-sticky) shadow-[4px_0_24px_rgba(0,0,0,0.01)]">
          {/* Header — admin-specific Back button + Add/Edit title.
              Sits above the steps in the same chrome as VendorPanel's
              "Registration Progress" header for visual parity. */}
          <div className="px-6 py-6 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin/dashboard/vendors')}
                className="p-1.5 h-8 w-8"
                aria-label="Back to vendors"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xs font-bold text-gray-900 tracking-widest uppercase">
                {mode === 'add' ? 'Add Vendor' : 'Edit Vendor'}
              </h2>
            </div>
            <p className="text-[11px] text-gray-400 font-medium">
              {mode === 'add' ? 'Complete all steps to create a vendor' : 'Update any step and save'}
            </p>
          </div>

          {/* Navigation Steps */}
          <nav aria-label={mode === 'add' ? 'Add vendor steps' : 'Edit vendor steps'} className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
            <ul className="space-y-1 relative" role="list">
              {steps.map((step, index) => {
                const skipped = isStepSkipped(index)
                const isCompleted = completedSteps.includes(index) && !skipped
                const isCurrent = index === currentStep && !skipped
                const isAccessible =
                  !skipped &&
                  (index <= currentStep ||
                    isCompleted ||
                    (index > 0 && completedSteps.includes(index - 1)))

                return (
                  <li key={index} className="relative flex items-start gap-4 pb-6 last:pb-0">
                    {/* Vertical Connector Line */}
                    {index < steps.length - 1 && (
                      <div
                        className="absolute left-6 top-8 bottom-0 w-0.5 -ml-px transition-colors duration-300"
                        style={{
                          backgroundColor: isCompleted ? 'var(--color-success-500)' : 'var(--color-outline)',
                        }}
                      />
                    )}

                    {/* Button */}
                    <button
                      type="button"
                      disabled={!isAccessible}
                      onClick={() => isAccessible && goToStep(index)}
                      aria-current={isCurrent ? 'step' : undefined}
                      aria-label={`Step ${index + 1}: ${step.title}${skipped ? ', not applicable' : isCompleted ? ', completed' : isCurrent ? ', current' : ''}`}
                      className={`flex items-start gap-3.5 p-2 rounded-xl w-full text-left transition-all duration-200 group relative
                        ${
                          skipped
                            ? 'opacity-50 cursor-not-allowed'
                            : isCurrent
                              ? 'bg-brand-50/50'
                              : isAccessible && !isCompleted
                                ? 'hover:bg-gray-50/60 cursor-pointer'
                                : isCompleted
                                  ? 'hover:bg-success-50/30 cursor-pointer'
                                  : 'opacity-60 cursor-not-allowed'
                        }`}
                    >
                      {/* Step Indicator Dot */}
                      <div className="relative shrink-0 z-10 flex items-center justify-center w-8 h-8">
                        {skipped ? (
                          <div className="flex items-center justify-center w-8 h-8 rounded-full border border-dashed border-gray-300 bg-gray-50 text-gray-400 text-xs font-medium">
                            &mdash;
                          </div>
                        ) : isCompleted ? (
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success-500 text-white shadow-[0_0_0_4px_rgba(22,163,74,0.1)] transition-transform duration-200 group-hover:scale-105">
                            <svg className="w-4 h-4 stroke-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : isCurrent ? (
                          <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-brand-500 bg-white shadow-[0_0_0_4px_rgba(224,26,27,0.12)]">
                            <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
                          </div>
                        ) : isAccessible ? (
                          <div className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-600 text-xs font-semibold group-hover:border-brand-400 group-hover:text-brand-500 transition-colors duration-150">
                            {index + 1}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 bg-gray-50 text-gray-400 text-xs font-medium">
                            {index + 1}
                          </div>
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p
                          className={`text-sm font-semibold leading-tight truncate transition-colors duration-150 ${
                            skipped
                              ? 'text-gray-400 line-through decoration-gray-300'
                              : isCurrent
                                ? 'text-brand-700 font-bold'
                                : isCompleted
                                  ? 'text-gray-700 group-hover:text-success-700'
                                  : 'text-gray-500 group-hover:text-gray-900'
                          }`}
                        >
                          {step.title}
                        </p>
                        {skipped ? (
                          <span className="text-[10px] text-gray-400 mt-0.5">Not applicable</span>
                        ) : isCurrent ? (
                          <span className="text-[10px] text-brand-600 font-bold tracking-wide uppercase mt-0.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                            In Progress
                          </span>
                        ) : isCompleted ? (
                          <span className="text-[10px] text-success-500 font-medium tracking-wide uppercase mt-0.5 flex items-center gap-1">
                            Completed
                          </span>
                        ) : isAccessible ? (
                          <span className="text-[10px] text-gray-400 mt-0.5">Available</span>
                        ) : (
                          <span className="text-[10px] text-gray-300 mt-0.5">Locked</span>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Progress Summary Pinned to Bottom */}
          <div className="p-5 border-t border-gray-100 shrink-0 bg-gray-50/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Overall Progress
              </span>
              <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full tabular-nums">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-linear-to-r from-brand-500 to-brand-600 transition-[width] duration-500 ease-out shadow-[0_0_8px_rgba(224,26,27,0.15)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-2.5">
              <span className="text-[10px] text-gray-400 font-medium tabular-nums">
                {completedVisibleCount} of {visibleStepCount} completed
              </span>
              {progressPercent === 100 && (
                <span className="text-[10px] text-success-500 font-bold flex items-center gap-0.5">
                  <svg className="w-3.5 h-3.5 fill-success-500" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Ready!
                </span>
              )}
            </div>
          </div>
        </aside>
          )
        })()}

        {/* Right Content Area. `flex-1 min-w-0` lets the content grow to
            fill the space the 272px sidebar doesn't use AND allows flex
            shrinking when the viewport gets narrow (without min-w-0,
            flex children with wide content force overflow). The previous
            `w-3/4` was capping the area at 75% of parent width, which
            left a visible empty band on the right at desktop widths. */}
        <div className="flex-1 min-w-0">
          <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              {/* Step Header */}
              <div className="mb-8">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-brand-500 text-white rounded-full font-semibold">
                    {currentStep + 1}
                  </div>
                  <div>
                    <h1 className="text-headline-md text-gray-900">{steps[currentStep].title}</h1>
                    <p className="text-gray-600">Step {currentStep + 1} of {steps.length}</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div
                    className="bg-brand-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
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