import axios from '@/lib/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WishlistItem {
  id: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    image: string;
    basePrice: number;
    adminFixedPrice?: number;
    originalPrice?: number;
    discount?: number;
    inStock: boolean;
    totalStock?: number;
    hasVariants?: boolean;
    rating?: number;
    reviews?: number;
    category: string;
    singleUnitSize?: string;
    singleUnitColor?: string;
    singleUnitColorHex?: string;
  };
  createdAt: string;
}

export interface WishlistResponse {
  success: boolean;
  data?: {
    items: WishlistItem[];
    count: number;
  };
  message?: string;
  error?: string;
}

// Surface the backend's error payload instead of the generic axios message so
// users see "Already in wishlist" / "Product not found" instead of a fallback.
function extractError(error: any, fallback: string): Error {
  return new Error(
    error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      fallback,
  );
}

class WishlistService {
  async addToWishlist(productId: string): Promise<WishlistResponse> {
    try {
      const response = await axios.post('/wishlist/add', { productId });
      return response.data;
    } catch (error: any) {
      throw extractError(error, 'Failed to add item to wishlist');
    }
  }

  async getWishlist(): Promise<WishlistResponse> {
    try {
      const response = await axios.get('/wishlist');
      return response.data;
    } catch (error: any) {
      throw extractError(error, 'Failed to fetch wishlist');
    }
  }

  async removeFromWishlist(productId: string): Promise<WishlistResponse> {
    try {
      const response = await axios.delete(`/wishlist/${productId}`);
      return response.data;
    } catch (error: any) {
      throw extractError(error, 'Failed to remove item from wishlist');
    }
  }

  async isInWishlist(productId: string): Promise<boolean> {
    try {
      const response = await axios.get(`/wishlist/check/${productId}`);
      return response.data.inWishlist || false;
    } catch {
      return false;
    }
  }

  // ── AsyncStorage methods for guest users ────────────────────────────────

  async getLocalWishlist(): Promise<string[]> {
    try {
      const wishlist = await AsyncStorage.getItem('guestWishlist');
      return wishlist ? JSON.parse(wishlist) : [];
    } catch {
      return [];
    }
  }

  async saveLocalWishlist(productIds: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem('guestWishlist', JSON.stringify(productIds));
    } catch (error) {
      console.error('Failed to save wishlist to AsyncStorage:', error);
    }
  }

  async addToLocalWishlist(productId: string): Promise<void> {
    const wishlist = await this.getLocalWishlist();
    if (!wishlist.includes(productId)) {
      wishlist.push(productId);
      await this.saveLocalWishlist(wishlist);
    }
  }

  async removeFromLocalWishlist(productId: string): Promise<void> {
    const wishlist = await this.getLocalWishlist();
    const updatedWishlist = wishlist.filter((id) => id !== productId);
    await this.saveLocalWishlist(updatedWishlist);
  }

  async isInLocalWishlist(productId: string): Promise<boolean> {
    const wishlist = await this.getLocalWishlist();
    return wishlist.includes(productId);
  }

  async clearLocalWishlist(): Promise<void> {
    try {
      await AsyncStorage.removeItem('guestWishlist');
    } catch (error) {
      console.error('Failed to clear wishlist from AsyncStorage:', error);
    }
  }

  // ── Guest → authenticated migration ─────────────────────────────────────
  // Call after login. Pushes each guest wishlist ID to the server; ignores
  // "already exists" errors from the backend so a repeated migrate is safe.
  async migrateGuestWishlistToAuth(): Promise<{
    migrated: number;
    failed: number;
  }> {
    const localIds = await this.getLocalWishlist();
    if (localIds.length === 0) return { migrated: 0, failed: 0 };

    let migrated = 0;
    let failed = 0;
    for (const productId of localIds) {
      try {
        await this.addToWishlist(productId);
        migrated += 1;
      } catch (err: any) {
        // The backend returns 400 with "already in wishlist" — treat as success.
        const msg = (err?.message || '').toLowerCase();
        if (msg.includes('already')) {
          migrated += 1;
        } else {
          console.warn(`Failed to migrate wishlist item ${productId}:`, err);
          failed += 1;
        }
      }
    }
    await this.clearLocalWishlist();
    return { migrated, failed };
  }
}

export const wishlistService = new WishlistService();
export default wishlistService;
