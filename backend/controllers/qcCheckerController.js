const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { prisma } = require('../config/database');
const { sendQCCheckerCredentialsEmail } = require('../utils/emailService');
const { resolveBase64InValue } = require('../config/cloudinary');

// Generate a random password
const generateRandomPassword = (length = 10) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// Generate a unique Checker ID
const generateCheckerId = async () => {
    const lastChecker = await prisma.qCChecker.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { checkerId: true }
    });

    let nextNumber = 1;
    if (lastChecker && lastChecker.checkerId) {
        const match = lastChecker.checkerId.match(/QC-(\d+)/);
        if (match) {
            nextNumber = parseInt(match[1]) + 1;
        }
    }

    return `QC-${nextNumber.toString().padStart(3, '0')}`;
};

// Generate JWT Token for QC Checker
const generateCheckerToken = (checkerId) => {
    return jwt.sign(
        { checkerId, type: 'qc_checker' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// ============================
// Admin: Create QC Checker
// ============================
const createQCChecker = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            address,
            city,
            state,
            zipCode,
            country,
            dateOfBirth,
            joiningDate,
            status,
            specialization,
            experience,
            certifications,
            assignedHubId,
        } = req.body;

        // Validation
        if (!name || !email || !phone) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, and phone are required',
            });
        }

        // Check if email already exists
        const existingChecker = await prisma.qCChecker.findUnique({
            where: { email },
        });

        if (existingChecker) {
            return res.status(409).json({
                success: false,
                error: 'A QC checker with this email already exists',
            });
        }

        // Generate checker ID and password
        const checkerId = await generateCheckerId();
        const plainPassword = generateRandomPassword();
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // Create the QC Checker
        const qcChecker = await prisma.qCChecker.create({
            data: {
                checkerId,
                email,
                password: hashedPassword,
                name,
                phone,
                address: address || null,
                city: city || null,
                state: state || null,
                zipCode: zipCode || null,
                country: country || 'India',
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
                specialization: specialization || null,
                experience: experience ? parseInt(experience) : 0,
                certifications: certifications || null,
                assignedHubId: assignedHubId || null,
                status: status ? status.toUpperCase() : 'ACTIVE',
                isActive: status ? status.toLowerCase() !== 'inactive' : true,
            },
        });

        // Send credentials email
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const loginLink = `${frontendUrl}/checker`;

        try {
            await sendQCCheckerCredentialsEmail({
                to: email,
                name,
                checkerId,
                password: plainPassword,
                loginLink,
            });
        } catch (emailError) {
            console.error('Failed to send credentials email:', emailError.message);
            // Still return success but with a warning
        }

        // Return without password
        const { password: _, ...checkerData } = qcChecker;

        res.status(201).json({
            success: true,
            message: `QC Checker created successfully. Login credentials have been sent to ${email}`,
            data: checkerData,
        });
    } catch (error) {
        console.error('Create QC Checker error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create QC checker',
        });
    }
};

// ============================
// Admin: Get all QC Checkers
// ============================
const getAllQCCheckers = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (status && status !== 'all') {
            where.status = status.toUpperCase();
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { checkerId: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [checkers, total] = await Promise.all([
            prisma.qCChecker.findMany({
                where,
                select: {
                    id: true,
                    checkerId: true,
                    email: true,
                    name: true,
                    phone: true,
                    address: true,
                    city: true,
                    state: true,
                    zipCode: true,
                    country: true,
                    dateOfBirth: true,
                    joiningDate: true,
                    specialization: true,
                    experience: true,
                    certifications: true,
                    assignedHubId: true,
                    status: true,
                    isActive: true,
                    lastLoginAt: true,
                    assignedVendors: true,
                    completedInspections: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit),
            }),
            prisma.qCChecker.count({ where }),
        ]);

        res.json({
            success: true,
            data: checkers,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Get QC Checkers error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch QC checkers',
        });
    }
};

