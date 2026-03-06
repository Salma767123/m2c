import axios from '@/lib/axios';

export interface SEOSettings {
    id?: string;
    page: string;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    ogImage?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface SEOSettingsResponse {
    success: boolean;
    data: SEOSettings | SEOSettings[];
    message?: string;
}

class SEOSettingsService {
    private baseURL = '/seo-settings';

    async getAllSettings(): Promise<SEOSettingsResponse> {
        const response = await axios.get(this.baseURL);
        return response.data;
    }

    async getSettings(page: string): Promise<SEOSettingsResponse> {
        const response = await axios.get(`${this.baseURL}/${page}`);
        return response.data;
    }

    async updateSettings(page: string, data: Partial<SEOSettings>, imageFile?: File): Promise<SEOSettingsResponse> {
        const formData = new FormData();
        
        // Add text fields
        if (data.metaTitle) formData.append('metaTitle', data.metaTitle);
        if (data.metaDescription) formData.append('metaDescription', data.metaDescription);
        if (data.metaKeywords) formData.append('metaKeywords', data.metaKeywords);
        
        // Add image file if provided
        if (imageFile) {
            formData.append('ogImage', imageFile);
        }

        const response = await axios.put(`${this.baseURL}/${page}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }
}

export const seoSettingsService = new SEOSettingsService();
export default seoSettingsService;
