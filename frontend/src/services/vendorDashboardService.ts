import axiosInstance from '@/lib/axios';

export interface VendorDashboardStats {
    stats: {
        totalProducts: number;
        totalRevenue: number;
        totalOrders: number;
    };
    analytics: {
        revenue: { current: number; change: number };
        orders: { current: number; change: number };
    };
    earningsData: {
        name: string;
        total: number;
    }[];
    recentProducts: {
        id: string;
        name: string;
        category: string;
        price: number;
        stock: number;
        status: string;
        createdAt: string;
        image: string;
    }[];
    recentOrders: {
        id: string;
        orderId: string;
        customerName: string;
        amount: number;
        status: string;
        date: string;
        items: number;
    }[];
}

export type ChartRange =
    | 'this_week'
    | 'last_week'
    | 'last_month'
    | 'last_3_months'
    | 'last_year'
    | 'last_3_years'
    | 'custom';

export interface ChartPoint {
    name: string;
    revenue: number;
    orders: number;
}

export interface ChartResponse {
    range: ChartRange;
    granularity: 'day' | 'week' | 'month';
    start: string;
    end: string;
    hasData: boolean;
    data: ChartPoint[];
}

class VendorDashboardService {
    static async getDashboardStats(): Promise<VendorDashboardStats> {
        try {
            const response = await axiosInstance.get('/vendor-dashboard/stats');
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to fetch dashboard stats');
        }
    }

    static async getChartData(params: {
        range: ChartRange;
        start?: string;
        end?: string;
    }): Promise<ChartResponse> {
        try {
            const response = await axiosInstance.get('/vendor-dashboard/chart', { params });
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to fetch chart data');
        }
    }
}

export default VendorDashboardService;
