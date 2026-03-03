import axiosInstance from "@/lib/axios";

export interface Category {
  id: string;
  name: string;
  description: string;
  slug: string;
  parentId?: string;
  image?: string;
  sortOrder: number;
  productCount?: number;
  subcategoryCount?: number;
  subcategories?: Category[];
}

export interface CategoryFilters {
  search?: string;
  status?: "all" | "ACTIVE" | "INACTIVE";
  parentId?: string;
  includeSubcategories?: boolean;
  showRootOnly?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

class CategoryService {
  async getAllCategories(options: {
    status?: string;
    showRootOnly?: string;
    includeSubcategories?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}): Promise<{ success: boolean; data: Category[]; total: number }> {
    const params = new URLSearchParams();

    if (options.status) params.append("status", options.status);
    if (options.showRootOnly) params.append("showRootOnly", options.showRootOnly);
    if (options.includeSubcategories)
      params.append("includeSubcategories", options.includeSubcategories);
    if (options.sortBy) params.append("sortBy", options.sortBy);
    if (options.sortOrder) params.append("sortOrder", options.sortOrder);

    const response = await axiosInstance.get(
      `/categories${params.toString() ? `?${params.toString()}` : ""}`,
    );
    return { success: true, ...response.data };
  }

  async getSubcategories(
    parentId: string,
  ): Promise<{ success: boolean; data: Category[]; total: number }> {
    const response = await axiosInstance.get(
      `/categories/${parentId}/subcategories`,
    );
    return { success: true, ...response.data };
  }
}

export const categoryService = new CategoryService();
export default CategoryService;

