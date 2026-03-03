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

class VendorDashboardService {
    static async getDashboardStats(): Promise<VendorDashboardStats> {
        try {
            const response = await axiosInstance.get('/vendor-dashboard/stats');
            return response.data;
        } catch (error: any) {
            console.error('Error fetching vendor dashboard stats:', error);
            throw new Error(error.response?.data?.error || 'Failed to fetch dashboard stats');
        }
    }
}

export default VendorDashboardService;
