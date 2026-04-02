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

  // Get assigned vendors
  async getAssignedVendors(): Promise<{ success: boolean; data: any[] }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.get('/qc-checkers/vendors', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
  async getAssignedProducts(): Promise<{ success: boolean; data: any[] }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.get('/qc-checkers/products', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch assigned products');
    }
  }

  // Approve Product
  async approveProduct(productId: string, formData?: any): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.post(`/qc-checkers/products/${productId}/approve`, { formData }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to approve product');
    }
  }

  // Reject Product
  async rejectProduct(productId: string, rejectionReason: string, formData?: any): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.post(`/qc-checkers/products/${productId}/reject`, { reason: rejectionReason, formData }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to reject product');
    }
  }

  // ============================
  // QC Checker: Inspection Operations
  // ============================

  // Get Assigned Inspections
  async getInspections(): Promise<{ success: boolean; inspections: any[] }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.get('/inspections', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch assigned inspections');
    }
  }

  // Start an Inspection
  async startInspection(inspectionId: string): Promise<{ success: boolean; message: string; inspection: any }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.post(`/inspections/${inspectionId}/start`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to start inspection');
    }
  }

  // Complete an Inspection
  async completeInspection(inspectionId: string, formData: any): Promise<{ success: boolean; message: string; inspection: any }> {
    try {
      const token = await this.getCheckerToken();
      const response = await axios.post(`/inspections/${inspectionId}/complete`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 120000, // 2 minutes — payload can include multiple base64 images
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to complete inspection');
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
}

export const qcCheckerService = new QCCheckerService();
export default qcCheckerService;
