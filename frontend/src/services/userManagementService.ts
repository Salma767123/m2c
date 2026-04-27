import axios from '@/lib/axios';

export interface UserAddress {
    addressLine1: string;
    addressLine2?: string;
    landmark?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}

export interface Customer {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    status: 'active' | 'inactive' | 'suspended' | 'pending';
    joinDate: string;
    lastLogin: string;
    totalOrders: number;
    totalSpent: number;
    loyaltyTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    avatar?: string;
    address: UserAddress;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    averageRating?: number;
    reviewsCount?: number;
}

export interface Staff {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: string;
    roleId?: string | null;
    permissions?: string[];
    status: 'active' | 'inactive' | 'suspended' | 'pending';
    joinDate: string;
    lastLogin: string;
    totalOrders: number;
    totalSpent: number;
    avatar?: string;
    address: UserAddress;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
}

export const userManagementService = {
    // ---- CUSTOMERS ----
    getCustomers: async (params?: { search?: string; status?: string; loyalty?: string }): Promise<Customer[]> => {
        try {
            const { data } = await axios.get('/admin/users/customers', { params });
            return data.data ?? [];
        } catch (error) {
            return [];
        }
    },

    getCustomerById: async (id: string): Promise<any> => {
        try {
            const { data } = await axios.get(`/admin/users/customers/${id}`);
            return data.data;
        } catch (error) {
            console.error('Failed to fetch customer', error);
            return null;
        }
    },

    updateCustomerStatus: async (id: string, status: 'active' | 'suspended'): Promise<void> => {
        await axios.put(`/admin/users/customers/${id}/status`, { status });
    },

    deleteCustomer: async (id: string): Promise<void> => {
        await axios.delete(`/admin/users/customers/${id}`);
    },

    // ---- STAFF ----
    getStaff: async (params?: { search?: string; role?: string; status?: string }): Promise<Staff[]> => {
        try {
            const { data } = await axios.get('/admin/users/staff', { params });
            return data.data ?? [];
        } catch (error) {
            return [];
        }
    },

    createStaff: async (staffData: Record<string, unknown>): Promise<Staff> => {
        const { data } = await axios.post('/admin/users/staff', staffData);
        return data.data;
    },

    getStaffById: async (id: string): Promise<Staff | null> => {
        try {
            const { data } = await axios.get(`/admin/users/staff/${id}`);
            return data?.data ?? null;
        } catch (error) {
            return null;
        }
    },

    updateStaff: async (id: string, staffData: Record<string, unknown>): Promise<Staff> => {
        const { data } = await axios.put(`/admin/users/staff/${id}`, staffData);
        return data.data;
    },

    updateStaffStatus: async (id: string, status: 'active' | 'suspended'): Promise<void> => {
        await axios.put(`/admin/users/staff/${id}/status`, { status });
    },

    deleteStaff: async (id: string): Promise<void> => {
        await axios.delete(`/admin/users/staff/${id}`);
    }
};
