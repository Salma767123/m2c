const express = require('express');
const router = express.Router();
const {
    submitContactEnquiry,
    getAllContactEnquiries,
    getContactEnquiryById,
    updateContactEnquiryStatus,
    deleteContactEnquiry,
    getContactEnquiryStats,
    getContactEnquirySourceReport
} = require('../controllers/contactEnquiryController');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');

// Public route - Submit contact enquiry
router.post('/submit', submitContactEnquiry);

// Admin routes — gated by the Enquiries module permissions
router.get('/', authenticateToken, requireRole('admin'), requirePermission('website_enquiries:view'), getAllContactEnquiries);
router.get('/stats', authenticateToken, requireRole('admin'), requirePermission('website_enquiries:view'), getContactEnquiryStats);
// Analytics: "How did you hear about us?" breakdown (period-aware)
router.get('/source-report', authenticateToken, requireRole('admin'), requirePermission('analytics:view'), getContactEnquirySourceReport);
router.get('/:id', authenticateToken, requireRole('admin'), requirePermission('website_enquiries:view'), getContactEnquiryById);
router.put('/:id/status', authenticateToken, requireRole('admin'), requirePermission('website_enquiries:resolve'), updateContactEnquiryStatus);
router.delete('/:id', authenticateToken, requireRole('admin'), requirePermission('website_enquiries:delete'), deleteContactEnquiry);

module.exports = router;
