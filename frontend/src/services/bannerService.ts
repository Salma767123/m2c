import axios from '@/lib/axios';

export interface BannerImage {
    id: string;
    imageUrl: string;
    altText?: string;
    displayOrder: number;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface BannerResponse {
    success: boolean;
    data: BannerImage | BannerImage[];
    message?: string;
}

class BannerService {
    private baseURL = '/banners';

    async getAllBanners(): Promise<BannerResponse> {
        const response = await axios.get(this.baseURL);
        return response.data;
    }

    async getActiveBanners(): Promise<BannerResponse> {
        const response = await axios.get(`${this.baseURL}/public`);
        return response.data;
    }

    async addBanner(imageFile: File, altText?: string): Promise<BannerResponse> {
        const formData = new FormData();
        formData.append('image', imageFile);
        if (altText) formData.append('altText', altText);

        const response = await axios.post(this.baseURL, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    }

    async updateBanner(id: string, data: Partial<BannerImage>, imageFile?: File): Promise<BannerResponse> {
        const formData = new FormData();

        if (data.altText !== undefined) formData.append('altText', data.altText || '');
        if (data.isActive !== undefined) formData.append('isActive', String(data.isActive));
        if (data.displayOrder !== undefined) formData.append('displayOrder', String(data.displayOrder));
        if (imageFile) formData.append('image', imageFile);

        const response = await axios.put(`${this.baseURL}/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    }

    async deleteBanner(id: string): Promise<BannerResponse> {
        const response = await axios.delete(`${this.baseURL}/${id}`);
        return response.data;
    }

    async reorderBanners(orderedIds: string[]): Promise<BannerResponse> {
        const response = await axios.put(`${this.baseURL}/reorder/update`, { orderedIds });
        return response.data;
    }
}

export const bannerService = new BannerService();
export default bannerService;
