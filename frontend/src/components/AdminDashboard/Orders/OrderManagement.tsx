"use client";

import { useState } from "react";
import VendorToHub from "./VendorToHub";
import HubToCustomer from "./HubToCustomer";

export default function OrderManagement() {
    const [activeTab, setActiveTab] = useState<"vendor-to-hub" | "hub-to-customer">("vendor-to-hub");

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === "vendor-to-hub"
                            ? "text-teal-600 border-b-2 border-teal-600"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                    onClick={() => setActiveTab("vendor-to-hub")}
                >
                    Vendor to Hub
                </button>
                <button
                    className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === "hub-to-customer"
                            ? "text-teal-600 border-b-2 border-teal-600"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                    onClick={() => setActiveTab("hub-to-customer")}
                >
                    Hub to Customer
                </button>
            </div>

            {/* Content */}
            <div className="mt-6">
                {activeTab === "vendor-to-hub" ? (
                    <VendorToHub />
                ) : (
                    <HubToCustomer />
                )}
            </div>
        </div>
    );
}
