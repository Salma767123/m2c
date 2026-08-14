const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { prisma } = require('../config/database');
const { sendTemplatedEmail } = require('../utils/emailTemplateRenderer');
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

// Generate a unique Checker ID in the form QC-<year>-<serial>, e.g. QC-2026-001.
// The serial is scoped to the current year, so it restarts at 001 each year.
const generateCheckerId = async () => {
    const year = new Date().getFullYear();
    const prefix = `QC-${year}-`;

    // Latest checker created this year → its serial is the current max for the year.
    const lastChecker = await prisma.qCChecker.findFirst({
        where: { checkerId: { startsWith: prefix } },
        orderBy: { createdAt: 'desc' },
        select: { checkerId: true }
    });

    let nextNumber = 1;
    if (lastChecker && lastChecker.checkerId) {
        const match = lastChecker.checkerId.match(/QC-\d{4}-(\d+)/);
        if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
        }
    }

    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
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
            title,
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
            alternatePhone,
            alternateEmail,
            profilePhoto,
            idProof,
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

        // Upload the profile photo + ID proof to Cloudinary so only the secure URL is
        // stored — never a base64 blob in the DB. Existing URLs pass through unchanged.
        const resolvedProfilePhoto = profilePhoto ? await resolveBase64InValue(profilePhoto, { folder: 'qc-checkers/photos' }) : null;
        const resolvedIdProof = idProof ? await resolveBase64InValue(idProof, { folder: 'qc-checkers/id-proofs' }) : null;

        // Create the QC Checker
        const qcChecker = await prisma.qCChecker.create({
            data: {
                checkerId,
                email,
                password: hashedPassword,
                name,
                title: title || null,
                phone,
                address: address || null,
                city: city || null,
                state: state || null,
                zipCode: zipCode || null,
                country: country || 'India',
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                alternatePhone: alternatePhone || null,
                alternateEmail: alternateEmail || null,
                profilePhoto: resolvedProfilePhoto,
                idProof: resolvedIdProof,
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

        await sendTemplatedEmail({
            key: 'qc_checker_credentials',
            to: email,
            data: {
                name,
                checkerId,
                password: plainPassword,
                loginLink,
            },
        });

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
                    title: true,
                    phone: true,
                    // Small Cloudinary URL — shown as the avatar in the management list.
                    profilePhoto: true,
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
                    // Live counts — the `assignedVendors` / `completedInspections`
                    // Int columns drift: they are only incremented by legacy
                    // code paths, while the inspection-assignment flow sets
                    // vendor.assignedQcId / creates Inspection rows directly —
                    // so the stored counters read 0 even for active checkers.
                    _count: {
                        select: {
                            vendorsList: true,
                            // Products assigned to this checker for QC.
                            productsList: true,
                            // "Performed" inspections — anything the checker has
                            // actually worked past scheduling (submitted, under
                            // review, rejected, re-inspection, completed).
                            inspections: {
                                where: { status: { notIn: ['SCHEDULED', 'IN_PROGRESS', 'CANCELLED'] } },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit),
            }),
            prisma.qCChecker.count({ where }),
        ]);

        res.json({
            success: true,
            // Overwrite the drifted counters with the live relation counts so
            // every consumer (assignment dropdown, checker management list)
            // sees the real numbers.
            data: checkers.map(({ _count, ...checker }) => ({
                ...checker,
                assignedVendors: _count.vendorsList,
                assignedProducts: _count.productsList,
                completedInspections: _count.inspections,
            })),
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
                title: true,
                phone: true,
                address: true,
                city: true,
                state: true,
                zipCode: true,
                country: true,
                dateOfBirth: true,
                alternatePhone: true,
                alternateEmail: true,
                profilePhoto: true,
                idProof: true,
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
// Admin: Get a checker's assignments — factory (vendor) inspections + product QC
// assignments, each with its status, for the Assignments tab on the detail page.
// ============================
const getCheckerAssignments = async (req, res) => {
    try {
        const { id } = req.params;

        const checker = await prisma.qCChecker.findUnique({ where: { id }, select: { id: true } });
        if (!checker) {
            return res.status(404).json({ success: false, error: 'QC checker not found' });
        }

        const [vendorInspections, productAssignments] = await Promise.all([
            // Factory / vendor inspections this checker was assigned.
            prisma.inspection.findMany({
                where: { checkerId: id },
                select: {
                    id: true,
                    poNumber: true,
                    clientName: true,
                    scheduledDate: true,
                    scheduledTime: true,
                    inspectionType: true,
                    status: true,
                    result: true,
                    submittedAt: true,
                    completedAt: true,
                    createdAt: true,
                    vendor: { select: { id: true, companyName: true, ownerName: true, factoryCity: true, factoryState: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            // Products assigned to this checker for QC. Their "status" is the product's
            // approvalStatus; the booked schedule (if any) lives in qcAssignment.
            prisma.product.findMany({
                where: { assignedQcId: id },
                select: {
                    id: true,
                    name: true,
                    baseSku: true,
                    category: true,
                    approvalStatus: true,
                    qcAssignment: true,
                    createdAt: true,
                    updatedAt: true,
                    vendor: { select: { id: true, companyName: true, ownerName: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        res.json({ success: true, data: { vendorInspections, productAssignments } });
    } catch (error) {
        console.error('Get checker assignments error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch assignments' });
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
            title,
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
            alternatePhone,
            alternateEmail,
            profilePhoto,
            idProof,
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
        if (title !== undefined) updateData.title = title || null;
        if (phone) updateData.phone = phone;
        if (address !== undefined) updateData.address = address || null;
        if (city !== undefined) updateData.city = city || null;
        if (state !== undefined) updateData.state = state || null;
        if (zipCode !== undefined) updateData.zipCode = zipCode || null;
        if (country !== undefined) updateData.country = country || 'India';
        if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
        if (alternatePhone !== undefined) updateData.alternatePhone = alternatePhone || null;
        if (alternateEmail !== undefined) updateData.alternateEmail = alternateEmail || null;
        // Upload any newly-picked photo/ID (base64) to Cloudinary; existing URLs pass through.
        if (profilePhoto !== undefined) updateData.profilePhoto = profilePhoto ? await resolveBase64InValue(profilePhoto, { folder: 'qc-checkers/photos' }) : null;
        if (idProof !== undefined) updateData.idProof = idProof ? await resolveBase64InValue(idProof, { folder: 'qc-checkers/id-proofs' }) : null;
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
                title: true,
                phone: true,
                address: true,
                city: true,
                state: true,
                zipCode: true,
                country: true,
                dateOfBirth: true,
                alternatePhone: true,
                alternateEmail: true,
                profilePhoto: true,
                idProof: true,
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

        const resendResult = await sendTemplatedEmail({
            key: 'qc_checker_credentials',
            to: checker.email,
            data: {
                name: checker.name,
                checkerId: checker.checkerId,
                password: plainPassword,
                loginLink,
            },
        });

        res.json({
            success: true,
            message: resendResult.sent
                ? `New credentials have been sent to ${checker.email}`
                : `Credentials regenerated, but the credentials email is turned off`,
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
                    title: checker.title,
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
                title: true,
                phone: true,
                address: true,
                city: true,
                state: true,
                zipCode: true,
                country: true,
                dateOfBirth: true,
                alternatePhone: true,
                alternateEmail: true,
                profilePhoto: true,
                idProof: true,
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

        // Lightweight mode (?light=1): strip the heavy base64 idProof blob (a
        // multi-MB PDF) from the payload so the profile screen loads fast on slow
        // mobile connections. We still surface whether an ID proof exists and its
        // type so the UI can render the "View ID Proof" button; the actual blob is
        // fetched on demand via GET /qc-checkers/me/id-proof. profilePhoto is kept
        // — it's the avatar shown on the profile screen and is comparatively small.
        const light = req.query.light === '1' || req.query.light === 'true';
        if (light) {
            const ip = checker.idProof;
            checker.hasIdProof = !!ip;
            checker.idProofType = ip
                ? ((ip.startsWith('data:application/pdf') || ip.toLowerCase().endsWith('.pdf')) ? 'pdf' : 'image')
                : null;
            delete checker.idProof;
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

// Fetch the current checker's ID proof (base64 data-URI or URL) on demand. Kept
// out of the main profile payload so the profile screen stays lightweight; only
// fetched when the user taps "View ID Proof".
const getCheckerIdProof = async (req, res) => {
    try {
        const checkerId = req.user?.checkerId || req.userId;

        const checker = await prisma.qCChecker.findUnique({
            where: { id: checkerId },
            select: { idProof: true },
        });

        if (!checker) {
            return res.status(404).json({
                success: false,
                error: 'Checker profile not found',
            });
        }

        res.json({
            success: true,
            data: { idProof: checker.idProof || null },
        });
    } catch (error) {
        console.error('Get checker ID proof error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get ID proof',
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
            alternatePhone,
            alternateEmail,
            profilePhoto,
            idProof,
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
        if (alternatePhone !== undefined) updateData.alternatePhone = alternatePhone || null;
        if (alternateEmail !== undefined) updateData.alternateEmail = alternateEmail || null;
        // Upload any newly-picked photo/ID (base64) to Cloudinary; existing URLs pass through.
        if (profilePhoto !== undefined) updateData.profilePhoto = profilePhoto ? await resolveBase64InValue(profilePhoto, { folder: 'qc-checkers/photos' }) : null;
        if (idProof !== undefined) updateData.idProof = idProof ? await resolveBase64InValue(idProof, { folder: 'qc-checkers/id-proofs' }) : null;

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
                alternatePhone: true,
                alternateEmail: true,
                profilePhoto: true,
                idProof: true,
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
const ALLOWED_VENDOR_SORT_FIELDS = ['assignedQcAt', 'submittedAt', 'status'];

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
            : 'assignedQcAt';
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
                    assignedQcAt: true,
                    factoryAddress: true,
                    factoryCity: true,
                    factoryState: true,
                    inspections: {
                        select: { status: true, result: true, cycleNumber: true, scheduledDate: true, scheduledTime: true, createdAt: true },
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                    },
                },
                orderBy: sortBy === 'assignedQcAt'
                    ? [{ assignedQcAt: sortOrder }, { createdAt: sortOrder }]
                    : { [sortBy]: sortOrder },
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
                documents: true,
                bankDetails: true,
                assignedQc: {
                    select: { name: true, title: true, checkerId: true, email: true, phone: true },
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
                    scheduledTime: true,
                    estimatedDuration: true, // for the "exceeded schedule" overtime badge
                    startedAt: true,
                    completedAt: true,
                    submittedAt: true,
                    totalPausedMs: true,     // active/paused duration math
                    result: true,
                    status: true,
                    inspectionType: true,
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
                    scheduledTime: true,     // assigned time slot — was omitted, so the card's clock rendered empty
                    estimatedDuration: true, // expected length of the inspection
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
            inspectionType: true, // so a continued inspection reuses its chosen type
            itemsToInspect: true,
            scheduledDate: true,
            scheduledTime: true,
            estimatedDuration: true,
            cycleNumber: true,
            parentInspectionId: true,
            rejectionReason: true,
            // Draft / pause-resume state so the checker can resume a half-filled form
            startedAt: true,
            draftData: true,
            pausedAt: true,
            totalPausedMs: true,
            checker: { select: { name: true, title: true, checkerId: true, email: true, phone: true } },
            vendor: {
                select: {
                    id: true,
                    vendorCode: true,
                    companyName: true,
                    // Factory address fields (broken down for display)
                    factoryAddress: true,
                    factoryCity: true,
                    factoryState: true,
                    factoryZipCode: true,
                    factoryCountry: true,
                    factoryLatitude: true,
                    factoryLongitude: true,
                    mapLink: true,
                    factoryOwnershipType: true,
                    // Owner / Proprietor
                    ownerName: true,
                    ownerPhone: true,
                    ownerPhone2: true,
                    ownerEmail: true,
                    ownerEmail2: true,
                    ownerLandline: true,
                    ownerLocalLandlineStd: true,
                    ownerIntlLandline: true,
                    ownerPhoto: true,
                    designation: true,
                    additionalOwners: true,
                    // Business contact info
                    businessPhone: true,
                    email: true,
                    phoneNumber2: true,
                    landlineNumber: true,
                    localLandlineStd: true,
                    intlLandline: true,
                    businessEmail: true,
                    businessEmail2: true,
                    // Contact persons from registration
                    mainContact: true,
                    alternateContacts: true,
                    // Legal / registration identifiers from Vendor Registration
                    gstNumber: true,
                    panNumber: true,
                    iecCode: true,
                    companyIdNumber: true,
                    businessType: true,
                    aadhaarNumber: true,
                    // Vendor-uploaded media — read-only reference for the checker.
                    // Logo + factory images surface on Step 1; legal/registration
                    // documents surface on Step 2.
                    companyLogo: true,
                    documents: {
                        select: { type: true, name: true, documentUrl: true },
                    },
                    // Products the vendor registered (category-keyed) — surfaced
                    // read-only on Step 3 / Production Info. categoryProducts is
                    // keyed by Category id; names are resolved below.
                    productCategories: true,
                    categoryProducts: true,
                    additionalCategories: true,
                },
            },
        };

        // Only return inspections the checker can act on. Falling back to
        // COMPLETED/CANCELLED rows would leak a stale id into InspectionForm and
        // corrupt the submit path (server would reject, but UX path is wrong).
        let inspection = await prisma.inspection.findFirst({
            where: { vendorId, checkerId, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
            orderBy: { scheduledDate: 'asc' },
            select: inspectionSelect,
        });

        // Deadline enforcement: the form opens straight into an IN_PROGRESS
        // inspection without calling startInspection, so the booked-window check
        // must also run here. A lapsed window is expired (frees the vendor for
        // reassignment) and reported as no active inspection — the client then
        // hits beginVendorInspection, which returns the EXPIRED 409.
        if (inspection) {
            const { isInspectionWindowElapsed } = require('../utils/inspectionSchedule');
            if (isInspectionWindowElapsed(inspection)) {
                await prisma.inspection.update({
                    where: { id: inspection.id },
                    data: { status: 'EXPIRED', expiredAt: new Date() },
                }).catch((e) => console.error('Failed to expire inspection in getActiveInspectionForVendor:', e));
                try {
                    const { createNotificationForRole } = require('./notificationController');
                    createNotificationForRole({
                        role: 'ADMIN', type: 'INSPECTION_EXPIRED',
                        title: 'Inspection Missed',
                        message: `"${inspection.vendor?.companyName || 'Vendor'}" inspection (scheduled ${inspection.scheduledDate} ${inspection.scheduledTime}) expired — the window passed before it was completed. Reassign a new QC checker.`,
                        data: { screen: 'assign-qc-checker', vendorId },
                    }).catch(() => {});
                } catch (e) { console.error('expired notify failed:', e); }
                inspection = null;
            }
        }

        // Flatten the vendor's registered products into a clean, read-only list
        // for Step 3 (Production Info): [{ category, name, photos: [url] }].
        // categoryProducts is keyed by Category id, so resolve those ids to
        // human-readable names; additionalCategories already carry their name.
        if (inspection?.vendor) {
            const v = inspection.vendor;
            const products = [];
            const collect = (categoryName, list) => {
                (Array.isArray(list) ? list : []).forEach((p, i) => {
                    const photos = (Array.isArray(p?.photos) ? p.photos : [])
                        .map((ph) => ph?.url || ph?.preview)
                        .filter(Boolean);
                    products.push({
                        category: categoryName,
                        name: p?.name || `Product ${i + 1}`,
                        photos,
                    });
                });
            };

            const catProducts = v.categoryProducts && typeof v.categoryProducts === 'object' ? v.categoryProducts : {};
            const catIds = Object.keys(catProducts);
            // categoryProducts keys must be MongoDB ObjectIds (24 hex chars) for the
            // Category lookup to succeed. Seed/legacy data sometimes uses human-readable
            // names as keys; filter those out to prevent PrismaClientValidationError.
            const validObjectIdCatIds = catIds.filter(id => /^[0-9a-f]{24}$/.test(id));
            let nameById = {};
            if (validObjectIdCatIds.length > 0) {
                const cats = await prisma.category.findMany({
                    where: { id: { in: validObjectIdCatIds } },
                    select: { id: true, name: true },
                });
                nameById = Object.fromEntries(cats.map((c) => [c.id, c.name]));
            }
            for (const [catId, list] of Object.entries(catProducts)) {
                collect(nameById[catId] || catId, list);
            }
            (Array.isArray(v.additionalCategories) ? v.additionalCategories : []).forEach((cat) => {
                collect(cat?.name || 'Custom Category', cat?.products);
            });

            v.products = products;
            // Raw category-keyed fields are no longer needed on the client.
            delete v.categoryProducts;
            delete v.additionalCategories;
        }

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
// QC Checker: Begin Vendor Inspection
// Returns an existing SCHEDULED/IN_PROGRESS inspection, or auto-creates one.
// Called when the checker clicks "Start Inspection" and no inspection exists.
// ============================
const beginVendorInspection = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const checkerId = req.user?.checkerId || req.userId;

        // 1. Verify vendor is assigned to this checker
        const vendor = await prisma.vendor.findFirst({
            where: { id: vendorId, assignedQcId: checkerId },
            select: { id: true, companyName: true },
        });
        if (!vendor) {
            return res.status(403).json({
                success: false,
                error: 'Vendor not assigned to you',
                message: 'This vendor has not been assigned to you. Please contact your administrator.',
            });
        }

        // 2. Return existing active inspection if one exists — but a booked
        //    window that has fully elapsed can no longer be opened. Expire it and
        //    tell the checker to have the admin reschedule.
        const { getInspectionDeadline, isInspectionWindowElapsed } = require('../utils/inspectionSchedule');
        const active = await prisma.inspection.findFirst({
            where: { vendorId, checkerId, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
            orderBy: { scheduledDate: 'asc' },
        });
        if (active) {
            if (isInspectionWindowElapsed(active)) {
                await prisma.inspection.update({
                    where: { id: active.id },
                    data: { status: 'EXPIRED', expiredAt: new Date() },
                }).catch((e) => console.error('Failed to expire inspection in beginVendorInspection:', e));
                try {
                    const { createNotificationForRole } = require('./notificationController');
                    createNotificationForRole({
                        role: 'ADMIN', type: 'INSPECTION_EXPIRED',
                        title: 'Inspection Missed',
                        message: `"${vendor.companyName}" inspection (scheduled ${active.scheduledDate} ${active.scheduledTime}) expired — the window passed before it was completed. Reassign a new QC checker.`,
                        data: { screen: 'assign-qc-checker', vendorId },
                    }).catch(() => {});
                } catch (e) { console.error('expired notify failed:', e); }
                const deadline = getInspectionDeadline(active);
                return res.status(409).json({
                    success: false,
                    code: 'INSPECTION_EXPIRED',
                    error: 'Inspection window has passed',
                    message: `This inspection can no longer be opened. Its scheduled window (${active.scheduledDate} ${active.scheduledTime}${deadline ? `, valid until ${deadline.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}` : ''}) has already ended. Please ask the admin to schedule a new assignment.`,
                });
            }
            return res.json({ success: true, inspection: active, created: false });
        }

        // 3. Block if inspection is already submitted/under review
        const submitted = await prisma.inspection.findFirst({
            where: { vendorId, checkerId, status: { in: ['SUBMITTED', 'UNDER_ADMIN_REVIEW'] } },
            orderBy: { createdAt: 'desc' },
        });
        if (submitted) {
            return res.status(409).json({
                success: false,
                error: 'inspection_submitted',
                message: 'The vendor inspection has already been submitted and is currently under admin review. No changes can be made until admin completes the review.',
                inspection: { id: submitted.id, status: submitted.status },
            });
        }

        // 3b. Do not resurrect an expired assignment. If the checker's most recent
        //     inspection for this vendor was EXPIRED (missed window), auto-creating
        //     a fresh today-dated one would silently bypass the admin's schedule.
        //     The admin must reassign instead.
        const latest = await prisma.inspection.findFirst({
            where: { vendorId, checkerId },
            orderBy: { createdAt: 'desc' },
            select: { status: true, scheduledDate: true, scheduledTime: true },
        });
        if (latest?.status === 'EXPIRED') {
            return res.status(409).json({
                success: false,
                code: 'INSPECTION_EXPIRED',
                error: 'Inspection window has passed',
                message: `The scheduled inspection for "${vendor.companyName}" (${latest.scheduledDate} ${latest.scheduledTime}) has expired. Please ask the admin to schedule a new assignment.`,
            });
        }

        // 4. Auto-create a new SCHEDULED inspection
        const today = new Date().toISOString().split('T')[0];
        const newInspection = await prisma.inspection.create({
            data: {
                vendorId,
                checkerId,
                poNumber: '',
                clientName: vendor.companyName,
                scheduledDate: today,
                scheduledTime: '09:00 AM',
                priority: 'medium',
                estimatedDuration: '1 Hour',
                itemsToInspect: [],
                status: 'SCHEDULED',
                cycleNumber: 1,
            },
        });

        return res.status(201).json({ success: true, inspection: newInspection, created: true });
    } catch (error) {
        console.error('Begin vendor inspection error:', error);
        res.status(500).json({ success: false, error: 'Failed to begin inspection. Please try again.' });
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
    'QC_SUBMITTED',
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
        // `status` may be a single value or a comma-separated list (e.g. the dashboard's
        // "Pending Action" card links here with PENDING,REINSPECTION so the list shows
        // exactly the products that card counted).
        const statusList = req.query.status
            ? req.query.status.toString().toUpperCase().split(',').map(s => s.trim()).filter(Boolean)
            : [];
        const sortBy = ALLOWED_PRODUCT_SORT_FIELDS.includes(req.query.sortBy)
            ? req.query.sortBy
            : 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

        const invalidStatus = statusList.find(s => !ALLOWED_PRODUCT_APPROVAL_STATUSES.includes(s));
        if (invalidStatus) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Must be one of: ${ALLOWED_PRODUCT_APPROVAL_STATUSES.join(', ')}`,
            });
        }

        const where = { assignedQcId: qcCheckerId };
        if (statusList.length === 1) where.approvalStatus = statusList[0];
        else if (statusList.length > 1) where.approvalStatus = { in: statusList };
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
                    // Booked inspection window (scheduledDate + scheduledTime) so the
                    // dashboard cards can show the schedule, matching vendor inspections.
                    qcAssignment: true,
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
            // QC_SUBMITTED = the checker finished & submitted; it must appear in their
            // reports/history right after submitting (admin decision still pending).
            approvalStatus: { in: ['QC_SUBMITTED', 'QC_APPROVED', 'APPROVED', 'REJECTED', 'REINSPECTION'] },
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
                    createdAt: true,
                    updatedAt: true,
                    vendor: {
                        select: { companyName: true, ownerName: true, vendorCode: true },
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
                        businessType: true,
                        ownerName: true,
                        ownerEmail: true,
                        ownerEmail2: true,
                        ownerPhone: true,
                        ownerPhone2: true,
                        designation: true,
                        email: true,
                        businessPhone: true,
                        phoneNumber2: true,
                        businessEmail: true,
                        businessEmail2: true,
                        businessAddress: true,
                        addressLine2: true,
                        addressLine3: true,
                        landmark: true,
                        businessCity: true,
                        businessState: true,
                        businessZipCode: true,
                        businessCountry: true,
                        factoryAddress: true,
                        factoryCity: true,
                        factoryState: true,
                        factoryZipCode: true,
                        factoryCountry: true,
                        warehouseAddress: true,
                        warehouseAddressLine2: true,
                        warehouseAddressLine3: true,
                        warehouseLandmark: true,
                        warehouseCity: true,
                        warehouseState: true,
                        warehouseZipCode: true,
                        warehouseCountry: true,
                        mainContact: true,
                    },
                },
                images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
                variants: { orderBy: { createdAt: 'asc' } },
                assignedQc: { select: { name: true, title: true, email: true, checkerId: true, phone: true } },
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
// Deadline guard for product inspections. The admin books a window on
// Product.qcAssignment (scheduledDate + scheduledTime + estimatedDuration); once
// that whole window has elapsed the checker can no longer start or submit the
// inspection — mirrors the factory inspection deadline. Returns a ready-to-send
// 409 body when expired, else null. Products with no schedule are never blocked.
const productInspectionExpiredResponse = (qcAssignment) => {
    const { isInspectionWindowElapsed, getInspectionDeadline } = require('../utils/inspectionSchedule');
    const sched = qcAssignment || {};
    if (!isInspectionWindowElapsed(sched)) return null;
    const deadline = getInspectionDeadline(sched);
    const until = deadline
        ? `, valid until ${deadline.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`
        : '';
    return {
        success: false,
        code: 'INSPECTION_EXPIRED',
        message: `This inspection can no longer be started — its scheduled window (${sched.scheduledDate || ''} ${sched.scheduledTime || ''}${until}) has already ended. Please ask the admin to schedule a new assignment.`,
    };
};

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
                        warehouseLatitude: true,
                        warehouseLongitude: true,
                        productInspectionSite: true,
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

        // Booked window elapsed → cannot start this inspection.
        const startExpired = productInspectionExpiredResponse(product.qcAssignment);
        if (startExpired) return res.status(409).json(startExpired);

        const { verifyCheckerAtVendor, LOCATION_THRESHOLD_METERS } = require('../utils/locationUtils');
        const geo = await verifyCheckerAtVendor({
            vendor: product.vendor,
            site: product.vendor?.productInspectionSite,
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
        const inspectionType = String(req.body.inspectionType).toUpperCase() === 'VIRTUAL' ? 'VIRTUAL' : 'PHYSICAL';
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
                        warehouseLatitude: true,
                        warehouseLongitude: true,
                        productInspectionSite: true,
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

        // Booked window elapsed → cannot record this inspection.
        const approveExpired = productInspectionExpiredResponse(product.qcAssignment);
        if (approveExpired) return res.status(409).json(approveExpired);

        // ── Location verification — checker must be at the vendor factory ──
        const { verifyCheckerAtVendor, buildLocationStamp, buildLocationSnapshot } = require('../utils/locationUtils');
        const geo = await verifyCheckerAtVendor({
            vendor: product.vendor,
            site: product.vendor?.productInspectionSite,
            checkerLatitude,
            checkerLongitude,
            prisma,
            label: `approveProduct ${productId}`,
            inspectionType,
        });
        if (!geo.ok) {
            return res.status(geo.status).json(geo.body);
        }

        // The checker's decision (formData.inspectionStatus) is ADVISORY ONLY —
        // mirroring the vendor/factory inspection flow, submitting the report always
        // lands the product in a neutral QC_SUBMITTED state. The ADMIN then makes the
        // final call (approve / reject / re-inspection). The checker's recommendation
        // stays in qcInspectionData.inspectionStatus for the admin to see.
        const approvalStatus = 'QC_SUBMITTED';
        const productStatus = 'INACTIVE'; // Stays INACTIVE until the admin finalizes.

        const cleanFormData = formData
            ? await resolveBase64InValue(formData, { folder: 'qc-inspections' })
            : null;

        const fromStatus = product.approvalStatus;

        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: {
                approvalStatus,
                status: productStatus,
                // Embed the checker's location alongside the form data. Product QC has
                // no lat/lng columns, so this JSON is the only place the coordinates can
                // live — and it's what the admin view and PDF report read.
                qcInspectionData: cleanFormData
                    ? { ...cleanFormData, inspectionType, checkerLocation: buildLocationSnapshot(geo, checkerLatitude, checkerLongitude) }
                    : { inspectionType, checkerLocation: buildLocationSnapshot(geo, checkerLatitude, checkerLongitude) },
                // Stamp the QC submission time so "Last Inspected" reflects the
                // actual inspection date (approvedAt is only set later, on the
                // admin's final decision).
                lastReviewedAt: new Date()
            }
        });

        // The checker's advisory recommendation (for the audit trail + admin
        // notification only — it does NOT change the product state, which is QC_SUBMITTED).
        const recommendation = formData?.inspectionStatus || 'Approved';
        const recIsReinspect = recommendation === 'Re-Inspection' || recommendation === 'On Hold';

        // Write audit log (with the verified-location snapshot)
        const locationStamp = buildLocationStamp(geo, checkerLatitude, checkerLongitude);
        await prisma.inspectionAuditLog.create({
            data: {
                entityType: 'PRODUCT_INSPECTION',
                entityId: productId,
                action: recommendation === 'Approved' ? 'QC_APPROVED' : recIsReinspect ? 'QC_REINSPECTION' : 'QC_REJECTED',
                fromStatus,
                toStatus: approvalStatus, // QC_SUBMITTED
                performedById: qcCheckerId,
                performedByType: 'QC_CHECKER',
                performedByName: req.user.name || req.user.email || 'QC Checker',
                locationDetails: locationStamp,
                inspectionData: cleanFormData,
                cycleNumber: product.inspectionCycleNumber || 1,
            },
        }).catch(err => console.error('Audit log write failed:', err));

        // In-app notification for admins — the report is submitted and awaits the
        // admin's final decision; the checker's recommendation is shown as context.
        const { createNotificationForRole: notifyAdminsQc } = require('./notificationController');
        const resultLabel = recommendation === 'Approved' ? 'Approved' : recIsReinspect ? 'Re-inspection' : 'Rejected';
        notifyAdminsQc({
            role: 'ADMIN', type: 'INSPECTION_COMPLETED',
            title: 'Product Inspection Submitted',
            message: `QC inspection for "${product.name}" is ready for your review — Checker's recommendation: ${resultLabel}`,
            data: { productId: product.id }
        }).catch(() => {});

        res.status(200).json({
            success: true,
            message: 'Product inspection submitted for admin review',
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
        const inspectionType = String(req.body.inspectionType).toUpperCase() === 'VIRTUAL' ? 'VIRTUAL' : 'PHYSICAL';
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
                        warehouseLatitude: true,
                        warehouseLongitude: true,
                        productInspectionSite: true,
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

        // Booked window elapsed → cannot record this inspection.
        const rejectExpired = productInspectionExpiredResponse(product.qcAssignment);
        if (rejectExpired) return res.status(409).json(rejectExpired);

        // ── Location verification — checker must be at the vendor factory ──
        const { verifyCheckerAtVendor, buildLocationStamp, buildLocationSnapshot } = require('../utils/locationUtils');
        const geo = await verifyCheckerAtVendor({
            vendor: product.vendor,
            site: product.vendor?.productInspectionSite,
            checkerLatitude,
            checkerLongitude,
            prisma,
            label: `rejectProduct ${productId}`,
            inspectionType,
        });
        if (!geo.ok) {
            return res.status(geo.status).json(geo.body);
        }

        const cleanFormData = formData
            ? await resolveBase64InValue(formData, { folder: 'qc-inspections' })
            : null;

        const fromStatus = product.approvalStatus;
        const { remarks, notes } = req.body;
        const locationStamp = buildLocationStamp(geo, checkerLatitude, checkerLongitude);

        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: {
                // Advisory only — a QC "Rejected" is a recommendation, not a final
                // rejection. The product lands in QC_SUBMITTED for the admin to decide;
                // the checker's reason lives in qcInspectionData (reviewerRemarks). The
                // product.rejection* columns are left for the ADMIN's final rejection.
                approvalStatus: 'QC_SUBMITTED',
                status: 'INACTIVE',
                lastReviewedAt: new Date(),
                qcInspectionData: cleanFormData
                    ? { ...cleanFormData, inspectionType, checkerLocation: buildLocationSnapshot(geo, checkerLatitude, checkerLongitude) }
                    : { inspectionType, checkerLocation: buildLocationSnapshot(geo, checkerLatitude, checkerLongitude) }
            }
        });

        // Write audit log — action records the checker's recommendation (reject),
        // but the product state is the neutral QC_SUBMITTED (admin decides).
        await prisma.inspectionAuditLog.create({
            data: {
                entityType: 'PRODUCT_INSPECTION',
                entityId: productId,
                action: 'QC_REJECTED',
                fromStatus,
                toStatus: 'QC_SUBMITTED',
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

// Send a verification test email to a vendor contact address. Used by the
// checker's vendor-inspection form to confirm an address is reachable
// before marking the email field as verified.
const sendContactTestEmail = async (req, res) => {
    try {
        const { email, vendorName } = req.body || {};

        if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return res.status(400).json({
                success: false,
                message: 'A valid email address is required'
            });
        }

        const checkerName = req.user?.name || null;
        const vendorNameVal = typeof vendorName === 'string' ? vendorName : null;

        // Pre-compute the conditional HTML blocks the template expects as vars.
        const vendorNameBlock = vendorNameVal ? ` for <strong>${vendorNameVal}</strong>` : '';
        const checkerLineBlock = checkerName
            ? `Quality checker <strong>${checkerName}</strong> is`
            : 'Our quality team is';

        const testResult = await sendTemplatedEmail({
            key: 'vendor_email_verification_test',
            to: email.trim(),
            data: { vendorNameBlock, checkerLineBlock },
        });

        if (!testResult.sent) {
            return res.status(testResult.reason === 'disabled' ? 400 : 500).json({
                success: false,
                message: testResult.reason === 'disabled'
                    ? 'The email verification test template is turned off'
                    : 'Failed to send test email. Check SMTP configuration.'
            });
        }

        res.status(200).json({
            success: true,
            message: `Test email sent to ${email.trim()}`
        });
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test email. Check SMTP configuration.'
        });
    }
};

module.exports = {
    createQCChecker,
    getAllQCCheckers,
    getQCCheckerById,
    getCheckerAssignments,
    updateQCChecker,
    deleteQCChecker,
    resendCredentials,
    qcCheckerLogin,
    getCheckerProfile,
    getCheckerIdProof,
    getAssignedVendors,
    getVendorDetails,
    getActiveInspectionForVendor,
    beginVendorInspection,
    approveVendorByQc,
    rejectVendorByQc,
    getAssignedProducts,
    getProductReports,
    getProductDetails,
    startProductInspectionByQc,
    approveProductByQc,
    rejectProductByQc,
    updateCheckerProfile,
    sendContactTestEmail
};
