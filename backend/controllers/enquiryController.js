const crypto = require('crypto');
const { prisma } = require('../config/database');
const { sendTemplatedEmail } = require('../utils/emailTemplateRenderer');

// ── Email OTP (email-ownership verification) ────────────────────────────────
// Namespaced by `purpose` so the vendor-enquiry form and the fuller vendor
// registration form each hold their own live code for an address.
const OTP_PURPOSES = ['vendor_enquiry', 'vendor_registration'];
const DEFAULT_OTP_PURPOSE = 'vendor_enquiry';
const OTP_PURPOSE = DEFAULT_OTP_PURPOSE; // used by the enquiry submit gate below
const OTP_TTL_MS = 10 * 60 * 1000;   // codes live 10 minutes
const OTP_RESEND_MS = 30 * 1000;     // min gap between two sends to one address
const OTP_MAX_ATTEMPTS = 5;          // wrong guesses before a code is burned

const normalizeEmail = (e) => String(e || '').trim().toLowerCase();
const hashCode = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Only allow known purposes; anything else falls back to the enquiry namespace.
const resolvePurpose = (p) => (OTP_PURPOSES.includes(p) ? p : DEFAULT_OTP_PURPOSE);

/**
 * Shared email-ownership helpers, reused by other controllers (e.g. vendor
 * registration) that need the same OTP gate. Consumption is checked in JS
 * because Prisma+Mongo does not reliably match `{ consumedAt: null }`.
 */
const getValidVerifiedOtp = async (email, purpose) => {
    const rec = await prisma.emailOtp.findFirst({
        where: { email: normalizeEmail(email), purpose: resolvePurpose(purpose), verified: true },
        orderBy: { createdAt: 'desc' },
    });
    if (!rec || rec.consumedAt || new Date(rec.expiresAt).getTime() < Date.now()) return null;
    return rec;
};
const consumeOtp = async (id) =>
    prisma.emailOtp.update({ where: { id }, data: { consumedAt: new Date() } }).catch(() => {});

// Public: send a one-time verification code to the applicant's email.
const sendEnquiryOtp = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const name = (req.body.name || '').trim();
        const purpose = resolvePurpose(req.body.purpose);

        if (!EMAIL_RE.test(email)) {
            return res.status(400).json({ success: false, message: 'A valid email address is required' });
        }

        // Don't let a fresh submit spam an address — respect a short resend gap.
        // NB: Prisma+Mongo does not reliably match `{ consumedAt: null }` in a
        // where-clause, so we fetch the latest row and check consumption in JS.
        const recent = await prisma.emailOtp.findFirst({
            where: { email, purpose },
            orderBy: { createdAt: 'desc' },
        });
        if (recent && !recent.consumedAt && (Date.now() - new Date(recent.createdAt).getTime()) < OTP_RESEND_MS) {
            const wait = Math.ceil((OTP_RESEND_MS - (Date.now() - new Date(recent.createdAt).getTime())) / 1000);
            return res.status(429).json({ success: false, message: `Please wait ${wait}s before requesting another code.` });
        }

        // One live code per address+purpose: clear any earlier ones first.
        await prisma.emailOtp.deleteMany({ where: { email, purpose } });

        const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
        await prisma.emailOtp.create({
            data: {
                email,
                purpose,
                codeHash: hashCode(code),
                expiresAt: new Date(Date.now() + OTP_TTL_MS),
            },
        });

        const result = await sendTemplatedEmail({
            key: 'vendor_enquiry_otp',
            to: email,
            data: { name: name || 'there', otp: code },
        });

        if (!result.sent) {
            // Email pipeline is down / misconfigured — don't leave a code the
            // applicant can never receive.
            await prisma.emailOtp.deleteMany({ where: { email, purpose } });
            return res.status(502).json({ success: false, message: 'Could not send the verification email. Please try again shortly.' });
        }

        res.json({ success: true, message: `A verification code has been sent to ${email}.` });
    } catch (error) {
        console.error('Error sending enquiry OTP:', error);
        res.status(500).json({ success: false, message: 'Failed to send verification code' });
    }
};

