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
  Percent,
  ShoppingCart,
  FileBarChart,
  ShoppingBag,
  RefreshCcw,
  BookOpen,
} from "lucide-react";

interface SubMenuItem {
  title: string;
  href: string;
  permission?: string | string[];
}

// Second-level entry inside a grouped module (e.g. everything under "Admin"):
// either a direct link (href) or a collapsible group of leaf links (subItems).
interface NavigationChild {
  title: string;
  icon: any;
  href?: string;
  subItems?: SubMenuItem[];
  permission?: string | string[];
}

interface NavigationItem extends NavigationChild {
  /** Third nesting level — used by the "Admin" module to host whole sub-modules. */
  children?: NavigationChild[];
}

// Permission strings follow the RBAC catalog: `<submodule_key>:<action>`.
// Groups carry no permission of their own — they disappear automatically when
// every child link is filtered out.
const navigation: NavigationItem[] = [
  // ── 1. Dashboard — visible to every admin ─────────────────────────────────
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin/dashboard",
  },

  // ── 2. Vendors ────────────────────────────────────────────────────────────
  {
    title: "Vendors",
    icon: Store,
    subItems: [
      { title: "Vendor Management", href: "/admin/dashboard/vendors", permission: "vendor_management:view" },
      { title: "Assign QC Checker", href: "/admin/dashboard/vendors/assign-qc", permission: "assign_qc_checker:view" },
      { title: "Vendor Product Requests", href: "/admin/dashboard/products/vendor-requests", permission: "vendor_product_requests:view" },
      { title: "Vendor to Hub", href: "/admin/dashboard/orders/vendor-to-hub", permission: "vendor_to_hub:view" },
      { title: "Settlement", href: "/admin/dashboard/billing/settlement", permission: "settlement:view" },
      { title: "Vendor Product Reviews", href: "/admin/dashboard/reviews/vendor-products", permission: "vendor_product_reviews:view" },
    ],
  },

  // ── 3. Customers ──────────────────────────────────────────────────────────
  {
    title: "Customers",
    icon: Users,
    subItems: [
      { title: "Customer Management", href: "/admin/dashboard/users/customer-management", permission: "customer_management:view" },
      { title: "Hub to Customer", href: "/admin/dashboard/orders/hub-to-customer", permission: "hub_to_customer:view" },
      { title: "Returns & Replacements", href: "/admin/dashboard/customers/returns", permission: "returns:view" },
      { title: "Invoices", href: "/admin/dashboard/billing/invoices", permission: "invoices:view" },
      { title: "Customer Reviews", href: "/admin/dashboard/reviews/customer", permission: "customer_reviews:view" },
    ],
  },

  // ── 4. Admin — every remaining module grouped under one entry ─────────────
  {
    title: "Admin",
    icon: Shield,
    children: [
      {
        title: "QC Checker",
        icon: ClipboardCheck,
        subItems: [
          { title: "QC Checker Management", href: "/admin/dashboard/qc-checker", permission: "qc_checker_management:view" },
          { title: "QC Reports", href: "/admin/dashboard/qc-reports", permission: "qc_reports:view" },
          { title: "Re-Inspection Review", href: "/admin/dashboard/reinspection-review", permission: "reinspection_review:view" },
        ],
      },
      {
        title: "Products",
        icon: Package,
        subItems: [
          { title: "All Products", href: "/admin/dashboard/products", permission: "all_products:view" },
        ],
      },
      {
        title: "Catalog",
        icon: BookOpen,
        subItems: [
          { title: "Categories", href: "/admin/dashboard/categories", permission: "categories:view" },
          { title: "Inventory", href: "/admin/dashboard/inventory", permission: "inventory:view" },
        ],
      },
      {
        title: "Coupons",
        icon: Ticket,
        href: "/admin/dashboard/coupons",
        permission: "coupons:view",
      },
      {
        title: "Offers",
        icon: Percent,
        href: "/admin/dashboard/offers",
        // Reuses the coupons permission set (offers live in the promotions area).
        permission: "coupons:view",
      },
      {
        title: "User Management",
        icon: Users,
        subItems: [
          { title: "User Management", href: "/admin/dashboard/users/user-management", permission: "staff_management:view" },
          { title: "Roles & Permissions", href: "/admin/dashboard/roles-permissions", permission: "roles_permissions:view" },
        ],
      },
      {
        title: "Analytics & Reports",
        icon: FileBarChart,
        subItems: [
          { title: "Analytics", href: "/admin/dashboard/analytics", permission: "analytics:view" },
          { title: "Reports", href: "/admin/dashboard/reports", permission: "reports:view" },
        ],
      },
      {
        title: "Support",
        icon: Headphones,
        subItems: [
          { title: "Vendor Support", href: "/admin/dashboard/support/vendor", permission: "support:view" },
          { title: "Customer Support", href: "/admin/dashboard/support/customer", permission: "support:view" },
        ],
      },
      {
        title: "General Enquiries",
        icon: Layers,
        subItems: [
          { title: "Vendor Enquiries", href: "/admin/dashboard/general/enquiry-form", permission: "vendor_enquiries:view" },
          { title: "Website Enquiries", href: "/admin/dashboard/general/website-enquiries", permission: "website_enquiries:view" },
        ],
      },
      {
        title: "Settings",
        icon: Settings,
        href: "/admin/dashboard/settings",
        permission: "settings:view",
      },
    ],
  },
];

