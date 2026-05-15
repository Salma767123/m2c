const express = require('express');
const router = express.Router();
const {
  getExchangeRate,
  updateExchangeRate,
} = require('../controllers/exchangeRateController');
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');

// Public — frontend needs the rate for price display
router.get('/', getExchangeRate);

// Admin only — update exchange rate + auto-recalculate all USD prices
router.put('/', authenticateToken, requireAdminRole, requirePermission('manage_settings'), updateExchangeRate);

module.exports = router;
