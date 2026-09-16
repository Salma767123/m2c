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

  /**
   * Request a reset link for a CUSTOMER account.
   *
   * `userType` is not optional in practice. Without it the backend auto-detects
   * across User → Admin → Vendor → QCChecker, so a staff address typed into the
   * storefront app would send that staff member a reset link through a customer
   * surface. The web passes 'user' here for exactly this reason
   * (frontend/src/components/WebSite/Forgot/Forgot.tsx) — mobile was omitting it.
   */
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${this.baseURL}/forgot-password`, {
      email,
      userType: 'user',
    });
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
      // Always write the flag, never only on true. Writing it conditionally
      // left a stale 'true' behind, so a later sign-in with the box UNchecked
      // still inherited the previous session's "remember me".
      await AsyncStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');
    } catch (error) {
      console.error('Failed to store auth data:', error);
    }
  }

  /**
   * Cold-start gate for the "Remember me" choice.
   *
   * The web gets this for free: unchecked logins go to sessionStorage, which
   * the browser drops when the tab closes. AsyncStorage has no session tier —
   * everything survives a restart — so without this the checkbox would be
   * decorative. Called once from the root layout: if a token was stored
   * without "remember me", the launch that follows is a new session and the
   * token goes.
   */
  async endSessionIfNotRemembered(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const remembered = await AsyncStorage.getItem('rememberMe');
      if (remembered !== 'true') {
        await this.clearAuthData();
      }
    } catch {
      // A storage read failure must never block app start — leaving the
      // session in place is the safe direction to fail.
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
