const { prisma } = require('../config/database');

const availablePermissions = [
    // Dashboard
    { id: '1', name: 'view_dashboard', description: 'View dashboard', module: 'Dashboard' },
    // Users
    { id: '2', name: 'view_users', description: 'View users list', module: 'Users' },
    { id: '3', name: 'create_users', description: 'Create new users', module: 'Users' },
    { id: '4', name: 'edit_users', description: 'Edit existing users', module: 'Users' },
    { id: '5', name: 'delete_users', description: 'Delete users', module: 'Users' },
    // Products
    { id: '6', name: 'view_products', description: 'View products list', module: 'Products' },
    { id: '7', name: 'create_products', description: 'Create new products', module: 'Products' },
    { id: '8', name: 'edit_products', description: 'Edit existing products', module: 'Products' },
    { id: '9', name: 'delete_products', description: 'Delete products', module: 'Products' },
    // Orders
    { id: '10', name: 'view_orders', description: 'View orders list', module: 'Orders' },
    { id: '11', name: 'create_orders', description: 'Create new orders', module: 'Orders' },
    { id: '12', name: 'edit_orders', description: 'Edit existing orders', module: 'Orders' },
    { id: '13', name: 'delete_orders', description: 'Delete orders', module: 'Orders' },
    // Vendors
    { id: '14', name: 'view_vendors', description: 'View vendors list', module: 'Vendors' },
    { id: '15', name: 'create_vendors', description: 'Create new vendors', module: 'Vendors' },
    { id: '16', name: 'edit_vendors', description: 'Edit existing vendors', module: 'Vendors' },
    { id: '17', name: 'delete_vendors', description: 'Delete vendors', module: 'Vendors' },
    // Categories
    { id: '18', name: 'view_categories', description: 'View categories list', module: 'Categories' },
    { id: '19', name: 'create_categories', description: 'Create new categories', module: 'Categories' },
    { id: '20', name: 'edit_categories', description: 'Edit existing categories', module: 'Categories' },
    { id: '21', name: 'delete_categories', description: 'Delete categories', module: 'Categories' },
    // Inventory
    { id: '22', name: 'view_inventory', description: 'View inventory list', module: 'Inventory' },
    { id: '23', name: 'create_inventory', description: 'Create inventory items', module: 'Inventory' },
    { id: '24', name: 'edit_inventory', description: 'Edit inventory items', module: 'Inventory' },
    { id: '25', name: 'delete_inventory', description: 'Delete inventory items', module: 'Inventory' },
    // Reports
    { id: '26', name: 'view_reports', description: 'View reports', module: 'Reports' },
    { id: '27', name: 'export_reports', description: 'Export reports', module: 'Reports' },
    // Settings
    { id: '28', name: 'view_settings', description: 'View system settings', module: 'Settings' },
    { id: '29', name: 'manage_settings', description: 'Manage system settings', module: 'Settings' },
    // Reviews
    { id: '30', name: 'view_reviews', description: 'View reviews', module: 'Reviews' },
    { id: '31', name: 'moderate_reviews', description: 'Moderate reviews', module: 'Reviews' },
    { id: '32', name: 'delete_reviews', description: 'Delete reviews', module: 'Reviews' },
    // Coupons
    { id: '33', name: 'view_coupons', description: 'View coupons list', module: 'Coupons' },
    { id: '34', name: 'create_coupons', description: 'Create new coupons', module: 'Coupons' },
    { id: '35', name: 'edit_coupons', description: 'Edit existing coupons', module: 'Coupons' },
    { id: '36', name: 'delete_coupons', description: 'Delete coupons', module: 'Coupons' },
    // Analytics
    { id: '37', name: 'view_analytics', description: 'View analytics dashboards', module: 'Analytics' },
    // Support
    { id: '38', name: 'view_support', description: 'View support tickets', module: 'Support' },
    { id: '39', name: 'manage_support', description: 'Reply to and resolve tickets', module: 'Support' },
    // Billing & Invoices
    { id: '40', name: 'view_billing', description: 'View invoices and settlements', module: 'Billing' },
    { id: '41', name: 'manage_billing', description: 'Process billing and settlements', module: 'Billing' },
    // Enquiries (vendor + website)
    { id: '42', name: 'view_enquiries', description: 'View customer / vendor enquiries', module: 'Enquiries' },
    { id: '43', name: 'manage_enquiries', description: 'Approve, reject, or reply to enquiries', module: 'Enquiries' },
    // QC Checker
    { id: '44', name: 'view_qc_checkers', description: 'View QC checkers list', module: 'QC Checker' },
    { id: '45', name: 'create_qc_checkers', description: 'Create new QC checkers', module: 'QC Checker' },
    { id: '46', name: 'edit_qc_checkers', description: 'Edit QC checkers and resend credentials', module: 'QC Checker' },
    { id: '47', name: 'delete_qc_checkers', description: 'Delete QC checkers', module: 'QC Checker' },
    // Roles & Permissions
    { id: '48', name: 'view_roles', description: 'View roles and permissions', module: 'Roles & Permissions' },
    { id: '49', name: 'create_roles', description: 'Create new roles', module: 'Roles & Permissions' },
    { id: '50', name: 'edit_roles', description: 'Edit existing roles and assign permissions', module: 'Roles & Permissions' },
    { id: '51', name: 'delete_roles', description: 'Delete roles', module: 'Roles & Permissions' }
];

