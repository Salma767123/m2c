import axios from '@/lib/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  async addToCart(productId: string, quantity: number = 1, variantId?: string): Promise<CartResponse> {
    try {
      const response = await axios.post('/cart/add', { productId, quantity, variantId });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to add item to cart');
    }
  }

  async getCart(): Promise<CartResponse> {
    try {
      const response = await axios.get('/cart');
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch cart');
    }
  }

  async updateCartItem(itemId: string, quantity: number): Promise<CartResponse> {
    try {
      const response = await axios.put(`/cart/${itemId}`, { quantity });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update cart item');
    }
  }

  async removeFromCart(itemId: string): Promise<CartResponse> {
    try {
      const response = await axios.delete(`/cart/${itemId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to remove item from cart');
    }
  }

  async clearCart(): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await axios.delete('/cart/clear');
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to clear cart');
    }
  }

  // AsyncStorage methods for guest users
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

  async addToLocalCart(productId: string, quantity: number = 1, variantId?: string): Promise<void> {
    const cart = await this.getLocalCart();
    const existingItem = cart.find(item => item.productId === productId && item.variantId === variantId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        productId,
        variantId,
        quantity,
        price: 0
      });
    }

    await this.saveLocalCart(cart);
  }

  async removeFromLocalCart(id: string): Promise<void> {
    const cart = await this.getLocalCart();
    // Remove by the unique cart item 'id' to support multiple variants
    const updatedCart = cart.filter(item => item.id !== id);
    await this.saveLocalCart(updatedCart);
  }

  async updateLocalCartItem(id: string, quantity: number): Promise<void> {
    const cart = await this.getLocalCart();
    const existingItem = cart.find(item => item.id === id);

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
}

export const cartService = new CartService();
export default cartService;