// ============================
// Admin: Get QC Checker by ID
// ============================
const getQCCheckerById = async (req, res) => {
    try {
        const { id } = req.params;

        const checker = await prisma.qCChecker.findUnique({
            where: { id },
            select: {
                id: true,
                checkerId: true,
                email: true,
                name: true,
                phone: true,
                address: true,
                city: true,
                state: true,
                zipCode: true,
                country: true,
                dateOfBirth: true,
                joiningDate: true,
                specialization: true,
                experience: true,
                certifications: true,
                assignedHubId: true,
                status: true,
                isActive: true,
                lastLoginAt: true,
                assignedVendors: true,
                completedInspections: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!checker) {
            return res.status(404).json({
                success: false,
                error: 'QC Checker not found',
            });
        }

        res.json({
            success: true,
            data: checker,
        });
    } catch (error) {
        console.error('Get QC Checker error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch QC checker',
        });
    }
};

// ============================
// Admin: Update QC Checker
// ============================
const updateQCChecker = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            phone,
            address,
            city,
            state,
            zipCode,
            country,
            dateOfBirth,
            joiningDate,
            status,
            specialization,
            experience,
            certifications,
            assignedHubId,
        } = req.body;

        const existing = await prisma.qCChecker.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'QC Checker not found',
            });
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (phone) updateData.phone = phone;
        if (address !== undefined) updateData.address = address || null;
        if (city !== undefined) updateData.city = city || null;
        if (state !== undefined) updateData.state = state || null;
        if (zipCode !== undefined) updateData.zipCode = zipCode || null;
        if (country !== undefined) updateData.country = country || 'India';
        if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
        if (joiningDate !== undefined) updateData.joiningDate = joiningDate ? new Date(joiningDate) : existing.joiningDate;
        if (status) {
            updateData.status = status.toUpperCase();
            updateData.isActive = status.toLowerCase() !== 'inactive' && status.toLowerCase() !== 'suspended';
        }
        if (specialization !== undefined) updateData.specialization = specialization || null;
        if (experience !== undefined) updateData.experience = experience ? parseInt(experience) : 0;
        if (certifications !== undefined) updateData.certifications = certifications || null;
        if (assignedHubId !== undefined) updateData.assignedHubId = assignedHubId || null;

        const updated = await prisma.qCChecker.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                checkerId: true,
                email: true,
                name: true,
                phone: true,
                address: true,
                city: true,
                state: true,
                zipCode: true,
                country: true,
                dateOfBirth: true,
                joiningDate: true,
                specialization: true,
                experience: true,
                certifications: true,
                assignedHubId: true,
                status: true,
                isActive: true,
                lastLoginAt: true,
                assignedVendors: true,
                completedInspections: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        res.json({
            success: true,
            message: 'QC Checker updated successfully',
            data: updated,
        });
    } catch (error) {
        console.error('Update QC Checker error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update QC checker',
        });
    }
};

// ============================
// Admin: Delete QC Checker
// ============================
const deleteQCChecker = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.qCChecker.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'QC Checker not found',
            });
        }

        await prisma.qCChecker.delete({ where: { id } });

        res.json({
            success: true,
            message: 'QC Checker deleted successfully',
        });
    } catch (error) {
        console.error('Delete QC Checker error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete QC checker',
        });
    }
};

// ============================
// Admin: Resend credentials email
// ============================
const resendCredentials = async (req, res) => {
    try {
        const { id } = req.params;

        const checker = await prisma.qCChecker.findUnique({ where: { id } });
        if (!checker) {
            return res.status(404).json({
                success: false,
                error: 'QC Checker not found',
            });
        }

        // Generate new password
        const plainPassword = generateRandomPassword();
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // Update password in DB
        await prisma.qCChecker.update({
            where: { id },
            data: { password: hashedPassword },
        });

        // Send credentials email
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const loginLink = `${frontendUrl}/checker`;

        await sendQCCheckerCredentialsEmail({
            to: checker.email,
            name: checker.name,
            checkerId: checker.checkerId,
            password: plainPassword,
            loginLink,
        });

        res.json({
            success: true,
            message: `New credentials have been sent to ${checker.email}`,
        });
    } catch (error) {
        console.error('Resend credentials error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to resend credentials',
        });
    }
};

// ============================
// QC Checker: Login
// ============================
const qcCheckerLogin = async (req, res) => {
    try {
        const { checkerId, password } = req.body;

        if (!checkerId || !password) {
            return res.status(400).json({
                success: false,
                error: 'Checker ID and password are required',
            });
        }

        // Find checker by checkerId
        const checker = await prisma.qCChecker.findUnique({
            where: { checkerId: checkerId.toUpperCase() },
        });

        if (!checker) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials. Please check your Checker ID and password.',
            });
        }

        // Check if checker is active
        if (!checker.isActive || checker.status === 'SUSPENDED') {
            return res.status(401).json({
                success: false,
                error: 'Your account is not active. Please contact admin.',
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, checker.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials. Please check your Checker ID and password.',
            });
        }

        // Update last login
        await prisma.qCChecker.update({
            where: { id: checker.id },
            data: { lastLoginAt: new Date() },
        });

        // Generate token
        const token = generateCheckerToken(checker.id);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                checker: {
                    id: checker.id,
                    checkerId: checker.checkerId,
                    email: checker.email,
                    name: checker.name,
                    phone: checker.phone,
                    status: checker.status,
                    specialization: checker.specialization,
                    assignedHubId: checker.assignedHubId,
                },
            },
        });
    } catch (error) {
        console.error('QC Checker login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed. Please try again.',
        });
    }
};

