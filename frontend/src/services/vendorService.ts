import { getStoredAuth, authenticatedFetch } from '@/lib/auth'
import axiosInstance from '@/lib/axios'
import { dispatchAuthChange } from '@/lib/authEvents'

// Vendor Service for API integration

export interface VendorRegistrationData {
  // Company Details
  businessType: string;
  companyName: string;
  gstNumber?: string;
  /** Type-specific regulatory ID — IEC / CIN / Deed details / LLPIN. */
  companyIdNumber?: string;
  /** PAN Number — required for all 4 supported businessType values. */
  panNumber?: string;
  email: string;
  email2?: string;
  phone: string;
  landlineNumber?: string;
  phoneNumber2?: string;
  website?: string;
  address: string;
  addressLine2?: string;
  addressLine3?: string;
  landmark?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  /** Factory ownership — owned / rented / lease. Mirrored to warehouse
   *  `ownershipType` when the user ticks "Same as warehouse". */
  factoryOwnershipType?: string;

  // Owner Profile
  ownerName: string;
  /** Designation — Proprietor / CEO / Director / Managing Director / Founder
   *  / custom typed value when "Other" chip is selected. */
  designation?: string;
  ownerEmail: string;
  ownerEmail2?: string;
  ownerPhone: string;
  ownerPhone2?: string;
  ownerLandline?: string;
  /** Additional owners / directors / partners. Required core fields are
   *  name + email + phone; the rest are optional and mirror the primary
   *  owner shape (designation / email2 / phone2 / landline). Backend
   *  stores the full array as raw JSON on the `additionalOwners` column. */
  additionalOwners?: Array<{
    name: string;
    designation?: string;
    email: string;
    email2?: string;
    phone: string;
    phone2?: string;
    landline?: string;
  }>;
  /** Full date — preferred over legacy `yearEstablished`. Backend derives
   *  `establishedYear` from this. */
  businessStartDate?: string;
  yearEstablished: string;
  employeeCount: string;

  // Warehouse Details
  ownershipType: string;
  warehouseAddress: string;
  warehouseAddressLine2?: string;
  warehouseAddressLine3?: string;
  warehouseLandmark?: string;
  warehouseCity: string;
  warehouseState: string;
  warehouseZip: string;
  warehouseCountry: string;
  mapLink?: string;

  // Vendor Type & Products
  vendorType: string | string[];
  marketType: string | string[];
  selectedCategories: Record<string, string[]>;
  categoryRemarks?: string;
  /** Per-category products from Step 4. Shape:
   *  `{ [categoryId]: Array<{ id, name, photos: Array<{ file?, preview }> }> }`
   *  The `preview` field carries a base64 data URI that the backend swaps for
   *  a Cloudinary URL via `resolveBase64InValue` before persisting. */
  categoryProducts?: Record<string, any[]>;
  /** User-defined custom categories created on Step 4. Same product shape
   *  as `categoryProducts`, but the category is named freely by the vendor
   *  rather than picked from the master Category tree. */
  additionalCategories?: Array<{ id: string; name: string; products: any[] }>;

  // Manufacturing Facilities
  enabledFacilities?: Record<string, boolean>;
  facilityDetails?: Record<string, any>;

  // Certifications & Logistics
  selectedCertifications: string[];
  certificationExpiryDates: Record<string, string>;
  /** User-defined custom certifications added on Step 6. Each entry has a
   *  vendor-typed name + free-text description; the backend creates
   *  `VendorCertification` rows with `isCustom: true` for these. */
  otherCertifications?: Array<{ id: string; name: string; description?: string }>;
  qualityControlProcess?: string;
  complianceStandards?: string;
  packagingCapabilities?: string;
  warehousingCapacity?: string;
  logisticsPartners?: string;
  shippingMethods: string[];

