const bcrypt = require('bcrypt');
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
            console.log(`✅ QC Checker credentials email sent to: ${email}`);
        } catch (emailError) {
            console.error('⚠️ Failed to send credentials email:', emailError.message);
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

        console.log(`🔍 QC Checker login attempt: ${checkerId}`);

        // Find checker by checkerId
        const checker = await prisma.qCChecker.findUnique({
            where: { checkerId: checkerId.toUpperCase() },
        });

        if (!checker) {
            console.log('❌ QC Checker not found');
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials. Please check your Checker ID and password.',
            });
        }

        // Check if checker is active
        if (!checker.isActive || checker.status === 'SUSPENDED') {
            console.log('❌ QC Checker account is not active');
            return res.status(401).json({
                success: false,
                error: 'Your account is not active. Please contact admin.',
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, checker.password);
        if (!isPasswordValid) {
            console.log('❌ Invalid password');
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

        console.log(`✅ QC Checker login successful: ${checker.name} (${checker.checkerId})`);

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
// QC Checker: Get assigned vendors
// ============================
const getAssignedVendors = async (req, res) => {
    try {
        const checkerId = req.user?.checkerId || req.userId;

        const vendors = await prisma.vendor.findMany({
            where: {
                assignedQcId: checkerId,
            },
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
            },
            orderBy: {
                submittedAt: 'desc'
            }
        });

        res.json({
            success: true,
            data: vendors,
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

        const vendor = await prisma.vendor.findFirst({
            where: { id: vendorId, assignedQcId: checkerId },
            include: {
                certifications: true,
                assignedQc: { select: { name: true, checkerId: true } },
            },
        });

        if (!vendor) {
            return res.status(404).json({
                success: false,
                error: 'Vendor not found or not assigned to you',
            });
        }

        const completedWhere = { vendorId, status: 'COMPLETED' };

        const [
            totalInspections,
            totalCompleted,
            passedCount,
            scoreAgg,
            completedForOnTime,
            recentCompleted,
        ] = await Promise.all([
            prisma.inspection.count({ where: { vendorId } }),
            prisma.inspection.count({ where: completedWhere }),
            prisma.inspection.count({ where: { ...completedWhere, result: 'PASSED' } }),
            prisma.inspection.aggregate({
                where: { ...completedWhere, score: { not: null } },
                _avg: { score: true },
            }),
            prisma.inspection.findMany({
                where: completedWhere,
                select: { scheduledDate: true, completedAt: true },
            }),
            prisma.inspection.findMany({
                where: completedWhere,
                orderBy: { completedAt: 'desc' },
                take: 10,
                select: {
                    id: true,
                    poNumber: true,
                    clientName: true,
                    scheduledDate: true,
                    completedAt: true,
                    result: true,
                    score: true,
                    itemsToInspect: true,
                },
            }),
        ]);

        const passRate = totalCompleted > 0 ? Math.round((passedCount / totalCompleted) * 100) : 0;
        const averageScore = scoreAgg._avg.score != null
            ? Number(scoreAgg._avg.score.toFixed(1))
            : 0;

        // Compare against IST end-of-day so result is stable across server timezones
        const onTimeCount = completedForOnTime.filter(i => {
            if (!i.completedAt || !i.scheduledDate) return false;
            const istEndOfDay = new Date(`${i.scheduledDate}T23:59:59.999+05:30`);
            if (isNaN(istEndOfDay.getTime())) return false;
            return new Date(i.completedAt) <= istEndOfDay;
        }).length;
        const onTimeDelivery = totalCompleted > 0
            ? Math.round((onTimeCount / totalCompleted) * 100)
            : 0;

        const latest = recentCompleted[0];
        const lastPoDate = latest
            ? (latest.completedAt ? latest.completedAt.toISOString() : latest.scheduledDate)
            : null;

        res.json({
            success: true,
            data: {
                vendor,
                stats: {
                    totalInspections,
                    totalCompleted,
                    passRate,
                    averageScore,
                    onTimeDelivery,
                    lastPoDate,
                },
                recentInspections: recentCompleted,
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
// QC Checker: Get assigned products
// ============================
const getAssignedProducts = async (req, res) => {
    try {
        if (req.user.role !== 'QC_CHECKER') {
            return res.status(403).json({ success: false, message: 'Access denied: QC Checker role required' });
        }

        const qcCheckerId = req.user.id;
        const products = await prisma.product.findMany({
            where: {
                assignedQcId: qcCheckerId
            },
            include: {
                vendor: {
                    select: { companyName: true, ownerName: true, email: true }
                },
                images: {
                    where: { isPrimary: true },
                    take: 1
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({
            success: true,
            data: products
        });
    } catch (error) {
        console.error('Error fetching assigned products:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching assigned products'
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
        const { formData } = req.body;
        const qcCheckerId = req.user.id;

        const product = await prisma.product.findFirst({
            where: {
                id: productId,
                assignedQcId: qcCheckerId
            }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found or not assigned to you'
            });
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

        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: {
                approvalStatus,
                status: productStatus,
                qcInspectionData: cleanFormData
            }
        });

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
        const { reason, formData } = req.body;
        const qcCheckerId = req.user.id;

        if (!reason) {
            return res.status(400).json({ success: false, message: 'Rejection reason is required' });
        }

        const product = await prisma.product.findFirst({
            where: {
                id: productId,
                assignedQcId: qcCheckerId
            }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found or not assigned to you'
            });
        }

        const cleanFormData = formData
            ? await resolveBase64InValue(formData, { folder: 'qc-inspections' })
            : null;

        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: {
                approvalStatus: 'REJECTED',
                rejectionReason: reason,
                status: 'INACTIVE',
                qcInspectionData: cleanFormData
            }
        });

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
    approveVendorByQc,
    rejectVendorByQc,
    getAssignedProducts,
    approveProductByQc,
    rejectProductByQc,
};
