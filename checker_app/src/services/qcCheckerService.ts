import axios from '../lib/axios';
import axiosLib from 'axios';
import { API_BASE_URL } from '../lib/apiBase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QCCheckerData {
  id: string;
  checkerId: string;
  email: string;
  name: string;
  // Optional web-parity fields (present on the /qc-checkers/me payload).
  title?: string | null;
  profilePhoto?: string | null;
  alternateEmail?: string | null;
  alternatePhone?: string | null;
  idProof?: string | null;
  // Lightweight profile fetch (?light=1) omits the heavy base64 idProof blob and
  // returns these instead; the blob is fetched on demand via getCheckerIdProof().
  hasIdProof?: boolean;
  idProofType?: 'pdf' | 'image' | null;
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
      const baseURL = API_BASE_URL || 'http://10.0.2.2:5000/api';
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
      // ?light=1 strips the heavy base64 idProof blob (a multi-MB PDF) so the
      // profile screen loads fast on slow mobile connections. The ID proof is
      // fetched on demand (getCheckerIdProof) only when the user taps "View".
      // profilePhoto is kept (it's the avatar shown on the profile screen).
      const response = await axios.get('/qc-checkers/me', { params: { light: 1 } });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch profile');
    }
  }

  // Fetch the current checker's ID proof (base64 data-URI or URL) on demand.
  async getCheckerIdProof(): Promise<{ success: boolean; data: { idProof: string | null } }> {
    try {
      const response = await axios.get('/qc-checkers/me/id-proof');
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch ID proof');
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

  // Category tree — used only to resolve the category IDs stored in a vendor's
  // categoryProducts into display names. The route is optionalAuth on the
  // backend, but the token is sent anyway so the request is attributable.
  //
  // Resolves to [] on failure rather than throwing: a missing name degrades a
  // label to "Category", which must never block the inspection form.
  async getCategoryTree(): Promise<any[]> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.get('/categories/tree', {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: 'ACTIVE', includeInactive: false },
      });
      return response.data?.data || [];
    } catch {
      return [];
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

  // Ensure an inspection exists for the vendor — creates one if none is active.
  // Returns the existing or newly-created inspection. Throws with status 409 if
  // already submitted/under review, or 403 if vendor is not assigned.
  async beginInspection(
    vendorId: string
  ): Promise<{ success: boolean; inspection: any; created: boolean }> {
    try {
      const token = await this.getCheckerToken();
      if (!token) throw new Error('Not authenticated as checker');
      const response = await axios.post(
        `/qc-checkers/vendors/${vendorId}/begin-inspection`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } },
      );
      return response.data;
    } catch (error: any) {
      // Preserve status/data so callers can handle 409 (already submitted) / 403
      const errData = error?.response?.data || error?.data;
      const err: any = new Error(
        errData?.error || errData?.message || error.message || 'Failed to begin inspection',
      );
      err.status = error?.response?.status || error?.status;
      err.data = errData;
      throw err;
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

  // Send a verification test email to a vendor contact address — lets the
  // checker confirm the address is reachable during vendor inspection.
  // Same endpoint/shape as web (POST /qc-checkers/send-test-email). The axios
  // interceptor attaches the checker bearer token automatically.
  async sendTestEmail(email: string, vendorName?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.post('/qc-checkers/send-test-email', { email, vendorName });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send test email');
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
      // Geofence details (403 Location mismatch) so the caller can show the gap.
      err.distanceMeters = errData?.distanceMeters;
      err.thresholdMeters = errData?.thresholdMeters;
      throw err;
    }
  }

  // Approve Product — requires GPS so the backend can verify the checker
  // is at the vendor's factory (same geofence as startInspection).
  async approveProduct(
    productId: string,
    formData?: any,
    location?: { latitude: number | null; longitude: number | null } | null,
    inspectionType?: 'PHYSICAL' | 'VIRTUAL',
  ): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.post(
        `/qc-checkers/products/${productId}/approve`,
        {
          formData,
          inspectionType,
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
    inspectionType?: 'PHYSICAL' | 'VIRTUAL',
  ): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.post(
        `/qc-checkers/products/${productId}/reject`,
        {
          reason: rejectionReason,
          formData,
          inspectionType,
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
    status?: string;
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

  /**
   * Request a password-reset email for a QC checker.
   *
   * `userType: 'checker'` is required — without it the backend auto-detects and
   * searches user → admin → vendor, never reaching the qc_checkers table.
   *
   * The reset link in the email points at the web portal (the backend builds it
   * from FRONTEND_URL), so the checker finishes the reset in a browser.
   */
  async forgotPassword(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await axios.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
        userType: 'checker',
      });
      return response.data;
    } catch (error: any) {
      // The shared interceptor rejects with a FLAT shape ({ message, status, data })
      // — there is no `.response`. Read that first, then fall back to a raw axios
      // error, so the status survives for the caller.
      const data = error?.data || error?.response?.data || {};
      const err: any = new Error(data.error || data.message || error?.message || 'Failed to send reset email');
      err.status = error?.status ?? error?.response?.status;
      throw err;
    }
  }

  /**
   * Complete a password reset with the token from the reset email.
   * No userType needed — the backend finds the owner by token, checking the
   * qc_checkers table among the others.
   */
  async resetPassword(token: string, password: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await axios.post('/auth/reset-password', { token, password });
      return response.data;
    } catch (error: any) {
      // Flat interceptor shape first — see forgotPassword.
      const data = error?.data || error?.response?.data || {};
      const err: any = new Error(data.error || data.message || error?.message || 'Failed to reset password');
      err.status = error?.status ?? error?.response?.status;
      throw err;
    }
  }

  /**
   * Save a server-side draft (pause) of an in-progress inspection so the
   * half-filled form survives a reinstall or a device change — and, just as
   * importantly, so the backend stamps `pausedAt`. Without that call the paused
   * time is never folded into `totalPausedMs` and the report's active/paused
   * split is wrong. Mirrors the web portal's saveInspectionDraft.
   */
  async saveInspectionDraft(
    inspectionId: string,
    draftData: any,
  ): Promise<{ success: boolean; message: string; inspection: any }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.post(
        `/inspections/${inspectionId}/draft`,
        { draftData },
        {
          headers: { Authorization: `Bearer ${token}` },
          // The snapshot can carry base64 evidence images.
          timeout: 120000,
        },
      );
      return response.data;
    } catch (error: any) {
      // Flat interceptor shape first — see forgotPassword. Without this the status
      // and code were dropped, so callers could not tell an expired window from a
      // storage failure.
      const data = error?.data || error?.response?.data || {};
      const err: any = new Error(data.message || data.error || error?.message || 'Failed to save draft');
      err.status = error?.status ?? error?.response?.status;
      err.code = data.code;
      throw err;
    }
  }

  // Start an Inspection (requires GPS location for proximity verification)
  async startInspection(
    inspectionId: string,
    location?: { latitude: number; longitude: number } | null,
    // PHYSICAL / VIRTUAL. The backend skips the geofence entirely for a VIRTUAL
    // inspection, so omitting this made every app inspection look PHYSICAL — and
    // therefore fail the location check it can never satisfy without GPS.
    inspectionType?: 'PHYSICAL' | 'VIRTUAL',
    discardDraft?: boolean,
  ): Promise<{ success: boolean; message: string; inspection: any; locationVerification?: any }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.post(`/inspections/${inspectionId}/start`, {
        checkerLatitude: location?.latitude ?? null,
        checkerLongitude: location?.longitude ?? null,
        inspectionType,
        discardDraft,
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
      err.code = errData?.code;
      // Geofence details (403 Location mismatch) so the caller can show the gap.
      err.distanceMeters = errData?.distanceMeters;
      err.thresholdMeters = errData?.thresholdMeters;
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
    inspectionType?: 'PHYSICAL' | 'VIRTUAL',
  ): Promise<{ success: boolean; message: string; inspection: any }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.post(
        `/inspections/${inspectionId}/complete`,
        {
          ...formData,
          checkerLatitude: location?.latitude ?? null,
          checkerLongitude: location?.longitude ?? null,
          // Same reason as startInspection: without this the submit-time geofence
          // treats every inspection as PHYSICAL and rejects it for missing GPS.
          inspectionType,
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