  // Contact & Trade Info
  mainContact: {
    /** Full name — concatenated by the form's `handleNext` from
     *  `firstName / middleName / lastName` for legacy consumers. */
    name?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    designation: string;
    customDesignation?: string;
    email1: string;
    email2?: string;
    phone1: string;
    phone2?: string;
    landline?: string;
    department: string;
    customDepartment?: string;
    /** Base64 data URI of the contact photo. Backend deep-walks the
     *  `mainContact` object with `resolveBase64InValue` and replaces this
     *  with a Cloudinary URL before persisting. */
    photo?: string;
  };
  alternateContacts: Array<{
    id?: string;
    name?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    designation?: string;
    customDesignation?: string;
    email1?: string;
    email2?: string;
    phone1?: string;
    phone2?: string;
    landline?: string;
    department?: string;
    customDepartment?: string;
  }>;
  hasImportExport: string;
  importCountries: string[];
  exportCountries: string[];
  tradeLicenseNumber?: string;
  businessRegistrationNumber?: string;
  taxIdentificationNumber?: string;
  bankingDetails?: {
    bankName: string;
    accountNumber: string;
    swiftCode?: string;
    iban?: string;
  };

  // Password
  password: string;
}

export interface VendorFiles {
  logo?: File;
  gstDocument?: File;
  /** PAN Card certificate upload — required by the Company Details step. */
  panCardFile?: File;
  /** Type-specific business registration certificate
   *  (IEC / CIN / Partnership Deed / LLPIN). */
  typeCertFile?: File;
  ownerPhoto?: File;
  /** Factory images keyed by slot ID (nameBoard / frontView / backView /
   *  leftView / rightView / roadView / insideFactory / others). Each slot
   *  is uploaded under the shared `factoryImages` field with the slot ID
   *  carried in a side-channel `factoryImageSlot_<index>` body field so the
   *  backend can store descriptive document names ("Factory Front View"
   *  etc.) instead of "Factory Image N". */
  factoryImages?: Record<string, File>;
  certificationFiles?: Record<string, File>;
}

export interface VendorLoginResponse {
  message: string;
  vendor: {
    id: string;
    email: string;
    companyName: string;
    status: string;
    ownerName: string;
  };
  token: string;
}

