const { PrismaClient } = require('@prisma/client');
const {
    availablePermissions,
    VALID_PERMISSION_NAMES,
    LEGACY_PERMISSION_MAP,
} = require('../config/permissions');

const prisma = new PrismaClient();

const ALL_PERMISSIONS = availablePermissions.map(p => p.name);

const defaultRoles = [
    {
        name: 'Super Admin',
        description: 'Full system access with all permissions',
        isSystem: true,
        // Super Admin bypasses permission checks via role name match. We still
        // list every permission so the UI shows the full set when admins view
        // this role, and this array stays in sync with the catalog.
        permissions: ALL_PERMISSIONS,
    },
    {
        name: 'Admin',
        description: 'Administrative access with limited permissions',
        isSystem: true,
        permissions: [
            // Vendors
            'vendor_management:view', 'vendor_management:create', 'vendor_management:edit',
            'assign_qc_checker:view', 'assign_qc_checker:create', 'assign_qc_checker:edit',
            'vendor_product_requests:view', 'vendor_product_requests:edit',
            'vendor_to_hub:view', 'vendor_to_hub:edit',
            'settlement:view',
            'vendor_product_reviews:view',
            // Customers
            'customer_management:view', 'customer_management:edit',
            'hub_to_customer:view', 'hub_to_customer:edit',
            'invoices:view',
            'customer_reviews:view', 'customer_reviews:edit',
            // Admin
            'qc_checker_management:view', 'qc_checker_management:create', 'qc_checker_management:edit',
            'qc_reports:view',
            'reinspection_review:view', 'reinspection_review:edit',
            'all_products:view', 'all_products:create', 'all_products:edit', 'all_products:delete',
            'bag_types:view', 'bag_types:create', 'bag_types:edit', 'bag_types:delete',
            'categories:view', 'categories:create', 'categories:edit', 'categories:delete',
            'inventory:view', 'inventory:create', 'inventory:edit',
            'coupons:view', 'coupons:create', 'coupons:edit',
            'staff_management:view', 'staff_management:create', 'staff_management:edit',
            'roles_permissions:view',
            'analytics:view',
            'reports:view',
            'support:view', 'support:edit',
            'vendor_enquiries:view', 'vendor_enquiries:edit',
            'website_enquiries:view', 'website_enquiries:edit',
            'settings:view',
        ],
    },
    {
        name: 'Manager',
        description: 'Management access for products and orders',
        isSystem: true,
        permissions: [
            'all_products:view', 'all_products:create', 'all_products:edit',
            'vendor_product_requests:view',
            'vendor_to_hub:view', 'vendor_to_hub:edit',
            'hub_to_customer:view', 'hub_to_customer:edit',
            'invoices:view',
            'settlement:view',
            'reports:view',
            'qc_reports:view',
            'analytics:view',
            'support:view',
        ],
    },
];

// Translate a stored permission list (possibly in the retired flat scheme)
// into the current `submodule:action` scheme.
function migratePermissions(perms) {
    const out = new Set();
    for (const p of perms || []) {
        if (VALID_PERMISSION_NAMES.has(p)) {
            out.add(p);
        } else if (LEGACY_PERMISSION_MAP[p]) {
            LEGACY_PERMISSION_MAP[p].forEach(np => out.add(np));
        }
        // Unknown strings are dropped.
    }
    return [...out];
}

async function main() {
    console.log('Seeding roles...');

    for (const roleData of defaultRoles) {
        const role = await prisma.role.upsert({
            where: { name: roleData.name },
            update: {
                permissions: roleData.permissions,
                description: roleData.description,
                isSystem: true
            },
            create: roleData
        });
        console.log(`Upserted role: ${role.name}`);
    }

    // Migrate custom (non-system) roles still storing legacy permission names.
    const customRoles = await prisma.role.findMany({ where: { isSystem: false } });
    for (const role of customRoles) {
        const hasLegacy = (role.permissions || []).some(p => !VALID_PERMISSION_NAMES.has(p));
        if (!hasLegacy) continue;
        const migrated = migratePermissions(role.permissions);
        await prisma.role.update({
            where: { id: role.id },
            data: { permissions: migrated }
        });
        console.log(`Migrated role "${role.name}" to the new permission scheme (${migrated.length} permissions).`);
    }

    // Assign 'Super Admin' role to any existing admins without a role
    const superAdminRole = await prisma.role.findUnique({ where: { name: 'Super Admin' } });
    if (superAdminRole) {
        const result = await prisma.admin.updateMany({
            where: { roleId: null },
            data: { roleId: superAdminRole.id }
        });
        console.log(`Updated ${result.count} existing admin accounts to Super Admin role.`);
    }

    console.log('Role seeding completed successfully.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
