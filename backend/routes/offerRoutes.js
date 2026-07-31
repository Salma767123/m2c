const express = require('express');
const {
  createOffer,
  getOffers,
  getOffer,
  updateOffer,
  deleteOffer,
  getActiveOffers,
} = require('../controllers/offerController');
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Public route (no auth) — live offers for the storefront /offers page + strips.
// MUST come before the admin '/:id' route so 'active' isn't read as an id.
router.get('/active', getActiveOffers);

// Admin routes. Reuses the coupons permission set (offers share the promotions area),
// so no new permission strings need seeding into the roles module.
router.post('/', authenticateToken, requireAdminRole, requirePermission('coupons:create'), createOffer);
router.get('/', authenticateToken, requireAdminRole, requirePermission('coupons:view'), getOffers);
router.get('/:id', authenticateToken, requireAdminRole, requirePermission('coupons:view'), getOffer);
router.put('/:id', authenticateToken, requireAdminRole, requirePermission('coupons:edit'), updateOffer);
router.delete('/:id', authenticateToken, requireAdminRole, requirePermission('coupons:delete'), deleteOffer);

module.exports = router;
