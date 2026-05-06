import axios from '@/lib/axios';

export interface WishlistItem {
  id: string;
  productId: string;
  product?: {
    id: string;
    slug?: string;
    name: string;
    image: string;
    basePrice: number;
    adminFixedPrice?: number;
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
  // In-memory cache of wishlisted product IDs for instant UI
  private _cachedIds: Set<string> = new Set();
  private _cacheLoaded = false;
  private _loadingPromise: Promise<void> | null = null;

  // Preload all wishlist IDs (single API call, cached)
  async preloadIds(): Promise<Set<string>> {
    if (this._cacheLoaded) return this._cachedIds;
    if (this._loadingPromise) { await this._loadingPromise; return this._cachedIds; }

    this._loadingPromise = (async () => {
      try {
        const res = await this.getWishlist();
        this._cachedIds = new Set((res.data?.items || []).map(i => i.productId));
        this._cacheLoaded = true;
      } catch { /* ignore */ }
    })();
    await this._loadingPromise;
    this._loadingPromise = null;
    return this._cachedIds;
  }

  // Synchronous check from cache (returns false if not loaded yet)
  isInWishlistSync(productId: string): boolean {
    return this._cachedIds.has(productId);
  }

  // Notify all listeners (dispatches custom event)
  private _notify() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wishlist-changed', { detail: { ids: Array.from(this._cachedIds), count: this._cachedIds.size } }));
    }
  }

  // Invalidate cache
  invalidateCache() {
    this._cacheLoaded = false;
    this._cachedIds = new Set();
  }

  // Add item to wishlist
  async addToWishlist(productId: string): Promise<WishlistResponse> {
    try {
      this._cachedIds.add(productId);
      this._notify();
      const response = await axios.post('/wishlist/add', { productId });
      return response.data;
    } catch (error: any) {
      this._cachedIds.delete(productId);
      this._notify();
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
      this._cachedIds.delete(productId);
      this._notify();
      const response = await axios.delete(`/wishlist/${productId}`);
      return response.data;
    } catch (error: any) {
      this._cachedIds.add(productId);
      this._notify();
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

  // Generate share token for wishlist
  async getShareToken(): Promise<string> {
    try {
      const response = await axios.post('/wishlist/share');
      return response.data.shareToken;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to generate share link');
    }
  }

  // Get public wishlist by share token (no auth required)
  async getSharedWishlist(token: string): Promise<{ ownerName: string; items: WishlistItem[]; count: number }> {
    try {
      const response = await axios.get(`/wishlist/shared/${token}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Wishlist not found');
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
