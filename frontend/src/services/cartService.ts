import axios from '@/lib/axios';

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product?: {
    id: string;
    name: string;
    image: string;
    basePrice: number;
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
  async addToCart(productId: string, quantity: number = 1): Promise<CartResponse> {
    try {
      const response = await axios.post('/cart/add', { productId, quantity });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to add item to cart');
    }
  }

  // Get cart items
  async getCart(): Promise<CartResponse> {
    try {
      const response = await axios.get('/cart');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch cart');
    }
  }

  // Update cart item quantity
  async updateCartItem(itemId: string, quantity: number): Promise<CartResponse> {
    try {
      const response = await axios.put(`/cart/${itemId}`, { quantity });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update cart item');
    }
  }

  // Remove item from cart
  async removeFromCart(itemId: string): Promise<CartResponse> {
    try {
      const response = await axios.delete(`/cart/${itemId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to remove item from cart');
    }
  }

  // Clear cart
  async clearCart(): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await axios.delete('/cart/clear');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to clear cart');
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
      console.error('Failed to save cart to localStorage:', error);
    }
  }

  addToLocalCart(productId: string, quantity: number = 1): void {
    const cart = this.getLocalCart();
    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({
        id: Date.now().toString(),
        productId,
        quantity,
        price: 0 // Will be updated when fetching product details
      });
    }
    
    this.saveLocalCart(cart);
  }

  removeFromLocalCart(productId: string): void {
    const cart = this.getLocalCart();
    const updatedCart = cart.filter(item => item.productId !== productId);
    this.saveLocalCart(updatedCart);
  }

  clearLocalCart(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('guestCart');
    } catch (error) {
      console.error('Failed to clear cart from localStorage:', error);
    }
  }
}

export const cartService = new CartService();
export default cartService;
