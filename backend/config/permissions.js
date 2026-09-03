// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the admin RBAC catalog.
//
// Structure mirrors the admin sidebar: Module → Submodule → actions.
// Every permission string is `<submodule_key>:<action>`.
//
// Actions come in two kinds:
//   • Core actions  — view | create | edit | delete (the fixed matrix columns).
//     A submodule only exposes the ones its UI supports; the role editor
//     renders a hyphen for the rest.
//   • Extra actions — page-specific buttons (Approve, Suspend, Mark as Paid…)
//     declared per submodule in `extra`, rendered as labelled chips in the
//     "Special buttons" column of the matrix.
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
                description: 'Vendor list, onboarding and profile edits',
                actions: { view: true, create: true, edit: true, delete: false },
                extra: [
                    { key: 'approve', label: 'Approve / Reject', description: 'Approve or reject vendor registrations (incl. confirm / cancel)' },
                    { key: 'suspend', label: 'Suspend', description: 'Suspend an approved vendor' },
                ],
            },
            {
                key: 'assign_qc_checker',
                name: 'Assign QC Checker',
                description: 'Assign and update QC checker inspection assignments',
                actions: { view: true, create: true, edit: true, delete: false },
                extra: [],
            },
            {
                key: 'vendor_product_requests',
                name: 'Vendor Product Requests',
                description: 'Review vendor product submissions',
                actions: { view: true, create: false, edit: true, delete: false },
                extra: [
                    { key: 'approve', label: 'Approve / Reject', description: 'Approve with pricing or reject a product request' },
                    { key: 'assign_qc', label: 'Assign QC', description: 'Assign or reassign the QC checker for a product' },
                ],
            },
            {
                key: 'vendor_to_hub',
                name: 'Vendor to Hub',
                description: 'Vendor shipments to the admin hub and hub-arrival reviews',
                actions: { view: true, create: false, edit: true, delete: false },
                extra: [
                    { key: 'update_status', label: 'Update Status', description: 'Change a vendor shipment status' },
                ],
            },
            {
                key: 'settlement',
                name: 'Settlement',
                description: 'Vendor payouts',
                actions: { view: true, create: false, edit: false, delete: false },
                extra: [
                    { key: 'mark_paid', label: 'Mark as Paid', description: 'Record a settlement payment with transaction ID' },
                    { key: 'set_due_date', label: 'Set Due Date', description: 'Set or change a settlement due date' },
                ],
            },
            {
                key: 'vendor_product_reviews',
                name: 'Vendor Product Reviews',
                description: 'Read-only QC review history for vendor products',
                actions: { view: true, create: false, edit: false, delete: false },
                extra: [],
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
                actions: { view: true, create: false, edit: false, delete: true },
                extra: [
                    { key: 'suspend', label: 'Activate / Suspend', description: 'Toggle a customer account status' },
                ],
            },
            {
                key: 'hub_to_customer',
                name: 'Hub to Customer',
                description: 'Customer orders and hub QC reviews',
                actions: { view: true, create: false, edit: true, delete: false },
                extra: [
                    { key: 'update_status', label: 'Update Delivery', description: 'Mark orders out for delivery / delivered' },
                ],
            },
            {
                key: 'returns',
                name: 'Returns & Replacements',
                description: 'Customer return, refund and replacement requests',
                actions: { view: true, create: false, edit: false, delete: false },
                extra: [
                    { key: 'manage', label: 'Approve / Reject / Process', description: 'Approve, reject and progress return, refund and replacement requests' },
                ],
            },
            {
                key: 'invoices',
                name: 'Invoices',
                description: 'Customer invoices',
                actions: { view: true, create: false, edit: false, delete: false },
                extra: [
                    { key: 'print', label: 'Print', description: 'Print / download the invoice document' },
                ],
            },
            {
                key: 'customer_reviews',
                name: 'Customer Reviews',
                description: 'Customer product reviews',
                actions: { view: true, create: false, edit: false, delete: true },
                extra: [
                    { key: 'approve', label: 'Approve / Reject', description: 'Moderate customer reviews' },
                ],
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
                description: 'QC checker accounts',
                actions: { view: true, create: true, edit: true, delete: true },
                extra: [
                    { key: 'resend_credentials', label: 'Resend Credentials', description: 'Resend login credentials to a QC checker' },
                ],
            },
            {
                key: 'qc_reports',
                name: 'QC Reports',
                description: 'Read-only QC inspection reports',
                actions: { view: true, create: false, edit: false, delete: false },
                extra: [],
            },
            {
                key: 'reinspection_review',
                name: 'Re-Inspection Review',
                description: 'Re-inspection requests awaiting an admin decision',
                actions: { view: true, create: false, edit: false, delete: false },
                extra: [
                    { key: 'approve', label: 'Approve / Reject', description: 'Decide factory / product re-inspection requests' },
                ],
            },
            {
                key: 'all_products',
                name: 'All Products',
                description: 'Product catalog management',
                actions: { view: true, create: true, edit: true, delete: true },
                extra: [
                    { key: 'approve', label: 'Approve / Reject', description: 'Approve with pricing or reject a QC-approved product' },
                ],
            },
            {
                key: 'categories',
                name: 'Categories',
                description: 'Category and subcategory management',
                actions: { view: true, create: true, edit: true, delete: true },
                extra: [],
            },
            {
                key: 'inventory',
                name: 'Inventory',
                description: 'Inventory items and history',
                actions: { view: true, create: true, edit: true, delete: true },
                extra: [
                    { key: 'update_stock', label: 'Update Stock', description: 'Adjust stock levels for an inventory item' },
                ],
            },
            {
                key: 'coupons',
                name: 'Coupons',
                description: 'Coupons and free-shipping offers',
                actions: { view: true, create: true, edit: true, delete: true },
                extra: [],
            },
            {
                key: 'staff_management',
                name: 'Staff Management',
                description: 'Staff (admin) accounts and role assignment',
                actions: { view: true, create: true, edit: true, delete: true },
                extra: [
                    { key: 'suspend', label: 'Activate / Suspend', description: 'Toggle a staff account status' },
                ],
            },
            {
                key: 'roles_permissions',
                name: 'Roles & Permissions',
                description: 'Roles and their permission sets',
                actions: { view: true, create: true, edit: true, delete: true },
                extra: [],
            },
            {
                key: 'analytics',
                name: 'Analytics',
                description: 'Read-only analytics dashboards',
                actions: { view: true, create: false, edit: false, delete: false },
                extra: [],
            },
            {
                key: 'reports',
                name: 'Reports',
                description: 'Business reports',
                actions: { view: true, create: false, edit: false, delete: false },
                extra: [
                    { key: 'export', label: 'Export', description: 'Export reports as PDF / Excel' },
                ],
            },
            {
                key: 'support',
                name: 'Support',
                description: 'Support tickets: reply and resolve',
                actions: { view: true, create: false, edit: true, delete: true },
                extra: [],
            },
            {
                key: 'vendor_enquiries',
                name: 'Vendor Enquiries',
                description: 'Vendor registration enquiries',
                actions: { view: true, create: false, edit: false, delete: true },
                extra: [
                    { key: 'approve', label: 'Approve / Reject', description: 'Approve or reject a vendor enquiry' },
                ],
            },
            {
                key: 'website_enquiries',
                name: 'Website Enquiries',
                description: 'Website contact enquiries',
                actions: { view: true, create: false, edit: false, delete: true },
                extra: [
                    { key: 'resolve', label: 'Resolve', description: 'Resolve / close a website enquiry' },
                ],
            },
            {
                key: 'settings',
                name: 'Settings',
                description: 'System settings: company, payment, GST, hubs, invoice, SEO, banners, exchange rate',
                actions: { view: true, create: false, edit: true, delete: false },
                extra: [],
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
    mod.submodules.flatMap((sub) => [
        ...ACTIONS.filter((a) => sub.actions[a]).map((a) => ({
            id: `${sub.key}:${a}`,
            name: `${sub.key}:${a}`,
            description: `${ACTION_LABELS[a]} — ${sub.name}`,
            module: mod.name,
            submodule: sub.name,
        })),
        ...(sub.extra || []).map((x) => ({
            id: `${sub.key}:${x.key}`,
            name: `${sub.key}:${x.key}`,
            description: `${x.label} — ${sub.name}`,
            module: mod.name,
            submodule: sub.name,
        })),
    ])
);

