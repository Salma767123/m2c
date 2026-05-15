import axios from '@/lib/axios';

export interface ExchangeRateData {
  id?: string;
  currency: string;
  rate: number;
  isActive: boolean;
  updatedAt?: string;
}

export const exchangeRateService = {
  // Public — get current exchange rate
  getExchangeRate: async (): Promise<{ success: boolean; data: ExchangeRateData }> => {
    const res = await axios.get('/exchange-rate');
    return res.data;
  },

  // Admin — update exchange rate (triggers bulk USD recalculation)
  updateExchangeRate: async (rate: number): Promise<{
    success: boolean;
    data: ExchangeRateData;
    recalculated: { productsUpdated: number; variantsUpdated: number; bagsUpdated: number };
    message: string;
  }> => {
    const res = await axios.put('/exchange-rate', { rate });
    return res.data;
  },
};
