import axiosInstance from '@/lib/axios';
import { getStoredAuth } from '@/lib/auth';

// Get admin token from auth system
const getAdminToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    const auth = getStoredAuth();
    return auth?.token || null;
};

export interface DashboardStats {
    stats: {
        totalEarnings: number;
        totalVendors: number;
        totalCustomers: number;
        totalOrders: number;
        totalIncome: number;
    };
    earningsData: {
        name: string;
        total: number;
    }[];
    salesByCategory: {
        name: string;
        amount: number;
        value: number;
    }[];
    recentOrders: {
        id: string;
        orderId: string;
        customerName: string;
        customerEmail: string;
        totalAmount: number;
        status: string;
        date: string;
        productName: string;
    }[];
    topProducts: {
        id: string;
        name: string;
        sales: number;
        revenue: number;
    }[];
    recentVendors: {
        id: string;
        companyName: string;
        email: string;
        status: string;
        createdAt: string;
        ownerName: string;
        vendorType: string;
    }[];
    recentProducts: {
        id: string;
        name: string;
        category: string;
        price: number;
        vendorName?: string;
        createdAt: string;
        stock: number;
        status: string;
    }[];
    recentRestocks: {
        id: string;
        productName: string;
        vendorName?: string;
        quantityAdded: number;
        previousStock: number;
        newStock: number;
        date: string;
    }[];
}

class AdminDashboardService {
    static async getDashboardStats(): Promise<DashboardStats> {
        const token = getAdminToken();
        if (!token) {
            throw new Error('No admin authentication token found');
        }

        try {
            const response = await axiosInstance.get('/admin-dashboard/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            return response.data;
        } catch (error) {
            throw error;
        }
    }
}

export default AdminDashboardService;
