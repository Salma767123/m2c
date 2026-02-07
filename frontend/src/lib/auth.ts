// Authentication utilities for admin dashboard

export interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  image?: string
  isVerified?: boolean
  phoneNumber?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  dateOfBirth?: string
  currency?: string
  companyName?: string
  gstNumber?: string
  onboardingCompleted?: boolean
}

export interface AuthTokens {
  token: string
  user: AdminUser
}

// Storage keys
const TOKEN_KEY = 'adminToken'
const USER_KEY = 'adminUser'

// Get stored authentication data
export function getStoredAuth(): AuthTokens | null {
  try {
    // Ensure we're in browser environment
    if (typeof window === 'undefined') {
      return null
    }
    
    // Check sessionStorage first, then localStorage
    let token = sessionStorage.getItem(TOKEN_KEY)
    let userStr = sessionStorage.getItem(USER_KEY)
    
    if (!token || !userStr) {
      token = localStorage.getItem(TOKEN_KEY)
      userStr = localStorage.getItem(USER_KEY)
    }
    
    if (!token || !userStr) {
      return null
    }
    
    const user = JSON.parse(userStr)
    
    // Validate user object has required properties
    if (!user || !user.id || !user.role) {
      console.warn('Invalid user data found in storage')
      return null
    }
    
    return { token, user }
  } catch (error) {
    console.error('Error getting stored auth:', error)
    return null
  }
}

// Store authentication data
export function storeAuth(token: string, user: AdminUser, remember: boolean = false): void {
  try {
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } else {
      sessionStorage.setItem(TOKEN_KEY, token)
      sessionStorage.setItem(USER_KEY, JSON.stringify(user))
    }
  } catch (error) {
    console.error('Error storing auth:', error)
  }
}

// Clear authentication data
export function clearAuth(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch (error) {
    console.error('Error clearing auth:', error)
  }
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  try {
    const auth = getStoredAuth()
    if (!auth || !auth.user || !auth.user.role) {
      return false
    }
    return auth.user.role.toLowerCase() === 'admin'
  } catch (error) {
    console.error('Error in isAuthenticated:', error)
    return false
  }
}

// Get authorization header for API calls
export function getAuthHeader(): Record<string, string> {
  const auth = getStoredAuth()
  if (!auth) {
    return {}
  }
  
  return {
    'Authorization': `Bearer ${auth.token}`
  }
}

// API call wrapper with authentication
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const authHeaders = getAuthHeader()
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Include httpOnly cookies
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
  })
  
  // If unauthorized, clear auth and redirect to login (but not for login attempts)
  if (response.status === 401) {
    const isLoginAttempt = url.includes('/auth/login') || 
                          url.includes('/auth/admin/login') ||
                          url.includes('/auth/vendor') ||
                          url.includes('/vendors/login');
    
    if (!isLoginAttempt) {
      clearAuth()
      window.location.href = '/admin/login'
    }
  }
  
  return response
}

import axiosInstance from './axios'

// Logout function
export async function logout(): Promise<void> {
  try {
    const auth = getStoredAuth()
    if (auth) {
      // Call backend logout endpoint with credentials for httpOnly cookies
      await axiosInstance.post('/auth/logout', {}, {
        withCredentials: true, // Include httpOnly cookies
      }).catch(() => {
        // Ignore errors, just clear local storage
      })
    }
  } finally {
    clearAuth()
    // Import toast function dynamically to avoid SSR issues
    if (typeof window !== 'undefined') {
      const { showSuccessToast } = await import('@/lib/toast-utils')
      showSuccessToast('Logged Out', 'You have been successfully logged out.')
      
      // Small delay to show the toast before redirect
      setTimeout(() => {
        window.location.href = '/admin/login'
      }, 1000)
    }
  }
}