import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// Create axios instance with base configuration
const axiosInstance: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // 30 seconds — increased to handle larger payloads (e.g. base64 images)
  withCredentials: true, // Always send httpOnly cookies (enables 7-day admin sessions)
  headers: {
    'Content-Type': 'application/json',
  },
});


// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage or sessionStorage
    // Check for admin token first, then vendor token, then checker token, then user token
    const adminToken = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    const vendorToken = localStorage.getItem('vendorToken');
    const checkerToken = localStorage.getItem('checkerToken');
    const userToken = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');

    const token = adminToken || vendorToken || checkerToken || userToken;

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

          if (!isLoginAttempt) {
            // Unauthorized - clear tokens and redirect to login (only for authenticated requests)
            localStorage.removeItem('adminToken');
            sessionStorage.removeItem('adminToken');
            localStorage.removeItem('vendorToken');
            localStorage.removeItem('vendorData');
            localStorage.removeItem('checkerToken');
            localStorage.removeItem('checkerData');
            localStorage.removeItem('checkerID');
            localStorage.removeItem('userToken');
            sessionStorage.removeItem('userToken');
            localStorage.removeItem('userData');
            sessionStorage.removeItem('userData');
            if (typeof window !== 'undefined') {
              // Redirect based on current path
              const currentPath = window.location.pathname;
              if (currentPath.includes('/admin')) {
                window.location.href = '/admin/login';
              } else if (currentPath.includes('/vendor')) {
                window.location.href = '/vendor';
              } else if (currentPath.includes('/checker')) {
                window.location.href = '/checker';
              } else {
                window.location.href = '/login';
              }
            }
          }
          break;
        case 403:
          // Forbidden
          console.error('Access forbidden:', data?.error || 'Insufficient permissions');
          break;
        case 404:
          // Not found
          console.error('Resource not found:', data?.error || 'The requested resource was not found');
          break;
        case 500:
          // Server error
          console.error('Server error:', data?.error || 'Internal server error');
          break;
        default:
          console.error('API Error:', data?.error || `HTTP ${status}`);
      }

      // Return a more user-friendly error without creating a new Error object
      const errorMessage = data?.error || data?.message || `HTTP ${status}`;
      return Promise.reject({ message: errorMessage, status, data });
    } else if (error.request) {
      // Network error
      console.error('Network error:', error.message);
      return Promise.reject({ message: 'Network error. Please check your connection.', status: 0, data: null });
    } else {
      // Other error
      console.error('Request error:', error.message);
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