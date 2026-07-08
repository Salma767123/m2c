// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the admin RBAC catalog.
//
// Structure mirrors the admin sidebar: Module → Submodule → actions.
// Every permission string is `<submodule_key>:<action>` where action is one of
// view | create | edit | delete. A submodule only exposes the actions its UI
// actually supports — the role editor renders a hyphen for the rest.
// ─────────────────────────────────────────────────────────────────────────────

const ACTIONS = ['view', 'create', 'edit', 'delete'];

const PERMISSION_MODULES = [
    {
        key: 'vendors',
        name: 'Vendors',
        submodules: [
            {
                key: 'vendor_management',
                name: 'Vendor Management',
                description: 'Vendor list, onboarding, approve / reject / suspend',
                actions: { view: true, create: true, edit: true, delete: false },
            },
            {
                key: 'assign_qc_checker',
                name: 'Assign QC Checker',
                description: 'Assign and update QC checker inspection assignments',
                actions: { view: true, create: true, edit: true, delete: false },
            },
            {
                key: 'vendor_product_requests',
                name: 'Vendor Product Requests',
                description: 'Review vendor product submissions: approve with pricing, reject, assign QC',
                actions: { view: true, create: false, edit: true, delete: false },
            },
            {
                key: 'vendor_to_hub',
                name: 'Vendor to Hub',
                description: 'Vendor shipments to the admin hub and hub-arrival reviews',
                actions: { view: true, create: false, edit: true, delete: false },
            },
            {
                key: 'settlement',
                name: 'Settlement',
                description: 'Vendor payouts: mark paid, set due dates',
                actions: { view: true, create: false, edit: true, delete: false },
            },
            {
                key: 'vendor_product_reviews',
                name: 'Vendor Product Reviews',
                description: 'Read-only QC review history for vendor products',
                actions: { view: true, create: false, edit: false, delete: false },
            },
        ],
    },
    {
        key: 'customers',
        name: 'Customers',
        submodules: [
            {
                key: 'customer_management',
                name: 'Customer Management',
                description: 'Customer accounts and profiles',
                actions: { view: true, create: false, edit: true, delete: true },
            },
            {
                key: 'hub_to_customer',
                name: 'Hub to Customer',
                description: 'Customer orders: mark out for delivery / delivered',
                actions: { view: true, create: false, edit: true, delete: false },
            },
            {
                key: 'invoices',
                name: 'Invoices',
                description: 'Customer invoices (view and print)',
                actions: { view: true, create: false, edit: false, delete: false },
            },
            {
                key: 'customer_reviews',
                name: 'Customer Reviews',
                description: 'Moderate (approve / reject) and delete customer reviews',
                actions: { view: true, create: false, edit: true, delete: true },
            },
        ],
    },
    {
        key: 'admin',
        name: 'Admin',
        submodules: [
            {
                key: 'qc_checker_management',
                name: 'QC Checker Management',
                description: 'QC checker accounts, credentials, suspension',
                actions: { view: true, create: true, edit: true, delete: true },
            },
            {
                key: 'qc_reports',
                name: 'QC Reports',
                description: 'Read-only QC inspection reports',
                actions: { view: true, create: false, edit: false, delete: false },
            },
            {
                key: 'reinspection_review',
                name: 'Re-Inspection Review',
                description: 'Review and decide re-inspection requests',
                actions: { view: true, create: false, edit: true, delete: false },
            },
            {
                key: 'all_products',
                name: 'All Products',
                description: 'Product catalog management',
                actions: { view: true, create: true, edit: true, delete: true },
            },
            {
                key: 'bag_types',
                name: 'Bag Types',
                description: 'Bag type presets and ordering',
                actions: { view: true, create: true, edit: true, delete: true },
            },
            {
                key: 'categories',
                name: 'Categories',
                description: 'Category and subcategory management',
                actions: { view: true, create: true, edit: true, delete: true },
            },
            {
                key: 'inventory',
                name: 'Inventory',
                description: 'Inventory items, stock updates, history',
                actions: { view: true, create: true, edit: true, delete: true },
            },
            {
                key: 'coupons',
                name: 'Coupons',
                description: 'Coupons and free-shipping offers',
                actions: { view: true, create: true, edit: true, delete: true },
            },
            {
                key: 'staff_management',
                name: 'Staff Management',
                description: 'Staff (admin) accounts and role assignment',
                actions: { view: true, create: true, edit: true, delete: true },
            },
            {
                key: 'roles_permissions',
                name: 'Roles & Permissions',
                description: 'Roles and their permission sets',
                actions: { view: true, create: true, edit: true, delete: true },
            },
            {
                key: 'analytics',
                name: 'Analytics',
                description: 'Read-only analytics dashboards',
                actions: { view: true, create: false, edit: false, delete: false },
            },
            {
                key: 'reports',
                name: 'Reports',
                description: 'Business reports (view and export)',
                actions: { view: true, create: false, edit: false, delete: false },
            },
            {
                key: 'support',
                name: 'Support',
                description: 'Support tickets: reply, resolve, delete',
                actions: { view: true, create: false, edit: true, delete: true },
            },
            {
                key: 'vendor_enquiries',
                name: 'Vendor Enquiries',
                description: 'Vendor registration enquiries: approve / reject / delete',
                actions: { view: true, create: false, edit: true, delete: true },
            },
            {
                key: 'website_enquiries',
                name: 'Website Enquiries',
                description: 'Website contact enquiries: resolve / delete',
                actions: { view: true, create: false, edit: true, delete: true },
            },
            {
                key: 'settings',
                name: 'Settings',
                description: 'System settings: company, payment, GST, hubs, invoice, SEO, banners, exchange rate',
                actions: { view: true, create: false, edit: true, delete: false },
            },
        ],
    },
];

