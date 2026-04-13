import axios from '@/lib/axios';

export interface UserRegisterData {
  email: string;
  password: string;
  name: string;
  phoneNumber: string;
}

export interface UserLoginData {
  email: string;
  password: string;
}

export interface UserAuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: 'user' | 'admin';
      image?: string;
      isVerified: boolean;
      phoneNumber?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
      dateOfBirth?: string;
    };
  };
}

export interface UserProfileResponse {
  success: boolean;
  data: {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
    image?: string;
    isVerified: boolean;
    phoneNumber?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    dateOfBirth?: string;
  };
}

class UserAuthService {
  private baseURL = '/auth';

  // Register new user
  async register(data: UserRegisterData): Promise<UserAuthResponse> {
    const response = await axios.post(`${this.baseURL}/register`, data);
    return response.data;
  }

  // Login user
  async login(data: UserLoginData): Promise<UserAuthResponse> {
    try {
      const response = await axios.post(`${this.baseURL}/login`, data);
      return response.data;
    } catch (error: any) {
      // Re-throw with full error data preserved (code, status, etc.)
      throw error;
    }
  }

  // Get current user profile
  async getCurrentUser(): Promise<UserProfileResponse> {
    const response = await axios.get(`${this.baseURL}/me`);
    return response.data;
  }

  // Logout user
  async logout(): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${this.baseURL}/logout`);
    return response.data;
  }

  // Update user profile
  async updateProfile(data: Partial<UserRegisterData>): Promise<UserProfileResponse> {
    const response = await axios.put(`${this.baseURL}/profile`, data);
    return response.data;
  }

  // Verify email
  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${this.baseURL}/verify-email`, { token });
    return response.data;
  }

  // Forgot password
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${this.baseURL}/forgot-password`, { email });
    return response.data;
  }

  // Reset password
  async resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${this.baseURL}/reset-password`, { token, password });
    return response.data;
  }

  // Google OAuth login
  initiateGoogleLogin(): void {
    const backendURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    // Remove /api from the end if it exists, then add the full path
    const baseURL = backendURL.replace(/\/api$/, '');
    window.location.href = `${baseURL}/api/auth/google`;
  }

  // Store auth token and user data
  storeAuthData(token: string, user: any, rememberMe: boolean = false): void {
    if (typeof window === 'undefined') return;
    try {
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('userToken', token);
      storage.setItem('userData', JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store auth data:', error);
    }
  }

  // Get stored auth token
  getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
    } catch {
      return null;
    }
  }

  // Get stored user data
  getUserData(): any | null {
    if (typeof window === 'undefined') return null;
    try {
      const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  // Clear auth data
  clearAuthData(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      sessionStorage.removeItem('userToken');
      sessionStorage.removeItem('userData');
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!this.getAuthToken();
  }
}

export const userAuthService = new UserAuthService();
export default userAuthService;