const VALID_PERMISSION_NAMES = new Set(availablePermissions.map((p) => p.name));

// Maps the retired flat permission names onto the new scheme so existing roles
// stored in the DB keep working (see prisma/seedRoles.js migration step).
const LEGACY_PERMISSION_MAP = {
    view_dashboard: [], // dashboard is now visible to every admin
    view_users: ['customer_management:view', 'staff_management:view'],
    create_users: ['staff_management:create'],
    edit_users: ['customer_management:suspend', 'staff_management:edit', 'staff_management:suspend'],
    delete_users: ['customer_management:delete', 'staff_management:delete'],
    view_products: ['all_products:view', 'vendor_product_requests:view'],
    create_products: ['all_products:create'],
    edit_products: [
        'all_products:edit', 'all_products:approve',
        'vendor_product_requests:edit', 'vendor_product_requests:approve', 'vendor_product_requests:assign_qc',
        'reinspection_review:approve',
    ],
    delete_products: ['all_products:delete'],
    view_orders: ['vendor_to_hub:view', 'hub_to_customer:view'],
    create_orders: [],
    edit_orders: [
        'vendor_to_hub:edit', 'vendor_to_hub:update_status',
        'hub_to_customer:edit', 'hub_to_customer:update_status',
    ],
    delete_orders: [],
    view_vendors: ['vendor_management:view', 'assign_qc_checker:view'],
    create_vendors: ['vendor_management:create'],
    edit_vendors: [
        'vendor_management:edit', 'vendor_management:approve', 'vendor_management:suspend',
        'assign_qc_checker:create', 'assign_qc_checker:edit', 'reinspection_review:approve',
    ],
    delete_vendors: [],
    view_categories: ['categories:view'],
    create_categories: ['categories:create'],
    edit_categories: ['categories:edit'],
    delete_categories: ['categories:delete'],
    view_inventory: ['inventory:view'],
    create_inventory: ['inventory:create'],
    edit_inventory: ['inventory:edit', 'inventory:update_stock'],
    delete_inventory: ['inventory:delete'],
    view_reports: ['reports:view', 'qc_reports:view', 'reinspection_review:view'],
    export_reports: ['reports:view', 'reports:export'],
    view_settings: ['settings:view'],
    manage_settings: ['settings:view', 'settings:edit'],
    view_reviews: ['customer_reviews:view', 'vendor_product_reviews:view'],
    moderate_reviews: ['customer_reviews:approve'],
    delete_reviews: ['customer_reviews:delete'],
    view_coupons: ['coupons:view'],
    create_coupons: ['coupons:create'],
    edit_coupons: ['coupons:edit'],
    delete_coupons: ['coupons:delete'],
    view_analytics: ['analytics:view'],
    view_support: ['support:view'],
    manage_support: ['support:view', 'support:edit', 'support:delete'],
    view_billing: ['settlement:view', 'invoices:view', 'invoices:print'],
    manage_billing: ['settlement:view', 'settlement:mark_paid', 'settlement:set_due_date', 'invoices:view', 'invoices:print'],
    view_enquiries: ['vendor_enquiries:view', 'website_enquiries:view'],
    manage_enquiries: [
        'vendor_enquiries:view', 'vendor_enquiries:approve', 'vendor_enquiries:delete',
        'website_enquiries:view', 'website_enquiries:resolve', 'website_enquiries:delete',
    ],
    view_qc_checkers: ['qc_checker_management:view'],
    create_qc_checkers: ['qc_checker_management:create'],
    edit_qc_checkers: ['qc_checker_management:edit', 'qc_checker_management:resend_credentials'],
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
