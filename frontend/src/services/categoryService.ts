// Category Service for Admin Dashboard
// Handles all API calls related to category management

import axiosInstance from '@/lib/axios';

export interface Category {
  id: string;
  name: string;
  description: string;
  slug: string;
  parentId?: string;
  parent?: {
    id: string;
    name: string;
    slug: string;
  };
  status: 'ACTIVE' | 'INACTIVE';
  image?: string;
  metaTitle?: string;
  metaDescription?: string;
  sortOrder: number;
  productCount: number;
  subcategoryCount: number;
  subcategories: Category[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  depth?: number; // For tree structure
  breadcrumb?: Category[]; // For breadcrumb navigation
}

export interface CategoryFormData {
  name: string;
  description: string;
  slug?: string;
  parentId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  image?: string;
  metaTitle?: string;
  metaDescription?: string;
  sortOrder: number;
  subcategories?: SubcategoryFormData[];
}

export interface SubcategoryFormData {
  id?: string;
  name: string;
  description: string;
  slug?: string;
  status: 'ACTIVE' | 'INACTIVE';
  image?: string;
  sortOrder: number;
}

export interface CategoryStats {
  total: number; // Root categories count
  active: number; // Active root categories
  inactive: number; // Inactive root categories
  subcategories: number; // Total subcategories
  rootCategories: number; // Same as total (for clarity)
  activeRootCategories: number;
  inactiveRootCategories: number;
  activeSubcategories: number;
  inactiveSubcategories: number;
  totalAllCategories: number; // Total including subcategories
  activeAllCategories: number;
  inactiveAllCategories: number;
}

export interface CategoryFilters {
  search?: string;
  status?: 'all' | 'ACTIVE' | 'INACTIVE';
  parentId?: string;
  includeSubcategories?: boolean;
  showRootOnly?: boolean; // New parameter to control root-only display
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchOptions {
  status?: string;
  includeSubcategories?: boolean;
  limit?: number;
}

export interface TreeOptions {
  status?: string;
  includeInactive?: boolean;
  maxDepth?: number;
}

export interface DuplicateOptions {
  newName?: string;
  includeSubcategories?: boolean;
}

export interface SubcategoryOrder {
  id: string;
  sortOrder: number;
}

class CategoryService {
  // Get all categories with optional filtering
  async getCategories(filters: CategoryFilters = {}): Promise<{ data: Category[]; total: number }> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.parentId) params.append('parentId', filters.parentId);
    if (filters.includeSubcategories !== undefined) {
      params.append('includeSubcategories', filters.includeSubcategories.toString());
    }
    if (filters.showRootOnly !== undefined) {
      params.append('showRootOnly', filters.showRootOnly.toString());
    }
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await axiosInstance.get(`/categories${params.toString() ? `?${params.toString()}` : ''}`);
    return response.data;
  }

  // Simplified method for public website - get all active categories
  async getAllCategories(options: {
    status?: string;
    showRootOnly?: string;
    includeSubcategories?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}): Promise<{ success: boolean; data: Category[]; total: number }> {
    const params = new URLSearchParams();
    
    if (options.status) params.append('status', options.status);
    if (options.showRootOnly) params.append('showRootOnly', options.showRootOnly);
    if (options.includeSubcategories) params.append('includeSubcategories', options.includeSubcategories);
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);

