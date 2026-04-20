const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const defaultRoles = [
    {
        name: 'Super Admin',
        description: 'Full system access with all permissions',
        isSystem: true,
        // Super Admin bypasses permission checks via role name match. We still
        // list every permission so the UI shows the full set when admins view
        // this role, and this array stays in sync with availablePermissions.
        permissions: [
            'view_dashboard',
            'view_users', 'create_users', 'edit_users', 'delete_users',
            'view_products', 'create_products', 'edit_products', 'delete_products',
            'view_orders', 'create_orders', 'edit_orders', 'delete_orders',
            'view_vendors', 'create_vendors', 'edit_vendors', 'delete_vendors',
            'view_categories', 'create_categories', 'edit_categories', 'delete_categories',
            'view_inventory', 'create_inventory', 'edit_inventory', 'delete_inventory',
            'view_reports', 'export_reports',
            'view_settings', 'manage_settings',
            'view_reviews', 'moderate_reviews', 'delete_reviews',
            'view_coupons', 'create_coupons', 'edit_coupons', 'delete_coupons',
            'view_analytics',
            'view_support', 'manage_support',
            'view_billing', 'manage_billing',
            'view_enquiries', 'manage_enquiries',
            'view_qc_checkers', 'create_qc_checkers', 'edit_qc_checkers', 'delete_qc_checkers',
            'view_roles', 'create_roles', 'edit_roles', 'delete_roles'
        ]
    },
    {
        name: 'Admin',
        description: 'Administrative access with limited permissions',
        isSystem: true,
        permissions: [
            'view_dashboard',
            'view_users', 'create_users', 'edit_users',
            'view_products', 'create_products', 'edit_products', 'delete_products',
            'view_orders', 'create_orders', 'edit_orders', 'delete_orders',
            'view_vendors', 'create_vendors', 'edit_vendors',
            'view_categories', 'create_categories', 'edit_categories', 'delete_categories',
            'view_inventory', 'create_inventory', 'edit_inventory',
            'view_reports', 'export_reports',
            'view_settings',
            'view_reviews', 'moderate_reviews',
            'view_coupons', 'create_coupons', 'edit_coupons',
            'view_analytics',
            'view_support', 'manage_support',
            'view_billing',
            'view_enquiries', 'manage_enquiries',
            'view_qc_checkers', 'create_qc_checkers', 'edit_qc_checkers',
            'view_roles'
        ]
    },
    {
        name: 'Manager',
        description: 'Management access for products and orders',
        isSystem: true,
        permissions: [
            'view_dashboard',
            'view_products', 'create_products', 'edit_products',
            'view_orders', 'create_orders', 'edit_orders',
            'view_reports',
            'view_analytics',
            'view_support',
            'view_billing'
        ]
    }
];

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
