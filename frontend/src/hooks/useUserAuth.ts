import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { userAuthService } from '@/services/userAuthService';

interface User {
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
}

export function useUserAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = userAuthService.getAuthToken();
      
      if (!token) {
        setIsLoading(false);
        setIsAuthenticated(false);
        return;
      }

      // Verify token by fetching current user
      const response = await userAuthService.getCurrentUser();
      
      if (response.success && response.data) {
        setUser(response.data);
        setIsAuthenticated(true);
      } else {
        // Token is invalid, clear auth data
        userAuthService.clearAuthData();
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear invalid auth data
      userAuthService.clearAuthData();
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      const response = await userAuthService.login({ email, password });
      
      if (response.success) {
        userAuthService.storeAuthData(response.data.token, response.data.user, rememberMe);
        setUser(response.data.user);
        setIsAuthenticated(true);
        return { success: true, message: response.message };
      }
      
      return { success: false, message: response.message };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Login failed';
      return { success: false, message: errorMessage };
    }
  };

  const register = async (data: { email: string; password: string; name: string; phoneNumber: string }) => {
    try {
      const response = await userAuthService.register(data);
      return { success: response.success, message: response.message };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Registration failed';
      return { success: false, message: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await userAuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      userAuthService.clearAuthData();
      setUser(null);
      setIsAuthenticated(false);
      router.push('/');
    }
  };

  const updateProfile = async (data: any) => {
    try {
      const response = await userAuthService.updateProfile(data);
      
      if (response.success) {
        setUser(response.data);
        return { success: true, message: 'Profile updated successfully' };
      }
      
      return { success: false, message: 'Failed to update profile' };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Update failed';
      return { success: false, message: errorMessage };
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    checkAuth
  };
}
