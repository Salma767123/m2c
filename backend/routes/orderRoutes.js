const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authenticateToken);

// Create new order
router.post('/', orderController.createOrder);

// Get user orders
router.get('/', orderController.getUserOrders);

// Get single order
router.get('/:id', orderController.getOrderById);

module.exports = router;
