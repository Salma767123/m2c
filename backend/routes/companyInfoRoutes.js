const express = require('express');
const router = express.Router();
const {
  getCompanyInfo,
  updateBasicInfo,
  updateLegalInfo,
  updateAddress,
  updateBankDetails,
  updateLogo
} = require('../controllers/companyInfoController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get company info - accessible by all admins
router.get('/', getCompanyInfo);

// Update routes - accessible by super_admin only
router.put('/basic', requireRole('admin'), updateBasicInfo);
router.put('/legal', requireRole('admin'), updateLegalInfo);
router.put('/address', requireRole('admin'), updateAddress);
router.put('/bank', requireRole('admin'), updateBankDetails);
router.put('/logo', requireRole('admin'), updateLogo);

module.exports = router;