export default function AdminSidebar({ isCollapsed = false, onToggleCollapse }: { isCollapsed?: boolean; onToggleCollapse?: () => void }) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [adminEmail, setAdminEmail] = useState<string>("admin@example.com");
  const [adminName, setAdminName] = useState<string>("Super Admin");
  const [adminImage, setAdminImage] = useState<string>("");

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth && auth.user) {
      setAdminEmail(auth.user.email || "admin@example.com");
      setAdminName(auth.user.name || "Super Admin");
      setAdminImage(auth.user.image || "");
    }
    // Live-refresh when the admin saves their profile (avatar + name).
    const onProfileUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      if (detail.name) setAdminName(detail.name);
      setAdminImage(detail.image || "");
    };
    window.addEventListener("admin-profile-updated", onProfileUpdated);
    return () => window.removeEventListener("admin-profile-updated", onProfileUpdated);
  }, []);

  const filterSubItems = (subItems: SubMenuItem[]) =>
    subItems.filter((sub) => (sub.permission ? hasPermission(sub.permission) : true));

  const visibleNavigation = navigation
    .filter((item) => (item.permission ? hasPermission(item.permission) : true))
    .map((item) => {
      if (item.children) {
        const children = item.children
          .filter((child) => (child.permission ? hasPermission(child.permission) : true))
          .map((child) =>
            child.subItems ? { ...child, subItems: filterSubItems(child.subItems) } : child
          )
          .filter((child) => !child.subItems || child.subItems.length > 0);
        return { ...item, children };
      }
      if (!item.subItems) return item;
      return { ...item, subItems: filterSubItems(item.subItems) };
    })
    .filter((item) => {
      if (item.children) return item.children.length > 0;
      return !item.subItems || item.subItems.length > 0;
    });

  const isMainItemActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const isSubItemActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === href;
    }
    if (href === "/admin/dashboard/products") {
      return pathname === "/admin/dashboard/products" || pathname.startsWith("/admin/dashboard/products?") || pathname.startsWith("/admin/dashboard/products#");
    }
    if (href === "/admin/dashboard/products/vendor-requests") {
      return pathname === "/admin/dashboard/products/vendor-requests" || pathname.startsWith("/admin/dashboard/products/vendor-requests/") || pathname.startsWith("/admin/dashboard/products/vendor-requests?") || pathname.startsWith("/admin/dashboard/products/vendor-requests#");
    }
    if (href === "/admin/dashboard/categories") {
      return pathname === "/admin/dashboard/categories" || pathname.startsWith("/admin/dashboard/categories/");
    }
    if (href === "/admin/dashboard/inventory") {
      return pathname === "/admin/dashboard/inventory" || pathname.startsWith("/admin/dashboard/inventory/");
    }
    return pathname === href;
  };

  const getActiveSubItems = (subItems: SubMenuItem[]) => {
    return subItems.filter(subItem => isSubItemActive(subItem.href));
  };

  const hasAnyActiveChild = (subItems: SubMenuItem[]) => {
    return getActiveSubItems(subItems).length > 0;
  };

  // A second-level child (link or group) counts as active when its own href
  // matches or any of its leaf links do.
  const isChildActive = (child: NavigationChild) => {
    if (child.href) return isMainItemActive(child.href);
    if (child.subItems) return hasAnyActiveChild(child.subItems);
    return false;
  };

  const hasAnyActiveDescendant = (item: NavigationItem) => {
    if (item.children) return item.children.some(isChildActive);
    if (item.subItems) return hasAnyActiveChild(item.subItems);
    return false;
  };

  useEffect(() => {
    const activeParents: string[] = [];
    navigation.forEach((item) => {
      if (item.subItems && hasAnyActiveChild(item.subItems)) {
        activeParents.push(item.title);
      }
      if (item.children) {
        item.children.forEach((child) => {
          if (isChildActive(child)) {
            activeParents.push(item.title);
            if (child.subItems) activeParents.push(child.title);
          }
        });
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
    <div className={`flex h-full ${isCollapsed ? 'w-20' : 'w-64'} flex-col font-sans bg-white border-r border-slate-200 shadow-sm transition-all duration-300`}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-slate-200 px-4 relative">
        {!isCollapsed ? (
          <Link
            href="/admin/dashboard"
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <div className="h-9 w-9 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shadow-sm">
              <Shield className="h-5 w-5 text-brand-500" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 block">
                Admin Panel
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-brand-500">Control Center</span>
            </div>
          </Link>
        ) : (
          <Link
            href="/admin/dashboard"
            className="flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            <div className="h-9 w-9 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shadow-sm">
              <Shield className="h-5 w-5 text-brand-500" />
            </div>
          </Link>
        )}

        {/* Collapse Toggle Button - Desktop Only */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-brand-500 text-white rounded-full items-center justify-center hover:bg-brand-600 transition-colors shadow-md z-10"
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
                  "w-full flex items-center px-3 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 group border-l-4",
                  itemIsActive
                    ? "bg-brand-50/60 border-brand-500 text-brand-700 font-bold shadow-xs shadow-brand-500/5"
                    : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                  isCollapsed && "justify-center"
                )}
                title={isCollapsed ? item.title : undefined}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    itemIsActive ? "text-brand-500" : "text-slate-400 group-hover:text-slate-600",
                    !isCollapsed && "mr-3"
                  )}
                />
                {!isCollapsed && <span className="font-medium">{item.title}</span>}
              </Link>
            );
          }

          // Collapsed mode: show only icon
          if (isCollapsed) {
            const parentHasActiveChild = hasAnyActiveDescendant(item);
            return (
              <div
                key={item.title}
                className={cn(
                  "w-full flex items-center justify-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                  parentHasActiveChild
                    ? "bg-brand-50/60 text-brand-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
                title={item.title}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    parentHasActiveChild ? "text-brand-500" : "text-slate-400"
                  )}
                />
              </div>
            );
          }

          const parentHasActiveChild = hasAnyActiveDescendant(item);

          return (
            <div key={item.title} className="space-y-1">
              {/* Main Menu Item */}
              <button
                onClick={() => toggleExpanded(item.title)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 group border-l-4",
                  parentHasActiveChild
                    ? "bg-brand-50/60 border-brand-500 text-brand-700"
                    : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                  "focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2",
                )}
              >
                <div className="flex items-center">
                  <Icon
                    className={cn(
                      "mr-3 h-5 w-5 transition-colors",
                      parentHasActiveChild
                        ? "text-brand-500"
                        : "text-slate-400 group-hover:text-slate-600"
                    )}
                  />
                  <span className="font-medium">{item.title}</span>
                </div>
                <div className="flex items-center">
                  {parentHasActiveChild && (
                    <div className="w-2 h-2 bg-brand-500 rounded-full mr-2" />
                  )}
                  {isExpanded ? (
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      parentHasActiveChild ? "text-brand-500" : "text-slate-400"
                    )} />
                  ) : (
                    <ChevronRight className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      parentHasActiveChild ? "text-brand-500" : "text-slate-400"
                    )} />
                  )}
                </div>
              </button>

              {/* Sub Menu Items */}
              {isExpanded && item.subItems && (
                <div className="ml-6 space-y-1 border-l-2 border-slate-100 pl-4 py-1">
                  {item.subItems.map((subItem) => {
                    const subItemIsActive = isSubItemActive(subItem.href);

                    return (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={cn(
                          "flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200 group relative",
                          subItemIsActive
                            ? "bg-brand-50/60 text-brand-700 font-semibold"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                        )}
                      >
                        {subItemIsActive && (
                          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-brand-500 rounded-r-full -ml-4" />
                        )}
                        <span>{subItem.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Nested module groups (the "Admin" entry) */}
              {isExpanded && item.children && (
                <div className="ml-4 space-y-1 border-l-2 border-slate-100 pl-2 py-1">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const childActive = isChildActive(child);

                    // Direct link (Coupons / Support / Settings)
                    if (child.href) {
                      return (
                        <Link
                          key={child.title}
                          href={child.href}
                          className={cn(
                            "w-full flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200 group",
                            childActive
                              ? "bg-brand-50/60 text-brand-700 font-semibold"
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                          )}
                        >
                          <ChildIcon
                            className={cn(
                              "mr-3 h-4 w-4 transition-colors",
                              childActive ? "text-brand-500" : "text-slate-400 group-hover:text-slate-600"
                            )}
                          />
                          <span className="font-medium">{child.title}</span>
                        </Link>
                      );
                    }

                    // Collapsible sub-module with its own leaf links
                    const childExpanded = expandedItems.includes(child.title);
                    return (
                      <div key={child.title} className="space-y-1">
                        <button
                          onClick={() => toggleExpanded(child.title)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all duration-200 group",
                            childActive
                              ? "bg-brand-50/60 text-brand-700 font-semibold"
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                            "focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2",
                          )}
                        >
                          <div className="flex items-center">
                            <ChildIcon
                              className={cn(
                                "mr-3 h-4 w-4 transition-colors",
                                childActive ? "text-brand-500" : "text-slate-400 group-hover:text-slate-600"
                              )}
                            />
                            <span className="font-medium">{child.title}</span>
                          </div>
                          {childExpanded ? (
                            <ChevronDown className={cn("h-4 w-4", childActive ? "text-brand-500" : "text-slate-400")} />
                          ) : (
                            <ChevronRight className={cn("h-4 w-4", childActive ? "text-brand-500" : "text-slate-400")} />
                          )}
                        </button>

                        {childExpanded && child.subItems && (
                          <div className="ml-5 space-y-1 border-l-2 border-slate-100 pl-4 py-1">
                            {child.subItems.map((subItem) => {
                              const subItemIsActive = isSubItemActive(subItem.href);
                              return (
                                <Link
                                  key={subItem.href}
                                  href={subItem.href}
                                  className={cn(
                                    "flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200 group relative",
                                    subItemIsActive
                                      ? "bg-brand-50/60 text-brand-700 font-semibold"
                                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                                  )}
                                >
                                  {subItemIsActive && (
                                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-brand-500 rounded-r-full -ml-4" />
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
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 p-4">
        {!isCollapsed ? (
          <>
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-linear-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-md overflow-hidden">
                {adminImage ? (
                  <img src={adminImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold text-white">
                    {adminName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-semibold text-slate-900">{adminName}</p>
                <p className="text-xs text-slate-500 truncate" title={adminEmail}>{adminEmail}</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="mt-3 flex w-full items-center px-3 py-2 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sign out
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <div className="h-10 w-10 rounded-full bg-linear-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-md overflow-hidden" title={adminName}>
              {adminImage ? (
                <img src={adminImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-white">
                  {adminName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              )}
            </div>
            <button
              onClick={() => logout()}
              className="flex items-center justify-center p-2 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
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
