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
const { authenticateToken, requireRole } = require('../middleware/auth');

// Create a new support ticket (Vendor or User)
router.post('/', authenticateToken, createTicket);

// Get tickets for specific user/vendor
router.get('/my-tickets', authenticateToken, getMyTickets);

// Get all tickets (Admin only)
router.get('/admin', authenticateToken, requireRole(['super_admin', 'admin']), getAllTickets);

// Get ticket details by ID
router.get('/:id', authenticateToken, getTicketById);

// Update ticket status (Admin mostly, but could be vendor closing their own ticket)
router.patch('/:id/status', authenticateToken, updateTicketStatus);

// Add a reply to a ticket
router.post('/:id/messages', authenticateToken, addTicketMessage);

// Delete ticket (Admin only)
router.delete('/:id', authenticateToken, requireRole(['super_admin', 'admin']), deleteTicket);

module.exports = router;
