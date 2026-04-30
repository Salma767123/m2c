import axios from '@/lib/axios';

export interface BagType {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
}

class BagTypeService {
  async getActiveBagTypes(): Promise<{ success: boolean; data: BagType[] }> {
    try {
      const response = await axios.get('/bag-types/active');
      return response.data;
    } catch {
      return { success: false, data: [] };
    }
  }
}

export const bagTypeService = new BagTypeService();
export default bagTypeService;