// ============================
// QC Checker: Get current profile
// ============================
const getCheckerProfile = async (req, res) => {
    try {
        const checkerId = req.user?.checkerId || req.userId;

        const checker = await prisma.qCChecker.findUnique({
            where: { id: checkerId },
            select: {
                id: true,
                checkerId: true,
                email: true,
                name: true,
                phone: true,
                address: true,
                city: true,
                state: true,
                zipCode: true,
                country: true,
                dateOfBirth: true,
                joiningDate: true,
                specialization: true,
                experience: true,
                certifications: true,
                assignedHubId: true,
                status: true,
                isActive: true,
                lastLoginAt: true,
                assignedVendors: true,
                completedInspections: true,
                createdAt: true,
            },
        });

        if (!checker) {
            return res.status(404).json({
                success: false,
                error: 'Checker profile not found',
            });
        }

        res.json({
            success: true,
            data: checker,
        });
    } catch (error) {
        console.error('Get checker profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get profile',
        });
    }
};

// ============================
// QC Checker: Update current profile
// ============================
const updateCheckerProfile = async (req, res) => {
    try {
        const checkerId = req.user?.checkerId || req.userId;
        const {
            name,
            phone,
            address,
            city,
            state,
            zipCode,
            country,
            password
        } = req.body;

        const checker = await prisma.qCChecker.findUnique({
            where: { id: checkerId },
        });

        if (!checker) {
            return res.status(404).json({
                success: false,
                error: 'Checker profile not found',
            });
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (phone) updateData.phone = phone;
        if (address !== undefined) updateData.address = address || null;
        if (city !== undefined) updateData.city = city || null;
        if (state !== undefined) updateData.state = state || null;
        if (zipCode !== undefined) updateData.zipCode = zipCode || null;
        if (country !== undefined) updateData.country = country || 'India';
        
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const updated = await prisma.qCChecker.update({
            where: { id: checkerId },
            data: updateData,
            select: {
                id: true,
                checkerId: true,
                email: true,
                name: true,
                phone: true,
                address: true,
                city: true,
                state: true,
                zipCode: true,
                country: true,
                dateOfBirth: true,
                joiningDate: true,
                specialization: true,
                experience: true,
                certifications: true,
                assignedHubId: true,
                status: true,
                isActive: true,
                lastLoginAt: true,
                assignedVendors: true,
                completedInspections: true,
                createdAt: true,
            },
        });

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: updated,
        });
    } catch (error) {
        console.error('Update checker profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile',
        });
    }
};

// ============================
// QC Checker: Get assigned vendors
// ============================
const ALLOWED_VENDOR_STATUSES = ['PENDING', 'UNDER_REVIEW', 'REINSPECTION', 'APPROVED', 'REJECTED', 'SUSPENDED'];
const ALLOWED_VENDOR_SORT_FIELDS = ['submittedAt', 'status'];

