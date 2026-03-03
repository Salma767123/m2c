const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getDashboardStats = async (req, res) => {
    try {
        // 1. Total statistics
        const totalVendors = await prisma.vendor.count();
        const totalCustomers = await prisma.user.count();
        const totalOrders = await prisma.order.count();

        // Total income/earnings (sum of totalAmount from all orders where status is maybe not Cancelled)
        const orders = await prisma.order.findMany({
            select: { totalAmount: true, createdAt: true }
        });

        const totalIncome = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

        // 2. Earnings chart (monthly data for the current year)
        const currentYear = new Date().getFullYear();
        const monthlyEarnings = Array(12).fill(0);
        orders.forEach(order => {
            const date = new Date(order.createdAt);
            if (date.getFullYear() === currentYear) {
                monthlyEarnings[date.getMonth()] += (order.totalAmount || 0);
            }
        });

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const earningsData = months.map((month, index) => ({
            name: month,
            total: monthlyEarnings[index]
        }));

        // 3. Recent orders
        const recentOrders = await prisma.order.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                items: {
                    select: { productName: true }
                }
            }
        });

        // 4. Top selling products
        const orderItems = await prisma.orderItem.groupBy({
            by: ['productId', 'productName'],
            _sum: {
                quantity: true,
                totalPrice: true
            },
            orderBy: {
                _sum: {
                    quantity: 'desc'
                }
            },
            take: 6
        });

        // 5. Recent vendors
        const recentVendors = await prisma.vendor.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                companyName: true,
                email: true,
                status: true,
                createdAt: true,
                ownerName: true,
                vendorType: true
            }
        });

        // 6. Vendor recent products
        const recentProducts = await prisma.product.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                vendor: {
                    select: { companyName: true }
                }
            }
        });

        const restocks = await prisma.stockChangeHistory.findMany({
            where: {
                changeAmount: { gt: 0 } // only restocks, not reductions
            },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                inventory: {
                    select: { name: true, vendor: { select: { companyName: true } } }
                }
            }
        });

        // 8. Sales by Category
        const categorySales = await prisma.orderItem.groupBy({
            by: ['productId'],
            _sum: {
                quantity: true,
                totalPrice: true
            }
        });

        // We need to map product IDs to categories manually or write a complex query.
        // simpler approach: fetch products
        const productIds = categorySales.map(cs => cs.productId);
        const relatedProducts = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, category: true }
        });

        const categoryMap = {}; // categoryName -> totalSalesAmount
        let totalSalesOverall = 0;

        categorySales.forEach(cs => {
            const prod = relatedProducts.find(p => p.id === cs.productId);
            const cat = prod?.category || 'Others';
            const amount = cs._sum.totalPrice || 0;
            if (!categoryMap[cat]) categoryMap[cat] = 0;
            categoryMap[cat] += amount;
            totalSalesOverall += amount;
        });

        const salesByCategory = Object.keys(categoryMap).map(cat => {
            return {
                name: cat,
                amount: categoryMap[cat],
                value: totalSalesOverall ? Math.round((categoryMap[cat] / totalSalesOverall) * 100) : 0
            };
        });

        // formatting the response
        res.json({
            stats: {
                totalEarnings: totalIncome,
                totalVendors,
                totalCustomers,
                totalOrders,
                totalIncome
            },
            earningsData,
            salesByCategory,
            recentOrders: recentOrders.map(o => ({
                id: o.id,
                orderId: o.orderId,
                customerName: o.customerName,
                customerEmail: o.customerEmail,
                totalAmount: o.totalAmount,
                status: o.status,
                date: o.createdAt,
                productName: o.items?.[0]?.productName || 'Multiple Items'
            })),
            topProducts: orderItems.map(item => ({
                id: item.productId,
                name: item.productName,
                sales: item._sum.quantity,
                revenue: item._sum.totalPrice
            })),
            recentVendors,
            recentProducts: recentProducts.map(p => ({
                id: p.id,
                name: p.name,
                category: p.category,
                price: p.basePrice,
                vendorName: p.vendor?.companyName,
                createdAt: p.createdAt,
                stock: p.totalStock,
                status: p.status
            })),
            recentRestocks: restocks.map(r => ({
                id: r.id,
                productName: r.inventory?.name,
                vendorName: r.inventory?.vendor?.companyName,
                quantityAdded: r.changeAmount,
                previousStock: r.previousStock,
                newStock: r.newStock,
                date: r.createdAt
            }))
        });
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {
    getDashboardStats
};
