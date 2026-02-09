import axios from '@/lib/axios';

export interface ProductFormData {
  // Inventory Connection
  inventoryItemId?: string;
  isFromInventory: boolean;
  
  // Basic Information
  name: string;
  description: string;
  category: string;
  subCategory?: string;
  
  // Pricing Information
  basePrice: number;
  adminFixedPrice?: number; // Admin's fixed price (overrides basePrice for display)
  originalPrice?: number;
  discount?: number;
  
  // Product Rating & Reviews
  rating?: number;
  reviews?: number;
  
  // Fabric & Specifications
  fabricType?: string;
  material?: string;
  fabricSpecifications?: {
    type: string;
    composition: string;
    weight: string;
    weave: string;
    finish: string;
    careInstructions: string[];
  };
  
  // Variants Management
  variants?: ProductVariant[];
  hasVariants: boolean;
  
  // Base Product Info
  baseSku: string;
  
  // Images
  images?: ProductImage[];
  
  // Pricing Configuration
  pricingTiers?: PricingTier[];
  bulkPricingEnabled: boolean;
  singleUnitPricingEnabled: boolean;
  
  // Stock Management
  totalStock: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  
  // Order Configuration
  minimumOrderQuantity: number;
  maximumOrderQuantity?: number;
  
  // Dispatch & Shipping
  dispatchTimeline: {
    processingDays: number;
    shippingDays: number;
    totalDays: number;
  };
  
  // Additional Info
  tags: string[];
  dimensions?: string;
  weight?: string;
  inStock: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
}

export interface ProductVariant {
  id?: string;
  size: string;
  color: string;
  colorHex?: string;
  sku: string;
  price: number;
  stock: number;
  images: string[];
}

export interface ProductImage {
  id?: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  imageType: 'cover' | 'gallery';
}

export interface PricingTier {
  minQuantity: number;
  maxQuantity?: number;
  price: number;
  discount?: number;
}

export interface Product extends ProductFormData {
  id: string;
  vendorId: string;
  createdAt: string;
  updatedAt: string;
  variants?: ProductVariant[];
  images?: ProductImage[];
  inventory?: {
    id: string;
    name: string;
    sku: string;
    currentStock: number;
    category?: string;
  };
}

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  pendingProducts: number;
  outOfStockProducts: number;
  productsWithVariants: number;
  totalStock: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  subcategory?: string;
  description?: string;
  currentStock: number;
}

class ProductService {
  // Create a new product
  async createProduct(productData: ProductFormData): Promise<{ success: boolean; data?: Product; message?: string }> {
    try {
      const response = await axios.post('/products', productData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create product');
    }
  }

  // Get all products for the vendor
  async getProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
    hasVariants?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    success: boolean;
    data: {
      items: Product[];
      pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
        limit: number;
      };
    };
  }> {
    try {
      const response = await axios.get('/products', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch products');
    }
  }

  // Get a single product by ID
  async getProduct(id: string): Promise<{ success: boolean; data?: Product; message?: string }> {
    try {
      const response = await axios.get(`/products/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch product');
    }
  }

  // Update a product
  async updateProduct(id: string, productData: Partial<ProductFormData>): Promise<{ success: boolean; data?: Product; message?: string }> {
    try {
      const response = await axios.put(`/products/${id}`, productData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update product');
    }
  }

  // Delete a product
  async deleteProduct(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await axios.delete(`/products/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete product');
    }
  }

  // Get product statistics
  async getProductStats(): Promise<{ success: boolean; data?: ProductStats; message?: string }> {
    try {
      const response = await axios.get('/products/stats');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch product statistics');
    }
  }

  // Get available inventory items for product creation
  async getAvailableInventoryItems(): Promise<{ success: boolean; data?: InventoryItem[]; message?: string }> {
    try {
      const response = await axios.get('/products/available-inventory');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch available inventory items');
    }
  }

  // Get public products (for website - no authentication required)
  async getPublicProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    subCategory?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    inStock?: boolean;
  }): Promise<{
    success: boolean;
    data: {
      items: Product[];
      pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
        limit: number;
      };
    };
  }> {
    try {
      const response = await axios.get('/products/public', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch products');
    }
  }

  // Get single public product (for website - no authentication required)
  async getPublicProduct(id: string): Promise<{ success: boolean; data?: Product; message?: string }> {
    try {
      const response = await axios.get(`/products/public/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch product');
    }
  }
}

export const productService = new ProductService();
export default productService;