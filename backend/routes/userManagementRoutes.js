const express = require('express');
const router = express.Router();
const userManagementController = require('../controllers/userManagementController');
const { authenticateToken, requireAdminRole } = require('../middleware/auth');

// All routes require authenticated admin
router.use(authenticateToken, requireAdminRole);

// ------------------------------------
// CUSTOMER MANAGEMENT ROUTES
// ------------------------------------
router.get('/customers', userManagementController.getCustomers);
router.put('/customers/:id/status', userManagementController.updateCustomerStatus);
router.delete('/customers/:id', userManagementController.deleteCustomer);

// ------------------------------------
// INTERNAL STAFF ROUTES
// ------------------------------------
router.get('/staff', userManagementController.getStaff);
router.post('/staff', userManagementController.createStaff);
router.put('/staff/:id/status', userManagementController.updateStaffStatus);
router.delete('/staff/:id', userManagementController.deleteStaff);

module.exports = router;
