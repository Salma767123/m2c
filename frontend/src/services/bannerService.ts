import axios from '@/lib/axios';

export interface BannerImage {
    id: string;
    imageUrl: string;
    altText?: string;
    displayOrder: number;
    isActive: boolean;
    /** Optional click-through: 'product' | 'category' | null. */
    linkType?: 'product' | 'category' | null;
    /** Slug of the linked product/category. */
    linkValue?: string | null;
    /** Cached display name of the link target (admin view only). */
    linkLabel?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

/** Click-through target chosen for a banner in the admin form. */
export interface BannerLink {
    linkType: 'product' | 'category' | 'none';
    linkValue?: string;
    linkLabel?: string;
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

    async addBanner(imageFile: File, altText?: string, link?: BannerLink): Promise<BannerResponse> {
        const formData = new FormData();
        formData.append('image', imageFile);
        if (altText) formData.append('altText', altText);
        if (link) {
            formData.append('linkType', link.linkType);
            if (link.linkValue) formData.append('linkValue', link.linkValue);
            if (link.linkLabel) formData.append('linkLabel', link.linkLabel);
        }

        const response = await axios.post(this.baseURL, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    }

    async updateBanner(id: string, data: Partial<BannerImage>, imageFile?: File, link?: BannerLink): Promise<BannerResponse> {
        const formData = new FormData();

        if (data.altText !== undefined) formData.append('altText', data.altText || '');
        if (data.isActive !== undefined) formData.append('isActive', String(data.isActive));
        if (data.displayOrder !== undefined) formData.append('displayOrder', String(data.displayOrder));
        if (imageFile) formData.append('image', imageFile);
        if (link) {
            formData.append('linkType', link.linkType);
            if (link.linkValue) formData.append('linkValue', link.linkValue);
            if (link.linkLabel) formData.append('linkLabel', link.linkLabel);
        }

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

/** Sentinel linkValue meaning "all products" / "all categories" (the listing page). */
export const BANNER_LINK_ALL = '__all__';

/**
 * Resolve a banner's click-through target to a storefront URL.
 *   product  → /products/<slug>   (or /products for "all products")
 *   category → /products?category=<slug>   (or /categories for "all categories")
 * Returns null when the banner has no link (so it stays non-clickable).
 */
export function bannerHref(b: Pick<BannerImage, 'linkType' | 'linkValue'>): string | null {
    if (b.linkType === 'product' && b.linkValue) {
        return b.linkValue === BANNER_LINK_ALL ? '/products' : `/products/${b.linkValue}`;
    }
    if (b.linkType === 'category' && b.linkValue) {
        return b.linkValue === BANNER_LINK_ALL ? '/categories' : `/products?category=${b.linkValue}`;
    }
    return null;
}

export const bannerService = new BannerService();
export default bannerService;
