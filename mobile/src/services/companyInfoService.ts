import axios from '@/lib/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PublicCompanyInfo {
  companyName: string;
  companyLogo: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
  companyWebsite: string | null;
  registeredAddress: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
  socialInstagram: string | null;
  socialFacebook: string | null;
  socialYoutube: string | null;
}

const CACHE_KEY = 'companyInfo_public';

const DEFAULT_INFO: PublicCompanyInfo = {
  companyName: 'M2C MarkDowns Private Limited',
  companyLogo: null,
  companyEmail: null,
  companyPhone: null,
  companyWebsite: null,
  registeredAddress: null,
  city: null,
  state: null,
  country: null,
  zipCode: null,
  socialInstagram: null,
  socialFacebook: null,
  socialYoutube: null,
};

export const companyInfoService = {
  // Read cached company info instantly (for fast initial render before API responds)
  getCachedCompanyInfo: async (): Promise<PublicCompanyInfo> => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) return { ...DEFAULT_INFO, ...JSON.parse(cached) };
    } catch { /* ignore */ }
    return DEFAULT_INFO;
  },

  // Fetch public company info (no auth required) + cache it
  getPublicCompanyInfo: async (): Promise<PublicCompanyInfo> => {
    try {
      const response = await axios.get('/company-info/public');
      const data = { ...DEFAULT_INFO, ...(response.data?.data || {}) };
      try { await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
      return data;
    } catch {
      return companyInfoService.getCachedCompanyInfo();
    }
  },
};

export default companyInfoService;
