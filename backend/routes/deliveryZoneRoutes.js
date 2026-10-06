const express = require('express');
const {
  listZones,
  createZone,
  updateZone,
  deleteZone,
  updateShippingGst,
  quoteDelivery,
} = require('../controllers/deliveryZoneController');
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Checkout quote — serviceability + shipping breakdown for an address (signed-in customer).
router.post('/quote', authenticateToken, quoteDelivery);

// Admin CRUD (reuses the product-logistics permission set, like couriers).
router.get('/', authenticateToken, requireAdminRole, requirePermission('all_products:view'), listZones);
router.post('/', authenticateToken, requireAdminRole, requirePermission('all_products:create'), createZone);
router.put('/shipping-gst', authenticateToken, requireAdminRole, requirePermission('all_products:edit'), updateShippingGst);
router.put('/:id', authenticateToken, requireAdminRole, requirePermission('all_products:edit'), updateZone);
router.delete('/:id', authenticateToken, requireAdminRole, requirePermission('all_products:delete'), deleteZone);

module.exports = router;
