const express = require('express');
const router = express.Router();
const userManagementController = require('../controllers/userManagementController');
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');

// All routes require authenticated admin
router.use(authenticateToken, requireAdminRole);

// ------------------------------------
// CUSTOMER MANAGEMENT ROUTES
// ------------------------------------
router.get('/customers', requirePermission('view_users'), userManagementController.getCustomers);
router.get('/customers/:id', requirePermission('view_users'), userManagementController.getCustomerById);
router.put('/customers/:id/status', requirePermission('edit_users'), userManagementController.updateCustomerStatus);
router.delete('/customers/:id', requirePermission('delete_users'), userManagementController.deleteCustomer);

// ------------------------------------
// INTERNAL STAFF ROUTES
// ------------------------------------
router.get('/staff', requirePermission('view_users'), userManagementController.getStaff);
router.get('/staff/:id', requirePermission('view_users'), userManagementController.getStaffById);
router.post('/staff', requirePermission('create_users'), userManagementController.createStaff);
router.put('/staff/:id', requirePermission('edit_users'), userManagementController.updateStaff);
router.put('/staff/:id/status', requirePermission('edit_users'), userManagementController.updateStaffStatus);
router.delete('/staff/:id', requirePermission('delete_users'), userManagementController.deleteStaff);

module.exports = router;
