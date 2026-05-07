const { prisma } = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendStaffCredentialsEmail } = require('../utils/emailService');

// ==========================================
// CUSTOMER MANAGEMENT
// ==========================================

// Get all customers (Users)
exports.getCustomers = async (req, res) => {
    try {
        const { search, status, loyalty } = req.query;

        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phoneNumber: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (status && status !== 'all') {
            if (status === 'active') where.isActive = true;
            if (status === 'suspended') where.isActive = false;
            if (status === 'pending') where.isVerified = false;
        }

        const customers = await prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                isActive: true,
                isVerified: true,
                createdAt: true,
                lastLogin: true,
                image: true,
                addresses: true
            }
        });

        // Aggregate order counts and spending per customer
        const customerIds = customers.map(c => c.id);
        const [orderAggregations, reviewAggregations] = await Promise.all([
            prisma.order.groupBy({
                by: ['customerId'],
                where: { customerId: { in: customerIds } },
                _count: { id: true },
                _sum: { totalAmount: true }
            }),
            // Aggregate approved review stats per customer
            prisma.review.groupBy({
                by: ['userId'],
                where: {
                    userId: { in: customerIds },
                    status: 'APPROVED'
                },
                _count: { id: true },
                _avg: { rating: true }
            })
        ]);

        const orderMap = {};
        for (const agg of orderAggregations) {
            orderMap[agg.customerId] = {
                totalOrders: agg._count.id,
                totalSpent: agg._sum.totalAmount || 0
            };
        }

        const reviewMap = {};
        for (const agg of reviewAggregations) {
            reviewMap[agg.userId] = {
                reviewsCount: agg._count.id,
                averageRating: Math.round((agg._avg.rating || 0) * 10) / 10
            };
        }

        // Formatting for frontend expected Customer interface
        const formattedCustomers = customers.map(c => {
            let currentStatus = 'pending';
            if (c.isActive && c.isVerified) currentStatus = 'active';
            else if (!c.isActive) currentStatus = 'suspended';

            // Pick first address or empty
            const address = c.addresses && c.addresses.length > 0 ? c.addresses[0] : {
                addressLine1: 'N/A', city: 'N/A', state: 'N/A', zipCode: 'N/A', country: 'N/A'
            };

            return {
                id: c.id,
                firstName: c.name.split(' ')[0] || '',
                lastName: c.name.split(' ').slice(1).join(' ') || '',
                email: c.email,
                phone: c.phoneNumber || 'N/A',
                status: currentStatus,
                joinDate: c.createdAt,
                lastLogin: c.lastLogin || c.createdAt,
                totalOrders: orderMap[c.id]?.totalOrders || 0,
                totalSpent: orderMap[c.id]?.totalSpent || 0,
                // loyaltyTier: 'Bronze', // TODO: Re-enable when loyalty system is implemented
                avatar: c.image,
                address: {
                    addressLine1: address.address,
                    city: address.city,
                    state: address.state,
                    zipCode: address.zipCode,
                    country: address.country
                },
                isEmailVerified: c.isVerified,
                isPhoneVerified: !!c.phoneNumber,
                averageRating: reviewMap[c.id]?.averageRating || null,
                reviewsCount: reviewMap[c.id]?.reviewsCount || 0
            };
        });

        res.json({ success: true, count: formattedCustomers.length, data: formattedCustomers });
    } catch (error) {
        console.error('Error getting customers:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch customers' });
    }
};

// Get single customer by ID with order history
exports.getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;

        const customer = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                isActive: true,
                isVerified: true,
                createdAt: true,
                lastLogin: true,
                image: true,
                addresses: true
            }
        });

        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        // Get order stats, review stats, and recent orders in parallel
        const [orderAgg, reviewAgg, recentOrders] = await Promise.all([
            prisma.order.aggregate({
                where: { customerId: id },
                _count: { id: true },
                _sum: { totalAmount: true }
            }),
            prisma.review.aggregate({
                where: { userId: id, status: 'APPROVED' },
                _count: { id: true },
                _avg: { rating: true }
            }),
            prisma.order.findMany({
                where: { customerId: id },
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: {
                    id: true,
                    orderId: true,
                    status: true,
                    totalAmount: true,
                    createdAt: true,
                    paymentStatus: true,
                    paymentMethod: true,
                    items: {
                        select: {
                            id: true,
                            productName: true,
                            productImage: true,
                            quantity: true,
                            unitPrice: true,
                            totalPrice: true,
                            size: true,
                            color: true
                        }
                    }
                }
            })
        ]);

        let currentStatus = 'pending';
        if (customer.isActive && customer.isVerified) currentStatus = 'active';
        else if (!customer.isActive) currentStatus = 'suspended';

        res.json({
            success: true,
            data: {
                id: customer.id,
                name: customer.name,
                email: customer.email,
                phone: customer.phoneNumber || 'N/A',
                status: currentStatus,
                joinDate: customer.createdAt,
                lastLogin: customer.lastLogin || customer.createdAt,
                avatar: customer.image,
                isEmailVerified: customer.isVerified,
                isPhoneVerified: !!customer.phoneNumber,
                addresses: customer.addresses || [],
                totalOrders: orderAgg._count.id,
                totalSpent: orderAgg._sum.totalAmount || 0,
                averageRating: reviewAgg._avg.rating ? Math.round(reviewAgg._avg.rating * 10) / 10 : null,
                reviewsCount: reviewAgg._count.id || 0,
                recentOrders
            }
        });
    } catch (error) {
        console.error('Error getting customer:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch customer' });
    }
};

