const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ==========================================
// TRACKING ENDPOINTS (Public - called by frontend)
// ==========================================

// Track a page view
const trackPageView = async (req, res) => {
  try {
    const { page, sessionId, referrer, device, browser, duration } = req.body;

    if (!page) {
      return res.status(400).json({ success: false, message: "Page is required" });
    }

    // Get userId from auth if available
    const userId = req.user?.id || req.body.userId || null;

    await prisma.pageView.create({
      data: {
        page,
        userId,
        sessionId: sessionId || null,
        referrer: referrer || null,
        device: device || null,
        browser: browser || null,
        duration: duration || null,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Track pageview error:", error);
    res.status(500).json({ success: false, message: "Failed to track" });
  }
};

// Track a product view
const trackProductView = async (req, res) => {
  try {
    const { productId, productName, category, sessionId, source } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID is required" });
    }

    const userId = req.user?.id || req.body.userId || null;

    await prisma.productView.create({
      data: {
        productId,
        productName: productName || null,
        category: category || null,
        userId,
        sessionId: sessionId || null,
        source: source || null,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Track product view error:", error);
    res.status(500).json({ success: false, message: "Failed to track" });
  }
};

// ==========================================
// ANALYTICS ENDPOINTS (Admin only)
// ==========================================

// Get page analytics
const getPageAnalytics = async (req, res) => {
  try {
    const { period = "30days" } = req.query;
    const startDate = getStartDate(period);

    // Total pageviews
    const totalPageViews = await prisma.pageView.count({
      where: { createdAt: { gte: startDate } },
    });

    // Previous period for comparison
    const prevStart = getPreviousStartDate(period, startDate);
    const prevPageViews = await prisma.pageView.count({
      where: { createdAt: { gte: prevStart, lt: startDate } },
    });

    // Unique visitors (by sessionId)
    const uniqueVisitors = await prisma.pageView.groupBy({
      by: ["sessionId"],
      where: { createdAt: { gte: startDate }, sessionId: { not: null } },
    });

    // Top pages
    const topPagesRaw = await prisma.pageView.groupBy({
      by: ["page"],
      where: { createdAt: { gte: startDate } },
      _count: { id: true },
      _avg: { duration: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    const topPages = topPagesRaw.map((p) => ({
      page: p.page,
      views: p._count.id,
      avgDuration: Math.round(p._avg.duration || 0),
    }));

    // Device breakdown
    const deviceRaw = await prisma.pageView.groupBy({
      by: ["device"],
      where: { createdAt: { gte: startDate }, device: { not: null } },
      _count: { id: true },
    });

    const deviceBreakdown = deviceRaw.map((d) => ({
      device: d.device || "unknown",
      count: d._count.id,
    }));

    // Daily pageview trend
    const allViews = await prisma.pageView.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const dailyTrend = {};
    allViews.forEach((v) => {
      const day = v.createdAt.toISOString().split("T")[0];
      dailyTrend[day] = (dailyTrend[day] || 0) + 1;
    });

    const trend = Object.entries(dailyTrend).map(([date, views]) => ({
      date,
      views,
    }));

    // Bounce rate: pages with very short duration (< 15s) indicate bounces.
    // We only count pages that have a duration recorded (not the empty
    // entry-only records — those would inflate the rate).
    const recordsWithDuration = await prisma.pageView.count({
      where: { createdAt: { gte: startDate }, duration: { not: null } },
    });

    const bounceCount = await prisma.pageView.count({
      where: {
        createdAt: { gte: startDate },
        duration: { not: null, lt: 15 },
      },
    });

    const bounceRate = recordsWithDuration > 0
      ? Math.round((bounceCount / recordsWithDuration) * 100)
      : 0;

    // Avg session duration (excludes null/zero durations)
    const avgDurationResult = await prisma.pageView.aggregate({
      where: { createdAt: { gte: startDate }, duration: { not: null, gt: 0 } },
      _avg: { duration: true },
    });

    res.json({
      success: true,
      data: {
        totalPageViews,
        previousPageViews: prevPageViews,
        uniqueVisitors: uniqueVisitors.length,
        bounceRate,
        avgDuration: Math.round(avgDurationResult._avg.duration || 0),
        topPages,
        deviceBreakdown,
        trend,
      },
    });
  } catch (error) {
    console.error("Page analytics error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch analytics" });
  }
};

// Get product heat map data
const getProductHeatMap = async (req, res) => {
  try {
    const { period = "30days" } = req.query;
    const startDate = getStartDate(period);

    // Product views grouped by product
    const productViewsRaw = await prisma.productView.groupBy({
      by: ["productId", "productName", "category"],
      where: { createdAt: { gte: startDate } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 50,
    });

    // Get order counts for these products to calculate conversion
    const productIds = productViewsRaw.map((p) => p.productId);

    const orderItemsRaw = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        productId: { in: productIds },
        order: { createdAt: { gte: startDate } },
      },
      _count: { id: true },
      _sum: { quantity: true },
    });

    const orderMap = {};
    orderItemsRaw.forEach((oi) => {
      orderMap[oi.productId] = {
        orders: oi._count.id,
        quantity: oi._sum.quantity || 0,
      };
    });

    // Build heat map data
    const heatMapData = productViewsRaw.map((p) => {
      const orders = orderMap[p.productId] || { orders: 0, quantity: 0 };
      const conversionRate = p._count.id > 0
        ? Math.round((orders.orders / p._count.id) * 100 * 10) / 10
        : 0;

      return {
        productId: p.productId,
        productName: p.productName || "Unknown",
        category: p.category || "Uncategorized",
        views: p._count.id,
        orders: orders.orders,
        quantitySold: orders.quantity,
        conversionRate,
      };
    });

    // Category heat map
    const categoryViewsRaw = await prisma.productView.groupBy({
      by: ["category"],
      where: { createdAt: { gte: startDate }, category: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const categoryHeatMap = categoryViewsRaw.map((c) => ({
      category: c.category || "Uncategorized",
      views: c._count.id,
    }));

    // Source breakdown (where product views come from)
    const sourceRaw = await prisma.productView.groupBy({
      by: ["source"],
      where: { createdAt: { gte: startDate }, source: { not: null } },
      _count: { id: true },
    });

    const sourceBreakdown = sourceRaw.map((s) => ({
      source: s.source || "direct",
      count: s._count.id,
    }));

    // Total product views
    const totalProductViews = await prisma.productView.count({
      where: { createdAt: { gte: startDate } },
    });

    // Daily product view trend
    const allProdViews = await prisma.productView.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const dailyTrend = {};
    allProdViews.forEach((v) => {
      const day = v.createdAt.toISOString().split("T")[0];
      dailyTrend[day] = (dailyTrend[day] || 0) + 1;
    });

    const trend = Object.entries(dailyTrend).map(([date, views]) => ({
      date,
      views,
    }));

    res.json({
      success: true,
      data: {
        totalProductViews,
        products: heatMapData,
        categoryHeatMap,
        sourceBreakdown,
        trend,
      },
    });
  } catch (error) {
    console.error("Product heat map error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch heat map" });
  }
};

// ==========================================
// HELPERS
// ==========================================

function getStartDate(period) {
  const now = new Date();
  switch (period) {
    case "today":
      return new Date(now.setHours(0, 0, 0, 0));
    case "7days":
      return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    case "30days":
      return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    case "3months":
      return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    case "6months":
      return new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    case "1year":
      return new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    default:
      return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }
}

function getPreviousStartDate(period, currentStart) {
  const diff = Date.now() - currentStart.getTime();
  return new Date(currentStart.getTime() - diff);
}

module.exports = {
  trackPageView,
  trackProductView,
  getPageAnalytics,
  getProductHeatMap,
};
