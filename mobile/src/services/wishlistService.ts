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
    originalPrice?: number;
    discount?: number;
    inStock: boolean;
    rating?: number;
    reviews?: number;
    category: string;
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

class WishlistService {
  async addToWishlist(productId: string): Promise<WishlistResponse> {
    try {
      const response = await axios.post('/wishlist/add', { productId });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to add item to wishlist');
    }
  }

  async getWishlist(): Promise<WishlistResponse> {
    try {
      const response = await axios.get('/wishlist');
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch wishlist');
    }
  }

  async removeFromWishlist(productId: string): Promise<WishlistResponse> {
    try {
      const response = await axios.delete(`/wishlist/${productId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to remove item from wishlist');
    }
  }

  async isInWishlist(productId: string): Promise<boolean> {
    try {
      const response = await axios.get(`/wishlist/check/${productId}`);
      return response.data.inWishlist || false;
    } catch (error: any) {
      return false;
    }
  }

  // AsyncStorage methods for guest users
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
    const updatedWishlist = wishlist.filter(id => id !== productId);
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
}

export const wishlistService = new WishlistService();
export default wishlistService;