const getAssignedVendors = async (req, res) => {
    try {
        const checkerId = req.user?.checkerId || req.userId;

        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
        // Cap search length to bound DB scan cost — beyond this, regex/contains
        // queries on text columns get expensive.
        const search = (req.query.search || '').toString().trim().slice(0, 100);
        const status = req.query.status ? req.query.status.toString().toUpperCase() : null;
        const sortBy = ALLOWED_VENDOR_SORT_FIELDS.includes(req.query.sortBy)
            ? req.query.sortBy
            : 'submittedAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

        if (status && !ALLOWED_VENDOR_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Must be one of: ${ALLOWED_VENDOR_STATUSES.join(', ')}`,
            });
        }

        const where = { assignedQcId: checkerId };
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { companyName: { contains: search, mode: 'insensitive' } },
                { factoryCity: { contains: search, mode: 'insensitive' } },
                { factoryState: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [total, vendors] = await Promise.all([
            prisma.vendor.count({ where }),
            prisma.vendor.findMany({
                where,
                select: {
                    id: true,
                    companyName: true,
                    ownerName: true,
                    businessEmail: true,
                    businessPhone: true,
                    status: true,
                    createdAt: true,
                    submittedAt: true,
                    factoryAddress: true,
                    factoryCity: true,
                    factoryState: true,
                    inspections: {
                        select: { status: true, result: true, cycleNumber: true },
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                    },
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);

        res.json({
            success: true,
            data: {
                vendors,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });

    } catch (error) {
        console.error('Get assigned vendors error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch assigned vendors',
        });
    }
};

// ============================
// QC Checker: Get Vendor Details + Stats
// ============================
const getVendorDetails = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const checkerId = req.user?.checkerId || req.userId;

        const historyLimit = Math.min(
            Math.max(parseInt(req.query.historyLimit, 10) || 10, 1),
            50
        );

        const vendor = await prisma.vendor.findFirst({
            where: { id: vendorId, assignedQcId: checkerId },
            include: {
                certifications: true,
                assignedQc: {
                    select: { name: true, checkerId: true, email: true, phone: true },
                },
            },
        });

        if (!vendor) {
            return res.status(404).json({
                success: false,
                error: 'Vendor not found or not assigned to you',
            });
        }

        // Include SUBMITTED and COMPLETED in history (inspections that have been done)
        const historyWhere = { vendorId, status: { in: ['COMPLETED', 'SUBMITTED', 'UNDER_ADMIN_REVIEW', 'REJECTED'] } };
        const completedWhere = { vendorId, status: 'COMPLETED' };

        const [
            statusBreakdown,
            passedCount,
            recentCompleted,
            upcomingInspections,
        ] = await Promise.all([
            prisma.inspection.groupBy({
                by: ['status'],
                where: { vendorId },
                _count: { _all: true },
            }),
            prisma.inspection.count({ where: { ...completedWhere, result: 'PASSED' } }),
            prisma.inspection.findMany({
                where: historyWhere,
                orderBy: { createdAt: 'desc' },
                take: historyLimit,
                select: {
                    id: true,
                    poNumber: true,
                    clientName: true,
                    scheduledDate: true,
                    completedAt: true,
                    submittedAt: true,
                    result: true,
                    status: true,
                    score: true,
                    cycleNumber: true,
                    itemsToInspect: true,
                },
            }),
            prisma.inspection.findMany({
                where: { vendorId, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
                orderBy: { scheduledDate: 'asc' },
                select: {
                    id: true,
                    poNumber: true,
                    clientName: true,
                    scheduledDate: true,
                    status: true,
                    priority: true,
                    cycleNumber: true,
                },
            }),
        ]);

        const countByStatus = statusBreakdown.reduce((acc, row) => {
            acc[row.status] = row._count._all;
            return acc;
        }, {});
        const scheduledCount = countByStatus.SCHEDULED ?? 0;
        const inProgressCount = countByStatus.IN_PROGRESS ?? 0;
        const completedCount = countByStatus.COMPLETED ?? 0;
        const submittedCount = countByStatus.SUBMITTED ?? 0;
        const cancelledCount = countByStatus.CANCELLED ?? 0;
        const totalInspections = scheduledCount + inProgressCount + completedCount + submittedCount + cancelledCount;
        const finishedCount = completedCount + submittedCount;
        const passRate = finishedCount > 0 ? Math.round((passedCount / finishedCount) * 100) : 0;

        const latest = recentCompleted[0];
        const lastInspectionDate = latest
            ? (latest.submittedAt ? latest.submittedAt.toISOString() : latest.completedAt ? latest.completedAt.toISOString() : latest.scheduledDate)
            : null;

        res.json({
            success: true,
            data: {
                vendor,
                stats: {
                    totalInspections,
                    scheduledCount,
                    inProgressCount,
                    completedCount,
                    submittedCount,
                    passRate,
                    lastInspectionDate,
                },
                recentInspections: recentCompleted,
                upcomingInspections,
                recentInspectionsMeta: {
                    limit: historyLimit,
                    returned: recentCompleted.length,
                    total: finishedCount,
                    hasMore: finishedCount > recentCompleted.length,
                },
            },
        });
    } catch (error) {
        console.error('Get vendor details error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch vendor details',
        });
    }
};

// ============================
// QC Checker: Get active inspection for a vendor (fast path for InspectionForm)
// ============================
const getActiveInspectionForVendor = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const checkerId = req.user?.checkerId || req.userId;

        const vendor = await prisma.vendor.findFirst({
            where: { id: vendorId, assignedQcId: checkerId },
            select: { id: true },
        });
        if (!vendor) {
            return res.status(403).json({
                success: false,
                error: 'Vendor not assigned to this checker',
            });
        }

        const inspectionSelect = {
            id: true,
            status: true,
            itemsToInspect: true,
            scheduledDate: true,
            cycleNumber: true,
            parentInspectionId: true,
            rejectionReason: true,
            vendor: {
                select: {
                    id: true,
                    vendorCode: true,
                    companyName: true,
                    ownerName: true,
                    businessPhone: true,
                    gstNumber: true,
                    factoryAddress: true,
                    factoryCity: true,
                    factoryState: true,
                    factoryZipCode: true,
                    businessRegistrationNumber: true,
                    tradeLicenseNumber: true,
                    factoryLatitude: true,
                    factoryLongitude: true,
                    mapLink: true,
                },
            },
        };

        // Only return inspections the checker can act on. Falling back to
        // COMPLETED/CANCELLED rows would leak a stale id into InspectionForm and
        // corrupt the submit path (server would reject, but UX path is wrong).
        const inspection = await prisma.inspection.findFirst({
            where: { vendorId, checkerId, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
            orderBy: { scheduledDate: 'asc' },
            select: inspectionSelect,
        });

        // For re-inspections, fetch the previous rejection reason from the parent
        let previousRejectionReason = null;
        if (inspection?.parentInspectionId) {
            const parent = await prisma.inspection.findUnique({
                where: { id: inspection.parentInspectionId },
                select: { rejectionReason: true, notes: true },
            });
            previousRejectionReason = parent?.rejectionReason || parent?.notes || null;
        }

        res.json({ success: true, inspection, previousRejectionReason });
    } catch (error) {
        console.error('Get active inspection error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch active inspection',
        });
    }
};

// ============================
// QC Checker: Approve Vendor
// ============================
const approveVendorByQc = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const checkerId = req.user?.checkerId || req.userId;

        const vendor = await prisma.vendor.findFirst({
            where: {
                id: vendorId,
                assignedQcId: checkerId,
            },
        });

        if (!vendor) {
            return res.status(404).json({
                success: false,
                error: 'Vendor not found or not assigned to you',
            });
        }

        const updatedVendor = await prisma.vendor.update({
            where: { id: vendorId },
            data: {
                status: 'UNDER_REVIEW', // Keep as UNDER_REVIEW for admin approval
                approvedAt: new Date(),
            },
        });

        // Update QC stats
        await prisma.qCChecker.update({
            where: { id: checkerId },
            data: {
                completedInspections: { increment: 1 }
            }
        });

        // Write audit log
        // Find the latest inspection for this vendor to link the audit log
        const latestInspection = await prisma.inspection.findFirst({
            where: { vendorId, checkerId },
            orderBy: { createdAt: 'desc' },
            select: { id: true, cycleNumber: true },
        });
        if (latestInspection) {
            await prisma.inspectionAuditLog.create({
                data: {
                    entityType: 'FACTORY_INSPECTION',
                    entityId: latestInspection.id,
                    action: 'QC_APPROVED',
                    fromStatus: vendor.status,
                    toStatus: 'UNDER_REVIEW',
                    performedById: checkerId,
                    performedByType: 'QC_CHECKER',
                    performedByName: req.user?.name || req.user?.email || 'QC Checker',
                    cycleNumber: latestInspection.cycleNumber || 1,
                },
            }).catch(err => console.error('Audit log write failed:', err));
        }

        res.json({
            success: true,
            message: 'Vendor approved successfully',
            data: updatedVendor,
        });

    } catch (error) {
        console.error('Approve vendor error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to approve vendor',
        });
    }
};

// ============================
// QC Checker: Reject Vendor
// ============================
const rejectVendorByQc = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { reason } = req.body;
        const checkerId = req.user?.checkerId || req.userId;

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'Rejection reason is required',
            });
        }

        const vendor = await prisma.vendor.findFirst({
            where: {
                id: vendorId,
                assignedQcId: checkerId,
            },
        });

        if (!vendor) {
            return res.status(404).json({
                success: false,
                error: 'Vendor not found or not assigned to you',
            });
        }

        const updatedVendor = await prisma.vendor.update({
            where: { id: vendorId },
            data: {
                status: 'REJECTED',
                rejectedAt: new Date(),
                rejectionReason: reason,
            },
        });

        // Update QC stats
        await prisma.qCChecker.update({
            where: { id: checkerId },
            data: {
                completedInspections: { increment: 1 }
            }
        });

        // Write audit log
        const latestInspection = await prisma.inspection.findFirst({
            where: { vendorId, checkerId },
            orderBy: { createdAt: 'desc' },
            select: { id: true, cycleNumber: true },
        });
        if (latestInspection) {
            await prisma.inspectionAuditLog.create({
                data: {
                    entityType: 'FACTORY_INSPECTION',
                    entityId: latestInspection.id,
                    action: 'QC_REJECTED',
                    fromStatus: vendor.status,
                    toStatus: 'REJECTED',
                    performedById: checkerId,
                    performedByType: 'QC_CHECKER',
                    performedByName: req.user?.name || req.user?.email || 'QC Checker',
                    rejectionReason: reason,
                    cycleNumber: latestInspection.cycleNumber || 1,
                },
            }).catch(err => console.error('Audit log write failed:', err));
        }

        res.json({
            success: true,
            message: 'Vendor rejected successfully',
            data: updatedVendor,
        });

    } catch (error) {
        console.error('Error rejecting vendor by QC:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while rejecting the vendor'
        });
    }
};

// ============================
// QC Checker: Get assigned products (paginated + filterable)
// ============================
// Matches the ProductApprovalStatus enum in schema.prisma — note there is
// no UNDER_REVIEW for products (vendor statuses use it, product statuses don't).
const ALLOWED_PRODUCT_APPROVAL_STATUSES = [
    'PENDING',
    'QC_APPROVED',
    'APPROVED',
    'REINSPECTION',
    'REJECTED',
];
const ALLOWED_PRODUCT_SORT_FIELDS = ['createdAt', 'approvalStatus', 'basePrice'];

const getAssignedProducts = async (req, res) => {
    try {
        if (req.user.role !== 'QC_CHECKER') {
            return res.status(403).json({ success: false, message: 'Access denied: QC Checker role required' });
        }

        const qcCheckerId = req.user.id;

        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
        // Cap search to bound DB scan cost — same pattern as getAssignedVendors.
        const search = (req.query.search || '').toString().trim().slice(0, 100);
        const status = req.query.status ? req.query.status.toString().toUpperCase() : null;
        const sortBy = ALLOWED_PRODUCT_SORT_FIELDS.includes(req.query.sortBy)
            ? req.query.sortBy
            : 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

        if (status && !ALLOWED_PRODUCT_APPROVAL_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Must be one of: ${ALLOWED_PRODUCT_APPROVAL_STATUSES.join(', ')}`,
            });
        }

        const where = { assignedQcId: qcCheckerId };
        if (status) where.approvalStatus = status;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { baseSku: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
                { vendor: { companyName: { contains: search, mode: 'insensitive' } } },
            ];
        }

        const [total, products] = await Promise.all([
            prisma.product.count({ where }),
            prisma.product.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    baseSku: true,
                    category: true,
                    basePrice: true,
                    totalStock: true,
                    status: true,
                    approvalStatus: true,
                    createdAt: true,
                    vendor: {
                        select: { companyName: true, ownerName: true, email: true },
                    },
                    images: {
                        where: { isPrimary: true },
                        take: 1,
                        select: { url: true, isPrimary: true },
                    },
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);

        res.status(200).json({
            success: true,
            data: {
                products,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        console.error('Error fetching assigned products:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching assigned products',
        });
    }
};

// ============================
// QC Checker: Get completed product inspection reports (paginated)
// ============================
const getProductReports = async (req, res) => {
    try {
        if (req.user.role !== 'QC_CHECKER') {
            return res.status(403).json({ success: false, message: 'Access denied: QC Checker role required' });
        }

        const qcCheckerId = req.user.id;

        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
        const search = (req.query.search || '').toString().trim().slice(0, 100);
        const sortBy = ALLOWED_PRODUCT_SORT_FIELDS.includes(req.query.sortBy)
            ? req.query.sortBy
            : 'updatedAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

        const where = {
            assignedQcId: qcCheckerId,
            approvalStatus: { in: ['QC_APPROVED', 'APPROVED', 'REJECTED', 'REINSPECTION'] },
        };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { baseSku: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
                { vendor: { companyName: { contains: search, mode: 'insensitive' } } },
            ];
        }

        const [total, products] = await Promise.all([
            prisma.product.count({ where }),
            prisma.product.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    baseSku: true,
                    category: true,
                    approvalStatus: true,
                    rejectionReason: true,
                    updatedAt: true,
                    vendor: {
                        select: { companyName: true, ownerName: true },
                    },
                    images: {
                        where: { isPrimary: true },
                        take: 1,
                    },
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);

        res.status(200).json({
            success: true,
            data: {
                products,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        console.error('Error fetching product reports:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching product reports',
        });
    }
};

// ============================
// QC Checker: Get product details (scoped to assigned checker)
// ============================
const getProductDetails = async (req, res) => {
    try {
        if (req.user.role !== 'QC_CHECKER') {
            return res.status(403).json({ success: false, message: 'Access denied: QC Checker role required' });
        }

        const { productId } = req.params;
        const qcCheckerId = req.user.id;

        const product = await prisma.product.findFirst({
            where: { id: productId, assignedQcId: qcCheckerId },
            include: {
                vendor: {
                    select: {
                        id: true,
                        companyName: true,
                        ownerName: true,
                        email: true,
                        businessPhone: true,
                        businessEmail: true,
                        factoryCity: true,
                        factoryState: true,
                    },
                },
                images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
                variants: { orderBy: { createdAt: 'asc' } },
                assignedQc: { select: { name: true, email: true } },
            },
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found or not assigned to you',
            });
        }

        // QC activity for this product lives on the Product record itself
        // (approvedAt, approvedBy, rejectionReason, qcInspectionData). The
        // Inspection model has no productId relation, so there is no separate
        // history to fetch — the product document is the canonical source.
        res.status(200).json({
            success: true,
            data: { product },
        });
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching product details',
        });
    }
};

