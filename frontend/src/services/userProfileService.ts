import axios from '@/lib/axios';

/**
 * The payload from GET /auth/stats.
 *
 * `totalSpent` and `averageOrderValue` carry no currency — the controller sums
 * each order's raw `total` across online and POS orders, which may not all be
 * in the same currency. Treat them as the storefront default (INR) and do not
 * present them as authoritative until the endpoint returns a currency.
 */
export interface UserStats {
  accountType: 'user' | 'admin';
  memberSince: string;
  lastLogin: string | null;
  isVerified: boolean;
  totalOrders: number;
  totalSpent: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  lastOrderDate: string | null;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    orderType: string;
    total: number;
    orderStatus: string;
    createdAt: string;
    itemCount: number;
  }>;
  wishlistItems: number;
  cartItems: number;
}

export interface UserStatsResponse {
  success: boolean;
  data?: UserStats;
  error?: string;
}

export interface UpdateUserProfileData {
  name: string;
  /**
   * Avatar URL. The backend has always accepted this on PUT /auth/profile and
   * always returned it from GET /auth/me — it was missing from these two
   * interfaces, so the typed service silently dropped it in both directions.
   * Anyone who signed in with Google already had a picture stored that the
   * account page could not see.
   */
  image?: string;
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
    image?: string;
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

  /**
   * Get user statistics.
   *
   * GET /auth/stats has been fully implemented on the backend the whole time
   * and this method had no callers anywhere in the frontend. Typed now that
   * the account page uses it — the fields below are exactly what
   * authController.getUserStats builds.
   *
   * Note the failure mode: if the stats calculation throws server-side, the
   * controller still answers 200 with every count zeroed rather than an error.
   * So `success: true` does not prove the numbers are real, only that the
   * request completed.
   */
  async getUserStats(): Promise<UserStatsResponse> {
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
