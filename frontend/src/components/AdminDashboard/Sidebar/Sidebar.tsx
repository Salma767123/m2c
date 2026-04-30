"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getStoredAuth, logout, hasPermission } from "@/lib/auth";
import {
  LayoutDashboard,
  Users,
  Package,
  Settings,
  Store,
  Tags,
  MessageSquare,
  FileText,
  LogOut,
  Warehouse,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Shield,
  Headphones,
  ClipboardCheck,
  Layers,
  Ticket,
  ShoppingCart,
  FileBarChart,
  ShoppingBag,
  RefreshCcw,
} from "lucide-react";

interface SubMenuItem {
  title: string;
  href: string;
  permission?: string | string[];
}

interface NavigationItem {
  title: string;
  icon: any;
  href?: string; // For single links
  subItems?: SubMenuItem[]; // For expandable sections
  permission?: string | string[]; // Required permission(s) — omit for "any admin"
}

const navigation: NavigationItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin/dashboard",
    permission: "view_dashboard",
  },
  {
    title: "Orders",
    icon: ShoppingCart,
    permission: "view_orders",
    subItems: [
      { title: "Vendor to Hub", href: "/admin/dashboard/orders/vendor-to-hub", permission: "view_orders" },
      { title: "Hub to Customer", href: "/admin/dashboard/orders/hub-to-customer", permission: "view_orders" },
    ],
  },
  {
    title: "General",
    icon: Layers,
    permission: ["view_enquiries", "manage_enquiries"],
    subItems: [
      { title: "Vendor Enquiries", href: "/admin/dashboard/general/enquiry-form", permission: ["view_enquiries", "manage_enquiries"] },
      { title: "Website Enquiries", href: "/admin/dashboard/general/website-enquiries", permission: ["view_enquiries", "manage_enquiries"] },
    ],
  },
  {
    title: "Vendors",
    icon: Store,
    permission: "view_vendors",
    subItems: [
      { title: "All Vendors", href: "/admin/dashboard/vendors", permission: "view_vendors" },
      { title: "Assign QC Checker", href: "/admin/dashboard/vendors/assign-qc", permission: "edit_vendors" },
    ],
  },
  {
    title: "QC Checker",
    icon: ClipboardCheck,
    href: "/admin/dashboard/qc-checker",
    permission: ["view_qc_checkers", "view_users"],
  },
  {
    title: "Categories",
    icon: Tags,
    href: "/admin/dashboard/categories",
    permission: "view_categories",
  },
  {
    title: "Coupons",
    icon: Ticket,
    href: "/admin/dashboard/coupons",
    permission: "view_coupons",
  },
  {
    title: "Bag Types",
    icon: ShoppingBag,
    href: "/admin/dashboard/bag-types",
  },
  {
    title: "Inventory",
    icon: Warehouse,
    href: "/admin/dashboard/inventory",
    permission: "view_inventory",
  },
  {
    title: "Products",
    icon: Package,
    permission: "view_products",
    subItems: [
      { title: "All Products", href: "/admin/dashboard/products", permission: "view_products" },
      { title: "Vendor Requests", href: "/admin/dashboard/products/vendor-requests", permission: "view_products" },
    ],
  },
  {
    title: "Users",
    icon: Users,
    permission: "view_users",
    subItems: [
      { title: "User Management", href: "/admin/dashboard/users/user-management", permission: "view_users" },
      { title: "Customer Management", href: "/admin/dashboard/users/customer-management", permission: "view_users" },
    ],
  },
  {
    title: "Roles & Permissions",
    icon: Shield,
    href: "/admin/dashboard/roles-permissions",
    permission: ["view_roles", "edit_roles", "manage_settings"],
  },
  {
    title: "Reviews",
    icon: MessageSquare,
    permission: "view_reviews",
    subItems: [
      { title: "Customer Reviews", href: "/admin/dashboard/reviews/customer", permission: "view_reviews" },
      { title: "Vendor Product Reviews", href: "/admin/dashboard/reviews/vendor-products", permission: "view_reviews" },
    ],
  },
  {
    title: "Invoice & Billing",
    icon: FileBarChart,
    permission: ["view_billing", "manage_billing"],
    subItems: [
      { title: "Invoices", href: "/admin/dashboard/billing/invoices", permission: ["view_billing", "manage_billing"] },
      { title: "Settlement", href: "/admin/dashboard/billing/settlement", permission: ["view_billing", "manage_billing"] },
    ],
  },
  {
    title: "Support",
    icon: Headphones,
    href: "/admin/dashboard/support",
    permission: ["view_support", "manage_support"],
  },
  {
    title: "Analytics",
    icon: FileBarChart,
    href: "/admin/dashboard/analytics",
    permission: "view_analytics",
  },
  {
    title: "Reports",
    icon: FileText,
    href: "/admin/dashboard/reports",
    permission: "view_reports",
  },
  {
    title: "QC Reports",
    icon: ClipboardCheck,
    href: "/admin/dashboard/qc-reports",
    permission: "view_reports",
  },
  {
    title: "Re-Inspection Review",
    icon: RefreshCcw,
    href: "/admin/dashboard/reinspection-review",
    permission: "view_reports",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/admin/dashboard/settings",
    permission: ["view_settings", "manage_settings"],
  },
];

