const express = require('express');
const { getDashboardStats } = require('../controllers/adminDashboardController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Admin Dashboard stats
router.get('/stats', authenticateToken, requireRole('admin'), getDashboardStats);

module.exports = router;
