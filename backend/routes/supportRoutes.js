const express = require('express');
const router = express.Router();
const {
    createTicket,
    getAllTickets,
    getMyTickets,
    getTicketById,
    updateTicketStatus,
    addTicketMessage,
    deleteTicket,
} = require('../controllers/supportController');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');

// Create a new support ticket (Vendor or User)
router.post('/', authenticateToken, createTicket);

// Get tickets for specific user/vendor
router.get('/my-tickets', authenticateToken, getMyTickets);

// Get all tickets (Admin only) — gated by dedicated Support permissions
router.get('/admin', authenticateToken, requireRole('admin'), requirePermission('support:view'), getAllTickets);

// Get ticket details by ID — owner check is in controller; admins still need permission to view others' tickets
router.get('/:id', authenticateToken, getTicketById);

// Update ticket status (vendor can close own; admin needs support:edit to act on any)
router.patch('/:id/status', authenticateToken, updateTicketStatus);

// Add a reply to a ticket
router.post('/:id/messages', authenticateToken, addTicketMessage);

// Delete ticket (Admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), requirePermission('support:delete'), deleteTicket);

module.exports = router;
