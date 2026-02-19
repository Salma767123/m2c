const { PrismaClient } = require('@prisma/client');
const { sendVendorApprovalEmail, sendVendorRejectionEmail } = require('../utils/emailService');

const prisma = new PrismaClient();

// Public: Submit a vendor enquiry (from Contact page)
const submitEnquiry = async (req, res) => {
    try {
        const { name, companyName, gstNumber, email, phone, website } = req.body;

        if (!name || !companyName || !gstNumber || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Name, company name, GST number, email and phone are required'
            });
        }

        // Check for duplicate submission (same email with pending status)
        const existing = await prisma.vendorEnquiry.findFirst({
            where: { email, status: 'pending' }
        });

        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'An enquiry with this email is already pending review.'
            });
        }

        const enquiry = await prisma.vendorEnquiry.create({
            data: {
                name,
                companyName,
                gstNumber,
                email,
                phone,
                website: website || null,
                status: 'pending'
            }
        });

        res.status(201).json({
            success: true,
            message: 'Your application has been submitted successfully. We will review and get back to you soon.',
            data: enquiry
        });
    } catch (error) {
        console.error('Error submitting enquiry:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit enquiry',
            error: error.message
        });
    }
};

// Admin: Get all enquiries
const getAllEnquiries = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (status && status !== 'all') {
            where.status = status;
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { companyName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { gstNumber: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [enquiries, total] = await Promise.all([
            prisma.vendorEnquiry.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.vendorEnquiry.count({ where })
        ]);

        res.json({
            success: true,
            data: enquiries,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching enquiries:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch enquiries'
        });
    }
};

// Admin: Get single enquiry
const getEnquiryById = async (req, res) => {
    try {
        const { id } = req.params;
        const enquiry = await prisma.vendorEnquiry.findUnique({ where: { id } });

        if (!enquiry) {
            return res.status(404).json({ success: false, message: 'Enquiry not found' });
        }

        res.json({ success: true, data: enquiry });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch enquiry' });
    }
};

// Admin: Approve enquiry + send registration email
const approveEnquiry = async (req, res) => {
    try {
        const { id } = req.params;

        const enquiry = await prisma.vendorEnquiry.findUnique({ where: { id } });
        if (!enquiry) {
            return res.status(404).json({ success: false, message: 'Enquiry not found' });
        }

        if (enquiry.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Enquiry is already ${enquiry.status}`
            });
        }

        // Build vendor registration link
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const registrationLink = `${frontendUrl}/vendor/register`;

        // Send the approval email with registration link
        await sendVendorApprovalEmail({
            to: enquiry.email,
            name: enquiry.name,
            companyName: enquiry.companyName,
            registrationLink
        });

        // Update status in DB
        const updated = await prisma.vendorEnquiry.update({
            where: { id },
            data: {
                status: 'approved',
                approvedAt: new Date()
            }
        });

        res.json({
            success: true,
            message: `Approval email sent to ${enquiry.email}`,
            data: updated
        });
    } catch (error) {
        console.error('Error approving enquiry:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve enquiry. Please check email configuration.',
            error: error.message
        });
    }
};

// Admin: Reject enquiry
const rejectEnquiry = async (req, res) => {
    try {
        const { id } = req.params;

        const enquiry = await prisma.vendorEnquiry.findUnique({ where: { id } });
        if (!enquiry) {
            return res.status(404).json({ success: false, message: 'Enquiry not found' });
        }

        if (enquiry.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Enquiry is already ${enquiry.status}`
            });
        }

        // Optionally send rejection email
        try {
            await sendVendorRejectionEmail({
                to: enquiry.email,
                name: enquiry.name,
                companyName: enquiry.companyName
            });
        } catch (emailErr) {
            console.warn('Could not send rejection email:', emailErr.message);
        }

        const updated = await prisma.vendorEnquiry.update({
            where: { id },
            data: {
                status: 'rejected',
                rejectedAt: new Date()
            }
        });

        res.json({
            success: true,
            message: 'Enquiry rejected successfully',
            data: updated
        });
    } catch (error) {
        console.error('Error rejecting enquiry:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject enquiry'
        });
    }
};

// Admin: Delete enquiry
const deleteEnquiry = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.vendorEnquiry.delete({ where: { id } });
        res.json({ success: true, message: 'Enquiry deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete enquiry' });
    }
};

module.exports = {
    submitEnquiry,
    getAllEnquiries,
    getEnquiryById,
    approveEnquiry,
    rejectEnquiry,
    deleteEnquiry
};
