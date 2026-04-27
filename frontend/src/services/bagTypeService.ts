import axios from '@/lib/axios';

export interface BagType {
    id: string;
    name: string;
    description?: string;
    price: number;
    image?: string;
    isActive: boolean;
    sortOrder?: number;
    createdAt?: string;
    updatedAt?: string;
}

class BagTypeService {
    // Public: get active bag types for cart page
    async getActiveBagTypes(): Promise<{ success: boolean; data: BagType[] }> {
        try {
            const response = await axios.get('/bag-types/active');
            return response.data;
        } catch (error) {
            console.warn('Failed to fetch bag types:', error);
            return { success: false, data: [] };
        }
    }

    // Admin: get all bag types with pagination
    async getBagTypes(params?: { page?: number; limit?: number; search?: string; isActive?: string }): Promise<{
        success: boolean;
        data: BagType[];
        pagination: { page: number; limit: number; total: number; pages: number };
        stats: {
            total: number; active: number; inactive: number;
            totalBagsSold: number;
            totalRevenue: number;
            perBagType: Array<{ bagTypeId: string; sold: number; revenue: number }>;
        };
    }> {
        const response = await axios.get('/bag-types', { params });
        return response.data;
    }

    // Admin: get single bag type
    async getBagType(id: string): Promise<{ success: boolean; data: BagType }> {
        const response = await axios.get(`/bag-types/${id}`);
        return response.data;
    }

    // Admin: create bag type
    async createBagType(data: Partial<BagType>): Promise<{ success: boolean; data: BagType; message: string }> {
        const response = await axios.post('/bag-types', data);
        return response.data;
    }

    // Admin: update bag type
    async updateBagType(id: string, data: Partial<BagType>): Promise<{ success: boolean; data: BagType; message: string }> {
        const response = await axios.put(`/bag-types/${id}`, data);
        return response.data;
    }

    // Admin: delete bag type
    async deleteBagType(id: string): Promise<{ success: boolean; message: string }> {
        const response = await axios.delete(`/bag-types/${id}`);
        return response.data;
    }
}

export const bagTypeService = new BagTypeService();
export default bagTypeService;