export interface VendorProfile {
  id: string;
  email: string;
  companyName: string;
  /** Raw business STRUCTURE from Step 1 (proprietorship / pvt-ltd /
   *  partnership-firm / llp / others / <custom>). Distinct from
   *  `companyType` (vendor role enum). */
  businessType?: string;
  companyLogo?: string;
  gstNumber?: string;
  /** Type-specific regulatory ID — IEC / CIN / Partnership Deed / LLPIN. */
  companyIdNumber?: string;
  /** PAN Number — required across the 4 supported business types. */
  panNumber?: string;
  status: string;
  ownerName: string;
  /** Owner designation chip (Proprietor / CEO / Director / etc.). */
  designation?: string;
  ownerEmail: string;
  ownerEmail2?: string;
  ownerPhone: string;
  ownerPhone2?: string;
  ownerLandline?: string;
  ownerPhoto?: string;
  additionalOwners?: Array<{
    name: string;
    /** Optional designation — matches primary-owner shape. */
    designation?: string;
    email: string;
    email2?: string;
    phone: string;
    phone2?: string;
    landline?: string;
  }>;
  /** Full date — backend derives `establishedYear` from this. */
  businessStartDate?: string;
  /** Employee head-count range chip from Step 3 (e.g. "10-20"). */
  employeeCount?: string;
  businessPhone: string;
  landlineNumber?: string;
  phoneNumber2?: string;
  businessEmail: string;
  /** Optional secondary business email. */
  businessEmail2?: string;
  businessAddress: string;
  /** Optional company address detail lines + landmark. */
  addressLine2?: string;
  addressLine3?: string;
  landmark?: string;
  businessCity: string;
  businessState: string;
  businessZipCode: string;
  businessCountry: string;
  website?: string;
  /** Factory ownership — owned / rented / lease. */
  factoryOwnershipType?: string;
  establishedYear?: number;
  companyType?: string;
  vendorType: string;
  /** Raw multi-select vendor types — present on rows submitted after the
   *  Step 4 audit. Prefer this over the single-enum `vendorType` for display. */
  vendorTypes?: string[];
  vendorCode?: string;
  productCategories: string[];
  productTypes: string[];
  specializations: string[];
  categoryRemarks?: string;
  /** Per-category products (JSON). Shape:
   *  `{ [categoryId]: Array<{ id, name, photos }> }`. Photos already point
   *  to Cloudinary URLs by the time they reach the frontend. */
  categoryProducts?: Record<string, unknown[]>;
  /** User-defined custom categories. */
  additionalCategories?: Array<{ id: string; name: string; products: unknown[] }>;
  annualTurnover?: string;
  /** Import / export experience flags (split as of Step 7 audit). */
  importExperience?: boolean;
  exportExperience?: boolean;
  exportCountries?: string[];
  importCountries?: string[];
  primaryMarkets?: string[];
  factoryAddress?: string;
  factoryCity?: string;
  factoryState?: string;
  factoryZipCode?: string;
  factoryCountry?: string;
  factorySize?: string;
  productionCapacity?: string;
  qualityControl?: string;
  enabledFacilities?: Record<string, boolean>;
  facilityDetails?: Record<string, any>;
  ownershipType?: string;
  warehouseAddress?: string;
  /** Optional warehouse address detail lines + landmark. */
  warehouseAddressLine2?: string;
  warehouseAddressLine3?: string;
  warehouseLandmark?: string;
  warehouseCity?: string;
  warehouseState?: string;
  warehouseZipCode?: string;
  warehouseCountry?: string;
  /** Step 6 free-text logistics / compliance fields. */
  packagingCapabilities?: string;
  logisticsPartners?: string;
  complianceStandards?: string;
  warehouseSize?: string;
  storageCapacity?: string;
  mapLink?: string;
  shippingMethods?: string[];
  deliveryTime?: string;
  minimumOrderQuantity?: string;
  paymentTerms?: string[];
  mainContact?: any;
  alternateContacts?: any[];
  tradeLicenseNumber?: string;
  businessRegistrationNumber?: string;
  taxIdentificationNumber?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  suspendedAt?: string;
  rejectionReason?: string;
  applicationStep?: number;
  completedSteps?: number[];
  completionPercentage?: number;
  approvalRequestedBy?: string;
  approvalRequestedByName?: string;
  approvalRequestedAt?: string;
  rejectionRequestedBy?: string;
  rejectionRequestedByName?: string;
  rejectionRequestedAt?: string;
  certifications: any[];
  documents: any[];
  bankDetails?: any;
  references: any[];
  rating?: number | null;
  ratingCount?: number;
  latestInspection?: {
    id: string;
    status: string;
    result: string | null;
    completedAt: string | null;
  } | null;
  _count?: {
    certifications: number;
    documents: number;
  };
}

export interface VendorsListResponse {
  vendors: VendorProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface VendorFilters {
  status?: 'PENDING' | 'UNDER_REVIEW' | 'REINSPECTION' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  search?: string;
  page?: number;
  limit?: number;
}

// Vendor Settings Interfaces
export interface VendorBasicInfo {
  companyName: string;
  companyDescription?: string;
  gstNumber?: string;
  businessPhone: string;
  businessEmail: string;
  website?: string;
  businessAddress: string;
  businessCity: string;
  businessState: string;
  businessZipCode: string;
  businessCountry: string;
}

export interface VendorOwnerInfo {
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerAddress: string;
  ownerCity: string;
  ownerState: string;
  ownerZipCode: string;
  ownerCountry: string;
}

export interface VendorBankDetails {
  id?: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: string;
  accountHolderName: string;
  branchName?: string;
  branchAddress?: string;
  isVerified?: boolean;
  verifiedAt?: string;
}

export interface VendorDocument {
  id: string;
  type: string;
  name: string;
  documentUrl: string;
  uploadedAt: string;
}

export interface VendorCertification {
  id: string;
  name: string;
  issuedBy: string;
  certificateNumber?: string;
  issuedDate?: string;
  expiryDate?: string;
  documentUrl?: string;
}

export interface VendorPreferences {
  shippingMethods: string[];
  deliveryTime?: string;
  minimumOrderQuantity?: string;
  paymentTerms: string[];
  productCategories: string[];
  specializations: string[];
}

class VendorService {
  // Get vendor token from localStorage
  private static getVendorToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('vendorToken');
  }