// Get all roles
exports.getRoles = async (req, res) => {
    try {
        const roles = await prisma.role.findMany({
            include: {
                _count: {
                    select: { admins: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formattedRoles = roles.map(role => {
            // Reconstruct full permission objects based on the string names stored in DB
            const rolePermissions = role.permissions.map(pName => {
                return availablePermissions.find(ap => ap.name === pName) || { name: pName, description: '', module: 'Unknown' };
            });

            return {
                id: role.id,
                name: role.name,
                description: role.description || '',
                permissions: rolePermissions,
                userCount: role._count?.admins || 0,
                isSystem: role.isSystem,
                createdAt: role.createdAt,
                updatedAt: role.updatedAt,
            };
        });

        res.json({ success: true, count: formattedRoles.length, data: formattedRoles });
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch roles' });
    }
};

// Get available permissions
exports.getPermissions = async (req, res) => {
    try {
        res.json({ success: true, count: availablePermissions.length, data: availablePermissions });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch permissions' });
    }
};

// Validate that every permission string in `perms` matches a known permission.
// Returns array of unknown permissions (empty if all valid).
const validatePermissions = (perms) => {
    if (!Array.isArray(perms)) return [];
    const validNames = new Set(availablePermissions.map(p => p.name));
    return perms.filter(p => !validNames.has(p));
};

// Create a new role
exports.createRole = async (req, res) => {
    try {
        const { name, description, permissions } = req.body;

        // Check if role name already exists
        const existing = await prisma.role.findUnique({ where: { name } });
        if (existing) {
            return res.status(400).json({ success: false, error: 'Role name already exists' });
        }

        // Reject typos / invalid permission strings to prevent silently locking users out
        const invalid = validatePermissions(permissions);
        if (invalid.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Invalid permission(s): ${invalid.join(', ')}`
            });
        }

        const role = await prisma.role.create({
            data: {
                name,
                description,
                permissions: Array.isArray(permissions) ? permissions : [],
                isSystem: false,
            }
        });

        res.status(201).json({ success: true, data: role });
    } catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({ success: false, error: 'Failed to create role' });
    }
};

// Update an existing role
exports.updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, permissions } = req.body;

        const role = await prisma.role.findUnique({ where: { id } });
        if (!role) {
            return res.status(404).json({ success: false, error: 'Role not found' });
        }

        if (role.isSystem) {
            return res.status(400).json({ success: false, error: 'Cannot modify system roles' });
        }

        // Check name collision if name is being changed
        if (name && name !== role.name) {
            const existingName = await prisma.role.findUnique({ where: { name } });
            if (existingName) {
                return res.status(400).json({ success: false, error: 'Role name already exists' });
            }
        }

        // Reject invalid permission names
        if (permissions !== undefined) {
            const invalid = validatePermissions(permissions);
            if (invalid.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid permission(s): ${invalid.join(', ')}`
                });
            }
        }

        const updatedRole = await prisma.role.update({
            where: { id },
            data: {
                name: name !== undefined ? name : role.name,
                description: description !== undefined ? description : role.description,
                permissions: Array.isArray(permissions) ? permissions : role.permissions,
            }
        });

        res.json({ success: true, data: updatedRole });
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ success: false, error: 'Failed to update role' });
    }
};

// Delete a role
exports.deleteRole = async (req, res) => {
    try {
        const { id } = req.params;

        const role = await prisma.role.findUnique({
            where: { id },
            include: { _count: { select: { admins: true } } }
        });

        if (!role) {
            return res.status(404).json({ success: false, error: 'Role not found' });
        }

        if (role.isSystem) {
            return res.status(400).json({ success: false, error: 'Cannot delete system roles' });
        }

        if (role._count.admins > 0) {
            return res.status(400).json({ success: false, error: 'Cannot delete role assigned to users. Reassign users first.' });
        }

        await prisma.role.delete({ where: { id } });

        res.json({ success: true, message: 'Role deleted successfully' });
    } catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({ success: false, error: 'Failed to delete role' });
    }
};
