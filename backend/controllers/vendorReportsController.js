const { prisma } = require('../config/database');
const { attachVendorPrices } = require('../utils/vendorPricing');
const { pickGranularity, buildBuckets, makeIndexer } = require('../utils/trendBuckets');

// Fields needed to derive the vendor price for a line item.
const VENDOR_PRICE_SELECT = { productId: true, variantId: true, quantity: true, unitPrice: true };

// Helper: get date range based on period string
const getDateRange = (period) => {
    const now = new Date();
    const start = new Date();

    switch (period) {
        case 'today':
            start.setHours(0, 0, 0, 0);
            break;
        case 'last7days': // handle VendorReports.tsx string options
        case '7days':
            start.setDate(now.getDate() - 7);
            break;
        case 'Last 30 Days':
        case '30days':
        default:
            start.setDate(now.getDate() - 30);
            break;
        case 'Last 3 Months':
        case '3months':
            start.setMonth(now.getMonth() - 3);
            break;
        case 'Last 6 Months':
        case '6months':
            start.setMonth(now.getMonth() - 6);
            break;
        case 'Last Year':
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

// Helper: resolve the active date range from query params.
// A custom startDate/endDate (YYYY-MM-DD) takes precedence over the period preset.
const resolveRange = (query) => {
    const { startDate, endDate, period = '30days' } = query;
    if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const length = end - start;
            return { start, end, prevStart: new Date(start - length), prevEnd: start };
        }
    }
    const { start, end } = getDateRange(period);
    const { start: prevStart, end: prevEnd } = getPrevDateRange(period);
    return { start, end, prevStart, prevEnd };
};

