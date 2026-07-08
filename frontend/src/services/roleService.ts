import axiosInstance from '../lib/axios';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export const PERMISSION_ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete'];

export interface Permission {
    id: string;
    /** `<submodule_key>:<action>`, e.g. "vendor_management:view" */
    name: string;
    description: string;
    module: string;
    submodule?: string;
}

/** A page-specific button permission (Approve, Suspend, Mark as Paid, …). */
export interface PermissionExtraAction {
    key: string;
    label: string;
    description?: string;
}

/** One sidebar submodule and the subset of view/create/edit/delete it supports. */
export interface PermissionSubmodule {
    key: string;
    name: string;
    description: string;
    actions: Record<PermissionAction, boolean>;
    /** Special button permissions beyond the core four. */
    extra?: PermissionExtraAction[];
}

/** Top-level sidebar module (Vendors / Customers / Admin). */
export interface PermissionModule {
    key: string;
    name: string;
    submodules: PermissionSubmodule[];
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

    getPermissions: async (): Promise<{ success: boolean; data: Permission[]; modules: PermissionModule[] }> => {
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
