import axios from '@/lib/axios';

export interface PublicProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  subCategory?: string;
  basePrice: number;
  adminFixedPrice?: number; // Admin's fixed price (overrides basePrice for display)
  originalPrice?: number;
  discount?: number;
  gstPercentage?: number;
  rating?: number;
  reviews?: number;
  images: Array<{
    id: string;
    url: string;
    alt: string;
    isPrimary: boolean;
    imageType: 'cover' | 'gallery';
  }>;
  tags: string[];
  inStock: boolean;
  totalStock: number;
  hasVariants: boolean;
  variants?: Array<{
    id: string;
    size: string;
    color: string;
    colorHex?: string;
    sku: string;
    price: number;
    stock: number;
    images: string[];
  }>;
  fabricType?: string;
  material?: string;
  dimensions?: string;
  weight?: string;
  createdAt: string;
  updatedAt: string;
  vendorId: string;
  isFromInventory: boolean;
  baseSku: string;
  lowStockThreshold: number;
  trackInventory: boolean;
  dispatchTimeline: {
    processingDays: number;
    shippingDays: number;
    totalDays: number;
  };
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
}

export interface ProductsResponse {
  success: boolean;
  data?: {
    items: PublicProduct[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
      limit: number;
    };
  };
  message?: string;
}

class PublicProductService {
  // Get all public products with filters
  async getProducts(params?: {
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
  }): Promise<ProductsResponse> {
    try {
      const response = await axios.get('/products/public', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching public products:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch products'
      };
    }
  }

  // Get products by tag
  async getProductsByTag(tag: string, limit: number = 4): Promise<ProductsResponse> {
    try {
      const response = await axios.get('/products/public', {
        params: {
          search: tag,
          limit,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching products by tag:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch products'
      };
    }
  }

  // Get single product by ID
  async getProduct(id: string): Promise<{ success: boolean; data?: PublicProduct; message?: string }> {
    try {
      const response = await axios.get(`/products/public/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching product:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch product'
      };
    }
  }

  // Get featured products
  async getFeaturedProducts(limit: number = 4): Promise<ProductsResponse> {
    return this.getProductsByTag('Featured', limit);
  }

  // Get top selling products
  async getTopSellingProducts(limit: number = 4): Promise<ProductsResponse> {
    return this.getProductsByTag('Top Selling', limit);
  }

  // Get best seller products
  async getBestSellerProducts(limit: number = 4): Promise<ProductsResponse> {
    return this.getProductsByTag('Best Seller', limit);
  }
}

export const publicProductService = new PublicProductService();
export default publicProductService;
