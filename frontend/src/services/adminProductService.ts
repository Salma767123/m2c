import axios from '@/lib/axios';

export interface AdminProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  subCategory?: string;
  basePrice: number;
  originalPrice?: number;
  discount?: number;
  gstPercentage?: number;
  adminFixedPrice?: number; // Admin's fixed price (separate from basePrice)
  singleUnitSize?: string;
  singleUnitColor?: string;
  singleUnitColorHex?: string;
  fabricType?: string;
  material?: string;
  fabricSpecifications?: any;
  hasVariants: boolean;
  baseSku: string;
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
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  vendorId: string;
  vendor: {
    id: string;
    companyName: string;
    ownerName: string;
    businessEmail: string;
    status: string;
  };
  inventory?: {
    id: string;
    name: string;
    sku: string;
    currentStock: number;
    category: string;
  };
  images: Array<{
    id: string;
    url: string;
    alt: string;
    isPrimary: boolean;
    imageType: string;
  }>;
  variants: Array<{
    id: string;
    size: string;
    color: string;
    price: number;
    stock: number;
  }>;
}

export interface AdminProductsResponse {
  success: boolean;
  data: {
    products: AdminProduct[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      limit: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export interface AdminProductResponse {
  success: boolean;
  data: AdminProduct;
  message?: string;
}

class AdminProductService {
  // Get all products for admin with filters
  async getAllProducts(params?: {
    page?: number;
    limit?: number;
    approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
    status?: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
    search?: string;
    vendorId?: string;
    category?: string;
  }): Promise<AdminProductsResponse> {
    try {
      const response = await axios.get('/products/admin/all', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch products');
    }
  }

  // Get single product by ID (admin view)
  async getProduct(id: string): Promise<AdminProductResponse> {
    try {
      const response = await axios.get(`/products/admin/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch product');
    }
  }

  // Create product (admin)
  async createProduct(productData: any): Promise<AdminProductResponse> {
    try {
      const response = await axios.post('/products/admin', productData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create product');
    }
  }

  // Update product (admin)
  async updateProduct(id: string, productData: any): Promise<AdminProductResponse> {
    try {
      const response = await axios.put(`/products/admin/${id}`, productData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update product');
    }
  }

  // Delete product (admin)
  async deleteProduct(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await axios.delete(`/products/admin/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete product');
    }
  }

  // Approve a product
  async approveProduct(id: string, adminPrice?: number): Promise<{ success: boolean; data?: AdminProduct; message?: string }> {
    try {
      const payload: any = {};
      if (adminPrice !== undefined) {
        payload.adminPrice = adminPrice;
      }
      const response = await axios.put(`/products/${id}/approve`, payload);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to approve product');
    }
  }

  // Reject a product
  async rejectProduct(id: string, rejectionReason: string): Promise<{ success: boolean; data?: AdminProduct; message?: string }> {
    try {
      const response = await axios.put(`/products/${id}/reject`, { rejectionReason });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to reject product');
    }
  }
}

export const adminProductService = new AdminProductService();
export default adminProductService;