    const response = await axiosInstance.get(`/categories${params.toString() ? `?${params.toString()}` : ''}`);
    return { success: true, ...response.data };
  }

  // Get single category by ID
  async getCategoryById(id: string): Promise<{ data: Category }> {
    const response = await axiosInstance.get(`/categories/${id}`);
    return response.data;
  }

  // Get category statistics
  async getCategoryStats(): Promise<{ data: CategoryStats }> {
    const response = await axiosInstance.get('/categories/stats');
    return response.data;
  }

  // Create new category (admin only)
  async createCategory(categoryData: CategoryFormData): Promise<{ data: Category; message: string }> {
    const response = await axiosInstance.post('/categories', categoryData);
    return response.data;
  }

  // Update existing category (admin only)
  async updateCategory(id: string, categoryData: Partial<CategoryFormData>): Promise<{ data: Category; message: string }> {
    const response = await axiosInstance.put(`/categories/${id}`, categoryData);
    return response.data;
  }

  // Delete category (admin only)
  async deleteCategory(id: string): Promise<{ message: string }> {
    const response = await axiosInstance.delete(`/categories/${id}`);
    return response.data;
  }

  // Bulk update category status (admin only)
  async bulkUpdateStatus(categoryIds: string[], status: 'ACTIVE' | 'INACTIVE'): Promise<{ message: string; data: { updatedCount: number } }> {
    const response = await axiosInstance.patch('/categories/bulk-status', { categoryIds, status });
    return response.data;
  }

  // Helper method to generate slug from name
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  // Helper method to build category tree from flat array
  buildCategoryTree(categories: Category[]): Category[] {
    const categoryMap = new Map<string, Category>();
    const rootCategories: Category[] = [];

    // First pass: create map of all categories
    categories.forEach(category => {
      categoryMap.set(category.id, {
        ...category,
        subcategories: []
      });
    });

    // Second pass: build hierarchy
    categories.forEach(category => {
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.subcategories.push(categoryMap.get(category.id)!);
        }
      } else {
        rootCategories.push(categoryMap.get(category.id)!);
      }
    });

    return rootCategories;
  }

  // Helper method to flatten category tree
  flattenCategoryTree(categories: Category[]): Category[] {
    const flattened: Category[] = [];
    
    const flatten = (cats: Category[]) => {
      cats.forEach(category => {
        flattened.push(category);
        if (category.subcategories && category.subcategories.length > 0) {
          flatten(category.subcategories);
        }
      });
    };
    
    flatten(categories);
    return flattened;
  }

  // Get parent categories (for dropdown selection)
  async getParentCategories(): Promise<Category[]> {
    const response = await this.getCategories({
      includeSubcategories: false,
      showRootOnly: true, // Only root categories
      status: 'ACTIVE',
      sortBy: 'name',
      sortOrder: 'asc'
    });
    
    return response.data;
  }

  // Get subcategories of a specific category
  async getSubcategories(parentId: string): Promise<{ success: boolean; data: Category[]; total: number }> {
    const response = await axiosInstance.get(`/categories/${parentId}/subcategories`);
    return { success: true, ...response.data };
  }

  // Update subcategory
  async updateSubcategory(parentId: string, subcategoryId: string, subcategoryData: Partial<SubcategoryFormData>): Promise<{ data: Category; message: string }> {
    const response = await axiosInstance.put(`/categories/${parentId}/subcategories/${subcategoryId}`, subcategoryData);
    return response.data;
  }

  // Delete subcategory
  async deleteSubcategory(parentId: string, subcategoryId: string): Promise<{ message: string }> {
    const response = await axiosInstance.delete(`/categories/${parentId}/subcategories/${subcategoryId}`);
    return response.data;
  }

  // Get single subcategory
  async getSubcategoryById(parentId: string, subcategoryId: string): Promise<{ data: Category }> {
    const response = await axiosInstance.get(`/categories/${parentId}/subcategories/${subcategoryId}`);
    return response.data;
  }

  // Bulk update subcategory status
  async bulkUpdateSubcategoryStatus(parentId: string, subcategoryIds: string[], status: 'ACTIVE' | 'INACTIVE'): Promise<{ message: string; data: { updatedCount: number } }> {
    const response = await axiosInstance.patch(`/categories/${parentId}/subcategories/bulk-status`, { subcategoryIds, status });
    return response.data;
  }

  // Reorder root categories (drag-and-drop)
  async reorderCategories(categoryOrders: { id: string; sortOrder: number }[]): Promise<{ message: string }> {
    const response = await axiosInstance.patch('/categories/reorder', { categoryOrders });
    return response.data;
  }

  // Reorder subcategories
  async reorderSubcategories(parentId: string, subcategoryOrders: { id: string; sortOrder: number }[]): Promise<{ message: string }> {
    const response = await axiosInstance.patch(`/categories/${parentId}/subcategories/reorder`, { subcategoryOrders });
    return response.data;
  }

  // Move subcategory to different parent
  async moveSubcategory(parentId: string, subcategoryId: string, newParentId: string): Promise<{ data: Category; message: string }> {
    const response = await axiosInstance.patch(`/categories/${parentId}/subcategories/${subcategoryId}/move`, { newParentId });
    return response.data;
  }

  // Get category breadcrumb path
  async getCategoryBreadcrumb(categoryId: string): Promise<{ data: Category[] }> {
    const response = await axiosInstance.get(`/categories/${categoryId}/breadcrumb`);
    return response.data;
  }

  // Search categories
  async searchCategories(query: string, options: { status?: string; includeSubcategories?: boolean; limit?: number } = {}): Promise<{ data: Category[]; total: number; query: string }> {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (options.status) params.append('status', options.status);
    if (options.includeSubcategories !== undefined) params.append('includeSubcategories', options.includeSubcategories.toString());
    if (options.limit) params.append('limit', options.limit.toString());

    const response = await axiosInstance.get(`/categories/search?${params.toString()}`);
    return response.data;
  }

  // Get category tree
  async getCategoryTree(options: { status?: string; includeInactive?: boolean; maxDepth?: number } = {}): Promise<{ data: Category[]; total: number; maxDepth: number }> {
    const params = new URLSearchParams();
    
    if (options.status) params.append('status', options.status);
    if (options.includeInactive !== undefined) params.append('includeInactive', options.includeInactive.toString());
    if (options.maxDepth) params.append('maxDepth', options.maxDepth.toString());

    const response = await axiosInstance.get(`/categories/tree?${params.toString()}`);
    return response.data;
  }

  // Duplicate category
  async duplicateCategory(categoryId: string, options: { newName?: string; includeSubcategories?: boolean } = {}): Promise<{ data: Category; message: string }> {
    const response = await axiosInstance.post(`/categories/${categoryId}/duplicate`, options);
    return response.data;
  }
}

// Export singleton instance
export const categoryService = new CategoryService();

// Export class for testing
export default CategoryService;