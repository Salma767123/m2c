import axiosInstance from '@/lib/axios';

export type ReportPeriod = 'today' | '7days' | '30days' | '3months' | '6months' | '1year';

const reportsService = {
    getOverview: (period: ReportPeriod = '30days') =>
        axiosInstance.get(`/reports/overview?period=${period}`).then(r => r.data),

    getSales: (period: ReportPeriod = '30days') =>
        axiosInstance.get(`/reports/sales?period=${period}`).then(r => r.data),

    getOrders: (period: ReportPeriod = '30days') =>
        axiosInstance.get(`/reports/orders?period=${period}`).then(r => r.data),

    getSettlement: (period: ReportPeriod = '30days') =>
        axiosInstance.get(`/reports/settlement?period=${period}`).then(r => r.data),

    getVendors: (period: ReportPeriod = '30days') =>
        axiosInstance.get(`/reports/vendors?period=${period}`).then(r => r.data),

    getProducts: (period: ReportPeriod = '30days') =>
        axiosInstance.get(`/reports/products?period=${period}`).then(r => r.data),

    getCustomers: (period: ReportPeriod = '30days') =>
        axiosInstance.get(`/reports/customers?period=${period}`).then(r => r.data),

    getFinancial: (period: ReportPeriod = '30days') =>
        axiosInstance.get(`/reports/financial?period=${period}`).then(r => r.data),

    getQcFactory: (params?: {
        page?: number
        limit?: number
        search?: string
        result?: string
        sortBy?: 'completedAt' | 'createdAt'
        sortOrder?: 'asc' | 'desc'
    }) =>
        axiosInstance.get(`/reports/qc-factory`, { params }).then(r => r.data),

    getQcProducts: (params?: {
        page?: number
        limit?: number
        search?: string
        status?: string
        sortOrder?: 'asc' | 'desc'
    }) =>
        axiosInstance.get(`/reports/qc-products`, { params }).then(r => r.data),
};

export default reportsService;