export default function AdminSidebar({ isCollapsed = false, onToggleCollapse }: { isCollapsed?: boolean; onToggleCollapse?: () => void }) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [adminEmail, setAdminEmail] = useState<string>("admin@example.com");
  const [adminName, setAdminName] = useState<string>("Super Admin");

  // Load admin data from storage
  useEffect(() => {
    const auth = getStoredAuth();
    if (auth && auth.user) {
      setAdminEmail(auth.user.email || "admin@example.com");
      setAdminName(auth.user.name || "Super Admin");
    }
  }, []);

  // Filter navigation by user permissions. Items without `permission` are
  // shown to every admin. Sub-items are filtered too — if a parent ends up
  // with zero visible sub-items it's dropped entirely.
  const visibleNavigation = navigation
    .filter((item) => (item.permission ? hasPermission(item.permission) : true))
    .map((item) => {
      if (!item.subItems) return item;
      const visibleSubItems = item.subItems.filter((sub) =>
        sub.permission ? hasPermission(sub.permission) : true
      );
      return { ...item, subItems: visibleSubItems };
    })
    .filter((item) => !item.subItems || item.subItems.length > 0);

  // Simple active check functions
  const isMainItemActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const isSubItemActive = (href: string) => {
    // Special case for dashboard home
    if (href === "/admin/dashboard") {
      return pathname === href;
    }

    // For products routes
    if (href === "/admin/dashboard/products") {
      return pathname === "/admin/dashboard/products" || pathname.startsWith("/admin/dashboard/products?") || pathname.startsWith("/admin/dashboard/products#");
    }

    if (href === "/admin/dashboard/products/vendor-requests") {
      return pathname === "/admin/dashboard/products/vendor-requests" || pathname.startsWith("/admin/dashboard/products/vendor-requests/") || pathname.startsWith("/admin/dashboard/products/vendor-requests?") || pathname.startsWith("/admin/dashboard/products/vendor-requests#");
    }

    // Default exact match for any other routes
    return pathname === href;
  };

  const getActiveSubItems = (subItems: SubMenuItem[]) => {
    return subItems.filter(subItem => isSubItemActive(subItem.href));
  };

  const hasAnyActiveChild = (subItems: SubMenuItem[]) => {
    return getActiveSubItems(subItems).length > 0;
  };

  // Auto-expand parent menu if child is active
  useEffect(() => {
    const activeParents: string[] = [];

    navigation.forEach((item) => {
      if (item.subItems && hasAnyActiveChild(item.subItems)) {
        activeParents.push(item.title);
      }
    });

    if (activeParents.length > 0) {
      setExpandedItems((prev) => {
        const newExpanded = [...new Set([...prev, ...activeParents])];
        return newExpanded;
      });
    }
  }, [pathname]);

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title],
    );
  };

  return (
    <div className={`flex h-full ${isCollapsed ? 'w-20' : 'w-64'} flex-col font-sans bg-white border-r border-gray-200 shadow-sm transition-all duration-300`}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-200 px-4 relative">
        {!isCollapsed ? (
          <Link
            href="/admin/dashboard"
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <div className="h-9 w-9 rounded-lg bg-[#222222] flex items-center justify-center shadow-md">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-[#222222] block">
                Admin Panel
              </span>
              <span className="text-xs text-slate-500">Control Center</span>
            </div>
          </Link>
        ) : (
          <Link
            href="/admin/dashboard"
            className="flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            <div className="h-9 w-9 rounded-lg bg-[#222222] flex items-center justify-center shadow-md">
              <Shield className="h-5 w-5 text-white" />
            </div>
          </Link>
        )}
        
        {/* Collapse Toggle Button - Desktop Only */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-[#222222] text-white rounded-full items-center justify-center hover:bg-[#444444] transition-colors shadow-md z-10"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {visibleNavigation.map((item) => {
          const isExpanded = expandedItems.includes(item.title);
          const Icon = item.icon;

          // If item has href, render as single link
          if (item.href) {
            const itemIsActive = isMainItemActive(item.href);

            return (
              <Link
                key={item.title}
                href={item.href}
                className={cn(
                  "w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group",
                  itemIsActive
                    ? "bg-[#222222] text-white shadow-sm"
                    : "text-slate-700 hover:bg-gray-100 hover:text-[#222222]",
                  isCollapsed && "justify-center"
                )}
                title={isCollapsed ? item.title : undefined}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    itemIsActive ? "text-white" : "text-slate-500 group-hover:text-[#222222]",
                    !isCollapsed && "mr-3"
                  )}
                />
                {!isCollapsed && <span className="font-medium">{item.title}</span>}
              </Link>
            );
          }

          // If item has subItems, render as expandable section (hide when collapsed)
          if (isCollapsed) {
            // In collapsed mode, show only icon with tooltip
            const parentHasActiveChild = item.subItems ? hasAnyActiveChild(item.subItems) : false;
            return (
              <div
                key={item.title}
                className={cn(
                  "w-full flex items-center justify-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                  parentHasActiveChild
                    ? "bg-gray-100 text-[#222222]"
                    : "text-slate-700 hover:bg-gray-100 hover:text-[#222222]"
                )}
                title={item.title}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    parentHasActiveChild ? "text-[#222222]" : "text-slate-500"
                  )}
                />
              </div>
            );
          }

          const parentHasActiveChild = item.subItems ? hasAnyActiveChild(item.subItems) : false;

          return (
            <div key={item.title} className="space-y-1">
              {/* Main Menu Item */}
              <button
                onClick={() => toggleExpanded(item.title)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group",
                  parentHasActiveChild
                    ? "bg-gray-100 text-[#222222] border border-gray-300"
                    : "text-slate-700 hover:bg-gray-100 hover:text-[#222222]",
                  "focus:outline-none focus:ring-2 focus:ring-[#222222] focus:ring-offset-2",
                )}
              >
                <div className="flex items-center">
                  <Icon
                    className={cn(
                      "mr-3 h-5 w-5 transition-colors",
                      parentHasActiveChild
                        ? "text-[#222222]"
                        : "text-slate-500 group-hover:text-[#222222]"
                    )}
                  />
                  <span className="font-medium">{item.title}</span>
                </div>
                <div className="flex items-center">
                  {parentHasActiveChild && (
                    <div className="w-2 h-2 bg-[#222222] rounded-full mr-2" />
                  )}
                  {isExpanded ? (
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      parentHasActiveChild ? "text-[#222222]" : "text-slate-400"
                    )} />
                  ) : (
                    <ChevronRight className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      parentHasActiveChild ? "text-[#222222]" : "text-slate-400"
                    )} />
                  )}
                </div>
              </button>

              {/* Sub Menu Items */}
              {isExpanded && item.subItems && (
                <div className="ml-6 space-y-1 border-l-2 border-gray-100 pl-4 py-1">
                  {item.subItems.map((subItem) => {
                    const subItemIsActive = isSubItemActive(subItem.href);

                    return (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={cn(
                          "flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200 group relative",
                          subItemIsActive
                            ? "bg-[#222222] text-white shadow-sm font-medium"
                            : "text-slate-600 hover:bg-gray-100 hover:text-[#222222]",
                        )}
                      >
                        {subItemIsActive && (
                          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-[#222222] rounded-r-full -ml-4" />
                        )}
                        <span>{subItem.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        {!isCollapsed ? (
          <>
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-linear-to-br from-[#222222] to-[#444444] flex items-center justify-center shadow-md">
                <span className="text-sm font-semibold text-white">
                  {adminName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-semibold text-[#222222]">{adminName}</p>
                <p className="text-xs text-slate-500 truncate" title={adminEmail}>{adminEmail}</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="mt-3 flex w-full items-center px-3 py-2 text-sm font-medium text-[#222222] rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sign out
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <div className="h-10 w-10 rounded-full bg-linear-to-br from-[#222222] to-[#444444] flex items-center justify-center shadow-md" title={adminName}>
              <span className="text-sm font-semibold text-white">
                {adminName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
            <button
              onClick={() => logout()}
              className="flex items-center justify-center p-2 text-[#222222] rounded-lg hover:bg-gray-100 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}