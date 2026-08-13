import axios from '@/lib/axios';
import type { ActiveOffer } from '@/lib/offers';

export interface ManufacturerInfo {
  photo?: string;
  title?: string;
  fullName?: string;
  role?: string;
  experience?: string;
  description?: string;
}

export interface PublicProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  subCategory?: string;
  basePrice: number;
  adminFixedPrice?: number;
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
    adminFixedPrice?: number;
    originalPrice?: number;
    discount?: number;
    stock: number;
    images: string[];
  }>;
  fabricType?: string;
  material?: string;
  dimensions?: string;
  weight?: string;
  weightUnit?: string;
  uom?: string;
  singleUnitSize?: string;
  singleUnitColor?: string;
  singleUnitColorHex?: string;
  fabricSpecifications?: Record<string, any>;
  inventory?: {
    baseStock?: number;
    currentStock: number;
    reservedStock: number;
    availableStock: number;
  };
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
  priceVisibility?: string;
  logisticsConfig?: any;
  manufacturerInfo?: ManufacturerInfo | null;
  activeOffer?: ActiveOffer;
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

export interface ProductFacets {
  colors: Array<{ value: string; hex: string | null; count: number }>;
  sizes: Array<{ value: string; count: number }>;
  materials: Array<{ value: string; count: number }>;
  fabricTypes: Array<{ value: string; count: number }>;
  priceRange: { min: number; max: number };
  maxDiscount: number;
}

class PublicProductService {
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
    minRating?: number;
    tag?: string;
    colors?: string;
    sizes?: string;
    materials?: string;
    fabricTypes?: string;
    minDiscount?: number;
    newArrivals?: boolean;
  }): Promise<ProductsResponse> {
    try {
      const response = await axios.get('/products/public', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching public products:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch products'
      };
    }
  }

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
      if (error?.status !== 0) {
        console.error('Error fetching products by tag:', error);
      }
      return {
        success: false,
        message: error.message || 'Failed to fetch products'
      };
    }
  }

  async getProductsByTagPaged(tag: string, page: number = 1, limit: number = 10): Promise<ProductsResponse> {
    try {
      const response = await axios.get('/products/public', {
        params: {
          search: tag,
          page,
          limit,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching paged products by tag:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch products'
      };
    }
  }

  async getFeaturedProductsPaged(page: number = 1, limit: number = 10): Promise<ProductsResponse> {
    return this.getProductsByTagPaged('Featured', page, limit);
  }

  async getTopSellingProductsPaged(page: number = 1, limit: number = 10): Promise<ProductsResponse> {
    return this.getProductsByTagPaged('Top Selling', page, limit);
  }

  async getBestSellerProductsPaged(page: number = 1, limit: number = 10): Promise<ProductsResponse> {
    return this.getProductsByTagPaged('Best Seller', page, limit);
  }

  async getProduct(id: string): Promise<{ success: boolean; data?: PublicProduct; message?: string }> {
    try {
      const response = await axios.get(`/products/public/${id}`);
      return response.data;
    } catch (error: any) {
      if (error?.status !== 0) {
        console.error('Error fetching product:', error);
      }
      return {
        success: false,
        message: error.message || 'Failed to fetch product'
      };
    }
  }

  async getFeaturedProducts(limit: number = 4): Promise<ProductsResponse> {
    return this.getProductsByTag('Featured', limit);
  }

  async getFacets(params?: {
    search?: string;
    category?: string;
    subCategory?: string;
  }): Promise<{ success: boolean; data?: ProductFacets }> {
    try {
      const response = await axios.get('/products/public/facets', { params });
      return response.data;
    } catch (error: any) {
      if (error?.status !== 0) {
        console.error('Error fetching product facets:', error);
      }
      return { success: false };
    }
  }

  async getTopSellingProducts(limit: number = 4): Promise<ProductsResponse> {
    return this.getProductsByTag('Top Selling', limit);
  }

  async getBestSellerProducts(limit: number = 4): Promise<ProductsResponse> {
    return this.getProductsByTag('Best Seller', limit);
  }
}

export const publicProductService = new PublicProductService();
export default publicProductService;
