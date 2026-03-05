import axios from '@/lib/axios';

export interface SEOSettings {
    id?: string;
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    twitterCard: string;
    twitterTitle: string;
    twitterDescription: string;
    twitterImage: string;
    googleAnalyticsId: string;
    facebookPixelId: string;
    robotsTxt: string;
    sitemapUrl: string;
}

export interface SEOSettingsResponse {
    success: boolean;
    data: SEOSettings;
    message?: string;
}

class SEOSettingsService {
    private baseURL = '/seo-settings';

    async getSettings(): Promise<SEOSettingsResponse> {
        const response = await axios.get(this.baseURL);
        return response.data;
    }

    async updateSettings(data: SEOSettings): Promise<SEOSettingsResponse> {
        const response = await axios.put(this.baseURL, data);
        return response.data;
    }
}

export const seoSettingsService = new SEOSettingsService();
export default seoSettingsService;