// ============================
// QC Checker: Start Product Inspection
//   Pre-flight geofence check before the checker fills the form. Mirrors
//   the factory `startInspection` endpoint so the backend logs both sides
//   of the comparison at the moment the checker begins. No state change
//   on the product — it's a verification ping only.
// ============================
const startProductInspectionByQc = async (req, res) => {
    try {
        if (req.user.role !== 'QC_CHECKER') {
            return res.status(403).json({ success: false, message: 'Access denied: QC Checker role required' });
        }

        const { productId } = req.params;
        const { checkerLatitude, checkerLongitude } = req.body;
        const qcCheckerId = req.user.id;

        const product = await prisma.product.findFirst({
            where: { id: productId, assignedQcId: qcCheckerId },
            include: {
                vendor: {
                    select: {
                        id: true,
                        factoryLatitude: true,
                        factoryLongitude: true,
                        mapLink: true,
                        companyName: true,
                    },
                },
            },
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found or not assigned to you',
            });
        }

        const { verifyCheckerAtVendor, LOCATION_THRESHOLD_METERS } = require('../utils/locationUtils');
        const geo = await verifyCheckerAtVendor({
            vendor: product.vendor,
            checkerLatitude,
            checkerLongitude,
            prisma,
            label: `startProductInspection ${productId}`,
        });
        if (!geo.ok) {
            return res.status(geo.status).json(geo.body);
        }

        return res.json({
            success: true,
            message: 'Location verified — you may begin the product inspection.',
            locationVerification: {
                verified: true,
                distanceMeters: Math.round(geo.distanceM),
                thresholdMeters: LOCATION_THRESHOLD_METERS,
            },
        });
    } catch (error) {
        console.error('Error starting product inspection:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while verifying location',
        });
    }
};

