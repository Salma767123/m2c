import axios from '@/lib/axios';

export interface Hub {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    email: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateHubData {
    name: string;
    address?: string;
    city: string;
    state: string;
    zipCode?: string;
    phone?: string;
    email?: string;
    isActive?: boolean;
}

export interface UpdateHubData extends CreateHubData { }

class HubService {
    // Get all hubs
    async getHubs(): Promise<{ success: boolean; data: Hub[] }> {
        try {
            const response = await axios.get('/hubs');
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to fetch hubs');
        }
    }

    // Get single hub
    async getHubById(id: string): Promise<{ success: boolean; data: Hub }> {
        try {
            const response = await axios.get(`/hubs/${id}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to fetch hub');
        }
    }

    // Create hub
    async createHub(data: CreateHubData): Promise<{ success: boolean; data: Hub; message: string }> {
        try {
            const response = await axios.post('/hubs', data);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to create hub');
        }
    }

    // Update hub
    async updateHub(id: string, data: UpdateHubData): Promise<{ success: boolean; data: Hub; message: string }> {
        try {
            const response = await axios.put(`/hubs/${id}`, data);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to update hub');
        }
    }

    // Toggle hub status
    async toggleHubStatus(id: string): Promise<{ success: boolean; data: Hub; message: string }> {
        try {
            const response = await axios.patch(`/hubs/${id}/toggle-status`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to toggle hub status');
        }
    }

    // Delete hub
    async deleteHub(id: string): Promise<{ success: boolean; message: string }> {
        try {
            const response = await axios.delete(`/hubs/${id}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to delete hub');
        }
    }
}

export const hubService = new HubService();
export default hubService;