const getVendorOverviewReport = async (req, res) => {
    try {
        const vendorId = req.vendorId || req.userId;
        const { start, end, prevStart, prevEnd } = resolveRange(req.query);

        const dateFilter = { gte: start, lte: end };
        const prevDateFilter = { gte: prevStart, lte: prevEnd };

        const [
            currentItems,
            prevItems,
            currentOrders,
            prevOrders,
            currentProducts,
            stockAggregate,
            topItems,
            statusDistribution,
            revenueOverTime
        ] = await Promise.all([
            // current revenue items
            prisma.orderItem.findMany({
                where: { vendorId, order: { createdAt: dateFilter, paymentStatus: 'PAID' } },
                select: VENDOR_PRICE_SELECT
            }),
            // prev revenue items
            prisma.orderItem.findMany({
                where: { vendorId, order: { createdAt: prevDateFilter, paymentStatus: 'PAID' } },
                select: VENDOR_PRICE_SELECT
            }),
            // current orders
            prisma.order.count({ where: { items: { some: { vendorId } }, createdAt: dateFilter } }),
            // prev orders
            prisma.order.count({ where: { items: { some: { vendorId } }, createdAt: prevDateFilter } }),
            // Total products listed by vendor
            prisma.product.count({ where: { vendorId } }),
            // Total stock on hand across all vendor products
            prisma.product.aggregate({ where: { vendorId }, _sum: { totalStock: true } }),
            // Top selling products — aggregated in JS on the vendor price below
            prisma.orderItem.findMany({
                where: { vendorId, order: { createdAt: dateFilter } },
                select: { ...VENDOR_PRICE_SELECT, productName: true }
            }),
            // order status distribution
            prisma.order.groupBy({
                by: ['status'],
                where: { items: { some: { vendorId } }, createdAt: dateFilter },
                _count: true,
            }),
            // Revenue over time — within the SELECTED range so the trend graph
            // reflects the active filter (was hardcoded to the last 6 months).
            prisma.orderItem.findMany({
                where: { vendorId, order: { createdAt: dateFilter, paymentStatus: 'PAID' } },
                select: { ...VENDOR_PRICE_SELECT, order: { select: { createdAt: true } } }
            })
        ]);

        // Derive vendor price on every item set before any revenue math.
        await Promise.all([
            attachVendorPrices(currentItems),
            attachVendorPrices(prevItems),
            attachVendorPrices(topItems),
            attachVendorPrices(revenueOverTime),
        ]);

        const currentRevenue = currentItems.reduce((sum, item) => sum + (item.vendorTotalPrice || 0), 0);
        const prevRevenue = prevItems.reduce((sum, item) => sum + (item.vendorTotalPrice || 0), 0);

        const totalStock = stockAggregate?._sum?.totalStock || 0;

        // Top selling products by vendor revenue
        const topMap = new Map();
        topItems.forEach(item => {
            const cur = topMap.get(item.productId) || { productId: item.productId, productName: item.productName, quantity: 0, revenue: 0 };
            cur.quantity += item.quantity || 0;
            cur.revenue += item.vendorTotalPrice || 0;
            topMap.set(item.productId, cur);
        });
        const topSellingProducts = Array.from(topMap.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        // Build the revenue trend over the SELECTED range using the shared
        // bucketing logic (same as the dashboard chart): contiguous, zero-filled
        // buckets at an adaptive granularity (daily ≤31d, weekly ≤92d, else
        // monthly), so every date/month in the range is represented.
        const spanDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        const granularity = pickGranularity(spanDays);
        const multiYear = start.getFullYear() !== end.getFullYear();
        const revBuckets = buildBuckets(granularity, start, end, multiYear);
        const revByBucket = new Array(revBuckets.length).fill(0);
        const revIndexFor = makeIndexer(granularity, revBuckets);
        revenueOverTime.forEach(item => {
            const idx = revIndexFor(new Date(item.order.createdAt));
            if (idx < 0 || idx >= revBuckets.length) return;
            revByBucket[idx] += item.vendorTotalPrice || 0;
        });
        const revenueChartData = revBuckets.map((b, i) => ({
            period: b.label,
            revenue: Math.round(revByBucket[i] * 100) / 100,
        }));

        // Order status chart data
        const STATUS_COLORS = {
            DELIVERED: '#10b981',
            ORDER_CREATED: '#3b82f6',
            VENDOR_PROCESSING: '#f59e0b',
            CANCELLED: '#ef4444',
            PROCESSING: '#3b82f6',
            PENDING: '#eab308'
        };
        const orderStatusData = statusDistribution.map(s => {
            const count = s._count;
            return {
                status: s.status.replace(/_/g, ' '),
                count,
                percentage: currentOrders > 0 ? Math.round((count / currentOrders) * 100) : 0,
                color: STATUS_COLORS[s.status] || '#8b5cf6'
            };
        });

        // Resolve top product inventory and ratings
        const topProductsData = await Promise.all(topSellingProducts.map(async p => {
            const product = await prisma.product.findUnique({
                where: { id: p.productId },
                select: { totalStock: true, rating: true }
            });
            return {
                name: p.productName,
                sales: p.quantity || 0,
                revenue: p.revenue || 0,
                stock: product?.totalStock ?? 0,
                trend: 0, // Mock trend for now
                rating: product?.rating || 0
            };
        }));

        // Drill-down tables backing each metric card. Built from the same range
        // filter so the table below the cards always matches the selected metric.
        const [revenueItemRows, orderRows, productRows] = await Promise.all([
            prisma.orderItem.findMany({
                where: { vendorId, order: { createdAt: dateFilter, paymentStatus: 'PAID' } },
                include: { order: { select: { orderId: true, createdAt: true } } },
                orderBy: { order: { createdAt: 'desc' } },
                take: 200,
            }),
            prisma.order.findMany({
                where: { items: { some: { vendorId } }, createdAt: dateFilter },
                select: { orderId: true, status: true, createdAt: true, items: { where: { vendorId }, select: VENDOR_PRICE_SELECT } },
                orderBy: { createdAt: 'desc' },
                take: 200,
            }),
            prisma.product.findMany({
                where: { vendorId },
                select: { name: true, baseSku: true, category: true, basePrice: true, totalStock: true, status: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN');

        // Derive vendor price for the drill-down rows too.
        await attachVendorPrices(revenueItemRows);
        await Promise.all(orderRows.map(o => attachVendorPrices(o.items)));

        const revenueTable = revenueItemRows.map(item => ({
            'Order ID': item.order?.orderId || '—',
            Product: item.productName,
            Quantity: item.quantity,
            Amount: item.vendorTotalPrice || 0,
            Date: fmtDate(item.order?.createdAt),
        }));

        const ordersTable = orderRows.map(o => ({
            'Order ID': o.orderId,
            Status: o.status.replace(/_/g, ' '),
            Amount: o.items.reduce((s, i) => s + (i.vendorTotalPrice || 0), 0),
            Date: fmtDate(o.createdAt),
        }));

        const stockTable = productRows.map(p => ({
            Product: p.name,
            SKU: p.baseSku,
            Stock: p.totalStock,
            Status: p.status,
        }));

        const productsTable = productRows.map(p => ({
            Product: p.name,
            Category: p.category,
            'Base Price': p.basePrice,
            Stock: p.totalStock,
            Status: p.status,
            'Listed On': fmtDate(p.createdAt),
        }));

        res.json({
            success: true,
            data: {
                metrics: {
                    revenue: { current: currentRevenue, previous: prevRevenue },
                    orders: { current: currentOrders, previous: prevOrders },
                    totalStock: { current: totalStock, previous: totalStock },
                    productsListed: { current: currentProducts, previous: currentProducts }
                },
                charts: {
                    revenueChartData,
                    orderStatusData
                },
                tables: {
                    topProducts: topProductsData,
                    revenue: revenueTable,
                    orders: ordersTable,
                    stock: stockTable,
                    products: productsTable
                }
            }
        });

    } catch (error) {
        console.error('Error fetching vendor overview report:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};

const getVendorOrdersReport = async (req, res) => {
    try {
        const vendorId = req.vendorId || req.userId;
        const { start, end } = resolveRange(req.query);

        const filter = { vendorId, order: { createdAt: { gte: start, lte: end } } };

        const [orders, statusGroup] = await Promise.all([
            prisma.orderItem.findMany({
                where: filter,
                include: { order: true },
                orderBy: { order: { createdAt: 'desc' } },
                take: 50
            }),
            prisma.order.groupBy({
                by: ['status'],
                where: { items: { some: { vendorId } }, createdAt: { gte: start, lte: end } },
                _count: true,
            })
        ]);

        await attachVendorPrices(orders);

        const totalItems = orders.length;
        const totalRevenue = orders.reduce((sum, item) => sum + (item.vendorTotalPrice || 0), 0);

        const mappedOrders = orders.map(item => ({
            orderId: item.order.orderId,
            product: item.productName,
            quantity: item.quantity,
            amount: item.vendorTotalPrice || 0,
            date: item.order.createdAt,
            status: item.order.status.replace(/_/g, ' ')
        }));

        const STATUS_COLORS = { DELIVERED: 'bg-green-500', ORDER_CREATED: 'bg-blue-500', VENDOR_PROCESSING: 'bg-yellow-500', CANCELLED: 'bg-red-500' };

        const orderStatusData = statusGroup.map(s => {
            const count = s._count;
            return {
                status: s.status.replace(/_/g, ' '),
                count,
                percentage: totalItems > 0 ? Math.round((count / statusGroup.reduce((a, b) => a + b._count, 0)) * 100) : 0,
                color: STATUS_COLORS[s.status] || 'bg-purple-500'
            };
        });

        // Daily trend mock (using monthly graph trick or real)
        const dailyMap = {};
        orders.forEach(item => {
            const d = new Date(item.order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (!dailyMap[d]) dailyMap[d] = { period: d, orders: 0 };
            dailyMap[d].orders++;
        });

        res.json({
            success: true,
            data: {
                metrics: {
                    orders: statusGroup.reduce((a, b) => a + b._count, 0),
                    avgOrderValue: statusGroup.reduce((a, b) => a + b._count, 0) > 0 ? totalRevenue / statusGroup.reduce((a, b) => a + b._count, 0) : 0
                },
                tables: {
                    orders: mappedOrders
                },
                charts: {
                    orderStatusData,
                    volumeTrend: Object.values(dailyMap)
                }
            }
        });

    } catch (err) {
        console.error('Error in vendor orders report', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};


module.exports = {
    getVendorOverviewReport,
    getVendorOrdersReport
};
