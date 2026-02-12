import axios from '@/lib/axios';

export interface InventoryItem {
  id: string;
  vendorId: string;
  name: string;
  sku: string;
  category: string;
  subcategory?: string;
  description?: string;
  manufacturingDate?: string;
  currentStock: number;
  minStock: number;
  location?: string;
  status: 'ACTIVE' | 'INACTIVE';
  sourceType?: 'SUPPLIER' | 'MANUFACTURE';
  supplier?: string;
  lastRestocked?: string;
  notes?: string;
  hasProductCreated: boolean;
  productId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryStats {
  totalItems: number;
  activeItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalStockUnits: number;
}

export interface InventoryListResponse {
  items: InventoryItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  };
}

export interface CreateInventoryData {
  name: string;
  sku: string;
  category: string;
  subcategory?: string;
  description?: string;
  manufacturingDate?: string;
  currentStock: number;
  minStock: number;
  location?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  sourceType?: 'SUPPLIER' | 'MANUFACTURE';
  supplier?: string;
  lastRestocked?: string;
  notes?: string;
}

export interface UpdateInventoryData extends Partial<CreateInventoryData> {}

export interface UpdateStockData {
  currentStock: number;
  reason: string;
  notes?: string;
}

export interface StockChangeHistory {
  id: string;
  inventoryId: string;
  previousStock: number;
  newStock: number;
  changeAmount: number;
  reason: string;
  changedBy: string;
  changedByType: 'admin' | 'vendor';
  changedByName?: string;
  createdAt: string;
}

export interface StockHistoryResponse {
  history: StockChangeHistory[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  };
}

export interface InventoryFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  sourceType?: 'SUPPLIER' | 'MANUFACTURE';
}

export interface VendorCategories {
  categories: Array<{
    id?: string;
    name: string;
    slug?: string;
  }>;
  subcategories: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  productTypes: string[];
}

class InventoryService {
  private baseURL = '/inventory';

  // Get inventory statistics
  async getStats(): Promise<InventoryStats> {
    const response = await axios.get(`${this.baseURL}/stats`);
    return response.data.data;
  }

  // Get vendor's selected categories
  async getVendorCategories(): Promise<VendorCategories> {
    const response = await axios.get(`${this.baseURL}/categories`);
    return response.data.data;
  }

  // Create new inventory item
  async createItem(data: CreateInventoryData): Promise<InventoryItem> {
    const response = await axios.post(this.baseURL, data);
    return response.data.data;
  }

  // Get all inventory items with filters
  async getItems(filters: InventoryFilters = {}): Promise<InventoryListResponse> {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);
    if (filters.sourceType) params.append('sourceType', filters.sourceType);

    const response = await axios.get(`${this.baseURL}?${params.toString()}`);
    return response.data.data;
  }

  // Get single inventory item
  async getItem(id: string): Promise<InventoryItem> {
    const response = await axios.get(`${this.baseURL}/${id}`);
    return response.data.data;
  }

  // Update inventory item
  async updateItem(id: string, data: UpdateInventoryData): Promise<InventoryItem> {
    const response = await axios.put(`${this.baseURL}/${id}`, data);
    return response.data.data;
  }

  // Delete inventory item
  async deleteItem(id: string): Promise<void> {
    await axios.delete(`${this.baseURL}/${id}`);
  }

  // Update stock levels
  async updateStock(id: string, data: UpdateStockData): Promise<{ inventory: InventoryItem; history: StockChangeHistory }> {
    const response = await axios.patch(`${this.baseURL}/${id}/stock`, data);
    return response.data.data;
  }

  // Get stock change history
  async getStockHistory(id: string, page: number = 1, limit: number = 20): Promise<StockHistoryResponse> {
    const response = await axios.get(`${this.baseURL}/${id}/history?page=${page}&limit=${limit}`);
    return response.data.data;
  }

  // Admin: Update stock levels
  async adminUpdateStock(id: string, data: UpdateStockData): Promise<{ inventory: InventoryItem; history: StockChangeHistory }> {
    const response = await axios.patch(`${this.baseURL}/admin/${id}/stock`, data);
    return response.data.data;
  }

  // Admin: Get stock change history
  async adminGetStockHistory(id: string, page: number = 1, limit: number = 20): Promise<StockHistoryResponse> {
    const response = await axios.get(`${this.baseURL}/admin/${id}/history?page=${page}&limit=${limit}`);
    return response.data.data;
  }

  // Admin: Create inventory item
  async adminCreateItem(data: CreateInventoryData & { vendorId: string }): Promise<InventoryItem> {
    const response = await axios.post(`${this.baseURL}/admin`, data);
    return response.data.data;
  }

  // Admin: Get single inventory item
  async adminGetItem(id: string): Promise<InventoryItem> {
    const response = await axios.get(`${this.baseURL}/admin/${id}`);
    return response.data.data;
  }

  // Admin: Update inventory item
  async adminUpdateItem(id: string, data: UpdateInventoryData & { vendorId?: string }): Promise<InventoryItem> {
    const response = await axios.put(`${this.baseURL}/admin/${id}`, data);
    return response.data.data;
  }

  // Admin: Delete inventory item
  async adminDeleteItem(id: string): Promise<void> {
    await axios.delete(`${this.baseURL}/admin/${id}`);
  }

  // Admin: Get inventory items by vendor ID (for product creation)
  async adminGetInventoryByVendor(vendorId: string, includeUsed: boolean = false): Promise<InventoryItem[]> {
    const response = await axios.get(`${this.baseURL}/admin/vendor/${vendorId}?includeUsed=${includeUsed}`);
    return response.data.data;
  }

  // Helper method to format inventory data for frontend forms
  formatForForm(item: InventoryItem) {
    return {
      name: item.name,
      sku: item.sku,
      category: item.category,
      subcategory: item.subcategory || '',
      description: item.description || '',
      manufacturingDate: item.manufacturingDate ? item.manufacturingDate.split('T')[0] : '',
      currentStock: item.currentStock,
      minStock: item.minStock,
      location: item.location || '',
      status: item.status.toLowerCase() as 'active' | 'inactive',
      sourceType: item.sourceType?.toLowerCase() as 'supplier' | 'manufacture' | null,
      supplier: item.supplier || '',
      lastRestocked: item.lastRestocked ? item.lastRestocked.split('T')[0] : '',
      notes: item.notes || '',
      hasProductCreated: item.hasProductCreated,
      productId: item.productId || ''
    };
  }

  // Helper method to format form data for API
  formatForAPI(formData: any): CreateInventoryData | UpdateInventoryData {
    return {
      name: formData.name,
      sku: formData.sku,
      category: formData.category,
      subcategory: formData.subcategory || undefined,
      description: formData.description || undefined,
      manufacturingDate: formData.manufacturingDate || undefined,
      currentStock: parseInt(formData.currentStock),
      minStock: parseInt(formData.minStock),
      location: formData.location || undefined,
      status: formData.status?.toUpperCase() as 'ACTIVE' | 'INACTIVE',
      sourceType: formData.sourceType?.toUpperCase() as 'SUPPLIER' | 'MANUFACTURE' | undefined,
      supplier: formData.supplier || undefined,
      lastRestocked: formData.lastRestocked || undefined,
      notes: formData.notes || undefined
    };
  }
}

export const inventoryService = new InventoryService();
export default inventoryService;