const express = require("express");
const router = express.Router();
const {
  trackPageView,
  trackProductView,
  getPageAnalytics,
  getProductHeatMap,
} = require("../controllers/analyticsController");
const { authenticateToken, requireAdminRole, optionalAuth } = require("../middleware/auth");

// Public tracking endpoints (with optional auth to capture userId)
router.post("/track/pageview", optionalAuth, trackPageView);
router.post("/track/product-view", optionalAuth, trackProductView);

// Admin analytics endpoints
router.get("/page-analytics", authenticateToken, requireAdminRole, getPageAnalytics);
router.get("/product-heatmap", authenticateToken, requireAdminRole, getProductHeatMap);

module.exports = router;
