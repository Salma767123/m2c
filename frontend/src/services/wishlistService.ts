import axios from '@/lib/axios';

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
  // Add item to wishlist
  async addToWishlist(productId: string): Promise<WishlistResponse> {
    try {
      const response = await axios.post('/wishlist/add', { productId });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to add item to wishlist');
    }
  }

  // Get wishlist items
  async getWishlist(): Promise<WishlistResponse> {
    try {
      const response = await axios.get('/wishlist');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch wishlist');
    }
  }

  // Remove item from wishlist
  async removeFromWishlist(productId: string): Promise<WishlistResponse> {
    try {
      const response = await axios.delete(`/wishlist/${productId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to remove item from wishlist');
    }
  }

  // Check if product is in wishlist
  async isInWishlist(productId: string): Promise<boolean> {
    try {
      const response = await axios.get(`/wishlist/check/${productId}`);
      return response.data.inWishlist || false;
    } catch (error: any) {
      return false;
    }
  }

  // Local storage methods for guest users
  getLocalWishlist(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const wishlist = localStorage.getItem('guestWishlist');
      return wishlist ? JSON.parse(wishlist) : [];
    } catch {
      return [];
    }
  }

  saveLocalWishlist(productIds: string[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('guestWishlist', JSON.stringify(productIds));
    } catch (error) {
    }
  }

  addToLocalWishlist(productId: string): void {
    const wishlist = this.getLocalWishlist();
    if (!wishlist.includes(productId)) {
      wishlist.push(productId);
      this.saveLocalWishlist(wishlist);
    }
  }

  removeFromLocalWishlist(productId: string): void {
    const wishlist = this.getLocalWishlist();
    const updatedWishlist = wishlist.filter(id => id !== productId);
    this.saveLocalWishlist(updatedWishlist);
  }

  isInLocalWishlist(productId: string): boolean {
    const wishlist = this.getLocalWishlist();
    return wishlist.includes(productId);
  }

  clearLocalWishlist(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('guestWishlist');
    } catch (error) {
    }
  }
}

export const wishlistService = new WishlistService();
export default wishlistService;
