import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// Create axios instance with base configuration
const axiosInstance: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage or sessionStorage
    // Check for admin token first, then vendor token
    const adminToken = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    const vendorToken = localStorage.getItem('vendorToken');
    
    const token = adminToken || vendorToken;
    
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
          // Unauthorized - clear tokens and redirect to login
          localStorage.removeItem('adminToken');
          sessionStorage.removeItem('adminToken');
          localStorage.removeItem('vendorToken');
          localStorage.removeItem('vendorData');
          if (typeof window !== 'undefined') {
            // Redirect based on current path
            const currentPath = window.location.pathname;
            if (currentPath.includes('/admin')) {
              window.location.href = '/admin/login';
            } else if (currentPath.includes('/vendor')) {
              window.location.href = '/vendor/login';
            } else {
              window.location.href = '/login';
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
      
      // Return a more user-friendly error
      const errorMessage = data?.error || data?.message || `HTTP ${status}`;
      return Promise.reject(new Error(errorMessage));
    } else if (error.request) {
      // Network error
      console.error('Network error:', error.message);
      return Promise.reject(new Error('Network error. Please check your connection.'));
    } else {
      // Other error
      console.error('Request error:', error.message);
      return Promise.reject(error);
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