// ============================
// QC Checker: Approve Product
// ============================
const approveProductByQc = async (req, res) => {
    try {
        if (req.user.role !== 'QC_CHECKER') {
            return res.status(403).json({ success: false, message: 'Access denied: QC Checker role required' });
        }

        const { productId } = req.params;
        const { formData, checkerLatitude, checkerLongitude } = req.body;
        const qcCheckerId = req.user.id;

        const product = await prisma.product.findFirst({
            where: {
                id: productId,
                assignedQcId: qcCheckerId
            },
            include: {
                vendor: {
                    select: {
                        id: true,
                        factoryLatitude: true,
                        factoryLongitude: true,
                        mapLink: true,
                        companyName: true,
                    },
                },
            },
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found or not assigned to you'
            });
        }

        // Prevent duplicate submission — only PENDING or REINSPECTION products can be inspected
        if (product.approvalStatus !== 'PENDING' && product.approvalStatus !== 'REINSPECTION') {
            return res.status(409).json({
                success: false,
                message: `Product inspection already completed with status: ${product.approvalStatus}`
            });
        }

        // ── Location verification — checker must be at the vendor factory ──
        const { verifyCheckerAtVendor } = require('../utils/locationUtils');
        const geo = await verifyCheckerAtVendor({
            vendor: product.vendor,
            checkerLatitude,
            checkerLongitude,
            prisma,
            label: `approveProduct ${productId}`,
        });
        if (!geo.ok) {
            return res.status(geo.status).json(geo.body);
        }

        // Calculate the inspection result from formData
        let approvalStatus = 'QC_APPROVED';
        let productStatus = 'INACTIVE'; // Keep as INACTIVE until Admin finalizes with a price
        
        if (formData) {
            // Extract remark codes from formData
            const remarkFields = [
                'shipperCartonRemark',
                'innerCartonRemark',
                'retailPackagingRemark',
                'productTypeRemark',
                'aqlWorkmanshipRemark',
                'onSiteTestsRemark'
            ];
            
            const remarkCodes = [];
            remarkFields.forEach(field => {
                const value = formData[field];
                if (value && typeof value === 'string') {
                    const code = parseInt(value.trim());
                    if (!isNaN(code) && code >= 1 && code <= 10) {
                        remarkCodes.push(code);
                    }
                }
            });
            
            // Calculate average score
            const average = remarkCodes.length > 0 
                ? remarkCodes.reduce((sum, code) => sum + code, 0) / remarkCodes.length 
                : 10;
            
            // Determine approval status based on average
            if (average >= 8) {
                approvalStatus = 'QC_APPROVED';
            } else if (average >= 6) {
                approvalStatus = 'REINSPECTION';
            } else {
                approvalStatus = 'REJECTED';
            }
        }

        const cleanFormData = formData
            ? await resolveBase64InValue(formData, { folder: 'qc-inspections' })
            : null;

        const fromStatus = product.approvalStatus;

        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: {
                approvalStatus,
                status: productStatus,
                qcInspectionData: cleanFormData
            }
        });

        // Write audit log (with the verified-location snapshot)
        const locationStamp = `Verified at factory — ${Math.round(geo.distanceM)}m from vendor (checker ${Number(checkerLatitude).toFixed(6)},${Number(checkerLongitude).toFixed(6)})`;
        await prisma.inspectionAuditLog.create({
            data: {
                entityType: 'PRODUCT_INSPECTION',
                entityId: productId,
                action: approvalStatus === 'QC_APPROVED' ? 'QC_APPROVED' : approvalStatus === 'REINSPECTION' ? 'QC_REINSPECTION' : 'QC_REJECTED',
                fromStatus,
                toStatus: approvalStatus,
                performedById: qcCheckerId,
                performedByType: 'QC_CHECKER',
                performedByName: req.user.name || req.user.email || 'QC Checker',
                locationDetails: locationStamp,
                inspectionData: cleanFormData,
                cycleNumber: product.inspectionCycleNumber || 1,
            },
        }).catch(err => console.error('Audit log write failed:', err));

        // Notify admins when product needs review
        if (approvalStatus === 'REJECTED' || approvalStatus === 'REINSPECTION') {
            const { notifications } = require('../utils/notificationService');
            notifications.inspectionSubmitted(product.name, approvalStatus).catch(console.error);
        }

        // In-app notification for admins
        const { createNotificationForRole: notifyAdminsQc } = require('./notificationController');
        const resultLabel = approvalStatus === 'QC_APPROVED' ? 'Approved' : approvalStatus === 'REINSPECTION' ? 'Re-inspection' : 'Rejected';
        notifyAdminsQc({
            role: 'ADMIN', type: 'INSPECTION_COMPLETED',
            title: 'Product Inspection Completed',
            message: `QC inspection for "${product.name}" — Result: ${resultLabel}`,
            data: { productId: product.id }
        }).catch(() => {});

        res.status(200).json({
            success: true,
            message: `Product ${approvalStatus === 'QC_APPROVED' ? 'approved' : approvalStatus === 'REINSPECTION' ? 'marked for reinspection' : 'rejected'} successfully`,
            data: updatedProduct
        });
    } catch (error) {
        console.error('Error approving product by QC:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while approving the product'
        });
    }
};

