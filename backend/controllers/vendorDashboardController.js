const { prisma } = require('../config/database');

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
            // 3. Recent products
            prisma.product.findMany({
                where: { vendorId },
                take: 5,
                orderBy: { createdAt: 'desc' }
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

        const orderIds = new Set(orderItems.map(item => item.orderId));
        const totalOrdersCount = orderIds.size;

        const totalRevenue = orderItems.reduce((sum, item) => sum + (item.totalPrice ? Number(item.totalPrice) : 0), 0);

        // Earnings chart (monthly data for the current year)
        const currentYear = new Date().getFullYear();
        const monthlyEarnings = Array(12).fill(0);
        orderItems.forEach(item => {
            const date = item.order && item.order.createdAt ? new Date(item.order.createdAt) : new Date(item.createdAt);
            if (date.getFullYear() === currentYear) {
                monthlyEarnings[date.getMonth()] += (item.totalPrice ? Number(item.totalPrice) : 0);
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
                    orderId: item.order.orderId,
                    customerName: item.order.customerName,
                    amount: item.totalPrice, // Note: For a vendor view, the "amount" might be only their part, so item.totalPrice instead of order.totalAmount
                    status: item.order.status,
                    date: item.order.createdAt,
                    items: 1
                });
            } else if (item.order) {
                const existing = recentOrderMap.get(item.orderId);
                existing.items += 1;
                existing.amount += item.totalPrice;
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
                price: p.basePrice || 0,
                stock: p.totalStock || 0,
                status: p.status,
                createdAt: p.createdAt,
                image: '' // Add image fetch if necessary
            })),
            recentOrders: recentOrdersList.map(o => ({
                id: o.id,
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

module.exports = {
    getVendorDashboardStats
};
