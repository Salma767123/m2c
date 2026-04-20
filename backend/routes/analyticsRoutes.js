const express = require("express");
const router = express.Router();
const {
  trackPageView,
  trackProductView,
  getPageAnalytics,
  getProductHeatMap,
} = require("../controllers/analyticsController");
const { authenticateToken, requireAdminRole, optionalAuth, requirePermission } = require("../middleware/auth");

// Public tracking endpoints (with optional auth to capture userId)
router.post("/track/pageview", optionalAuth, trackPageView);
router.post("/track/product-view", optionalAuth, trackProductView);

// Admin analytics endpoints — gated by view_analytics (or view_reports for back-compat)
router.get("/page-analytics", authenticateToken, requireAdminRole, requirePermission(['view_analytics', 'view_reports']), getPageAnalytics);
router.get("/product-heatmap", authenticateToken, requireAdminRole, requirePermission(['view_analytics', 'view_reports']), getProductHeatMap);

module.exports = router;
