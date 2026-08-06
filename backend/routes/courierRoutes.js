const express = require('express');
const {
  createCourier,
  getCouriers,
  updateCourier,
  deleteCourier,
  getActiveCouriers,
} = require('../controllers/courierController');
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Public — active couriers for the storefront + product picker.
router.get('/active', getActiveCouriers);

// Admin CRUD. Reuses the products permission set (couriers are product-logistics config).
router.post('/', authenticateToken, requireAdminRole, requirePermission('all_products:create'), createCourier);
router.get('/', authenticateToken, requireAdminRole, requirePermission('all_products:view'), getCouriers);
router.put('/:id', authenticateToken, requireAdminRole, requirePermission('all_products:edit'), updateCourier);
router.delete('/:id', authenticateToken, requireAdminRole, requirePermission('all_products:delete'), deleteCourier);

module.exports = router;
