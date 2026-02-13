import { getStoredAuth, authenticatedFetch } from '@/lib/auth'
import axiosInstance from '@/lib/axios'

// Vendor Service for API integration

export interface VendorRegistrationData {
  // Company Details
  businessType: string;
  companyName: string;
  gstNumber?: string;
  email: string;
  phone: string;
  website?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  
  // Owner Profile
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  yearEstablished: string;
  employeeCount: string;
  
  // Warehouse Details
  ownershipType: string;
  warehouseAddress: string;
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
  
  // Manufacturing Facilities
  enabledFacilities?: Record<string, boolean>;
  facilityDetails?: Record<string, any>;
  
  // Certifications & Logistics
  selectedCertifications: string[];
  certificationExpiryDates: Record<string, string>;
  qualityControlProcess?: string;
  complianceStandards?: string;
  packagingCapabilities?: string;
  warehousingCapacity?: string;
  logisticsPartners?: string;
  shippingMethods: string[];
  
  // Contact & Trade Info
  mainContact: {
    name: string;
    designation: string;
    email1: string;
    email2?: string;
    phone1: string;
    phone2?: string;
    department: string;
  };
  alternateContacts: any[];
  hasImportExport: string;
  importCountries: string[];
  exportCountries: string[];
  tradeLicenseNumber?: string;
  businessRegistrationNumber?: string;
  taxIdentificationNumber?: string;
  bankingDetails?: {
    bankName: string;
    accountNumber: string;
    swiftCode: string;
  };
  
  // Password
  password: string;
}

export interface VendorFiles {
  logo?: File;
  gstDocument?: File;
  ownerPhoto?: File;
  factoryImages?: File[];
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
  status: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  businessCity: string;
  businessState: string;
  businessCountry: string;
  website?: string;
  establishedYear?: number;
  vendorType: string;
  productCategories: string[];
  productTypes: string[];
  specializations: string[];
  annualTurnover?: string;
  exportExperience?: boolean;
  exportCountries?: string[];
  primaryMarkets?: string[];
  factoryAddress?: string;
  factoryCity?: string;
  factoryState?: string;
  factorySize?: string;
  productionCapacity?: string;
  qualityControl?: string;
  warehouseAddress?: string;
  warehouseCity?: string;
  warehouseState?: string;
  warehouseSize?: string;
  storageCapacity?: string;
  shippingMethods?: string[];
  deliveryTime?: string;
  minimumOrderQuantity?: string;
  paymentTerms?: string[];
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  suspendedAt?: string;
  rejectionReason?: string;
  certifications: any[];
  documents: any[];
  bankDetails?: any;
  references: any[];
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
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  search?: string;
  page?: number;
  limit?: number;
}

// Vendor Settings Interfaces
export interface VendorBasicInfo {
  companyName: string;
  companyDescription?: string;
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
    if (files.ownerPhoto) {
      form.append('ownerPhoto', files.ownerPhoto);
    }
    if (files.factoryImages && files.factoryImages.length > 0) {
      files.factoryImages.forEach(file => {
        form.append('factoryImages', file);
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
      console.error('Vendor registration error:', error);
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
      }
      
      return data;
    } catch (error: any) {
      // The axios interceptor returns a custom error object: { message, status, data }
      // Also handle standard axios error structure for backward compatibility
      let errorMessage = 'Invalid credentials';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.data?.error) {
        errorMessage = error.data.error;
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      }
      
      console.error('Vendor login error:', { error, errorMessage });
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
      console.error('Get vendor profile error:', error);
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
      console.error('Update vendor profile error:', error);
      throw error;
    }
  }

  // Admin: Get all vendors with filters
  static async getAllVendors(filters: VendorFilters = {}): Promise<VendorsListResponse> {
    const token = this.getAdminToken();
    console.log('Admin token check:', token ? 'Token found' : 'No token found');
    
    if (!token) {
      throw new Error('No admin authentication token found');
    }

    const queryParams = new URLSearchParams();
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.page) queryParams.append('page', filters.page.toString());
    if (filters.limit) queryParams.append('limit', filters.limit.toString());

    const url = `/vendors/all?${queryParams.toString()}`;
    console.log('Making request to:', url);

    try {
      const response = await axiosInstance.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('Response status:', response.status);
      console.log('Vendors data received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Get all vendors error:', error);
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
      console.error('Get vendor by ID error:', error);
      throw error;
    }
  }

  // Admin: Update vendor by ID
  static async updateVendorById(vendorId: string, vendorData: any) {
    const token = this.getAdminToken();
    console.log('updateVendorById - Admin token:', token ? 'Found' : 'Not found');
    
    if (!token) {
      throw new Error('No admin authentication token found');
    }

    try {
      console.log('updateVendorById - Sending request to:', `/vendors/${vendorId}`);
      console.log('updateVendorById - Data:', vendorData);
      
      // Prepare FormData for file uploads
      const formData = new FormData();
      
      // Add all form fields
      Object.keys(vendorData).forEach(key => {
        const value = vendorData[key];
        
        // Skip certificationFiles as we'll handle them separately
        if (key === 'certificationFiles') {
          return;
        }
        
        // Handle different data types
        if (typeof value === 'object' && value !== null && !(value instanceof File)) {
          formData.append(key, JSON.stringify(value));
        } else if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });
      
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
      
      const response = await axiosInstance.put(`/vendors/${vendorId}`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('updateVendorById - Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Update vendor by ID error:', error);
      console.error('Error response:', error.response?.data);
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
      console.error('Approve vendor error:', error);
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
      console.error('Reject vendor error:', error);
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
      console.error('Suspend vendor error:', error);
      throw error;
    }
  }
  
  // Logout vendor
  static logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vendorToken');
      localStorage.removeItem('vendorData');
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
      console.error('Update vendor basic info error:', error);
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
      console.error('Update vendor owner info error:', error);
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
      console.error('Upload vendor logo error:', error);
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
      console.error('Update vendor preferences error:', error);
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
      if (error.response?.status === 404) {
        // Return null for bank details if not found, don't throw error
        return { bankDetails: null };
      }
      console.error('Get vendor bank details error:', error);
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
      console.error('Upsert vendor bank details error:', error);
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
      console.error('Get vendor documents error:', error);
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
      console.error('Upload vendor document error:', error);
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
      console.error('Delete vendor document error:', error);
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
      console.error('Change vendor password error:', error);
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
      console.error('Get vendor certifications error:', error);
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
      console.error('Add vendor certification error:', error);
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
      console.error('Update vendor certification error:', error);
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
      console.error('Delete vendor certification error:', error);
      throw error;
    }
  }
}

export default VendorService;