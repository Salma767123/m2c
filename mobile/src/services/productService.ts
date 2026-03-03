import axios from '@/lib/axios';

export interface ProductFormData {
  inventoryItemId?: string;
  isFromInventory: boolean;
  name: string;
  description: string;
  category: string;
  subCategory?: string;
  basePrice: number;
  adminFixedPrice?: number;
  originalPrice?: number;
  discount?: number;
  gstPercentage?: number;
  singleUnitSize?: string;
  singleUnitColor?: string;
  singleUnitColorHex?: string;
  rating?: number;
  reviews?: number;
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
  variants?: ProductVariant[];
  hasVariants: boolean;
  baseSku: string;
  images?: ProductImage[];
  totalStock: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  dispatchTimeline: {
    processingDays: number;
    shippingDays: number;
    totalDays: number;
  };
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

class ProductService {
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
      throw new Error(error.message || 'Failed to fetch products');
    }
  }

  async getPublicProduct(id: string): Promise<{ success: boolean; data?: Product; message?: string }> {
    try {
      const response = await axios.get(`/products/public/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch product');
    }
  }
}

export const productService = new ProductService();
export default productService;
