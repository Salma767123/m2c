import axios from '@/lib/axios';

export interface BannerImage {
  id: string;
  imageUrl: string;
  altText?: string;
  displayOrder: number;
  isActive?: boolean;
  /**
   * Optional click-through target. The backend has always sent these three and
   * the app read none of them, so every banner in the app was decoration while
   * the same banner on the web navigated. Backend comment: "When set, clicking
   * the banner on the storefront navigates the shopper to the linked
   * product/category page."
   *   linkType  = 'product' | 'category' (null = not clickable)
   *   linkValue = the target's slug
   *   linkLabel = the target's display name, cached for the admin views
   */
  linkType?: 'product' | 'category' | null;
  linkValue?: string | null;
  linkLabel?: string | null;
  createdAt?: string;
  updatedAt?: string;
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
