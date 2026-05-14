import axios from '@/lib/axios';
import { getCurrency } from '@/lib/currency';

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
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
    singleUnitColor?: string;
    singleUnitSize?: string;
    singleUnitColorHex?: string;
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

class CartService {
  // Add item to cart
  async addToCart(productId: string, quantity: number = 1, variantId?: string): Promise<CartResponse> {
    try {
      const currency = getCurrency();
      const response = await axios.post('/cart/add', { productId, quantity, variantId, currency });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to add item to cart');
    }
  }

  // Get cart items
  async getCart(): Promise<CartResponse> {
    try {
      const response = await axios.get('/cart');
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch cart');
    }
  }

  // Update cart item quantity
  async updateCartItem(itemId: string, quantity: number): Promise<CartResponse> {
    try {
      const response = await axios.put(`/cart/${itemId}`, { quantity });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update cart item');
    }
  }

  // Remove item from cart
  async removeFromCart(itemId: string): Promise<CartResponse> {
    try {
      const response = await axios.delete(`/cart/${itemId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to remove item from cart');
    }
  }

  // Clear cart
  async clearCart(): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await axios.delete('/cart/clear');
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to clear cart');
    }
  }

  // Local storage methods for guest users
  getLocalCart(): CartItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const cart = localStorage.getItem('guestCart');
      return cart ? JSON.parse(cart) : [];
    } catch {
      return [];
    }
  }

  saveLocalCart(items: CartItem[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('guestCart', JSON.stringify(items));
    } catch (error) {
    }
  }

  addToLocalCart(productId: string, quantity: number = 1, variantId?: string): void {
    const cart = this.getLocalCart();
    const existingItem = cart.find(item => item.productId === productId && item.variantId === variantId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        productId,
        variantId,
        quantity,
        price: 0 // Will be updated when fetching product details
      });
    }

    this.saveLocalCart(cart);
  }

  removeFromLocalCart(id: string): void {
    const cart = this.getLocalCart();
    // Assuming we want to remove by the unique cart item 'id' to support multiple variants
    const updatedCart = cart.filter(item => item.id !== id);
    this.saveLocalCart(updatedCart);
  }

  updateLocalCartItem(id: string, quantity: number): void {
    const cart = this.getLocalCart();
    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
      existingItem.quantity = quantity;
      this.saveLocalCart(cart);
    }
  }

  clearLocalCart(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('guestCart');
    } catch (error) {
    }
  }

  // Check free shipping eligibility
  async checkFreeShipping(userId: string, cartTotal: number): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const response = await axios.post('/coupons/check-free-shipping', { userId, cartTotal });
      return response.data;
    } catch (error: any) {
      console.warn('Free shipping check failed:', error);
      return { success: false, message: error.message || 'Failed to check free shipping' };
    }
  }
}

export const cartService = new CartService();
export default cartService;
