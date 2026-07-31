import axios from '@/lib/axios';
import { getRegion } from '@/lib/currency';

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
  gstPercentage?: number;
  // Vendor payout economics (attached by the backend on vendor-facing responses only).
  // What the vendor is actually paid: GST on their base price, and the per-unit total.
  vendorGstRate?: number;
  vendorTaxAmount?: number;
  vendorTotalAmount?: number;

  // Single Unit Configuration
  singleUnitSize?: string;
  singleUnitColor?: string;
  singleUnitColorHex?: string;

  // Product Rating & Reviews
  rating?: number;
  reviews?: number;

  // Who made the item (JSON on Product). Distinct from the vendor who sells it.
  manufacturerInfo?: {
    photo?: string;
    title?: string;
    fullName?: string;
    role?: string;
    experience?: string;
    description?: string;
  };

  // Fabric & Specifications
  fabricType?: string;
  material?: string;
  fabricSpecifications?: {
    type?: string;
    composition?: string;
    // GSM calculation fields (current form): weight in grams + length/breadth in
    // cm auto-calculate GSM; weightUnit is forced to 'GSM'.
    weightValue?: string;
    weightUnit?: string;
    length?: string;
    breadth?: string;
    gsm?: string;
    weave?: string;
    // Legacy fields (older products created before the GSM fields existed).
    weight?: string;
    finish?: string;
    careInstructions?: string[];
  };

  // Variants Management
  variants?: ProductVariant[];
  hasVariants: boolean;

  // Base Product Info
  baseSku: string;

  // Images
  images?: ProductImage[];

  // Stock Management
  totalStock: number;
  lowStockThreshold: number;
  trackInventory: boolean;

  // Dispatch & Shipping
  dispatchTimeline: {
    processingDays: number;
    shippingDays: number;
    totalDays: number;
  };

  // Multi-currency pricing
  priceINR?: number;
  priceUSD?: number;
  priceVisibility?: 'IN_ONLY' | 'COM_ONLY' | 'BOTH';

  // Additional Info
  uom?: string;
  tags: string[];
  dimensions?: string;
  weight?: string;
  weightUnit?: string;
  inStock: boolean;

  // Logistics Configuration
  logisticsConfig?: {
    unitWeight: number;
    weightUom: 'KG' | 'GRAM' | 'TON';
    maxWeight: number;
    dimensions: { length: number; width: number; height: number; unit: 'CM' | 'IN' } | null;
    transportTypes: ('AIR' | 'SHIP')[];
    weightRanges: Array<{ minWeight: number; maxWeight: number; recommendedTransport: 'AIR' | 'SHIP' }>;
    airDeliveryDays: number;
    shipDeliveryDays: number;
    airCostPerKg: number;
    shipCostPerKg: number;
    notes: string;
  } | null;
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
  approvalStatus?: 'PENDING' | 'QC_APPROVED' | 'APPROVED' | 'REJECTED' | 'REINSPECTION' | 'NEGOTIATION';
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
}

export interface ProductVariant {
  id?: string;
  variantName?: string;
  size: string;
  color: string;
  colorHex?: string;
  sku: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  adminFixedPrice?: number;
  priceINR?: number;
  priceUSD?: number;
  priceVisibility?: 'IN_ONLY' | 'COM_ONLY' | 'BOTH';
  stock: number;
  images: string[];
  // Vendor payout economics (vendor-facing responses only) — see Product above.
  vendorGstRate?: number;
  vendorTaxAmount?: number;
  vendorTotalAmount?: number;
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
  slug?: string;
  vendorId: string;
  // Price-negotiation economics — set when a negotiation opens/agrees and kept
  // afterwards, so they also flag that a (now historical) negotiation exists.
  agreedPrice?: number | null;
  basePriceOriginal?: number | null;
  createdAt: string;
  updatedAt: string;
  variants?: ProductVariant[];
  images?: ProductImage[];
  inventory?: {
    id: string;
    name: string;
    sku: string;
    currentStock: number;
    baseStock: number;
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
      throw new Error(error.message || 'Failed to create product');
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
      throw new Error(error.message || 'Failed to fetch products');
    }
  }

  // Get a single product by ID
  async getProduct(id: string): Promise<{ success: boolean; data?: Product; message?: string }> {
    try {
      const response = await axios.get(`/products/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch product');
    }
  }

  // Update a product
  async updateProduct(id: string, productData: Partial<ProductFormData>): Promise<{ success: boolean; data?: Product; message?: string }> {
    try {
      const response = await axios.put(`/products/${id}`, productData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update product');
    }
  }

  // Delete a product
  async deleteProduct(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await axios.delete(`/products/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete product');
    }
  }

  // Get product statistics
  async getProductStats(): Promise<{ success: boolean; data?: ProductStats; message?: string }> {
    try {
      const response = await axios.get('/products/stats');
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch product statistics');
    }
  }

  // Get available inventory items for product creation
  async getAvailableInventoryItems(): Promise<{ success: boolean; data?: InventoryItem[]; message?: string }> {
    try {
      const response = await axios.get('/products/available-inventory');
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch available inventory items');
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
    tag?: string;
    colors?: string;
    sizes?: string;
    materials?: string;
    fabricTypes?: string;
    minDiscount?: number;
    newArrivals?: boolean;
    minRating?: number;
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
      // Region gates visibility server-side (IN_ONLY/COM_ONLY). Sending it here is
      // what makes the filter and pagination correct — without it every product leaks.
      const response = await axios.get('/products/public', { params: { ...params, region: getRegion() } });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch products');
    }
  }

  // Available filter facets for the storefront — colours/sizes/materials/fabric
  // types/price range/max discount, all computed live from the real catalogue.
  async getPublicProductFacets(params?: {
    search?: string;
    category?: string;
    subCategory?: string;
  }): Promise<{
    success: boolean;
    data: {
      colors: Array<{ value: string; hex: string | null; count: number }>;
      sizes: Array<{ value: string; count: number }>;
      materials: Array<{ value: string; count: number }>;
      fabricTypes: Array<{ value: string; count: number }>;
      priceRange: { min: number; max: number };
      maxDiscount: number;
    };
  }> {
    const response = await axios.get('/products/public/facets', { params: { ...params, region: getRegion() } });
    return response.data;
  }

  // Get single public product (for website - no authentication required)
  async getPublicProduct(id: string): Promise<{ success: boolean; data?: Product; message?: string }> {
    try {
      const response = await axios.get(`/products/public/${id}`, { params: { region: getRegion() } });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch product');
    }
  }
}

export const productService = new ProductService();
export default productService;