import axiosInstance from '../lib/axios';

export interface Permission {
    id: string;
    name: string;
    description: string;
    module: string;
}

export interface Role {
    id: string;
    name: string;
    description: string;
    permissions: Permission[];
    userCount: number;
    isSystem: boolean;
    createdAt: string;
    updatedAt: string;
}

export const roleService = {
    getRoles: async (): Promise<{ success: boolean; data: Role[] }> => {
        const response = await axiosInstance.get('/roles');
        return response.data;
    },

    getPermissions: async (): Promise<{ success: boolean; data: Permission[] }> => {
        const response = await axiosInstance.get('/roles/permissions');
        return response.data;
    },

    createRole: async (data: { name: string; description: string; permissions: string[] }): Promise<{ success: boolean; data: Role }> => {
        const response = await axiosInstance.post('/roles', data);
        return response.data;
    },

    updateRole: async (id: string, data: { name?: string; description?: string; permissions?: string[] }): Promise<{ success: boolean; data: Role }> => {
        const response = await axiosInstance.put(`/roles/${id}`, data);
        return response.data;
    },

    deleteRole: async (id: string): Promise<{ success: boolean; message: string }> => {
        const response = await axiosInstance.delete(`/roles/${id}`);
        return response.data;
    }
};
