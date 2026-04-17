import axios from '@/lib/axios';

// ==========================================
// TRACKING (called from storefront pages)
// ==========================================

export const trackPageView = async (data: {
  page: string;
  referrer?: string;
  duration?: number;
}) => {
  try {
    const sessionId = getSessionId();
    const device = getDeviceType();
    const browser = getBrowserName();
    await axios.post('/analytics/track/pageview', {
      ...data,
      sessionId,
      device,
      browser,
    });
  } catch {
    // Silent fail - tracking should never break the app
  }
};

export const trackProductView = async (data: {
  productId: string;
  productName?: string;
  category?: string;
  source?: string;
}) => {
  if (!data?.productId) {
    console.warn('[analytics] trackProductView: productId is required, skipping');
    return;
  }
  try {
    const sessionId = getSessionId();
    await axios.post('/analytics/track/product-view', { ...data, sessionId });
    if (process.env.NODE_ENV === 'development') {
      console.log('[analytics] product view tracked:', data.productName, '(', data.productId, ')');
    }
  } catch (err: any) {
    // Log in dev so we can see what's wrong
    console.warn('[analytics] trackProductView failed:', err?.message || err);
  }
};

// ==========================================
// ADMIN ANALYTICS (dashboard)
// ==========================================

export interface PageAnalyticsData {
  totalPageViews: number;
  previousPageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgDuration: number;
  topPages: Array<{ page: string; views: number; avgDuration: number }>;
  deviceBreakdown: Array<{ device: string; count: number }>;
  trend: Array<{ date: string; views: number }>;
}

export interface ProductHeatMapData {
  totalProductViews: number;
  products: Array<{
    productId: string;
    productName: string;
    category: string;
    views: number;
    orders: number;
    quantitySold: number;
    conversionRate: number;
  }>;
  categoryHeatMap: Array<{ category: string; views: number }>;
  sourceBreakdown: Array<{ source: string; count: number }>;
  trend: Array<{ date: string; views: number }>;
}

export const getPageAnalytics = async (period: string = '30days'): Promise<{ success: boolean; data: PageAnalyticsData }> => {
  const response = await axios.get(`/analytics/page-analytics?period=${period}`);
  return response.data;
};

export const getProductHeatMap = async (period: string = '30days'): Promise<{ success: boolean; data: ProductHeatMapData }> => {
  const response = await axios.get(`/analytics/product-heatmap?period=${period}`);
  return response.data;
};

// ==========================================
// HELPERS
// ==========================================

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = sessionStorage.getItem('m2c_session');
  if (!sid) {
    sid = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem('m2c_session', sid);
  }
  return sid;
}

function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown';
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function getBrowserName(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  return 'Other';
}

export default {
  trackPageView,
  trackProductView,
  getPageAnalytics,
  getProductHeatMap,
};
