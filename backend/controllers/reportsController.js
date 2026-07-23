const { prisma } = require('../config/database');
const { REFERRAL_SOURCE_LABELS } = require('../utils/referralSources');

// Helper: get date range based on period string
const getDateRange = (period) => {
    const now = new Date();
    const start = new Date();

    switch (period) {
        case 'today':
            start.setHours(0, 0, 0, 0);
            break;
        case '7days':
            start.setDate(now.getDate() - 7);
            break;
        case '30days':
        default:
            start.setDate(now.getDate() - 30);
            break;
        case '3months':
            start.setMonth(now.getMonth() - 3);
            break;
        case '6months':
            start.setMonth(now.getMonth() - 6);
            break;
        case '1year':
            start.setFullYear(now.getFullYear() - 1);
            break;
    }
    return { start, end: now };
};

// Helper: get previous period date range (of same length)
const getPrevDateRange = (period) => {
    const { start, end } = getDateRange(period);
    const length = end - start;
    return { start: new Date(start - length), end: start };
};

// ============================================
// GET OVERVIEW REPORT
// ============================================
const getOverviewReport = async (req, res) => {
    try {
        const { period = '30days' } = req.query;
        const { start, end } = getDateRange(period);
        const { start: prevStart, end: prevEnd } = getPrevDateRange(period);

        const dateFilter = { gte: start, lte: end };
        const prevDateFilter = { gte: prevStart, lte: prevEnd };

        // Current period aggregates
        const [
            currentOrders,
            prevOrders,
            currentRevenue,
            prevRevenue,
            currentCustomers,
            prevCustomers,
            currentVendors,
            prevVendors,
            currentProducts,
            orderStatusCounts,
            recentOrders,
            topVendors,
            categoryBreakdown,
            monthlyRevenue,
        ] = await Promise.all([
            // Orders counts
            prisma.order.count({ where: { createdAt: dateFilter } }),
            prisma.order.count({ where: { createdAt: prevDateFilter } }),

            // Revenue aggregates
            prisma.order.aggregate({
                where: { createdAt: dateFilter, paymentStatus: 'PAID' },
                _sum: { totalAmountINR: true },
                _count: true,
            }),
            prisma.order.aggregate({
                where: { createdAt: prevDateFilter, paymentStatus: 'PAID' },
                _sum: { totalAmountINR: true },
                _count: true,
            }),

            // New customers registered
            prisma.user.count({ where: { createdAt: dateFilter } }),
            prisma.user.count({ where: { createdAt: prevDateFilter } }),

            // Active vendors
            prisma.vendor.count({ where: { status: 'APPROVED', createdAt: dateFilter } }),
            prisma.vendor.count({ where: { status: 'APPROVED', createdAt: prevDateFilter } }),

            // Products created
            prisma.product.count({ where: { createdAt: dateFilter } }),

            // Order status distribution
            prisma.order.groupBy({
                by: ['status'],
                where: { createdAt: dateFilter },
                _count: true,
            }),

            // Recent 5 orders
            prisma.order.findMany({
                where: { createdAt: dateFilter },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    orderId: true,
                    customerName: true,
                    totalAmount: true,
                    currency: true,
                    exchangeRate: true,
                    status: true,
                    createdAt: true,
                    items: { select: { vendorName: true }, take: 1 },
                },
            }),

            // Top 5 vendors by revenue
            prisma.orderItem.groupBy({
                by: ['vendorId', 'vendorName'],
                where: { order: { createdAt: dateFilter, paymentStatus: 'PAID' } },
                _sum: { totalPriceINR: true },
                _count: { id: true },
                // Ordering by the raw sum would rank an INR vendor ~83x above a USD one.
                orderBy: { _sum: { totalPriceINR: 'desc' } },
                take: 5,
            }),

            // Category breakdown
            prisma.orderItem.groupBy({
                by: ['productId'],
                where: { order: { createdAt: dateFilter } },
                _sum: { totalPriceINR: true, quantity: true },
                _count: { id: true },
            }),

            // Monthly revenue trend (last 6 months)
            prisma.order.findMany({
                where: {
                    createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) },
                    paymentStatus: 'PAID',
                },
                select: { totalAmountINR: true, createdAt: true },
            }),
        ]);

        const currentRev = currentRevenue._sum.totalAmountINR || 0;
        const prevRev = prevRevenue._sum.totalAmountINR || 0;
        // Divide PAID revenue by the PAID order count. currentOrders/prevOrders count
        // every order regardless of payment status, so using them here dragged AOV down
        // by every unpaid order — wrong independently of the currency issue.
        const paidOrderCount = currentRevenue._count || 0;
        const prevPaidOrderCount = prevRevenue._count || 0;
        const avgOrderValue = paidOrderCount > 0 ? (currentRev / paidOrderCount) : 0;
        const prevAvgOrderValue = prevPaidOrderCount > 0 ? (prevRev / prevPaidOrderCount) : 0;

        // Build monthly revenue chart data
        const monthMap = {};
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        monthlyRevenue.forEach(order => {
            const d = new Date(order.createdAt);
            const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
            if (!monthMap[key]) monthMap[key] = { month: monthNames[d.getMonth()], revenue: 0, orders: 0 };
            monthMap[key].revenue += (order.totalAmountINR || 0);
            monthMap[key].orders += 1;
        });
        const revenueChartData = Object.values(monthMap).slice(-6);

        // Order status chart data
        const STATUS_COLORS = {
            DELIVERED: '#10b981',
            ORDER_CREATED: '#3b82f6',
            VENDOR_PROCESSING: '#f59e0b',
            CANCELLED: '#ef4444',
            SHIPPED_TO_CUSTOMER: '#8b5cf6',
            RETURNED: '#f97316',
        };
        const orderStatusData = orderStatusCounts.map(s => ({
            name: s.status.replace(/_/g, ' '),
            value: s._count,
            color: STATUS_COLORS[s.status] || '#6b7280',
        }));

        res.json({
            success: true,
            data: {
                metrics: {
                    revenue: { current: currentRev, previous: prevRev },
                    orders: { current: currentOrders, previous: prevOrders },
                    customers: { current: currentCustomers, previous: prevCustomers },
                    vendors: { current: currentVendors, previous: prevVendors },
                    products: { current: currentProducts },
                    avgOrderValue: { current: avgOrderValue, previous: prevAvgOrderValue },
                },
                charts: {
                    revenueChartData,
                    orderStatusData,
                },
                tables: {
                    recentOrders: recentOrders.map(o => ({
                        id: o.orderId,
                        customer: o.customerName,
                        vendor: o.items[0]?.vendorName || '-',
                        amount: o.totalAmount,
                        currency: o.currency,
                        exchangeRate: o.exchangeRate,
                        status: o.status,
                        date: o.createdAt,
                    })),
                    topVendors: topVendors.map((v, i) => ({
                        rank: i + 1,
                        id: v.vendorId,
                        name: v.vendorName,
                        revenue: v._sum.totalPriceINR || 0,
                        orders: v._count.id,
                    })),
                },
            },
        });
    } catch (error) {
        console.error('Error fetching overview report:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

// ============================================
// GET SALES REPORT
// ============================================
const getSalesReport = async (req, res) => {
    try {
        const { period = '30days' } = req.query;
        const { start, end } = getDateRange(period);
        const { start: prevStart, end: prevEnd } = getPrevDateRange(period);

        const [
            paidOrders,
            prevPaidOrders,
            dailySales,
            topProducts,
        ] = await Promise.all([
            prisma.order.findMany({
                where: { createdAt: { gte: start, lte: end }, paymentStatus: 'PAID' },
                select: { totalAmountINR: true, subtotal: true, taxINR: true, discountINR: true, createdAt: true },
            }),
            prisma.order.findMany({
                where: { createdAt: { gte: prevStart, lte: prevEnd }, paymentStatus: 'PAID' },
                select: { totalAmountINR: true },
            }),
            // Daily sales breakdown
            prisma.order.findMany({
                where: { createdAt: { gte: start, lte: end } },
                select: { totalAmountINR: true, createdAt: true, paymentStatus: true },
                orderBy: { createdAt: 'asc' },
            }),
            // Top selling products
            prisma.orderItem.groupBy({
                by: ['productId', 'productName'],
                where: { order: { createdAt: { gte: start, lte: end } } },
                _sum: { totalPriceINR: true, quantity: true },
                _count: { id: true },
                // Ordering by the raw sum would rank INR products ~83x above USD ones.
                orderBy: { _sum: { totalPriceINR: 'desc' } },
                take: 10,
            }),
        ]);

        const totalRevenue = paidOrders.reduce((s, o) => s + (o.totalAmountINR || 0), 0);
        const prevRevenue = prevPaidOrders.reduce((s, o) => s + (o.totalAmountINR || 0), 0);
        const totalTax = paidOrders.reduce((s, o) => s + (o.taxINR || 0), 0);
        const totalDiscount = paidOrders.reduce((s, o) => s + (o.discountINR || 0), 0);

        // Group daily sales
        const dayMap = {};
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dailySales.forEach(o => {
            const d = new Date(o.createdAt);
            const key = dayNames[d.getDay()];
            if (!dayMap[key]) dayMap[key] = { day: key, sales: 0, orders: 0 };
            if (o.paymentStatus === 'PAID') dayMap[key].sales += (o.totalAmountINR || 0);
            dayMap[key].orders += 1;
        });

        res.json({
            success: true,
            data: {
                metrics: {
                    totalRevenue: { current: totalRevenue, previous: prevRevenue },
                    totalTax,
                    totalDiscount,
                    avgOrderValue: paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0,
                    orderCount: paidOrders.length,
                },
                charts: {
                    dailySalesTrend: Object.values(dayMap),
                },
                tables: {
                    topProducts: topProducts.map(p => ({
                        name: p.productName,
                        revenue: p._sum.totalPriceINR || 0,
                        quantity: p._sum.quantity || 0,
                        orders: p._count.id,
                    })),
                },
            },
        });
    } catch (error) {
        console.error('Error fetching sales report:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

// ============================================
// GET ORDERS REPORT
// ============================================
const getOrdersReport = async (req, res) => {
    try {
        const { period = '30days' } = req.query;
        const { start, end } = getDateRange(period);

        const [
            allOrders,
            statusBreakdown,
            recentOrders,
        ] = await Promise.all([
            prisma.order.count({ where: { createdAt: { gte: start, lte: end } } }),
            prisma.order.groupBy({
                by: ['status'],
                where: { createdAt: { gte: start, lte: end } },
                _count: true,
            }),
            prisma.order.findMany({
                where: { createdAt: { gte: start, lte: end } },
                orderBy: { createdAt: 'desc' },
                take: 20,
                select: {
                    id: true,
                    orderId: true,
                    customerName: true,
                    totalAmount: true,
                    // totalAmount is meaningless without the currency it is quoted in,
                    // and the INR equivalent needs the order's own rate snapshot.
                    currency: true,
                    exchangeRate: true,
                    status: true,
                    paymentStatus: true,
                    createdAt: true,
                    items: { select: { vendorName: true }, take: 1 },
                },
            }),
        ]);

        const delivered = statusBreakdown.find(s => s.status === 'DELIVERED')?._count || 0;
        const processing = statusBreakdown.find(s => s.status === 'VENDOR_PROCESSING')?._count || 0;
        const created = statusBreakdown.find(s => s.status === 'ORDER_CREATED')?._count || 0;
        const cancelled = statusBreakdown.find(s => s.status === 'CANCELLED')?._count || 0;

        res.json({
            success: true,
            data: {
                metrics: {
                    total: allOrders,
                    delivered,
                    processing: processing + created,
                    cancelled,
                },
                charts: {
                    statusBreakdown: statusBreakdown.map(s => ({
                        status: s.status,
                        count: s._count,
                    })),
                },
                tables: {
                    orders: recentOrders.map(o => ({
                        id: o.orderId,
                        customer: o.customerName,
                        vendor: o.items[0]?.vendorName || '-',
                        amount: o.totalAmount,
                        // amount is in the order's OWN currency, so it cannot be rendered
                        // without these two — getOverviewReport sends them for the same
                        // reason. Omitting them made the UI fall back to a hardcoded ₹,
                        // printing a $9.39 order as ₹9.39.
                        currency: o.currency,
                        exchangeRate: o.exchangeRate,
                        status: o.status,
                        paymentStatus: o.paymentStatus,
                        date: o.createdAt,
                        internalId: o.id,
                    })),
                },
            },
        });
    } catch (error) {
        console.error('Error fetching orders report:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

// ============================================
// GET SETTLEMENT REPORT
// ============================================
const getSettlementReport = async (req, res) => {
    try {
        const { period = '30days' } = req.query;
        const { start, end } = getDateRange(period);

        const [settlements, statusBreakdown] = await Promise.all([
            prisma.settlement.findMany({
                where: { createdAt: { gte: start, lte: end } },
                orderBy: { createdAt: 'desc' },
                take: 30,
                select: {
                    id: true,
                    settlementNumber: true,
                    vendorId: true,
                    vendorName: true,
                    amount: true,
                    status: true,
                    dueDate: true,
                    createdAt: true,
                    orderId: true,
                },
            }),
            prisma.settlement.groupBy({
                by: ['status'],
                where: { createdAt: { gte: start, lte: end } },
                _count: true,
                _sum: { amount: true },
            }),
        ]);

        const totalSettled = statusBreakdown.find(s => s.status === 'Paid')?._sum?.amount || 0;
        const totalPending = statusBreakdown.find(s => s.status === 'Pending')?._sum?.amount || 0;
        const totalProcessing = statusBreakdown.find(s => s.status === 'Processing')?._sum?.amount || 0;
        const totalAmount = settlements.reduce((s, x) => s + x.amount, 0);

        res.json({
            success: true,
            data: {
                metrics: {
                    totalAmount,
                    totalSettled,
                    totalPending,
                    totalProcessing,
                    count: settlements.length,
                },
                tables: {
                    settlements: settlements.map(s => ({
                        id: s.settlementNumber || s.id,
                        vendor: s.vendorName || '-',
                        amount: s.amount,
                        status: s.status,
                        dueDate: s.dueDate,
                        date: s.createdAt,
                        orderId: s.orderId,
                    })),
                },
            },
        });
    } catch (error) {
        console.error('Error fetching settlement report:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

// ============================================
// GET VENDOR REPORT
// ============================================
const getVendorsReport = async (req, res) => {
    try {
        const { period = '30days' } = req.query;
        const { start, end } = getDateRange(period);

        const [
            allVendors,
            topVendors,
            newVendors,
            referralGroups,
        ] = await Promise.all([
            prisma.vendor.count({ where: { status: 'APPROVED' } }),
            prisma.orderItem.groupBy({
                by: ['vendorId', 'vendorName'],
                where: { order: { createdAt: { gte: start, lte: end } } },
                _sum: { totalPriceINR: true },
                _count: { id: true },
                // Ordering by the raw sum would rank INR vendors ~83x above USD ones.
                orderBy: { _sum: { totalPriceINR: 'desc' } },
                take: 10,
            }),
            prisma.vendor.count({ where: { createdAt: { gte: start, lte: end } } }),
            // Acquisition channels are deliberately ALL-TIME, not period-scoped:
            // "where do most vendors come from" is a lifetime question, and a
            // 30-day window would render a near-empty chart on most days.
            prisma.vendor.groupBy({
                by: ['referralSource'],
                _count: { id: true },
            }),
        ]);

        // Shape for the chart. Vendors registered before this field existed have a
        // null source — surfaced honestly as "Not recorded" rather than dropped, so
        // the totals still reconcile against the vendor count.
        const REFERRAL_COLORS = {
            'google': '#4285f4',
            'online-ads': '#f59e0b',
            'linkedin': '#0a66c2',
            'instagram': '#e1306c',
            'facebook': '#1877f2',
            'youtube': '#ff0000',
            'referral': '#10b981',
            'trade-show': '#8b5cf6',
            'others': '#6b7280',
        };
        const referralSourceData = referralGroups
            .map((g) => ({
                key: g.referralSource || 'not-recorded',
                name: g.referralSource
                    ? (REFERRAL_SOURCE_LABELS[g.referralSource] || g.referralSource)
                    : 'Not recorded',
                value: g._count.id,
                color: g.referralSource ? (REFERRAL_COLORS[g.referralSource] || '#6b7280') : '#cbd5e1',
            }))
            .sort((a, b) => b.value - a.value);

        res.json({
            success: true,
            data: {
                metrics: {
                    totalActive: allVendors,
                    newThisPeriod: newVendors,
                },
                charts: {
                    referralSourceData,
                },
                tables: {
                    topVendors: topVendors.map((v, i) => ({
                        rank: i + 1,
                        id: v.vendorId,
                        name: v.vendorName,
                        revenue: v._sum.totalPriceINR || 0,
                        orders: v._count.id,
                    })),
                },
            },
        });
    } catch (error) {
        console.error('Error fetching vendors report:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

// ============================================
// GET PRODUCTS REPORT
// ============================================
const getProductsReport = async (req, res) => {
    try {
        const { period = '30days' } = req.query;
        const { start, end } = getDateRange(period);

        const [
            totalProducts,
            approvedProducts,
            pendingProducts,
            lowStockProducts,
            topSellingProducts,
        ] = await Promise.all([
            prisma.product.count({ where: { status: 'ACTIVE' } }),
            prisma.product.count({ where: { approvalStatus: 'APPROVED' } }),
            prisma.product.count({ where: { approvalStatus: 'PENDING' } }),
            prisma.product.findMany({
                where: { totalStock: { lte: 10 }, status: 'ACTIVE' },
                select: { id: true, name: true, totalStock: true, lowStockThreshold: true, baseSku: true },
                take: 10,
                orderBy: { totalStock: 'asc' },
            }),
            prisma.orderItem.groupBy({
                by: ['productId', 'productName'],
                where: { order: { createdAt: { gte: start, lte: end } } },
                _sum: { totalPriceINR: true, quantity: true },
                orderBy: { _sum: { totalPriceINR: 'desc' } },
                take: 10,
            }),
        ]);

        res.json({
            success: true,
            data: {
                metrics: {
                    total: totalProducts,
                    approved: approvedProducts,
                    pending: pendingProducts,
                    lowStock: lowStockProducts.length,
                },
                tables: {
                    lowStockProducts,
                    topSellingProducts: topSellingProducts.map(p => ({
                        name: p.productName,
                        revenue: p._sum.totalPriceINR || 0,
                        quantity: p._sum.quantity || 0,
                    })),
                },
            },
        });
    } catch (error) {
        console.error('Error fetching products report:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

// ============================================
// GET CUSTOMERS REPORT
// ============================================
const getCustomersReport = async (req, res) => {
    try {
        const { period = '30days' } = req.query;
        const { start, end } = getDateRange(period);
        const { start: prevStart, end: prevEnd } = getPrevDateRange(period);

        const [
            totalCustomers,
            newCustomers,
            prevNewCustomers,
            topCustomers,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { createdAt: { gte: start, lte: end } } }),
            prisma.user.count({ where: { createdAt: { gte: prevStart, lte: prevEnd } } }),
            prisma.order.groupBy({
                by: ['customerId', 'customerName', 'customerEmail'],
                where: { createdAt: { gte: start, lte: end }, paymentStatus: 'PAID' },
                _sum: { totalAmountINR: true },
                _count: { id: true },
                // Ordering by the raw sum would rank INR customers ~83x above USD ones.
                orderBy: { _sum: { totalAmountINR: 'desc' } },
                take: 10,
            }),
        ]);

        res.json({
            success: true,
            data: {
                metrics: {
                    total: totalCustomers,
                    new: { current: newCustomers, previous: prevNewCustomers },
                },
                tables: {
                    topCustomers: topCustomers.map((c, i) => ({
                        rank: i + 1,
                        name: c.customerName,
                        email: c.customerEmail,
                        revenue: c._sum.totalAmountINR || 0,
                        orders: c._count.id,
                    })),
                },
            },
        });
    } catch (error) {
        console.error('Error fetching customers report:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

// ============================================
// GET FINANCIAL REPORT
// ============================================
const getFinancialReport = async (req, res) => {
    try {
        const { period = '30days' } = req.query;
        const { start, end } = getDateRange(period);

        // Monthly financials for last 6 months
        const orders6M = await prisma.order.findMany({
            where: {
                createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 6)), lte: end },
            },
            select: { totalAmountINR: true, taxINR: true, discountINR: true, shippingCostINR: true, subtotal: true, paymentStatus: true, createdAt: true },
        });

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthMap = {};
        orders6M.forEach(o => {
            const d = new Date(o.createdAt);
            const key = `${monthNames[d.getMonth()]}`;
            if (!monthMap[key]) monthMap[key] = { month: key, revenue: 0, expenses: 0, profit: 0 };
            if (o.paymentStatus === 'PAID') {
                monthMap[key].revenue += (o.totalAmountINR || 0);
                monthMap[key].expenses += (o.taxINR || 0) + (o.shippingCostINR || 0);
                monthMap[key].profit += (o.totalAmountINR || 0) - (o.taxINR || 0) - (o.shippingCostINR || 0);
            }
        });

        const periodOrders = orders6M.filter(o => new Date(o.createdAt) >= start);
        const totalRevenue = periodOrders.filter(o => o.paymentStatus === 'PAID').reduce((s, o) => s + (o.totalAmountINR || 0), 0);
        const totalTax = periodOrders.reduce((s, o) => s + (o.taxINR || 0), 0);
        const totalShipping = periodOrders.reduce((s, o) => s + (o.shippingCostINR || 0), 0);
        const totalDiscount = periodOrders.reduce((s, o) => s + (o.discountINR || 0), 0);

        res.json({
            success: true,
            data: {
                metrics: {
                    totalRevenue,
                    totalTax,
                    totalShipping,
                    totalDiscount,
                    netRevenue: totalRevenue - totalTax - totalShipping,
                },
                charts: {
                    monthlyFinancials: Object.values(monthMap),
                },
            },
        });
    } catch (error) {
        console.error('Error fetching financial report:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

// ============================================
// GET QC FACTORY REPORTS
// ============================================
const getQcFactoryReports = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 100);
        const search = (req.query.search || '').trim();
        const result = (req.query.result || '').trim().toUpperCase();
        const sortBy = req.query.sortBy === 'createdAt' ? 'createdAt' : 'completedAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
        const skip = (page - 1) * limit;

        // Only inspections the admin has FINALISED belong in QC Reports. Both
        // admin decisions land on COMPLETED (approve → result PASSED, final
        // reject → result FAILED). SUBMITTED / UNDER_ADMIN_REVIEW / REJECTED are
        // still in the Re-Inspection Review queue (pending admin action) and must
        // not surface here until the admin acts.
        const where = { status: 'COMPLETED' };
        if (result === 'PASSED' || result === 'FAILED') where.result = result;
        if (search) {
            where.OR = [
                { vendor: { is: { companyName: { contains: search, mode: 'insensitive' } } } },
                { vendor: { is: { email: { contains: search, mode: 'insensitive' } } } },
                { clientName: { contains: search, mode: 'insensitive' } },
                { checker: { is: { name: { contains: search, mode: 'insensitive' } } } },
            ];
        }

        const [inspections, total] = await Promise.all([
            prisma.inspection.findMany({
                where,
                select: {
                    id: true,
                    status: true,
                    result: true,
                    inspectionType: true,
                    createdAt: true,
                    completedAt: true,
                    vendor: { select: { id: true, vendorCode: true, companyName: true, email: true } },
                    checker: { select: { id: true, name: true, title: true, email: true } },
                },
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit,
            }),
            prisma.inspection.count({ where }),
        ]);

        res.json({
            success: true,
            data: inspections,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.max(Math.ceil(total / limit), 1),
            },
        });
    } catch (error) {
        console.error('Error fetching QC factory reports:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

// ============================================
// GET QC PRODUCT REPORTS
// ============================================
const getQcProductReports = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 100);
        const search = (req.query.search || '').trim();
        const status = (req.query.status || '').trim().toUpperCase();
        const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
        const skip = (page - 1) * limit;

        const where = { qcInspectionData: { not: null } };
        if (['APPROVED', 'REJECTED', 'REINSPECTION', 'QC_APPROVED', 'PENDING'].includes(status)) {
            where.approvalStatus = status;
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { baseSku: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
                { vendor: { is: { companyName: { contains: search, mode: 'insensitive' } } } },
            ];
        }

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    baseSku: true,
                    category: true,
                    approvalStatus: true,
                    rejectionReason: true,
                    updatedAt: true,
                    qcInspectionData: true, // needed to extract finalDecision; stripped before response
                    vendor: { select: { id: true, vendorCode: true, companyName: true, email: true } },
                },
                orderBy: { updatedAt: sortOrder },
                skip,
                take: limit,
            }),
            prisma.product.count({ where }),
        ]);

        // Strip the heavy qcInspectionData JSON (can contain base64 photos) — surface
        // only the QC checker's actual decision. Prefer inspectionStatus (the real
        // Review-step decision); the legacy finalDecision was hard-coded "Approved".
        const slim = products.map((p) => {
            const qc = p.qcInspectionData && typeof p.qcInspectionData === 'object' ? p.qcInspectionData : null;
            const qcDecision = qc ? (qc.inspectionStatus || qc.finalDecision || null) : null;
            // eslint-disable-next-line no-unused-vars
            const { qcInspectionData, ...rest } = p;
            return { ...rest, qcDecision, finalDecision: qcDecision };
        });

        res.json({
            success: true,
            data: slim,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.max(Math.ceil(total / limit), 1),
            },
        });
    } catch (error) {
        console.error('Error fetching QC product reports:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

module.exports = {
    getOverviewReport,
    getSalesReport,
    getOrdersReport,
    getSettlementReport,
    getVendorsReport,
    getProductsReport,
    getCustomersReport,
    getFinancialReport,
    getQcFactoryReports,
    getQcProductReports,
};
