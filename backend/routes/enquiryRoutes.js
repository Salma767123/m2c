const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');
const {
    sendEnquiryOtp,
    verifyEnquiryOtp,
    submitEnquiry,
    getAllEnquiries,
    getEnquiryById,
    approveEnquiry,
    rejectEnquiry,
    deleteEnquiry
} = require('../controllers/enquiryController');

// Public: email verification for the vendor-enquiry form (no auth required)
router.post('/otp/send', sendEnquiryOtp);
router.post('/otp/verify', verifyEnquiryOtp);

// Public: Submit a vendor enquiry (from contact page - no auth required)
router.post('/submit', submitEnquiry);

// Admin only routes — gated by the Enquiries module permissions
router.get('/', authenticateToken, requireRole('admin'), requirePermission('vendor_enquiries:view'), getAllEnquiries);
router.get('/:id', authenticateToken, requireRole('admin'), requirePermission('vendor_enquiries:view'), getEnquiryById);
router.patch('/:id/approve', authenticateToken, requireRole('admin'), requirePermission('vendor_enquiries:approve'), approveEnquiry);
router.patch('/:id/reject', authenticateToken, requireRole('admin'), requirePermission('vendor_enquiries:approve'), rejectEnquiry);
router.delete('/:id', authenticateToken, requireRole('admin'), requirePermission('vendor_enquiries:delete'), deleteEnquiry);

module.exports = router;
