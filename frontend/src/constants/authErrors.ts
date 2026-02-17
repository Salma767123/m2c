/**
 * Authentication Error Messages
 * 
 * Standardized error messages for authentication failures across the application.
 * Provides clear, user-friendly, and actionable error messages.
 */

export const AUTH_ERRORS = {
  NO_TOKEN: 'No authentication token found. Please login again.',
  INVALID_TOKEN: 'Invalid authentication token. Please login again.',
  TOKEN_EXPIRED: 'Your session has expired. Please login again.',
  SUSPENDED_ACCOUNT: 'Your account has been suspended. Please contact support.',
  PENDING_APPROVAL: 'Your account is pending approval. Please wait for admin approval.',
  REJECTED_ACCOUNT: 'Your account has been rejected. Please contact support for more information.',
  UNAUTHORIZED: 'You are not authorized to access this page.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
  ACCOUNT_INACTIVE: 'Your account is inactive. Please contact support.',
  SESSION_EXPIRED: 'Your session has expired. Please login again.',
  MULTIPLE_SESSIONS: 'Your account is logged in from another device.',
} as const

export type AuthErrorType = keyof typeof AUTH_ERRORS

/**
 * Get user-friendly error message from error type
 * @param errorType - The type of authentication error
 * @returns User-friendly error message
 */
export function getAuthErrorMessage(errorType: AuthErrorType): string {
  return AUTH_ERRORS[errorType]
}

/**
 * Map HTTP status codes to auth error types
 * @param statusCode - HTTP status code
 * @returns Corresponding auth error type
 */
export function mapStatusToAuthError(statusCode: number): AuthErrorType {
  switch (statusCode) {
    case 401:
      return 'UNAUTHORIZED'
    case 403:
      return 'UNAUTHORIZED'
    case 419:
      return 'SESSION_EXPIRED'
    case 500:
      return 'SERVER_ERROR'
    case 503:
      return 'SERVER_ERROR'
    default:
      return 'UNKNOWN_ERROR'
  }
}