// ============================
// QC Checker: Reject Product
// ============================
const rejectProductByQc = async (req, res) => {
    try {
        if (req.user.role !== 'QC_CHECKER') {
            return res.status(403).json({ success: false, message: 'Access denied: QC Checker role required' });
        }

        const { productId } = req.params;
        const { reason, formData, checkerLatitude, checkerLongitude } = req.body;
        const qcCheckerId = req.user.id;

        if (!reason) {
            return res.status(400).json({ success: false, message: 'Rejection reason is required' });
        }

        const product = await prisma.product.findFirst({
            where: {
                id: productId,
                assignedQcId: qcCheckerId
            },
            include: {
                vendor: {
                    select: {
                        id: true,
                        factoryLatitude: true,
                        factoryLongitude: true,
                        mapLink: true,
                        companyName: true,
                    },
                },
            },
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found or not assigned to you'
            });
        }

        // Prevent duplicate submission — only PENDING or REINSPECTION products can be rejected
        if (product.approvalStatus !== 'PENDING' && product.approvalStatus !== 'REINSPECTION') {
            return res.status(409).json({
                success: false,
                message: `Product inspection already completed with status: ${product.approvalStatus}`
            });
        }

        // ── Location verification — checker must be at the vendor factory ──
        const { verifyCheckerAtVendor } = require('../utils/locationUtils');
        const geo = await verifyCheckerAtVendor({
            vendor: product.vendor,
            checkerLatitude,
            checkerLongitude,
            prisma,
            label: `rejectProduct ${productId}`,
        });
        if (!geo.ok) {
            return res.status(geo.status).json(geo.body);
        }

        const cleanFormData = formData
            ? await resolveBase64InValue(formData, { folder: 'qc-inspections' })
            : null;

        const fromStatus = product.approvalStatus;
        const { remarks, notes } = req.body;
        const locationStamp = `Verified at factory — ${Math.round(geo.distanceM)}m from vendor (checker ${Number(checkerLatitude).toFixed(6)},${Number(checkerLongitude).toFixed(6)})`;

        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: {
                approvalStatus: 'REJECTED',
                rejectionReason: reason,
                rejectionRemarks: remarks || null,
                rejectionNotes: notes || null,
                status: 'INACTIVE',
                qcInspectionData: cleanFormData
            }
        });

        // Write audit log
        await prisma.inspectionAuditLog.create({
            data: {
                entityType: 'PRODUCT_INSPECTION',
                entityId: productId,
                action: 'QC_REJECTED',
                fromStatus,
                toStatus: 'REJECTED',
                performedById: qcCheckerId,
                performedByType: 'QC_CHECKER',
                performedByName: req.user.name || req.user.email || 'QC Checker',
                rejectionReason: reason,
                remarks: remarks || null,
                notes: notes || null,
                locationDetails: locationStamp,
                inspectionData: cleanFormData,
                cycleNumber: product.inspectionCycleNumber || 1,
            },
        }).catch(err => console.error('Audit log write failed:', err));

        // Notify admins
        const { notifications } = require('../utils/notificationService');
        notifications.inspectionSubmitted(product.name, 'REJECTED').catch(console.error);

        res.status(200).json({
            success: true,
            message: 'Product rejected successfully',
            data: updatedProduct
        });
    } catch (error) {
        console.error('Error rejecting product by QC:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while rejecting the product'
        });
    }
};

module.exports = {
    createQCChecker,
    getAllQCCheckers,
    getQCCheckerById,
    updateQCChecker,
    deleteQCChecker,
    resendCredentials,
    qcCheckerLogin,
    getCheckerProfile,
    getAssignedVendors,
    getVendorDetails,
    getActiveInspectionForVendor,
    approveVendorByQc,
    rejectVendorByQc,
    getAssignedProducts,
    getProductReports,
    getProductDetails,
    startProductInspectionByQc,
    approveProductByQc,
    rejectProductByQc,
    updateCheckerProfile
};
