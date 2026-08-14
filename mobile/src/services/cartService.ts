import axios from '@/lib/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrency, getRegion } from '@/lib/currency';

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  transportType?: 'AIR' | 'SHIP' | null;
  courier?: string | null;

  product?: {
    id: string;
    name: string;
    images: { url: string; isPrimary: boolean }[];
    basePrice: number;
    description?: string;
    gstPercentage?: number;
    inStock?: boolean;
    availableStock?: number;
    originalPrice?: number;
    category?: string;
    rating?: number;
    reviews?: number;
    material?: string;
    discount?: number;
  };
  variant?: {
    size: string;
    color: string;
    colorHex?: string;
    sku: string;
    stock: number;
    images?: string[];
  };
}

export interface CartResponse {
  success: boolean;
  data?: {
    items: CartItem[];
    total: number;
    itemCount: number;
  };
  message?: string;
  error?: string;
}

// Prefer the backend's error payload (`response.data.error`/`message`) over
// axios's generic `.message` so users see real API errors ("Out of stock",
// "Quantity exceeds available stock", etc.) instead of generic fallbacks.
function extractError(error: any, fallback: string): Error {
  return new Error(
    error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      fallback,
  );
}

class CartService {
  // Mirrors the web service: optionally carries the shipping choice (transport +
  // courier) so the line lands ready to check out. Both are re-validated
  // server-side at order time.
  async addToCart(
    productId: string,
    quantity: number = 1,
    variantId?: string,
    shipping?: { transportType?: 'AIR' | 'SHIP' | null; courier?: string | null },
  ): Promise<CartResponse> {
    try {
      const response = await axios.post('/cart/add', {
        productId,
        quantity,
        variantId,
        currency: getCurrency(),
        ...(shipping?.transportType !== undefined ? { transportType: shipping.transportType } : {}),
        ...(shipping?.courier !== undefined ? { courier: shipping.courier } : {}),
      });
      return response.data;
    } catch (error: any) {
      throw extractError(error, 'Failed to add item to cart');
    }
  }

  async getCart(): Promise<CartResponse> {
    try {
      const response = await axios.get('/cart', { params: { region: getRegion() } });
      return response.data;
    } catch (error: any) {
      throw extractError(error, 'Failed to fetch cart');
    }
  }

  async updateCartItem(itemId: string, quantity: number): Promise<CartResponse> {
    try {
      const response = await axios.put(`/cart/${itemId}`, { quantity });
      return response.data;
    } catch (error: any) {
      throw extractError(error, 'Failed to update cart item');
    }
  }

  async removeFromCart(itemId: string): Promise<CartResponse> {
    try {
      const response = await axios.delete(`/cart/${itemId}`);
      return response.data;
    } catch (error: any) {
      throw extractError(error, 'Failed to remove item from cart');
    }
  }

  async clearCart(): Promise<{ success: boolean; message?: string }> {
    try {
      // Backend route is /cart/clear/all — previously called /cart/clear which 404'd.
      const response = await axios.delete('/cart/clear/all');
      return response.data;
    } catch (error: any) {
      throw extractError(error, 'Failed to clear cart');
    }
  }

  // ── AsyncStorage methods for guest users ────────────────────────────────

  async getLocalCart(): Promise<CartItem[]> {
    try {
      const cart = await AsyncStorage.getItem('guestCart');
      return cart ? JSON.parse(cart) : [];
    } catch {
      return [];
    }
  }

  async saveLocalCart(items: CartItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem('guestCart', JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save cart to AsyncStorage:', error);
    }
  }

  async addToLocalCart(
    productId: string,
    quantity: number = 1,
    variantId?: string,
    shipping?: { transportType?: 'AIR' | 'SHIP' | null; courier?: string | null },
  ): Promise<void> {
    const cart = await this.getLocalCart();
    const existingItem = cart.find(
      (item) => item.productId === productId && item.variantId === variantId,
    );

    if (existingItem) {
      existingItem.quantity += quantity;
      if (shipping?.transportType !== undefined) existingItem.transportType = shipping.transportType;
      if (shipping?.courier !== undefined) existingItem.courier = shipping.courier;
    } else {
      cart.push({
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        productId,
        variantId,
        quantity,
        price: 0,
        ...(shipping?.transportType !== undefined ? { transportType: shipping.transportType } : {}),
        ...(shipping?.courier !== undefined ? { courier: shipping.courier } : {}),
      });
    }

    await this.saveLocalCart(cart);
  }



  // newly added
// Add near updateCartItem()
async updateCartItemShipping(
  itemId: string,
  updates: { transportType?: 'AIR' | 'SHIP' | null; courier?: string | null },
): Promise<CartResponse> {
  try {
    const response = await axios.put(`/cart/${itemId}`, updates);
    return response.data;
  } catch (error: any) {
    throw extractError(error, 'Failed to update shipping method');
  }
}

// Add near updateLocalCartItem() — guest cart shipping persistence
async updateLocalCartItemShipping(
  id: string,
  updates: { transportType?: 'AIR' | 'SHIP' | null; courier?: string | null },
): Promise<void> {
  const cart = await this.getLocalCart();
  const item = cart.find((i) => i.id === id);
  if (item) {
    if (updates.transportType !== undefined) (item as any).transportType = updates.transportType;
    if (updates.courier !== undefined) (item as any).courier = updates.courier;
    await this.saveLocalCart(cart);
  }
}





  async removeFromLocalCart(id: string): Promise<void> {
    const cart = await this.getLocalCart();
    const updatedCart = cart.filter((item) => item.id !== id);
    await this.saveLocalCart(updatedCart);
  }

  async updateLocalCartItem(id: string, quantity: number): Promise<void> {
    const cart = await this.getLocalCart();
    const existingItem = cart.find((item) => item.id === id);

    if (existingItem) {
      existingItem.quantity = quantity;
      await this.saveLocalCart(cart);
    }
  }

  async clearLocalCart(): Promise<void> {
    try {
      await AsyncStorage.removeItem('guestCart');
    } catch (error) {
      console.error('Failed to clear cart from AsyncStorage:', error);
    }
  }

  // ── Guest → authenticated migration ─────────────────────────────────────
  // Call this right after a successful login. Walks the guest cart, pushes
  // each item to the server, then wipes the local copy. Swallows per-item
  // errors (stock changes, deleted products) so one bad item doesn't block
  // the rest from syncing.
  async migrateGuestCartToAuth(): Promise<{
    migrated: number;
    failed: number;
  }> {
    const localCart = await this.getLocalCart();
    if (localCart.length === 0) return { migrated: 0, failed: 0 };

    let migrated = 0;
    let failed = 0;
    for (const item of localCart) {
      try {
        await this.addToCart(item.productId, item.quantity, item.variantId);
        migrated += 1;
      } catch (err) {
        console.warn(`Failed to migrate cart item ${item.productId}:`, err);
        failed += 1;
      }
    }
    await this.clearLocalCart();
    return { migrated, failed };
  }
}

export const cartService = new CartService();
export default cartService;
