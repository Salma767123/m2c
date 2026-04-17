import axios from '@/lib/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  async register(data: UserRegisterData): Promise<UserAuthResponse> {
    const response = await axios.post(`${this.baseURL}/register`, data);
    return response.data;
  }

  async login(data: UserLoginData): Promise<UserAuthResponse> {
    try {
      const response = await axios.post(`${this.baseURL}/login`, data);
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.message || 'Invalid credentials';
      throw new Error(errorMessage);
    }
  }

  async googleLogin(data: { googleId: string; email: string; name: string; image?: string }): Promise<UserAuthResponse> {
    try {
      const response = await axios.post(`${this.baseURL}/google-callback`, data);
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.message || 'Google login failed';
      throw new Error(errorMessage);
    }
  }

  async getCurrentUser(): Promise<UserProfileResponse> {
    const response = await axios.get(`${this.baseURL}/me`);
    return response.data;
  }

  async logout(): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${this.baseURL}/logout`);
    return response.data;
  }

  async updateProfile(data: Partial<UserRegisterData>): Promise<UserProfileResponse> {
    const response = await axios.put(`${this.baseURL}/profile`, data);
    return response.data;
  }

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${this.baseURL}/verify-email`, { token });
    return response.data;
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${this.baseURL}/forgot-password`, { email });
    return response.data;
  }

  async resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${this.baseURL}/reset-password`, { token, password });
    return response.data;
  }

  // Store auth token and user data
  async storeAuthData(token: string, user: any, rememberMe: boolean = false): Promise<void> {
    try {
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      await AsyncStorage.setItem('userID', user.id || user._id || '');
      if (rememberMe) {
        await AsyncStorage.setItem('rememberMe', 'true');
      }
    } catch (error) {
      console.error('Failed to store auth data:', error);
    }
  }

  async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('userToken');
    } catch {
      return null;
    }
  }

  async getUserData(): Promise<any | null> {
    try {
      const userData = await AsyncStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  async clearAuthData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(['userToken', 'userData', 'rememberMe', 'userID']);
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken();
    return !!token;
  }
}

export const userAuthService = new UserAuthService();
export default userAuthService;
