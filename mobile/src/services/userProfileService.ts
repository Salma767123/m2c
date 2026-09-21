import axios from '@/lib/axios';

/**
 * Fields the backend's PUT /auth/profile accepts (authController.js:1234).
 *
 * These were missing from the mobile copy of this interface, so the typed
 * service silently dropped them in both directions — the same failure the web
 * hit once with `image` and documented in its own version of this file. If the
 * backend accepts a field and the user can edit it, it belongs here.
 */
export interface UpdateUserProfileData {
  name: string;
  email?: string;
  /** Honorific — Mr, Mrs, Ms, Miss, Mx, Dr. */
  title?: string;
  middleName?: string;
  gender?: string;
  phoneNumber?: string;
  /** WhatsApp contact, separate from the phone number. */
  whatsappNumber?: string;
  /** Avatar URL. Google sign-in already stores one. */
  image?: string;
  address?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface UserProfileResponse {
  success: boolean;
  data?: {
    id: string;
    email: string;
    name: string;
    title?: string;
    middleName?: string;
    gender?: string;
    phoneNumber?: string;
    whatsappNumber?: string;
    image?: string;
    address?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
  };
  message?: string;
  error?: string;
}

class UserProfileService {
  // Get current user profile
  async getProfile(suppressErrorToast = false): Promise<UserProfileResponse> {
    try {
      // The Profile page shows its own "Load Failed" toast, so opt out of the
      // global interceptor toast to avoid double-toasting the same error — same
      // pattern the web service uses.
       const response = await axios.get('/auth/me', suppressErrorToast ? ({ suppressErrorToast: true } as Record<string, unknown>) : undefined);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch profile');
    }
  }

  // Update user profile
  async updateProfile(profileData: UpdateUserProfileData): Promise<UserProfileResponse> {
    try {
      const response = await axios.put('/auth/profile', profileData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update profile');
    }
  }

  // Get user statistics
  async getUserStats(): Promise<any> {
    try {
      const response = await axios.get('/auth/stats');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch user stats');
    }
  }
}

export const userProfileService = new UserProfileService();
export default userProfileService;
