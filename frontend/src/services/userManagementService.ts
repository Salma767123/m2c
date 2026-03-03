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
            console.error('Failed to fetch customers', error);
            return [];
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
            console.error('Failed to fetch staff', error);
            return [];
        }
    },

    createStaff: async (staffData: Record<string, unknown>): Promise<Staff> => {
        const { data } = await axios.post('/admin/users/staff', staffData);
        return data.data;
    },

    getStaffById: async (id: string): Promise<Staff | null> => {
        try {
            // Reusing getStaff for now or adding a specific endpoint if needed
            // Backend currently doesn't have a specific getById, so we might need to add it 
            // or just fetch all and filter. For now, let's assume we fetch all and find.
            const staffList = await userManagementService.getStaff();
            return staffList.find(s => s.id === id) || null;
        } catch (error) {
            console.error('Failed to fetch staff by id', error);
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
