const express = require('express');
const { getDashboardStats } = require('../controllers/adminDashboardController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Admin Dashboard stats — visible to every admin (no permission gate)
router.get('/stats', authenticateToken, requireRole('admin'), getDashboardStats);

module.exports = router;
