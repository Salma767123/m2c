const express = require('express');
const router = express.Router();
const {
  getAdminProfile,
  updateAdminProfile
} = require('../controllers/adminProfileController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get admin profile
router.get('/', getAdminProfile);

// Update admin profile
router.put('/', updateAdminProfile);

module.exports = router;