// Flat list: [{ id, name: 'vendor_management:view', description, module, submodule }]
const ACTION_LABELS = {
    view: 'View',
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete',
};

const availablePermissions = PERMISSION_MODULES.flatMap((mod) =>
    mod.submodules.flatMap((sub) =>
        ACTIONS.filter((a) => sub.actions[a]).map((a) => ({
            id: `${sub.key}:${a}`,
            name: `${sub.key}:${a}`,
            description: `${ACTION_LABELS[a]} — ${sub.name}`,
            module: mod.name,
            submodule: sub.name,
        }))
    )
);

const VALID_PERMISSION_NAMES = new Set(availablePermissions.map((p) => p.name));

// Maps the retired flat permission names onto the new scheme so existing roles
// stored in the DB keep working (see prisma/seedRoles.js migration step).
const LEGACY_PERMISSION_MAP = {
    view_dashboard: [], // dashboard is now visible to every admin
    view_users: ['customer_management:view', 'staff_management:view'],
    create_users: ['staff_management:create'],
    edit_users: ['customer_management:edit', 'staff_management:edit'],
    delete_users: ['customer_management:delete', 'staff_management:delete'],
    view_products: ['all_products:view', 'vendor_product_requests:view', 'bag_types:view'],
    create_products: ['all_products:create', 'bag_types:create'],
    edit_products: ['all_products:edit', 'vendor_product_requests:edit', 'reinspection_review:edit', 'bag_types:edit'],
    delete_products: ['all_products:delete', 'bag_types:delete'],
    view_orders: ['vendor_to_hub:view', 'hub_to_customer:view'],
    create_orders: [],
    edit_orders: ['vendor_to_hub:edit', 'hub_to_customer:edit'],
    delete_orders: [],
    view_vendors: ['vendor_management:view', 'assign_qc_checker:view'],
    create_vendors: ['vendor_management:create'],
    edit_vendors: ['vendor_management:edit', 'assign_qc_checker:create', 'assign_qc_checker:edit', 'reinspection_review:edit'],
    delete_vendors: [],
    view_categories: ['categories:view'],
    create_categories: ['categories:create'],
    edit_categories: ['categories:edit'],
    delete_categories: ['categories:delete'],
    view_inventory: ['inventory:view'],
    create_inventory: ['inventory:create'],
    edit_inventory: ['inventory:edit'],
    delete_inventory: ['inventory:delete'],
    view_reports: ['reports:view', 'qc_reports:view', 'reinspection_review:view'],
    export_reports: ['reports:view'],
    view_settings: ['settings:view'],
    manage_settings: ['settings:view', 'settings:edit'],
    view_reviews: ['customer_reviews:view', 'vendor_product_reviews:view'],
    moderate_reviews: ['customer_reviews:edit'],
    delete_reviews: ['customer_reviews:delete'],
    view_coupons: ['coupons:view'],
    create_coupons: ['coupons:create'],
    edit_coupons: ['coupons:edit'],
    delete_coupons: ['coupons:delete'],
    view_analytics: ['analytics:view'],
    view_support: ['support:view'],
    manage_support: ['support:view', 'support:edit', 'support:delete'],
    view_billing: ['settlement:view', 'invoices:view'],
    manage_billing: ['settlement:view', 'settlement:edit', 'invoices:view'],
    view_enquiries: ['vendor_enquiries:view', 'website_enquiries:view'],
    manage_enquiries: [
        'vendor_enquiries:view', 'vendor_enquiries:edit', 'vendor_enquiries:delete',
        'website_enquiries:view', 'website_enquiries:edit', 'website_enquiries:delete',
    ],
    view_qc_checkers: ['qc_checker_management:view'],
    create_qc_checkers: ['qc_checker_management:create'],
    edit_qc_checkers: ['qc_checker_management:edit'],
    delete_qc_checkers: ['qc_checker_management:delete'],
    view_roles: ['roles_permissions:view'],
    create_roles: ['roles_permissions:create'],
    edit_roles: ['roles_permissions:edit'],
    delete_roles: ['roles_permissions:delete'],
};

module.exports = {
    ACTIONS,
    PERMISSION_MODULES,
    availablePermissions,
    VALID_PERMISSION_NAMES,
    LEGACY_PERMISSION_MAP,
};
