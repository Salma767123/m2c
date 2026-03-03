import axiosInstance from '@/lib/axios';

export type ReportPeriod = 'today' | '7days' | '30days' | '3months' | '6months' | '1year';

const vendorReportsService = {
    getOverview: (period: ReportPeriod = '30days') =>
        axiosInstance.get(`/vendor-reports/overview?period=${period}`).then(r => r.data),

    getOrders: (period: ReportPeriod = '30days') =>
        axiosInstance.get(`/vendor-reports/orders?period=${period}`).then(r => r.data),
};

export default vendorReportsService;
