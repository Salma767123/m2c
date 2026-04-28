import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { showErrorToast } from './toast-utils';

// Create axios instance with base configuration
const axiosInstance: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // 30 seconds — increased to handle larger payloads (e.g. base64 images)
  withCredentials: true, // Always send httpOnly cookies (enables 7-day admin sessions)
  headers: {
    'Content-Type': 'application/json',
  },
});


// Determine which token to use based on the current page path and API endpoint.
// This prevents cross-role token conflicts when multiple roles are logged in.
const getTokenForRequest = (url?: string): string | null => {
  if (typeof window === 'undefined') return null;

  const path = window.location.pathname;
  const apiUrl = url || '';

  // Admin pages or admin API calls
  if (path.startsWith('/admin') || apiUrl.includes('/admin/')) {
    return localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
  }

  // Vendor pages or vendor API calls
  if (path.startsWith('/vendor') || apiUrl.includes('/vendors/') || apiUrl.includes('/inventory')) {
    return localStorage.getItem('vendorToken') || sessionStorage.getItem('vendorToken');
  }

  // Checker pages or checker API calls
  if (path.startsWith('/checker') || apiUrl.includes('/qc-checkers/')) {
    return localStorage.getItem('checkerToken');
  }

  // Customer/website pages — use user token
  return localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
};

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // If the request already has an explicit Authorization header, don't overwrite it.
    // Services like qcCheckerService and vendorService set their own tokens.
    if (config.headers.Authorization) {
      return config;
    }

    const token = getTokenForRequest(config.url);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    // Handle common HTTP errors
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Check if this is a login attempt - don't redirect for login failures
          const isLoginAttempt = error.config?.url?.includes('/auth/login') ||
            error.config?.url?.includes('/auth/admin/login') ||
            error.config?.url?.includes('/auth/vendor') ||
            error.config?.url?.includes('/vendors/login') ||
            error.config?.url?.includes('/qc-checkers/login');

          if (!isLoginAttempt && typeof window !== 'undefined') {
            // Unauthorized - only clear the current role's tokens, not all roles
            const currentPath = window.location.pathname;

            if (currentPath.startsWith('/admin')) {
              localStorage.removeItem('adminToken');
              localStorage.removeItem('adminUser');
              sessionStorage.removeItem('adminToken');
              sessionStorage.removeItem('adminUser');
              window.location.href = '/admin/login';
            } else if (currentPath.startsWith('/vendor')) {
              localStorage.removeItem('vendorToken');
              localStorage.removeItem('vendorData');
              localStorage.removeItem('vendorUser');
              sessionStorage.removeItem('vendorToken');
              sessionStorage.removeItem('vendorData');
              window.location.href = '/vendor';
            } else if (currentPath.startsWith('/checker')) {
              localStorage.removeItem('checkerToken');
              localStorage.removeItem('checkerData');
              localStorage.removeItem('checkerID');
              window.location.href = '/checker';
            } else {
              localStorage.removeItem('userToken');
              localStorage.removeItem('userData');
              sessionStorage.removeItem('userToken');
              sessionStorage.removeItem('userData');
              window.location.href = '/login';
            }
          }
          break;
        case 403:
          showErrorToast('Access Denied', data?.error || 'You do not have permission to perform this action');
          break;
        case 404:
          // Not found — let the caller decide whether to surface
          break;
        case 500:
          showErrorToast('Server Error', data?.error || 'Internal server error. Please try again.');
          break;
        default:
          break;
      }

      // Return a more user-friendly error without creating a new Error object
      const errorMessage = data?.error || data?.message || `HTTP ${status}`;
      return Promise.reject({ message: errorMessage, status, data });
    } else if (error.request) {
      // Network error
      showErrorToast('Network Error', 'Please check your internet connection.');
      return Promise.reject({ message: 'Network error. Please check your connection.', status: 0, data: null });
    } else {
      return Promise.reject({ message: error.message || 'Request failed', status: 0, data: null });
    }
  }
);

export default axiosInstance;

// Create axios instance with vendor token
export const createVendorAxiosInstance = () => {
  const vendorToken = typeof window !== 'undefined' ? localStorage.getItem('vendorToken') : null;

  return axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      ...(vendorToken && { Authorization: `Bearer ${vendorToken}` })
    },
  });
};

// Create axios instance with admin token
export const createAdminAxiosInstance = () => {
  const adminToken = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');

  return axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      ...(adminToken && { Authorization: `Bearer ${adminToken}` })
    },
  });
};

// Export types for convenience
export type { AxiosResponse, InternalAxiosRequestConfig };