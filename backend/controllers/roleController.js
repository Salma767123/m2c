const { prisma } = require('../config/database');
const {
    PERMISSION_MODULES,
    availablePermissions,
    VALID_PERMISSION_NAMES,
} = require('../config/permissions');

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

// Get available permissions.
// `data` stays the flat list; `modules` is the Module → Submodule → actions
// tree the role editor renders as a View/Create/Edit/Delete matrix.
exports.getPermissions = async (req, res) => {
    try {
        res.json({
            success: true,
            count: availablePermissions.length,
            data: availablePermissions,
            modules: PERMISSION_MODULES,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch permissions' });
    }
};

// Validate that every permission string in `perms` matches a known permission.
// Returns array of unknown permissions (empty if all valid).
const validatePermissions = (perms) => {
    if (!Array.isArray(perms)) return [];
    return perms.filter(p => !VALID_PERMISSION_NAMES.has(p));
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
