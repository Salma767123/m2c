const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');
const {
    submitEnquiry,
    getAllEnquiries,
    getEnquiryById,
    approveEnquiry,
    rejectEnquiry,
    deleteEnquiry
} = require('../controllers/enquiryController');

// Public: Submit a vendor enquiry (from contact page - no auth required)
router.post('/submit', submitEnquiry);

// Admin only routes — gated by the Enquiries module permissions
router.get('/', authenticateToken, requireRole('admin'), requirePermission(['view_enquiries', 'manage_enquiries']), getAllEnquiries);
router.get('/:id', authenticateToken, requireRole('admin'), requirePermission(['view_enquiries', 'manage_enquiries']), getEnquiryById);
router.patch('/:id/approve', authenticateToken, requireRole('admin'), requirePermission('manage_enquiries'), approveEnquiry);
router.patch('/:id/reject', authenticateToken, requireRole('admin'), requirePermission('manage_enquiries'), rejectEnquiry);
router.delete('/:id', authenticateToken, requireRole('admin'), requirePermission('manage_enquiries'), deleteEnquiry);

module.exports = router;
