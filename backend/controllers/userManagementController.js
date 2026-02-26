const { prisma } = require('../config/database');
const bcrypt = require('bcryptjs');

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
                totalOrders: 0, // Mock for now, you can aggregation
                totalSpent: 0,
                loyaltyTier: 'Bronze', // Mock
                avatar: c.image,
                address: {
                    addressLine1: address.address,
                    city: address.city,
                    state: address.state,
                    zipCode: address.zipCode,
                    country: address.country
                },
                isEmailVerified: c.isVerified,
                isPhoneVerified: !!c.phoneNumber
            };
        });

        res.json({ success: true, count: formattedCustomers.length, data: formattedCustomers });
    } catch (error) {
        console.error('Error getting customers:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch customers' });
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
            where.role = role;
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
                country: true
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
                role: s.role,
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

// Create staff member
exports.createStaff = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, role, password } = req.body;

        const existingAdmin = await prisma.admin.findUnique({ where: { email } });
        if (existingAdmin) return res.status(400).json({ success: false, error: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password || 'Staff@123!!', 10);

        const newStaff = await prisma.admin.create({
            data: {
                name: `${firstName} ${lastName}`,
                email,
                phoneNumber: phone,
                role: role || 'employee',
                password: hashedPassword,
                isActive: true,
                isVerified: true, // Auto verify since created by SuperAdmin,
                onboardingCompleted: true
            }
        });

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
