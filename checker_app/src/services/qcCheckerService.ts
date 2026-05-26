import axios from '../lib/axios';
import axiosLib from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QCCheckerData {
  id: string;
  checkerId: string;
  email: string;
  name: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: string;
  joiningDate: string;
  specialization?: string;
  experience?: number;
  certifications?: string;
  assignedHubId?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  isActive: boolean;
  lastLoginAt?: string;
  assignedVendors: number;
  completedInspections: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQCCheckerData {
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  dateOfBirth?: string;
  joiningDate?: string;
  status?: string;
  specialization?: string;
  experience?: string;
  certifications?: string;
  assignedHubId?: string;
}

export interface QCCheckerLoginData {
  checkerId: string;
  password: string;
}

export interface QCCheckerLoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    checker: {
      id: string;
      checkerId: string;
      email: string;
      name: string;
      phone: string;
      status: string;
      specialization?: string;
      assignedHubId?: string;
    };
  };
}

class QCCheckerService {
  // ============================
  // Admin: CRUD Operations
  // ============================

  // Create a new QC Checker (Admin)
  async createQCChecker(data: CreateQCCheckerData): Promise<{ success: boolean; message: string; data: QCCheckerData }> {
    try {
      const response = await axios.post('/qc-checkers', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create QC checker');
    }
  }

  // Get all QC Checkers (Admin)
  async getAllQCCheckers(params?: { status?: string; search?: string }): Promise<{ success: boolean; data: QCCheckerData[]; pagination: any }> {
    try {
      const response = await axios.get('/qc-checkers', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch QC checkers');
    }
  }

  // Get QC Checker by ID (Admin)
  async getQCCheckerById(id: string): Promise<{ success: boolean; data: QCCheckerData }> {
    try {
      const response = await axios.get(`/qc-checkers/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch QC checker');
    }
  }

  // Update QC Checker (Admin)
  async updateQCChecker(id: string, data: Partial<CreateQCCheckerData>): Promise<{ success: boolean; message: string; data: QCCheckerData }> {
    try {
      const response = await axios.put(`/qc-checkers/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update QC checker');
    }
  }

  // Delete QC Checker (Admin)
  async deleteQCChecker(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.delete(`/qc-checkers/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete QC checker');
    }
  }

  // Resend credentials (Admin)
  async resendCredentials(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.post(`/qc-checkers/${id}/resend-credentials`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to resend credentials');
    }
  }

  // ============================
  // QC Checker: Auth Operations
  // ============================

  // Login
  async login(data: QCCheckerLoginData): Promise<QCCheckerLoginResponse> {
    try {
      // Using a basic fallback if env is not defined in rn
      const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api';
      const response = await axiosLib.post(`${baseURL}/qc-checkers/login`, data, {
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Login failed';
      throw new Error(errorMessage);
    }
  }

  // Get current checker profile
  async getCheckerProfile(): Promise<{ success: boolean; data: QCCheckerData }> {
    try {
      const response = await axios.get('/qc-checkers/me');
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch profile');
    }
  }

  // Update current checker profile
  async updateProfile(data: Partial<{
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    password?: string;
  }>): Promise<{ success: boolean; message: string; data: QCCheckerData }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.put('/qc-checkers/me', data, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to update profile');
    }
  }

  // Get assigned vendors
  async getAssignedVendors(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    success: boolean;
    data: {
      vendors: any[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    };
  }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.get('/qc-checkers/vendors', {
        headers: { 'Authorization': `Bearer ${token}` },
        params,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch assigned vendors');
    }
  }

  // Approve Vendor
  async approveVendor(vendorId: string): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.post(`/qc-checkers/vendors/${vendorId}/approve`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to approve vendor');
    }
  }

  // Get full vendor details (full vendor record + stats + recent inspections)
  async getVendorDetails(vendorId: string, historyLimit?: number): Promise<{
    success: boolean;
    data: {
      vendor: any;
      stats: any;
      recentInspections: any[];
      upcomingInspections?: any[];
      recentInspectionsMeta?: { total: number; returned: number; hasMore: boolean };
    };
  }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.get(`/qc-checkers/vendors/${vendorId}/details`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: historyLimit ? { historyLimit } : undefined,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch vendor details');
    }
  }

  // Get active inspection for a vendor (includes vendor record for autofill)
  async getActiveInspectionForVendor(
    vendorId: string
  ): Promise<{ success: boolean; inspection: any | null }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.get(
        `/qc-checkers/vendors/${vendorId}/active-inspection`,
        { headers: { 'Authorization': `Bearer ${token}` } },
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error?.message || 'Failed to fetch active inspection');
    }
  }

  // Reject Vendor
  async rejectVendor(vendorId: string, reason: string): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.post(`/qc-checkers/vendors/${vendorId}/reject`, { reason }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to reject vendor');
    }
  }
  // ============================
  // QC Checker: Products Operations
  // ============================

  // Get assigned products
  async getAssignedProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    success: boolean;
    data: {
      products: any[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    };
  }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.get('/qc-checkers/products', {
        headers: { 'Authorization': `Bearer ${token}` },
        params,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch assigned products');
    }
  }

  // Get product reports (inspected products — QC_APPROVED / REJECTED)
  async getProductReports(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    success: boolean;
    data: {
      products: any[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    };
  }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.get('/qc-checkers/products/reports', {
        headers: { 'Authorization': `Bearer ${token}` },
        params,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch product reports');
    }
  }

  // Get product details for QC checker view
  async getProductDetails(productId: string): Promise<{ success: boolean; data: { product: any } }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.get(`/qc-checkers/products/${productId}/details`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch product details');
    }
  }

  // Start Product Inspection — pre-flight GPS check that mirrors
  // startInspection (factory). Verifies the checker is at the vendor's
  // factory before the form opens, so the backend can log the geofence at
  // the moment the inspection begins. No state change on the product.
  async startProductInspection(
    productId: string,
    location?: { latitude: number | null; longitude: number | null } | null,
  ): Promise<{ success: boolean; message: string; locationVerification?: { verified: boolean; distanceMeters: number; thresholdMeters: number } }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.post(
        `/qc-checkers/products/${productId}/start`,
        {
          checkerLatitude: location?.latitude ?? null,
          checkerLongitude: location?.longitude ?? null,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return response.data;
    } catch (error: any) {
      // Preserve the full error response for location-specific error handling
      const errData = error?.response?.data || error?.data;
      const err: any = new Error(errData?.message || error.message || 'Failed to start product inspection');
      err.status = error?.response?.status || error?.status;
      err.data = errData;
      throw err;
    }
  }

  // Approve Product — requires GPS so the backend can verify the checker
  // is at the vendor's factory (same geofence as startInspection).
  async approveProduct(
    productId: string,
    formData?: any,
    location?: { latitude: number | null; longitude: number | null } | null,
  ): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.post(
        `/qc-checkers/products/${productId}/approve`,
        {
          formData,
          checkerLatitude: location?.latitude ?? null,
          checkerLongitude: location?.longitude ?? null,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return response.data;
    } catch (error: any) {
      // Preserve the full error response for location-specific error handling
      const errData = error?.response?.data || error?.data;
      const err: any = new Error(errData?.message || error.message || 'Failed to approve product');
      err.status = error?.response?.status || error?.status;
      err.data = errData;
      throw err;
    }
  }

  // Reject Product — requires GPS so the backend can verify the checker
  // is at the vendor's factory (same geofence as startInspection).
  async rejectProduct(
    productId: string,
    rejectionReason: string,
    formData?: any,
    location?: { latitude: number | null; longitude: number | null } | null,
  ): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.post(
        `/qc-checkers/products/${productId}/reject`,
        {
          reason: rejectionReason,
          formData,
          checkerLatitude: location?.latitude ?? null,
          checkerLongitude: location?.longitude ?? null,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return response.data;
    } catch (error: any) {
      const errData = error?.response?.data || error?.data;
      const err: any = new Error(errData?.message || error.message || 'Failed to reject product');
      err.status = error?.response?.status || error?.status;
      err.data = errData;
      throw err;
    }
  }

  // ============================
  // QC Checker: Inspection Operations
  // ============================

  // Get Assigned Inspections
  async getInspections(params?: {
    page?: number;
    limit?: number;
    search?: string;
    result?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    success: boolean;
    inspections: any[];
    pagination?: { total: number; page: number; limit: number; totalPages: number };
  }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.get('/inspections', {
        headers: { 'Authorization': `Bearer ${token}` },
        params,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch assigned inspections');
    }
  }

  // Start an Inspection (requires GPS location for proximity verification)
  async startInspection(
    inspectionId: string,
    location?: { latitude: number; longitude: number } | null,
  ): Promise<{ success: boolean; message: string; inspection: any; locationVerification?: any }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.post(`/inspections/${inspectionId}/start`, {
        checkerLatitude: location?.latitude ?? null,
        checkerLongitude: location?.longitude ?? null,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      // Preserve the full error response for location-specific error handling
      const errData = error?.response?.data || error?.data;
      const err: any = new Error(errData?.message || error.message || 'Failed to start inspection');
      err.status = error?.response?.status || error?.status;
      err.data = errData;
      throw err;
    }
  }

  // Complete an Inspection — also runs the submit-time geofence so the
  // checker has to STILL be at the vendor factory when submitting (not just
  // when they started). Mirrors approveProduct/rejectProduct.
  async completeInspection(
    inspectionId: string,
    formData: any,
    location?: { latitude: number | null; longitude: number | null } | null,
  ): Promise<{ success: boolean; message: string; inspection: any }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.post(
        `/inspections/${inspectionId}/complete`,
        {
          ...formData,
          checkerLatitude: location?.latitude ?? null,
          checkerLongitude: location?.longitude ?? null,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 120000, // 2 minutes — payload can include multiple base64 images
        },
      );
      return response.data;
    } catch (error: any) {
      // Preserve the full error response for location-specific error handling
      const errData = error?.response?.data || error?.data;
      const err: any = new Error(errData?.message || error.message || 'Failed to complete inspection');
      err.status = error?.response?.status || error?.status;
      err.data = errData;
      throw err;
    }
  }

  // Get a single completed inspection report (own only)
  async getMyInspectionById(inspectionId: string): Promise<{ success: boolean; inspection: any }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.get(`/inspections/${inspectionId}/my-report`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch inspection report');
    }
  }

  // ============================
  // Local Storage Helpers
  // ============================

  async storeCheckerAuth(token: string, checker: any): Promise<void> {
    try {
      await AsyncStorage.setItem('checkerToken', token);
      await AsyncStorage.setItem('checkerData', JSON.stringify(checker));
      await AsyncStorage.setItem('checkerID', checker.checkerId);
    } catch (error) {
      console.error('Failed to store checker auth data:', error);
    }
  }

  async getCheckerToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('checkerToken');
    } catch {
      return null;
    }
  }

  async getCheckerData(): Promise<any | null> {
    try {
      const data = await AsyncStorage.getItem('checkerData');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async clearCheckerAuth(): Promise<void> {
    try {
      await AsyncStorage.removeItem('checkerToken');
      await AsyncStorage.removeItem('checkerData');
      await AsyncStorage.removeItem('checkerID');
    } catch (error) {
      console.error('Failed to clear checker auth data:', error);
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getCheckerToken();
    return !!token;
  }

  // ── Re-inspection audit trail ──────────────────────────────────────────────

  async getAuditTrail(entityType: 'FACTORY_INSPECTION' | 'PRODUCT_INSPECTION', entityId: string) {
    const response = await axios.get(`/reinspections/${entityType}/${entityId}/audit-trail`);
    return response.data as {
      success: boolean;
      logs: AuditLogEntry[];
      inspectionChain: InspectionChainItem[];
    };
  }
}

// ── Audit trail types ──────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  performedById: string;
  performedByType: string;
  performedByName: string | null;
  rejectionReason: string | null;
  remarks: string | null;
  notes: string | null;
  locationDetails: string | null;
  attachments: string[];
  cycleNumber: number;
  createdAt: string;
}

export interface InspectionChainItem {
  id: string;
  status: string;
  result: string | null;
  cycleNumber: number;
  parentInspectionId: string | null;
  scheduledDate: string;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  checker: { id: string; name: string };
}

export const qcCheckerService = new QCCheckerService();
export default qcCheckerService;
