const express = require('express');
const { getDashboardStats } = require('../controllers/adminDashboardController');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Admin Dashboard stats
router.get('/stats', authenticateToken, requireRole('admin'), requirePermission('view_dashboard'), getDashboardStats);

module.exports = router;
