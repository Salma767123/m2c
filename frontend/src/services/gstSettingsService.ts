import axiosInstance from '@/lib/axios';

export interface GSTSetting {
    id: string;
    percentage: number;
    description?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

class GSTSettingsService {
    async getSettings(): Promise<{ success: boolean; data: GSTSetting[] }> {
        try {
            const response = await axiosInstance.get('/gst-settings');
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to fetch GST settings');
        }
    }

    async createSetting(data: { percentage: number; description?: string; isActive?: boolean }): Promise<{ success: boolean; data: GSTSetting; message: string }> {
        try {
            const response = await axiosInstance.post('/gst-settings', data);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to create GST setting');
        }
    }

    async updateSetting(id: string, data: Partial<GSTSetting>): Promise<{ success: boolean; data: GSTSetting; message: string }> {
        try {
            const response = await axiosInstance.put(`/gst-settings/${id}`, data);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to update GST setting');
        }
    }

    async deleteSetting(id: string): Promise<{ success: boolean; message: string }> {
        try {
            const response = await axiosInstance.delete(`/gst-settings/${id}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to delete GST setting');
        }
    }
}

export const gstSettingsService = new GSTSettingsService();
export default gstSettingsService;
