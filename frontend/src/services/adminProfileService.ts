import axios from '@/lib/axios';

export interface AdminProfile {
  id: string;
  name: string;
  title?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  addressLine2?: string;
  addressLine3?: string;
  landmark?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileData {
  name?: string;
  title?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
  addressLine2?: string;
  addressLine3?: string;
  landmark?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  /** Cropped profile photo — base64 data URI (uploaded server-side) or existing URL. */
  image?: string;
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
