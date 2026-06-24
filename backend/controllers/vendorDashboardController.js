const { prisma } = require('../config/database');
const { attachVendorPrices } = require('../utils/vendorPricing');
const { startOfDay, endOfDay, pickGranularity, buildBuckets, makeIndexer } = require('../utils/trendBuckets');

const getVendorDashboardStats = async (req, res) => {
    try {
        const vendorId = req.userId; // Provided by authenticateToken middleware

        // Run all independent queries in parallel
        const [totalProducts, orderItems, recentProductsList, recentOrdersGrouped] = await Promise.all([
            // 1. Total products
            prisma.product.count({
                where: { vendorId }
            }),
            // 2. Total orders and Revenue
            prisma.orderItem.findMany({
                where: { vendorId },
                include: {
                    order: {
                        select: { createdAt: true }
                    }
                }
            }),
            // 3. Recent products (with primary thumbnail for the dashboard preview)
            prisma.product.findMany({
                where: { vendorId },
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    images: {
                        take: 1,
                        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                        select: { url: true }
                    }
                }
            }),
            // 4. Recent orders
            prisma.orderItem.findMany({
                where: { vendorId },
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: {
                    order: {
                        select: {
                            id: true,
                            orderId: true,
                            customerName: true,
                            totalAmount: true,
                            status: true,
                            createdAt: true
                        }
                    }
                }
            })
        ]);

        // Revenue/earnings shown to the vendor must use the VENDOR price (what they
        // get paid), not the admin/customer selling price stored on the order item.
        await attachVendorPrices(orderItems);
        await attachVendorPrices(recentOrdersGrouped);

        const orderIds = new Set(orderItems.map(item => item.orderId));
        const totalOrdersCount = orderIds.size;

        const totalRevenue = orderItems.reduce((sum, item) => sum + (item.vendorTotalPrice || 0), 0);

        // Earnings chart (monthly data for the current year)
        const currentYear = new Date().getFullYear();
        const monthlyEarnings = Array(12).fill(0);
        orderItems.forEach(item => {
            const date = item.order && item.order.createdAt ? new Date(item.order.createdAt) : new Date(item.createdAt);
            if (date.getFullYear() === currentYear) {
                monthlyEarnings[date.getMonth()] += (item.vendorTotalPrice || 0);
            }
        });

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const analytics = {
            revenue: { current: totalRevenue, change: 0 }, // Simplified change logic for now
            orders: { current: totalOrdersCount, change: 0 }
        };

        const earningsData = months.map((month, index) => ({
            name: month,
            total: monthlyEarnings[index]
        }));

        // Dedup recent orders by orderId since multiple items could belong to the same order
        const recentOrderMap = new Map();
        recentOrdersGrouped.forEach(item => {
            if (item.order && !recentOrderMap.has(item.orderId)) {
                recentOrderMap.set(item.orderId, {
                    id: item.order.id, // we might need the internal id vs public orderId
                    // The vendor order detail page is keyed by VendorShipment id
                    // (not Order id) — link the dashboard preview to that.
                    shipmentId: item.shipmentId || null,
                    orderId: item.order.orderId,
                    customerName: item.order.customerName,
                    amount: item.vendorTotalPrice || 0, // vendor's own price, not the customer/admin price
                    status: item.order.status,
                    date: item.order.createdAt,
                    items: 1
                });
            } else if (item.order) {
                const existing = recentOrderMap.get(item.orderId);
                existing.items += 1;
                existing.amount += item.vendorTotalPrice || 0;
                recentOrderMap.set(item.orderId, existing);
            }
        });
        const recentOrdersList = Array.from(recentOrderMap.values()).slice(0, 5);

        res.json({
            stats: {
                totalProducts,
                totalRevenue,
                totalOrders: totalOrdersCount
            },
            analytics,
            earningsData,
            recentProducts: recentProductsList.map(p => ({
                id: p.id,
                name: p.name,
                category: p.category,
                sku: p.baseSku || '',
                price: p.basePrice || 0,
                stock: p.totalStock || 0,
                status: p.status,
                createdAt: p.createdAt,
                image: p.images?.[0]?.url || ''
            })),
            recentOrders: recentOrdersList.map(o => ({
                id: o.id,
                shipmentId: o.shipmentId,
                orderId: o.orderId,
                customerName: o.customerName,
                amount: o.amount,
                status: o.status,
                date: o.date,
                items: o.items
            }))
        });

    } catch (error) {
        console.error("Error fetching vendor dashboard stats:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Trend data for the Revenue & Orders charts, aggregated from real order
 * records for the authenticated vendor within the selected date range.
 * Query: ?range=last_week|last_month|last_3_months|last_year|last_3_years|custom
 *        &start=ISO&end=ISO  (start/end required only for custom)
 */
const getVendorDashboardChart = async (req, res) => {
    try {
        const vendorId = req.userId;
        const { range = 'last_year', start, end } = req.query;

        const now = new Date();
        let startDate;
        let endDate = endOfDay(now);
        let granularity;

        switch (range) {
            case 'this_week':
                // From the start of the current week (Sunday) through today.
                startDate = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()));
                granularity = 'day';
                break;
            case 'last_week':
                startDate = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
                granularity = 'day';
                break;
            case 'last_month':
                startDate = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
                granularity = 'day';
                break;
            case 'last_3_months':
                startDate = startOfDay(new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()));
                granularity = 'week';
                break;
            case 'last_year':
                startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
                granularity = 'month';
                break;
            case 'last_3_years':
                startDate = new Date(now.getFullYear(), now.getMonth() - 35, 1);
                granularity = 'month';
                break;
            case 'custom': {
                if (!start || !end) {
                    return res.status(400).json({ error: 'start and end are required for a custom range' });
                }
                let s = new Date(start);
                let e = new Date(end);
                if (isNaN(s.getTime()) || isNaN(e.getTime())) {
                    return res.status(400).json({ error: 'Invalid start or end date' });
                }
                // Validate / normalise: ensure start is not after end.
                if (s > e) {
                    const tmp = s;
                    s = e;
                    e = tmp;
                }
                startDate = startOfDay(s);
                endDate = endOfDay(e);
                const spanDays = Math.round((endDate - startDate) / 86400000);
                granularity = pickGranularity(spanDays);
                break;
            }
            default:
                startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
                granularity = 'month';
        }

        const multiYear = startDate.getFullYear() !== endDate.getFullYear();
        const buckets = buildBuckets(granularity, startDate, endDate, multiYear);

        // Pull only the records that fall inside the selected window. Select the
        // fields attachVendorPrices needs so revenue uses the VENDOR price (what
        // the vendor is paid) — never the admin/customer price.
        const orderItems = await prisma.orderItem.findMany({
            where: {
                vendorId,
                createdAt: { gte: startDate, lte: endDate },
            },
            select: { productId: true, variantId: true, quantity: true, unitPrice: true, orderId: true, createdAt: true },
        });
        await attachVendorPrices(orderItems);

        const revenue = new Array(buckets.length).fill(0);
        const orderSets = Array.from({ length: buckets.length }, () => new Set());

        const indexFor = makeIndexer(granularity, buckets);

        orderItems.forEach((item) => {
            const date = new Date(item.createdAt);
            const idx = indexFor(date);
            if (idx < 0 || idx >= buckets.length) return;
            revenue[idx] += item.vendorTotalPrice || 0;
            if (item.orderId) orderSets[idx].add(item.orderId);
        });

        const data = buckets.map((b, i) => ({
            name: b.label,
            revenue: Math.round(revenue[i] * 100) / 100,
            orders: orderSets[i].size,
        }));

        const hasData = data.some((d) => d.revenue > 0 || d.orders > 0);

        res.json({
            range,
            granularity,
            start: startDate,
            end: endDate,
            hasData,
            data,
        });
    } catch (error) {
        console.error('Error fetching vendor dashboard chart:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getVendorDashboardStats,
    getVendorDashboardChart
};