// Public: verify a code the applicant typed back in.
const verifyEnquiryOtp = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const code = String(req.body.otp || req.body.code || '').trim();
        const purpose = resolvePurpose(req.body.purpose);

        if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
            return res.status(400).json({ success: false, message: 'Enter the 6-digit code sent to your email.' });
        }

        // Fetch the latest row; check consumption in JS (Prisma+Mongo won't
        // reliably filter `{ consumedAt: null }`).
        const record = await prisma.emailOtp.findFirst({
            where: { email, purpose },
            orderBy: { createdAt: 'desc' },
        });

        if (!record || record.consumedAt) {
            return res.status(400).json({ success: false, message: 'No verification code found. Please request a new one.' });
        }
        if (new Date(record.expiresAt).getTime() < Date.now()) {
            await prisma.emailOtp.delete({ where: { id: record.id } }).catch(() => {});
            return res.status(400).json({ success: false, message: 'This code has expired. Please request a new one.' });
        }
        if (record.attempts >= OTP_MAX_ATTEMPTS) {
            await prisma.emailOtp.delete({ where: { id: record.id } }).catch(() => {});
            return res.status(429).json({ success: false, message: 'Too many incorrect attempts. Please request a new code.' });
        }

        if (record.codeHash !== hashCode(code)) {
            await prisma.emailOtp.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
            const left = OTP_MAX_ATTEMPTS - (record.attempts + 1);
            return res.status(400).json({
                success: false,
                message: left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Incorrect code. Please request a new one.',
            });
        }

        await prisma.emailOtp.update({ where: { id: record.id }, data: { verified: true } });
        res.json({ success: true, message: 'Email verified successfully.' });
    } catch (error) {
        console.error('Error verifying enquiry OTP:', error);
        res.status(500).json({ success: false, message: 'Failed to verify code' });
    }
};

// Public: Submit a vendor enquiry (from Contact page)
const submitEnquiry = async (req, res) => {
    try {
        const { name, companyName, gstNumber, phone, website } = req.body;
        const email = normalizeEmail(req.body.email);
        // Registered vendors must provide a GST number; unregistered ones may skip it.
        const vendorType = req.body.vendorType === 'UNREGISTERED' ? 'UNREGISTERED' : 'REGISTERED';

        if (!name || !companyName || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Name, company name, email and phone are required'
            });
        }
        if (vendorType === 'REGISTERED' && !gstNumber) {
            return res.status(400).json({
                success: false,
                message: 'GST number is required for registered vendors'
            });
        }

        // Email ownership must be proven first: a verified, unexpired, unspent
        // OTP for this address has to exist. Enforced server-side so the check
        // can't be skipped by calling the API directly.
        // Latest row, consumption checked in JS (Prisma+Mongo null-filter quirk).
        const otp = await prisma.emailOtp.findFirst({
            where: { email, purpose: OTP_PURPOSE, verified: true },
            orderBy: { createdAt: 'desc' },
        });
        if (!otp || otp.consumedAt || new Date(otp.expiresAt).getTime() < Date.now()) {
            return res.status(403).json({
                success: false,
                message: 'Please verify your email address before submitting.'
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
                vendorType,
                gstNumber: gstNumber || null,
                email,
                phone,
                website: website || null,
                status: 'pending'
            }
        });

        // Spend the verification code so it can't be reused for another submit.
        await prisma.emailOtp.update({
            where: { id: otp.id },
            data: { consumedAt: new Date() },
        }).catch(() => {});

        // Notify admins about new enquiry
        const { createNotificationForRole: notifyAdminsEnquiry } = require('./notificationController');
        notifyAdminsEnquiry({
            role: 'ADMIN', type: 'NEW_ENQUIRY',
            title: 'New Vendor Enquiry',
            message: `${companyName} (${name}) submitted a vendor enquiry.`,
            data: { enquiryId: enquiry.id }
        }).catch(() => {});

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

        // Send the approval email with registration link (DB-driven template)
        const approvalEmail = await sendTemplatedEmail({
            key: 'vendor_enquiry_approval',
            to: enquiry.email,
            data: {
                name: enquiry.name,
                companyName: enquiry.companyName,
                registrationLink,
            },
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
            message: approvalEmail.sent
                ? `Approval email sent to ${enquiry.email}`
                : `Enquiry approved (approval email is turned off)`,
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

        // Optionally send rejection email (DB-driven template; never throws)
        await sendTemplatedEmail({
            key: 'vendor_enquiry_rejection',
            to: enquiry.email,
            data: {
                name: enquiry.name,
                companyName: enquiry.companyName,
            },
        });

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
    sendEnquiryOtp,
    verifyEnquiryOtp,
    getValidVerifiedOtp,
    consumeOtp,
    submitEnquiry,
    getAllEnquiries,
    getEnquiryById,
    approveEnquiry,
    rejectEnquiry,
    deleteEnquiry
};