// Update customer status
exports.updateCustomerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'active', 'suspended'

        const user = await prisma.user.update({
            where: { id },
            data: {
                isActive: status === 'active' ? true : false
            }
        });

        res.json({ success: true, data: user });
    } catch (error) {
        console.error('Error updating customer status:', error);
        res.status(500).json({ success: false, error: 'Failed to update customer status' });
    }
};

// Delete a customer
exports.deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({ where: { id } });
        res.json({ success: true, message: 'Customer deleted successfully' });
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ success: false, error: 'Failed to delete customer' });
    }
};

// ==========================================
// INTERNAL STAFF (USER MANAGEMENT)
// ==========================================

// Get all staff members (Admins)
exports.getStaff = async (req, res) => {
    try {
        const { search, role, status } = req.query;

        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (role && role !== 'all') {
            where.roleId = role;
        }

        if (status && status !== 'all') {
            if (status === 'active') where.isActive = true;
            if (status === 'suspended') where.isActive = false;
        }

        const staffMembers = await prisma.admin.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                role: true,
                isActive: true,
                isVerified: true,
                createdAt: true,
                lastLogin: true,
                image: true,
                address: true,
                city: true,
                state: true,
                zipCode: true,
                country: true,
                role: {
                    select: {
                        id: true,
                        name: true,
                        permissions: true
                    }
                }
            }
        });

        const formattedStaff = staffMembers.map(s => {
            let currentStatus = 'pending';
            if (s.isActive && s.isVerified) currentStatus = 'active';
            else if (!s.isActive) currentStatus = 'suspended';
            else if (s.isActive && !s.isVerified) currentStatus = 'pending';

            return {
                id: s.id,
                firstName: s.name.split(' ')[0] || '',
                lastName: s.name.split(' ').slice(1).join(' ') || '',
                email: s.email,
                phone: s.phoneNumber || 'N/A',
                role: s.role ? s.role.name : 'Unknown',
                roleId: s.role ? s.role.id : null,
                permissions: s.role ? s.role.permissions : [],
                status: currentStatus,
                joinDate: s.createdAt,
                lastLogin: s.lastLogin || s.createdAt,
                totalOrders: 0,
                totalSpent: 0,
                avatar: s.image,
                address: {
                    addressLine1: s.address || 'N/A',
                    city: s.city || 'N/A',
                    state: s.state || 'N/A',
                    zipCode: s.zipCode || 'N/A',
                    country: s.country || 'N/A'
                },
                isEmailVerified: s.isVerified,
                isPhoneVerified: !!s.phoneNumber
            };
        });

        res.json({ success: true, count: formattedStaff.length, data: formattedStaff });
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch staff' });
    }
};

// Get a single staff member by id — used by the edit page so we don't have
// to download the entire staff list just to show one record.
exports.getStaffById = async (req, res) => {
    try {
        const { id } = req.params;
        const s = await prisma.admin.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                isActive: true,
                isVerified: true,
                createdAt: true,
                lastLogin: true,
                image: true,
                address: true,
                city: true,
                state: true,
                zipCode: true,
                country: true,
                role: { select: { id: true, name: true, permissions: true } }
            }
        });

        if (!s) {
            return res.status(404).json({ success: false, error: 'Staff member not found' });
        }

        let currentStatus = 'pending';
        if (s.isActive && s.isVerified) currentStatus = 'active';
        else if (!s.isActive) currentStatus = 'suspended';
        else if (s.isActive && !s.isVerified) currentStatus = 'pending';

        res.json({
            success: true,
            data: {
                id: s.id,
                firstName: s.name.split(' ')[0] || '',
                lastName: s.name.split(' ').slice(1).join(' ') || '',
                email: s.email,
                phone: s.phoneNumber || 'N/A',
                role: s.role ? s.role.name : 'Unknown',
                roleId: s.role ? s.role.id : null,
                permissions: s.role ? s.role.permissions : [],
                status: currentStatus,
                joinDate: s.createdAt,
                lastLogin: s.lastLogin || s.createdAt,
                totalOrders: 0,
                totalSpent: 0,
                avatar: s.image,
                address: {
                    addressLine1: s.address || 'N/A',
                    city: s.city || 'N/A',
                    state: s.state || 'N/A',
                    zipCode: s.zipCode || 'N/A',
                    country: s.country || 'N/A'
                },
                isEmailVerified: s.isVerified,
                isPhoneVerified: !!s.phoneNumber
            }
        });
    } catch (error) {
        console.error('Error fetching staff by id:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch staff member' });
    }
};

