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
  priceINR?: number;
  priceUSD?: number;
  priceVisibility?: 'IN_ONLY' | 'COM_ONLY' | 'BOTH';
  uom?: string;
  tags: string[];
  dimensions?: string;
  weight?: string;
  inStock: boolean;
  logisticsConfig?: {
    unitWeight: number;
    weightUom: string;
    maxWeight: number;
    dimensions: { length: number; width: number; height: number; unit: string } | null;
    transportTypes: string[];
    weightRanges: Array<{ minWeight: number; maxWeight: number; recommendedTransport: string }>;
    airDeliveryDays: number;
    shipDeliveryDays: number;
    airCostPerKg: number;
    shipCostPerKg: number;
    notes: string;
  } | null;
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
  approvalStatus: 'PENDING' | 'QC_APPROVED' | 'APPROVED' | 'REJECTED' | 'REINSPECTION';
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
  assignedQcId?: string | null;
  assignedQc?: {
    id: string;
    checkerId: string;
    name?: string;
    email?: string;
    status?: string;
  } | null;
  inventory?: {
    id: string;
    name: string;
    sku: string;
    currentStock: number;
    baseStock: number;
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
    colorHex?: string;
    sku: string;
    price: number;
    originalPrice?: number;
    adminFixedPrice?: number; // Admin's fixed price for this variant
    stock: number;
    images?: string[];
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
    approvalStatus?: 'PENDING' | 'QC_APPROVED' | 'APPROVED' | 'REJECTED' | 'REINSPECTION';
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
  async approveProduct(
    id: string,
    adminPrice?: number,
    variantPrices?: Record<string, number>,
    originalPrice?: number,
    variantOriginalPrices?: Record<string, number>,
    multiCurrency?: {
      priceINR?: number;
      priceUSD?: number;
      priceVisibility?: string;
      variantPricesINR?: Record<string, number>;
      variantPricesUSD?: Record<string, number>;
      variantVisibilities?: Record<string, string>;
    }
  ): Promise<{ success: boolean; data?: AdminProduct; message?: string }> {
    try {
      const payload: any = {};
      if (adminPrice !== undefined) {
        payload.adminPrice = adminPrice;
      }
      if (variantPrices !== undefined) {
        payload.variantPrices = variantPrices;
      }
      if (originalPrice !== undefined) {
        payload.originalPrice = originalPrice;
      }
      if (variantOriginalPrices !== undefined) {
        payload.variantOriginalPrices = variantOriginalPrices;
      }
      // Multi-currency fields
      if (multiCurrency) {
        if (multiCurrency.priceINR !== undefined) payload.priceINR = multiCurrency.priceINR;
        if (multiCurrency.priceUSD !== undefined) payload.priceUSD = multiCurrency.priceUSD;
        if (multiCurrency.priceVisibility) payload.priceVisibility = multiCurrency.priceVisibility;
        if (multiCurrency.variantPricesINR) payload.variantPricesINR = multiCurrency.variantPricesINR;
        if (multiCurrency.variantPricesUSD) payload.variantPricesUSD = multiCurrency.variantPricesUSD;
        if (multiCurrency.variantVisibilities) payload.variantVisibilities = multiCurrency.variantVisibilities;
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
      const response = await axios.put(`/products/${id}/reject`, { reason: rejectionReason });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to reject product');
    }
  }

  // Assign QC Checker to a product
  async assignQCChecker(id: string, qcCheckerId: string): Promise<{ success: boolean; data?: AdminProduct; message?: string }> {
    try {
      const response = await axios.post(`/products/admin/${id}/assign-qc`, { qcCheckerId });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to assign QC checker');
    }
  }
}

export const adminProductService = new AdminProductService();
export default adminProductService;