"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Settings,
  Store,
  Tags,
  MessageSquare,
  FileText,
  LogOut,
  Warehouse,
  Receipt,
  ChevronDown,
  ChevronRight,
  Shield,
} from "lucide-react";

interface SubMenuItem {
  title: string;
  href: string;
}

interface NavigationItem {
  title: string;
  icon: any;
  href?: string; // For single links
  subItems?: SubMenuItem[]; // For expandable sections
}

const navigation: NavigationItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin/dashboard",
  },
  {
    title: "Vendors",
    icon: Store,
    href: "/admin/dashboard/vendors",
  },
  {
    title: "Categories",
    icon: Tags,
    href: "/admin/dashboard/categories",
  },
  {
    title: "Products",
    icon: Package,
    subItems: [
      { title: "All Products", href: "/admin/dashboard/products" },
      { title: "Vendor Requests", href: "/admin/dashboard/products/vendor-requests" },
    ],
  },
  {
    title: "Inventory",
    icon: Warehouse,
    href: "/admin/dashboard/inventory",
  },
  {
    title: "Orders",
    icon: ShoppingCart,
    href: "/admin/dashboard/orders",
  },
  {
    title: "Invoice & Billing",
    icon: Receipt,
    href: "/admin/dashboard/billing",
  },
  {
    title: "Users",
    icon: Users,
    href: "/admin/dashboard/users",
  },
  {
    title: "Reviews",
    icon: MessageSquare,
    href: "/admin/dashboard/reviews",
  },
  {
    title: "Reports",
    icon: FileText,
    href: "/admin/dashboard/reports",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/admin/dashboard/settings",
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

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
    <div className="flex h-full w-64 flex-col font-sans bg-white border-r border-gray-200 shadow-sm">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-200 px-4">
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
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => {
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
                )}
              >
                <Icon
                  className={cn(
                    "mr-3 h-5 w-5 transition-colors",
                    itemIsActive ? "text-white" : "text-slate-500 group-hover:text-[#222222]",
                  )}
                />
                <span className="font-medium">{item.title}</span>
              </Link>
            );
          }

          // If item has subItems, render as expandable section
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
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#222222] to-[#444444] flex items-center justify-center shadow-md">
            <span className="text-sm font-semibold text-white">SA</span>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-semibold text-[#222222]">Super Admin</p>
            <p className="text-xs text-slate-500">admin@example.com</p>
          </div>
        </div>
        <button className="mt-3 flex w-full items-center px-3 py-2 text-sm font-medium text-[#222222] rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors">
          <LogOut className="mr-3 h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}