// Create staff member
// Generate a simple password from the user's email username + @ + random digits.
// Example: email "azar@mntfuture.com" -> password "azar@482"
//          email "john.doe@x.com"     -> password "john.doe@1923"
const generateSimplePassword = (email) => {
    const username = (email || 'user').split('@')[0].toLowerCase();
    // 3-4 digit number for variety: 100-9999
    const number = Math.floor(100 + Math.random() * 9900);
    return `${username}@${number}`;
};

exports.createStaff = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, roleId, password } = req.body;

        // Role is required — creating staff without a role would lock them out of every
        // permission-protected route, which is a broken state.
        if (!roleId) {
            return res.status(400).json({
                success: false,
                error: 'Role is required when creating a staff member'
            });
        }

        // Verify the role actually exists before saving
        const role = await prisma.role.findUnique({ where: { id: roleId } });
        if (!role) {
            return res.status(400).json({
                success: false,
                error: 'Selected role does not exist'
            });
        }

        const existingAdmin = await prisma.admin.findUnique({ where: { email } });
        if (existingAdmin) return res.status(400).json({ success: false, error: 'Email already exists' });

        // Use admin-provided password if any, otherwise generate one based on the email.
        // The raw password is what gets emailed to the staff member.
        const rawPassword = (password && password.trim().length >= 6)
            ? password.trim()
            : generateSimplePassword(email);

        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        // Verification token — staff must verify their email before they can log in.
        const verificationToken = crypto.randomBytes(32).toString('hex');

        const newStaff = await prisma.admin.create({
            data: {
                name: `${firstName} ${lastName}`,
                email,
                phoneNumber: phone,
                roleId,
                password: hashedPassword,
                isActive: true,
                isVerified: false,            // must verify via email link
                verificationToken,
                onboardingCompleted: true,
                googleId: `STAFF_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                provider: 'local'
            }
        });

        try {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const loginLink = `${frontendUrl}/admin/login`;
            const verificationLink = `${frontendUrl}/verify-email?token=${verificationToken}`;
            await sendStaffCredentialsEmail({
                to: email,
                name: `${firstName} ${lastName}`,
                email: email,
                password: rawPassword,
                loginLink,
                verificationLink
            });
        } catch (emailError) {
            console.error('Failed to send staff credentials email:', emailError);
        }

        res.status(201).json({ success: true, data: newStaff });
    } catch (error) {
        console.error('Error creating staff:', error);
        res.status(500).json({ success: false, error: 'Failed to create staff' });
    }
};

// Update staff status
exports.updateStaffStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Optional: Prevent suspending self
        if (id === req.user.id && status === 'suspended') {
            return res.status(400).json({ success: false, error: 'Cannot suspend your own account' });
        }

        const staff = await prisma.admin.update({
            where: { id },
            data: {
                isActive: status === 'active' ? true : false
            }
        });

        res.json({ success: true, data: staff });
    } catch (error) {
        console.error('Error updating staff status:', error);
        res.status(500).json({ success: false, error: 'Failed to update user status' });
    }
};

// Update staff details
exports.updateStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, email, phone, roleId } = req.body;

        const updatedStaff = await prisma.admin.update({
            where: { id },
            data: {
                firstName,
                lastName,
                email,
                phone,
                roleId
            }
        });

        res.json({ success: true, data: updatedStaff });
    } catch (error) {
        console.error('Error updating staff:', error);
        res.status(500).json({ success: false, error: 'Failed to update staff details' });
    }
};

// Delete staff
exports.deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;

        if (id === req.user.id) {
            return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
        }

        await prisma.admin.delete({ where: { id } });
        res.json({ success: true, message: 'Staff deleted successfully' });
    } catch (error) {
        console.error('Error deleting staff:', error);
        res.status(500).json({ success: false, error: 'Failed to delete staff' });
    }
};
