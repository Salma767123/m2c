"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  DollarSign,
  Warehouse,
  User,
  ChevronDown,
  ChevronRight,
  BarChart3,
  MessageSquare,
  Settings,
  ShoppingCart,
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
    href: "/vendor/dashboard",
  },
  {
    title: "Inventory",
    icon: Warehouse,
    href: "/vendor/dashboard/inventory",
  },
   {
    title: "Products",
    icon: Package,
    href: "/vendor/dashboard/products",
  },
  {
    title: "Orders",
    icon: ShoppingCart,
    href: "/vendor/dashboard/orders",
  },
  {
    title: "Earnings",
    icon: DollarSign,
    subItems: [
      { title: "Overview", href: "/vendor/dashboard/earnings" },
      { title: "Payouts", href: "/vendor/dashboard/earnings/payouts" },
    ],
  },
  {
    title: "Reports",
    icon: BarChart3,
    href: "/vendor/dashboard/reports",
  },
  {
    title: "Support",
    icon: MessageSquare,
    href: "/vendor/dashboard/support",
  },
  {
    title: "Settings",
    icon: Settings,
    subItems: [
      { title: "Vendor Settings", href: "/vendor/dashboard/settings" },
      { title: "Bank Details", href: "/vendor/dashboard/settings/bank" },
    ],
  },
];

export default function VendorSidebar() {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Simple active check functions
  const isMainItemActive = (href: string) => {
    if (href === "/vendor/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const isSubItemActive = (href: string) => {
    // Special case for dashboard home
    if (href === "/vendor/dashboard") {
      return pathname === href;
    }
    
    // For earnings routes
    if (href === "/vendor/dashboard/earnings") {
      return pathname === "/vendor/dashboard/earnings" || pathname.startsWith("/vendor/dashboard/earnings?") || pathname.startsWith("/vendor/dashboard/earnings#");
    }
    
    if (href === "/vendor/dashboard/earnings/payouts") {
      return pathname === "/vendor/dashboard/earnings/payouts" || pathname.startsWith("/vendor/dashboard/earnings/payouts/") || pathname.startsWith("/vendor/dashboard/earnings/payouts?") || pathname.startsWith("/vendor/dashboard/earnings/payouts#");
    }
    
    // For settings routes
    if (href === "/vendor/dashboard/settings") {
      return pathname === "/vendor/dashboard/settings" || pathname.startsWith("/vendor/dashboard/settings?") || pathname.startsWith("/vendor/dashboard/settings#");
    }
    
    if (href === "/vendor/dashboard/settings/bank") {
      return pathname === "/vendor/dashboard/settings/bank" || pathname.startsWith("/vendor/dashboard/settings/bank/") || pathname.startsWith("/vendor/dashboard/settings/bank?") || pathname.startsWith("/vendor/dashboard/settings/bank#");
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
          href="/vendor/dashboard"
          className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
        >
          <div>
            <span className="text-lg text-center font-bold text-gray-900 block">
              Vendor Management
            </span>
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
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                )}
              >
                <Icon
                  className={cn(
                    "mr-3 h-5 w-5 transition-colors",
                    itemIsActive ? "text-white" : "text-gray-500 group-hover:text-gray-700",
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
                    ? "bg-gray-100 text-gray-900 border border-gray-300"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                  "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2",
                )}
              >
                <div className="flex items-center">
                  <Icon 
                    className={cn(
                      "mr-3 h-5 w-5 transition-colors",
                      parentHasActiveChild 
                        ? "text-gray-900" 
                        : "text-gray-500 group-hover:text-gray-700"
                    )} 
                  />
                  <span className="font-medium">{item.title}</span>
                </div>
                <div className="flex items-center">
                  {parentHasActiveChild && (
                    <div className="w-2 h-2 bg-gray-900 rounded-full mr-2" />
                  )}
                  {isExpanded ? (
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      parentHasActiveChild ? "text-gray-900" : "text-gray-400"
                    )} />
                  ) : (
                    <ChevronRight className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      parentHasActiveChild ? "text-gray-900" : "text-gray-400"
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
                            ? "bg-gray-900 text-white shadow-sm font-medium"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                        )}
                      >
                        {subItemIsActive && (
                          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-gray-900 rounded-r-full -ml-4" />
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
          <div className="h-10 w-10 rounded-full bg-linear-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-md">
            <User className="h-5 w-5 text-white" />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-semibold text-gray-900">Vendor Store</p>
            <p className="text-xs text-gray-500">Premium Plan</p>
          </div>
        </div>
      </div>
    </div>
  );
}
