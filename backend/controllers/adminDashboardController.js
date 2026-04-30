const { prisma } = require('../config/database');

const getDashboardStats = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const yearStart = new Date(currentYear, 0, 1);
        const yearEnd = new Date(currentYear + 1, 0, 1);

        // Run ALL queries in parallel — biggest performance win
        const [
            totalVendors,
            totalCustomers,
            totalOrders,
            totalIncomeAgg,
            monthlyOrders,
            recentOrders,
            topProducts,
            recentVendors,
            recentProducts,
            restocks,
            categorySales,
        ] = await Promise.all([
            // 1. Counts
            prisma.vendor.count(),
            prisma.user.count(),
            prisma.order.count(),

            // 2. Total income via aggregate (no full table scan)
            prisma.order.aggregate({ _sum: { totalAmount: true } }),

            // 3. Monthly earnings — only fetch current year orders (not ALL orders)
            prisma.order.findMany({
                where: { createdAt: { gte: yearStart, lt: yearEnd } },
                select: { totalAmount: true, createdAt: true },
            }),

            // 4. Recent orders
            prisma.order.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: { items: { select: { productName: true }, take: 1 } },
            }),

            // 5. Top selling products (single groupBy — no duplicate)
            prisma.orderItem.groupBy({
                by: ['productId', 'productName'],
                _sum: { quantity: true, totalPrice: true },
                orderBy: { _sum: { quantity: 'desc' } },
                take: 6,
            }),

            // 6. Recent vendors
            prisma.vendor.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: { id: true, companyName: true, email: true, status: true, createdAt: true, ownerName: true, vendorType: true },
            }),

            // 7. Recent products
            prisma.product.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: { vendor: { select: { companyName: true } } },
            }),

            // 8. Recent restocks
            prisma.stockChangeHistory.findMany({
                where: { changeAmount: { gt: 0 } },
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: { inventory: { select: { name: true, vendor: { select: { companyName: true } } } } },
            }),

            // 9. Sales by category (reuse single groupBy + product lookup)
            prisma.orderItem.groupBy({
                by: ['productId'],
                _sum: { quantity: true, totalPrice: true },
            }),
        ]);

        const totalIncome = totalIncomeAgg._sum.totalAmount || 0;

        // Monthly earnings — computed from current year orders only (not all orders)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyEarnings = Array(12).fill(0);
        for (const order of monthlyOrders) {
            monthlyEarnings[new Date(order.createdAt).getMonth()] += (order.totalAmount || 0);
        }
        const earningsData = months.map((name, i) => ({ name, total: monthlyEarnings[i] }));

        // Sales by category — build map from groupBy + product lookup
        const productIds = categorySales.map(cs => cs.productId);
        const relatedProducts = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, category: true },
        });
        const prodCatMap = new Map(relatedProducts.map(p => [p.id, p.category || 'Others']));
        const categoryMap = {};
        let totalSalesOverall = 0;
        for (const cs of categorySales) {
            const cat = prodCatMap.get(cs.productId) || 'Others';
            const amount = cs._sum.totalPrice || 0;
            categoryMap[cat] = (categoryMap[cat] || 0) + amount;
            totalSalesOverall += amount;
        }
        const salesByCategory = Object.entries(categoryMap).map(([name, amount]) => ({
            name,
            amount,
            value: totalSalesOverall ? Math.round((amount / totalSalesOverall) * 100) : 0,
        }));

        res.json({
            stats: { totalEarnings: totalIncome, totalVendors, totalCustomers, totalOrders, totalIncome },
            earningsData,
            salesByCategory,
            recentOrders: recentOrders.map(o => ({
                id: o.id, orderId: o.orderId, customerName: o.customerName, customerEmail: o.customerEmail,
                totalAmount: o.totalAmount, status: o.status, date: o.createdAt,
                productName: o.items?.[0]?.productName || 'Multiple Items',
            })),
            topProducts: topProducts.map(item => ({
                id: item.productId, name: item.productName,
                sales: item._sum.quantity, revenue: item._sum.totalPrice,
            })),
            recentVendors,
            recentProducts: recentProducts.map(p => ({
                id: p.id, name: p.name, category: p.category, price: p.basePrice,
                vendorName: p.vendor?.companyName, createdAt: p.createdAt, stock: p.totalStock, status: p.status,
            })),
            recentRestocks: restocks.map(r => ({
                id: r.id, productName: r.inventory?.name, vendorName: r.inventory?.vendor?.companyName,
                quantityAdded: r.changeAmount, previousStock: r.previousStock, newStock: r.newStock, date: r.createdAt,
            })),
        });
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {
    getDashboardStats
};
