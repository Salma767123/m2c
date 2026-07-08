const express = require('express');
const router = express.Router();
const userManagementController = require('../controllers/userManagementController');
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');

// All routes require authenticated admin
router.use(authenticateToken, requireAdminRole);

// ------------------------------------
// CUSTOMER MANAGEMENT ROUTES
// ------------------------------------
router.get('/customers', requirePermission('customer_management:view'), userManagementController.getCustomers);
router.get('/customers/:id', requirePermission('customer_management:view'), userManagementController.getCustomerById);
router.put('/customers/:id/status', requirePermission('customer_management:edit'), userManagementController.updateCustomerStatus);
router.delete('/customers/:id', requirePermission('customer_management:delete'), userManagementController.deleteCustomer);

// ------------------------------------
// INTERNAL STAFF ROUTES
// ------------------------------------
router.get('/staff', requirePermission('staff_management:view'), userManagementController.getStaff);
router.get('/staff/:id', requirePermission('staff_management:view'), userManagementController.getStaffById);
router.post('/staff', requirePermission('staff_management:create'), userManagementController.createStaff);
router.put('/staff/:id', requirePermission('staff_management:edit'), userManagementController.updateStaff);
router.put('/staff/:id/status', requirePermission('staff_management:edit'), userManagementController.updateStaffStatus);
router.delete('/staff/:id', requirePermission('staff_management:delete'), userManagementController.deleteStaff);

module.exports = router;
