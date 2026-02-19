const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
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

// Admin only routes
router.get('/', authenticateToken, requireRole(['ADMIN']), getAllEnquiries);
router.get('/:id', authenticateToken, requireRole(['ADMIN']), getEnquiryById);
router.patch('/:id/approve', authenticateToken, requireRole(['ADMIN']), approveEnquiry);
router.patch('/:id/reject', authenticateToken, requireRole(['ADMIN']), rejectEnquiry);
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), deleteEnquiry);

module.exports = router;
