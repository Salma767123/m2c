const { prisma } = require('../config/database');

// Accepted "How did you hear about us?" slugs. Mirrors
// frontend/src/lib/enquirySources.ts — keep both in sync. Stored verbatim so
// enquiries can be grouped by source in reports.
const HEAR_ABOUT_US_VALUES = [
    'search_engine',
    'social_media',
    'referral',
    'existing_customer',
    'advertisement',
    'trade_show',
    'email_newsletter',
    'other',
];

// Public: Submit a contact enquiry (from Contact Us page)
const submitContactEnquiry = async (req, res) => {
    try {
        const { name, email, phone, subject, message, hearAboutUs, hearAboutUsOther } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, subject and message are required'
            });
        }

        // Only persist a recognised attribution slug — free-form values would
        // fragment the source report. Anything unknown falls back to null.
        const source = HEAR_ABOUT_US_VALUES.includes(hearAboutUs) ? hearAboutUs : null;
        // Free text is only meaningful for "other"; anything else is discarded so
        // it can't contradict the selected source. Capped to keep the field sane.
        const sourceOther = source === 'other' && typeof hearAboutUsOther === 'string'
            ? hearAboutUsOther.trim().slice(0, 200) || null
            : null;

        const enquiry = await prisma.contactEnquiry.create({
            data: {
                name,
                email,
                phone: phone || null,
                subject,
                message,
                hearAboutUs: source,
                hearAboutUsOther: sourceOther,
                status: 'new'
            }
        });

        // Notify admins about new website enquiry
        const { createNotificationForRole: notifyAdminsContact } = require('./notificationController');
        notifyAdminsContact({
            role: 'ADMIN', type: 'NEW_ENQUIRY',
            title: 'New Website Enquiry',
            message: `"${subject}" from ${name} (${email})`,
            data: { enquiryId: enquiry.id }
        }).catch(() => {});

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
        // Per-source counts drive the "How did you hear about us?" report. Counted
        // with one query per known slug rather than groupBy: on MongoDB an enquiry
        // created before this field exists has no `hearAboutUs` key at all (absent
        // ≠ null), so grouping would misreport. "Unspecified" is derived from the
        // total, which covers both legacy rows and blank submissions.
        const [total, newCount, readCount, repliedCount, closedCount, ...sourceCounts] = await Promise.all([
            prisma.contactEnquiry.count(),
            prisma.contactEnquiry.count({ where: { status: 'new' } }),
            prisma.contactEnquiry.count({ where: { status: 'read' } }),
            prisma.contactEnquiry.count({ where: { status: 'replied' } }),
            prisma.contactEnquiry.count({ where: { status: 'closed' } }),
            ...HEAR_ABOUT_US_VALUES.map((value) =>
                prisma.contactEnquiry.count({ where: { hearAboutUs: value } })
            ),
        ]);

        const bySource = {};
        let attributed = 0;
        HEAR_ABOUT_US_VALUES.forEach((value, i) => {
            bySource[value] = sourceCounts[i];
            attributed += sourceCounts[i];
        });
        bySource.unspecified = Math.max(0, total - attributed);

        res.json({
            success: true,
            data: {
                total,
                new: newCount,
                read: readCount,
                replied: repliedCount,
                closed: closedCount,
                bySource
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

// Admin: "How did you hear about us?" breakdown for the Analytics page.
// Period-aware so it honours the Analytics period selector.
const getContactEnquirySourceReport = async (req, res) => {
    try {
        const { period = '30days' } = req.query;
        const now = Date.now();
        const DAY = 24 * 60 * 60 * 1000;
        let startDate;
        switch (period) {
            case 'today': startDate = new Date(new Date().setHours(0, 0, 0, 0)); break;
            case '7days': startDate = new Date(now - 7 * DAY); break;
            case '3months': startDate = new Date(now - 90 * DAY); break;
            case '6months': startDate = new Date(now - 180 * DAY); break;
            case '1year': startDate = new Date(now - 365 * DAY); break;
            case 'all': startDate = null; break;
            default: startDate = new Date(now - 30 * DAY); break;
        }
        const where = startDate ? { createdAt: { gte: startDate } } : {};

        // One count per known slug (see getContactEnquiryStats for why groupBy is
        // avoided on MongoDB); "unspecified" is derived from the period total.
        const [total, ...counts] = await Promise.all([
            prisma.contactEnquiry.count({ where }),
            ...HEAR_ABOUT_US_VALUES.map((value) =>
                prisma.contactEnquiry.count({ where: { ...where, hearAboutUs: value } })
            ),
        ]);

        let attributed = 0;
        const sources = HEAR_ABOUT_US_VALUES.map((value, i) => {
            attributed += counts[i];
            return { value, count: counts[i] };
        });
        sources.push({ value: 'unspecified', count: Math.max(0, total - attributed) });

        res.json({ success: true, data: { period, total, sources } });
    } catch (error) {
        console.error('Error building enquiry source report:', error);
        res.status(500).json({ success: false, message: 'Failed to build source report' });
    }
};

module.exports = {
    submitContactEnquiry,
    getContactEnquirySourceReport,
    getAllContactEnquiries,
    getContactEnquiryById,
    updateContactEnquiryStatus,
    deleteContactEnquiry,
    getContactEnquiryStats
};
