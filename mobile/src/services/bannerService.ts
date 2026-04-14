import axios from '@/lib/axios';

export interface BannerImage {
  id: string;
  imageUrl: string;
  altText?: string;
  displayOrder: number;
}

export interface BannerResponse {
  success: boolean;
  data: BannerImage[];
  message?: string;
}

class BannerService {
  private baseURL = '/banners';

  async getActiveBanners(): Promise<BannerResponse> {
    const response = await axios.get(`${this.baseURL}/public`);
    return response.data;
  }
}

export const bannerService = new BannerService();
export default bannerService;
