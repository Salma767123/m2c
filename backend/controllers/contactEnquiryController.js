const { prisma } = require('../config/database');

// Public: Submit a contact enquiry (from Contact Us page)
const submitContactEnquiry = async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, subject and message are required'
            });
        }

        const enquiry = await prisma.contactEnquiry.create({
            data: {
                name,
                email,
                phone: phone || null,
                subject,
                message,
                status: 'new'
            }
        });

        res.status(201).json({
            success: true,
            message: 'Your message has been sent successfully. We will get back to you soon.',
            data: enquiry
        });
    } catch (error) {
        console.error('Error submitting contact enquiry:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit enquiry',
            error: error.message
        });
    }
};

// Admin: Get all contact enquiries
const getAllContactEnquiries = async (req, res) => {
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
                { email: { contains: search, mode: 'insensitive' } },
                { subject: { contains: search, mode: 'insensitive' } },
                { message: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [enquiries, total] = await Promise.all([
            prisma.contactEnquiry.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.contactEnquiry.count({ where })
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
        console.error('Error fetching contact enquiries:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch enquiries'
        });
    }
};

// Admin: Get single contact enquiry
const getContactEnquiryById = async (req, res) => {
    try {
        const { id } = req.params;
        const enquiry = await prisma.contactEnquiry.findUnique({ where: { id } });

        if (!enquiry) {
            return res.status(404).json({ success: false, message: 'Enquiry not found' });
        }

        // Mark as read if it's new
        if (enquiry.status === 'new') {
            await prisma.contactEnquiry.update({
                where: { id },
                data: { status: 'read' }
            });
        }

        res.json({ success: true, data: enquiry });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch enquiry' });
    }
};

// Admin: Update contact enquiry status
const updateContactEnquiryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        if (!['new', 'read', 'replied', 'closed'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be: new, read, replied, or closed'
            });
        }

        const updateData = { status };
        
        if (notes !== undefined) {
            updateData.notes = notes;
        }

        if (status === 'replied') {
            updateData.repliedAt = new Date();
        }

        if (status === 'closed') {
            updateData.closedAt = new Date();
        }

        const updated = await prisma.contactEnquiry.update({
            where: { id },
            data: updateData
        });

        res.json({
            success: true,
            message: 'Enquiry updated successfully',
            data: updated
        });
    } catch (error) {
        console.error('Error updating contact enquiry:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update enquiry'
        });
    }
};

// Admin: Delete contact enquiry
const deleteContactEnquiry = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.contactEnquiry.delete({ where: { id } });
        res.json({ success: true, message: 'Enquiry deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete enquiry' });
    }
};

// Admin: Get enquiry statistics
const getContactEnquiryStats = async (req, res) => {
    try {
        const [total, newCount, readCount, repliedCount, closedCount] = await Promise.all([
            prisma.contactEnquiry.count(),
            prisma.contactEnquiry.count({ where: { status: 'new' } }),
            prisma.contactEnquiry.count({ where: { status: 'read' } }),
            prisma.contactEnquiry.count({ where: { status: 'replied' } }),
            prisma.contactEnquiry.count({ where: { status: 'closed' } })
        ]);

        res.json({
            success: true,
            data: {
                total,
                new: newCount,
                read: readCount,
                replied: repliedCount,
                closed: closedCount
            }
        });
    } catch (error) {
        console.error('Error fetching contact enquiry stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
};

module.exports = {
    submitContactEnquiry,
    getAllContactEnquiries,
    getContactEnquiryById,
    updateContactEnquiryStatus,
    deleteContactEnquiry,
    getContactEnquiryStats
};