  // Get vendor auth headers
  private static getVendorAuthHeaders(): Record<string, string> {
    const token = this.getVendorToken();
    if (!token) {
      throw new Error('No vendor authentication token found');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // Get vendor auth headers for FormData
  private static getVendorAuthHeadersFormData(): Record<string, string> {
    const token = this.getVendorToken();
    if (!token) {
      throw new Error('No vendor authentication token found');
    }

    return {
      'Authorization': `Bearer ${token}`
    };
  }

  // Get admin token from auth system
  private static getAdminToken(): string | null {
    const auth = getStoredAuth();
    return auth?.token || null;
  }

  // Expose auth check for debugging
  static getStoredAuth() {
    return getStoredAuth();
  }

  // Register vendor with form data and files
  static async registerVendor(formData: VendorRegistrationData, files: VendorFiles) {
    const form = new FormData();

    // Add all form fields
    Object.keys(formData).forEach(key => {
      const value = (formData as any)[key];
      if (typeof value === 'object' && value !== null) {
        form.append(key, JSON.stringify(value));
      } else {
        form.append(key, value || '');
      }
    });

    // Add files
    if (files.logo) {
      form.append('logo', files.logo);
    }
    if (files.gstDocument) {
      form.append('gstDocument', files.gstDocument);
    }
    if (files.panCardFile) {
      form.append('panCardFile', files.panCardFile);
    }
    if (files.typeCertFile) {
      form.append('typeCertFile', files.typeCertFile);
    }
    if (files.ownerPhoto) {
      form.append('ownerPhoto', files.ownerPhoto);
    }
    if (files.factoryImages) {
      Object.entries(files.factoryImages).forEach(([slotId, file], index) => {
        form.append('factoryImages', file);
        form.append(`factoryImageSlot_${index}`, slotId);
      });
    }
    if (files.certificationFiles) {
      Object.entries(files.certificationFiles).forEach(([certId, file], index) => {
        form.append('certificationFiles', file);
        form.append(`certificationId_${index}`, certId);
      });
    }

    try {
      const response = await axiosInstance.post('/vendors/register', form, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Login vendor
  static async loginVendor(email: string, password: string): Promise<VendorLoginResponse> {
    try {
      const response = await axiosInstance.post('/vendors/login', { email, password });

      const data = response.data;

      // Store token in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('vendorToken', data.token);
        localStorage.setItem('vendorData', JSON.stringify(data.vendor));
        dispatchAuthChange();
      }

      return data;
    } catch (error: any) {
      // The axios interceptor returns a custom error object: { message, status, data }
      // Also handle standard axios error structure for backward compatibility
      const errorMessage = error?.message || error?.data?.error || error?.data?.message || 'Invalid credentials';
      throw new Error(errorMessage);
    }
  }

  // Get vendor profile
  static async getVendorProfile(): Promise<{ vendor: VendorProfile }> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('vendorToken') : null;
    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      const response = await axiosInstance.get('/vendors/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Update vendor profile
  static async updateVendorProfile(updateData: Partial<VendorProfile>) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('vendorToken') : null;
    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      const response = await axiosInstance.put('/vendors/profile', updateData, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Admin: Get all vendors with filters
  static async getAllVendors(filters: VendorFilters = {}): Promise<VendorsListResponse> {
    const token = this.getAdminToken();

    if (!token) {
      throw new Error('No admin authentication token found');
    }

    const queryParams = new URLSearchParams();
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.page) queryParams.append('page', filters.page.toString());
    if (filters.limit) queryParams.append('limit', filters.limit.toString());

    const url = `/vendors/all?${queryParams.toString()}`;

    try {
      const response = await axiosInstance.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Admin: Get single vendor by ID
  static async getVendorById(vendorId: string): Promise<{ vendor: VendorProfile }> {
    const token = this.getAdminToken();
    if (!token) {
      throw new Error('No admin authentication token found');
    }

    try {
      const response = await axiosInstance.get(`/vendors/${vendorId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Admin: Update vendor by ID
  static async updateVendorById(vendorId: string, vendorData: any) {
    const token = this.getAdminToken();

    if (!token) {
      throw new Error('No admin authentication token found');
    }

    try {
      // Prepare FormData for file uploads
      const formData = new FormData();

      // Fields to skip (handled separately or not needed in API)
      const skipFields = [
        'certificationFiles', 'logoFile', 'gstFile', 'contactPhotoFile',
        'productPhotos', 'contactPhoto', 'logo', 'gstDocument',
        'sameAsWarehouse', 'expandedCategories', 'factoryImages',
        'existingProductPhotos'
      ];

      // Add all form fields
      Object.keys(vendorData).forEach(key => {
        if (skipFields.includes(key)) return;

        const value = vendorData[key];

        // Handle different data types
        if (typeof value === 'object' && value !== null && !(value instanceof File)) {
          formData.append(key, JSON.stringify(value));
        } else if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });

      // Handle file uploads for allowed multer fields
      if (vendorData.logoFile instanceof File) {
        formData.append('logo', vendorData.logoFile);
      }
      if (vendorData.gstFile instanceof File) {
        formData.append('gstDocument', vendorData.gstFile);
      }
      if (vendorData.contactPhotoFile instanceof File) {
        formData.append('ownerPhoto', vendorData.contactPhotoFile);
      }

      // Add certification files
      if (vendorData.certificationFiles) {
        let fileIndex = 0;
        Object.entries(vendorData.certificationFiles).forEach(([certId, fileData]: [string, any]) => {
          if (fileData && fileData.file) {
            formData.append('certificationFiles', fileData.file);
            formData.append(`certificationId_${fileIndex}`, certId);
            fileIndex++;
          }
        });
      }

      // Handle factory images. WarehouseDetails stores them slot-keyed
      // (`{ nameBoard: {file,url,name}, ... }`); legacy callers may still
      // pass an array. Always send `existingFactoryImages` (even empty)
      // so the backend can distinguish "admin emptied this section" from
      // "admin didn't touch it" — without this, the backend defaults to
      // `[]` and deletes every factory document on the row. We also tag
      // each preserved URL and each new file upload with its slot id so
      // the backend can keep the descriptive document name.
      if (vendorData.factoryImages) {
        const existingImageUrls: string[] = [];
        const existingSlotIds: string[] = [];
        let newFileIndex = 0;

        const emitSlot = (slotId: string | null, slot: any) => {
          if (!slot) return;
          if (slot.file instanceof File) {
            formData.append('factoryImages', slot.file);
            if (slotId) formData.append(`factoryImageSlot_${newFileIndex}`, slotId);
            newFileIndex++;
          } else if (slot.url) {
            existingImageUrls.push(slot.url);
            existingSlotIds.push(slotId || '');
          }
        };

        if (Array.isArray(vendorData.factoryImages)) {
          // Legacy array shape — no slot identity available.
          vendorData.factoryImages.forEach((image: any) => emitSlot(null, image));
        } else if (typeof vendorData.factoryImages === 'object') {
          Object.entries(vendorData.factoryImages).forEach(([slotId, slot]) =>
            emitSlot(slotId, slot),
          );
        }

        formData.append('existingFactoryImages', JSON.stringify(existingImageUrls));
        existingSlotIds.forEach((slotId, i) => {
          if (slotId) formData.append(`existingFactoryImageSlot_${i}`, slotId);
        });
      }

      // Handle product photos - separate existing URLs from new file uploads
      if (vendorData.productPhotos && vendorData.productPhotos.length > 0) {
        const existingProductPhotoUrls: string[] = [];
        vendorData.productPhotos.forEach((photo: any) => {
          if (photo.isExisting && photo.url) {
            existingProductPhotoUrls.push(photo.url);
          } else if (photo.file instanceof File) {
            formData.append('productPhotos', photo.file);
          }
        });
        if (existingProductPhotoUrls.length > 0) {
          formData.append('existingProductPhotos', JSON.stringify(existingProductPhotoUrls));
        }
      }

      const response = await axiosInstance.put(`/vendors/${vendorId}`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Admin: Create new vendor
  static async createVendorByAdmin(vendorData: any) {
    const token = this.getAdminToken();
    if (!token) {
      throw new Error('No admin authentication token found');
    }

    try {
      const formData = new FormData();

      const skipFields = [
        'certificationFiles', 'logoFile', 'gstFile', 'contactPhotoFile',
        'productPhotos', 'contactPhoto', 'logo', 'gstDocument',
        'sameAsWarehouse', 'expandedCategories', 'factoryImages',
        'existingProductPhotos', 'approvalStatus'
      ];

      Object.keys(vendorData).forEach(key => {
        if (skipFields.includes(key)) return;
        const value = vendorData[key];
        if (typeof value === 'object' && value !== null && !(value instanceof File)) {
          formData.append(key, JSON.stringify(value));
        } else if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });

      if (vendorData.logoFile instanceof File) {
        formData.append('logo', vendorData.logoFile);
      }
      if (vendorData.gstFile instanceof File) {
        formData.append('gstDocument', vendorData.gstFile);
      }
      if (vendorData.contactPhotoFile instanceof File) {
        formData.append('ownerPhoto', vendorData.contactPhotoFile);
      }

      if (vendorData.certificationFiles) {
        let fileIndex = 0;
        Object.entries(vendorData.certificationFiles).forEach(([certId, fileData]: [string, any]) => {
          if (fileData && fileData.file) {
            formData.append('certificationFiles', fileData.file);
            formData.append(`certificationId_${fileIndex}`, certId);
            fileIndex++;
          }
        });
      }

      if (vendorData.factoryImages && vendorData.factoryImages.length > 0) {
        vendorData.factoryImages.forEach((image: any) => {
          if (image.file instanceof File) {
            formData.append('factoryImages', image.file);
          }
        });
      }

      if (vendorData.productPhotos && vendorData.productPhotos.length > 0) {
        vendorData.productPhotos.forEach((photo: any) => {
          if (photo.file instanceof File) {
            formData.append('productPhotos', photo.file);
          }
        });
      }

      const response = await axiosInstance.post('/vendors/admin/create', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Admin: Approve vendor
  static async approveVendor(vendorId: string) {
    const token = this.getAdminToken();
    if (!token) {
      throw new Error('No admin authentication token found');
    }

    try {
      const response = await axiosInstance.put(`/vendors/${vendorId}/approve`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Admin: Reject vendor
  static async rejectVendor(vendorId: string, reason: string) {
    const token = this.getAdminToken();
    if (!token) {
      throw new Error('No admin authentication token found');
    }

    try {
      const response = await axiosInstance.put(`/vendors/${vendorId}/reject`, { reason }, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Super Admin: Confirm vendor approval
  static async confirmApproval(vendorId: string) {
    const token = this.getAdminToken();
    if (!token) throw new Error('No admin authentication token found');
    try {
      const response = await axiosInstance.put(`/vendors/${vendorId}/confirm-approval`, {}, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Super Admin: Cancel vendor approval
  static async cancelApproval(vendorId: string) {
    const token = this.getAdminToken();
    if (!token) throw new Error('No admin authentication token found');
    try {
      const response = await axiosInstance.put(`/vendors/${vendorId}/cancel-approval`, {}, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Super Admin: Confirm vendor rejection
  static async confirmRejection(vendorId: string) {
    const token = this.getAdminToken();
    if (!token) throw new Error('No admin authentication token found');
    try {
      const response = await axiosInstance.put(`/vendors/${vendorId}/confirm-rejection`, {}, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Super Admin: Cancel vendor rejection
  static async cancelRejection(vendorId: string) {
    const token = this.getAdminToken();
    if (!token) throw new Error('No admin authentication token found');
    try {
      const response = await axiosInstance.put(`/vendors/${vendorId}/cancel-rejection`, {}, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Admin: Suspend vendor
  static async suspendVendor(vendorId: string, reason: string) {
    const token = this.getAdminToken();
    if (!token) {
      throw new Error('No admin authentication token found');
    }

    try {
      const response = await axiosInstance.put(`/vendors/${vendorId}/suspend`, { reason }, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Admin: Verify vendor bank details
  static async verifyVendorBankDetails(vendorId: string) {
    const token = this.getAdminToken();
    if (!token) {
      throw new Error('No admin authentication token found');
    }

    try {
      const response = await axiosInstance.put(`/vendors/${vendorId}/verify-bank`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Admin: Assign QC Checker & Create Inspection
  static async assignQc(
    vendorId: string,
    checkerId: string,
    poNumber: string,
    clientName: string,
    scheduledDate: string,
    scheduledTime: string,
    priority: string,
    estimatedDuration: string,
    itemsToInspect: any[]
  ) {
    const token = this.getAdminToken();
    if (!token) {
      throw new Error('No admin authentication token found');
    }

    try {
      const response = await axiosInstance.post(`/inspections/assign`, {
        vendorId,
        checkerId,
        poNumber,
        clientName,
        scheduledDate,
        scheduledTime,
        priority,
        estimatedDuration,
        itemsToInspect
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Admin: Get Inspection by Vendor
  static async getInspectionByVendorId(vendorId: string) {
    const token = this.getAdminToken();
    if (!token) {
      throw new Error('No admin authentication token found');
    }

    try {
      const response = await axiosInstance.get(`/inspections/vendor/${vendorId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Admin: Get single Inspection by ID
  static async getInspectionById(inspectionId: string) {
    const token = this.getAdminToken();
    if (!token) {
      throw new Error('No admin authentication token found');
    }

    try {
      const response = await axiosInstance.get(`/inspections/${inspectionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Admin: Update Inspection
  static async updateInspection(
    inspectionId: string,
    checkerId: string,
    poNumber: string,
    clientName: string,
    scheduledDate: string,
    scheduledTime: string,
    priority: string,
    estimatedDuration: string,
    itemsToInspect: any[]
  ) {
    const token = this.getAdminToken();
    if (!token) {
      throw new Error('No admin authentication token found');
    }

    try {
      const response = await axiosInstance.put(`/inspections/${inspectionId}`, {
        checkerId,
        poNumber,
        clientName,
        scheduledDate,
        scheduledTime,
        priority,
        estimatedDuration,
        itemsToInspect
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Logout vendor
  static logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vendorToken');
      localStorage.removeItem('vendorData');
      dispatchAuthChange();
    }
  }

  // Check if vendor is logged in
  static isLoggedIn(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('vendorToken');
  }

  // Get stored vendor data
  static getStoredVendorData(): VendorProfile | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem('vendorData');
    return data ? JSON.parse(data) : null;
  }

  // ============================================
  // VENDOR SETTINGS API METHODS
  // ============================================

  // Update vendor basic information
  static async updateVendorBasicInfo(basicInfo: VendorBasicInfo) {
    try {
      const response = await axiosInstance.put('/vendor-settings/profile/basic', basicInfo, {
        headers: this.getVendorAuthHeaders(),
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Update vendor owner information
  static async updateVendorOwnerInfo(ownerInfo: VendorOwnerInfo) {
    try {
      const response = await axiosInstance.put('/vendor-settings/profile/owner', ownerInfo, {
        headers: this.getVendorAuthHeaders(),
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Upload vendor logo
  static async uploadVendorLogo(logoFile: File) {
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);

      const response = await axiosInstance.post('/vendor-settings/profile/logo', formData, {
        headers: {
          ...this.getVendorAuthHeadersFormData(),
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Update vendor preferences
  static async updateVendorPreferences(preferences: VendorPreferences) {
    try {
      const response = await axiosInstance.put('/vendor-settings/preferences', preferences, {
        headers: this.getVendorAuthHeaders(),
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get vendor bank details
  static async getVendorBankDetails(): Promise<{ bankDetails: VendorBankDetails | null }> {
    try {
      const response = await axiosInstance.get('/vendor-settings/bank-details', {
        headers: this.getVendorAuthHeaders(),
      });

      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Create or update vendor bank details
  static async upsertVendorBankDetails(bankDetails: VendorBankDetails) {
    try {
      const response = await axiosInstance.put('/vendor-settings/bank-details', bankDetails, {
        headers: this.getVendorAuthHeaders(),
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get vendor documents
  static async getVendorDocuments(): Promise<{ documents: VendorDocument[] }> {
    try {
      const response = await axiosInstance.get('/vendor-settings/documents', {
        headers: this.getVendorAuthHeaders(),
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Upload vendor document
  static async uploadVendorDocument(documentFile: File, type: string, name: string) {
    try {
      const formData = new FormData();
      formData.append('document', documentFile);
      formData.append('type', type);
      formData.append('name', name);

      const response = await axiosInstance.post('/vendor-settings/documents', formData, {
        headers: {
          ...this.getVendorAuthHeadersFormData(),
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Delete vendor document
  static async deleteVendorDocument(documentId: string) {
    try {
      const response = await axiosInstance.delete(`/vendor-settings/documents/${documentId}`, {
        headers: this.getVendorAuthHeaders(),
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Change vendor password
  static async changeVendorPassword(currentPassword: string, newPassword: string, confirmPassword: string) {
    try {
      const response = await axiosInstance.put('/vendor-settings/password', {
        currentPassword,
        newPassword,
        confirmPassword
      }, {
        headers: this.getVendorAuthHeaders(),
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get vendor certifications
  static async getVendorCertifications(): Promise<{ certifications: VendorCertification[] }> {
    try {
      const response = await axiosInstance.get('/vendor-settings/certifications', {
        headers: this.getVendorAuthHeaders(),
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Add vendor certification
  static async addVendorCertification(
    certificationData: Omit<VendorCertification, 'id'>,
    certificateFile?: File
  ) {
    try {
      const formData = new FormData();

      if (certificateFile) {
        formData.append('certificate', certificateFile);
      }

      formData.append('name', certificationData.name);
      formData.append('issuedBy', certificationData.issuedBy);

      if (certificationData.certificateNumber) {
        formData.append('certificateNumber', certificationData.certificateNumber);
      }
      if (certificationData.issuedDate) {
        formData.append('issuedDate', certificationData.issuedDate);
      }
      if (certificationData.expiryDate) {
        formData.append('expiryDate', certificationData.expiryDate);
      }

      const response = await axiosInstance.post('/vendor-settings/certifications', formData, {
        headers: {
          ...this.getVendorAuthHeadersFormData(),
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Update vendor certification
  static async updateVendorCertification(
    certificationId: string,
    certificationData: Partial<Omit<VendorCertification, 'id'>>,
    certificateFile?: File
  ) {
    try {
      const formData = new FormData();

      if (certificateFile) {
        formData.append('certificate', certificateFile);
      }

      if (certificationData.name) {
        formData.append('name', certificationData.name);
      }
      if (certificationData.issuedBy) {
        formData.append('issuedBy', certificationData.issuedBy);
      }
      if (certificationData.certificateNumber) {
        formData.append('certificateNumber', certificationData.certificateNumber);
      }
      if (certificationData.issuedDate) {
        formData.append('issuedDate', certificationData.issuedDate);
      }
      if (certificationData.expiryDate) {
        formData.append('expiryDate', certificationData.expiryDate);
      }

      const response = await axiosInstance.put(`/vendor-settings/certifications/${certificationId}`, formData, {
        headers: {
          ...this.getVendorAuthHeadersFormData(),
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Delete vendor certification
  static async deleteVendorCertification(certificationId: string) {
    try {
      const response = await axiosInstance.delete(`/vendor-settings/certifications/${certificationId}`, {
        headers: this.getVendorAuthHeaders(),
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export default VendorService;