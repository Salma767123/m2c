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
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');

// Public route - Submit contact enquiry
router.post('/submit', submitContactEnquiry);

// Admin routes — gated by the Enquiries module permissions
router.get('/', authenticateToken, requireRole('admin'), requirePermission(['view_enquiries', 'manage_enquiries']), getAllContactEnquiries);
router.get('/stats', authenticateToken, requireRole('admin'), requirePermission(['view_enquiries', 'manage_enquiries']), getContactEnquiryStats);
router.get('/:id', authenticateToken, requireRole('admin'), requirePermission(['view_enquiries', 'manage_enquiries']), getContactEnquiryById);
router.put('/:id/status', authenticateToken, requireRole('admin'), requirePermission('manage_enquiries'), updateContactEnquiryStatus);
router.delete('/:id', authenticateToken, requireRole('admin'), requirePermission('manage_enquiries'), deleteContactEnquiry);

module.exports = router;
