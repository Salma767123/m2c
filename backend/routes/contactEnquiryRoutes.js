const express = require('express');
const router = express.Router();
const {
    submitContactEnquiry,
    getAllContactEnquiries,
    getContactEnquiryById,
    updateContactEnquiryStatus,
    deleteContactEnquiry,
    getContactEnquiryStats
} = require('../controllers/contactEnquiryController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Public route - Submit contact enquiry
router.post('/submit', submitContactEnquiry);

// Admin routes - Require authentication and admin role
router.get('/', authenticateToken, requireRole(['ADMIN']), getAllContactEnquiries);
router.get('/stats', authenticateToken, requireRole(['ADMIN']), getContactEnquiryStats);
router.get('/:id', authenticateToken, requireRole(['ADMIN']), getContactEnquiryById);
router.put('/:id/status', authenticateToken, requireRole(['ADMIN']), updateContactEnquiryStatus);
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), deleteContactEnquiry);

module.exports = router;
