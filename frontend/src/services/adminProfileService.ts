import axios from '@/lib/axios';

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileData {
  name: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export const adminProfileService = {
  // Get admin profile
  getProfile: async () => {
    try {
      const response = await axios.get('/admin/profile');
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch profile');
    }
  },

  // Update admin profile
  updateProfile: async (data: UpdateProfileData) => {
    try {
      const response = await axios.put('/admin/profile', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update profile');
    }
  }
};
