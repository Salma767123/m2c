import axios from '@/lib/axios';

export interface UpdateUserProfileData {
  name: string;
  phoneNumber?: string;
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
    phoneNumber?: string;
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
  async getProfile(): Promise<UserProfileResponse> {
    try {
      const response = await axios.get('/auth/me');
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch profile');
    }
  }

  // Update user profile
  async updateProfile(profileData: UpdateUserProfileData): Promise<UserProfileResponse> {
    try {
      const response = await axios.put('/auth/profile', profileData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update profile');
    }
  }

  // Get user statistics
  async getUserStats(): Promise<any> {
    try {
      const response = await axios.get('/auth/stats');
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch user stats');
    }
  }
}

export const userProfileService = new UserProfileService();
export default userProfileService;
