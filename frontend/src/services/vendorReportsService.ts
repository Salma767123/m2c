import axiosInstance from '@/lib/axios';

export type ReportPeriod = 'today' | '7days' | '30days' | '3months' | '6months' | '1year';

export interface DateRange {
    from: string;
    to: string;
}

const buildQuery = (period: ReportPeriod, range?: DateRange) =>
    range && range.from && range.to
        ? `startDate=${range.from}&endDate=${range.to}`
        : `period=${period}`;

const vendorReportsService = {
    getOverview: (period: ReportPeriod = '30days', range?: DateRange) =>
        axiosInstance.get(`/vendor-reports/overview?${buildQuery(period, range)}`).then(r => r.data),

    getOrders: (period: ReportPeriod = '30days', range?: DateRange) =>
        axiosInstance.get(`/vendor-reports/orders?${buildQuery(period, range)}`).then(r => r.data),
};

export default vendorReportsService;
