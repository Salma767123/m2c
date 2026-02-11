"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Clock, Factory, MapPin, Package, FileText, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "../../UI/Card";
import Dropdown from "../../UI/Dropdown";
import { Breadcrumb } from "../Breadcrumb/Breadcrumb";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";

interface Vendor {
  id: string;
  companyName: string;
  location: string;
  contactPerson: string;
  phone: string;
  email: string;
}

interface QCChecker {
  id: string;
  name: string;
  assignedVendors: number;
}

interface InspectionItem {
  id: number;
  itemName: string;
  description: string;
  quantity: number;
  inspectionQuantity: number;
  specifications: string;
  aqlLevel: string;
}

export default function CreateAssignment() {
  const router = useRouter();
  
  const [vendors] = useState<Vendor[]>([
    {
      id: "1",
      companyName: "Nav Nit Group of Textiles",
      location: "Gujarat, India",
      contactPerson: "Rajesh Patel",
      phone: "+91 98765 43210",
      email: "rajesh.patel@navnittextiles.com",
    },
    {
      id: "2",
      companyName: "Fabric Tech Industries",
      location: "Tamil Nadu, India",
      contactPerson: "Suresh Kumar",
      phone: "+91 98765 43212",
      email: "suresh.kumar@fabrictechindustries.com",
    },
    {
      id: "3",
      companyName: "Weave & Co",
      location: "Karnataka, India",
      contactPerson: "Arjun Reddy",
      phone: "+91 98765 43214",
      email: "arjun.reddy@weaveandco.com",
    },
  ]);

  const [qcCheckers] = useState<QCChecker[]>([
    { id: "1", name: "John Smith", assignedVendors: 12 },
    { id: "2", name: "Sarah Johnson", assignedVendors: 8 },
    { id: "3", name: "Michael Brown", assignedVendors: 5 },
  ]);

  const [formData, setFormData] = useState({
    vendorId: "",
    checkerId: "",
    po: "",
    client: "",
    scheduledDate: "",
    scheduledTime: "",
    priority: "",
    estimatedDuration: "",
    selectedItems: [] as number[],
  });

  const [inspectionItems] = useState<InspectionItem[]>([
    {
      id: 1,
      itemName: "Premium Cotton T-Shirts",
      description: "100% Organic Cotton Round Neck T-Shirts - Multiple Colors",
      quantity: 5000,
      inspectionQuantity: 315,
      specifications: "GSM: 180, Sizes: S-XXL, Colors: White, Black, Navy, Grey",
      aqlLevel: "2.5",
    },
    {
      id: 2,
      itemName: "Denim Jeans",
      description: "Slim Fit Blue Denim Jeans with Stretch",
      quantity: 3000,
      inspectionQuantity: 200,
      specifications: "Weight: 12oz, Sizes: 28-42, Wash: Stone Wash",
      aqlLevel: "2.5",
    },
    {
      id: 3,
      itemName: "Polo Shirts",
      description: "Cotton Pique Polo Shirts with Embroidered Logo",
      quantity: 2500,
      inspectionQuantity: 160,
      specifications: "GSM: 200, Sizes: S-XL, Colors: White, Navy, Red",
      aqlLevel: "1.5",
    },
  ]);

  const handleVendorChange = (value: string | string[]) => {
    setFormData((prev) => ({
      ...prev,
      vendorId: value as string,
    }));
  };

  const handleCheckerChange = (value: string | string[]) => {
    setFormData((prev) => ({
      ...prev,
      checkerId: value as string,
    }));
  };

  const handlePriorityChange = (value: string | string[]) => {
    setFormData((prev) => ({
      ...prev,
      priority: value as string,
    }));
  };

  const handleItemToggle = (itemId: number) => {
    setFormData((prev) => ({
      ...prev,
      selectedItems: prev.selectedItems.includes(itemId)
        ? prev.selectedItems.filter((id) => id !== itemId)
        : [...prev.selectedItems, itemId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.vendorId ||
      !formData.checkerId ||
      !formData.po ||
      !formData.client ||
      !formData.scheduledDate ||
      !formData.scheduledTime ||
      !formData.priority ||
      !formData.estimatedDuration ||
      formData.selectedItems.length === 0
    ) {
      showErrorToast("Incomplete Form", "Please fill in all required fields and select at least one item.");
      return;
    }

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      const vendor = vendors.find((v) => v.id === formData.vendorId);
      const checker = qcCheckers.find((c) => c.id === formData.checkerId);

      showSuccessToast(
        "Assignment Created!",
        `Inspection scheduled for ${vendor?.companyName} with ${checker?.name} on ${formData.scheduledDate}.`
      );

      // Redirect back to Assign QC Checker page after a short delay
      setTimeout(() => {
        router.push("/admin/dashboard/vendors/assign-qc-checker");
      }, 1000);
    } catch (error) {
      showErrorToast("Assignment Failed", "Failed to create assignment. Please try again.");
    }
  };

  const selectedVendor = vendors.find((v) => v.id === formData.vendorId);

  return (
    <div className="p-6">
      <Breadcrumb />

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/dashboard/vendors/assign-qc"
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create QC Assignment</h1>
          <p className="text-gray-600 mt-1">Schedule a new quality control inspection</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vendor & Checker Selection */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor & Inspector Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Vendor <span className="text-red-500">*</span>
                    </label>
                    <Dropdown
                      value={formData.vendorId}
                      options={[
                        { value: "", label: "Choose a vendor" },
                        ...vendors.map((vendor) => ({
                          value: vendor.id,
                          label: vendor.companyName,
                        })),
                      ]}
                      onChange={handleVendorChange}
                      placeholder="Select vendor"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select QC Checker <span className="text-red-500">*</span>
                    </label>
                    <Dropdown
                      value={formData.checkerId}
                      options={[
                        { value: "", label: "Choose a QC checker" },
                        ...qcCheckers.map((checker) => ({
                          value: checker.id,
                          label: `${checker.name} (${checker.assignedVendors} vendors)`,
                        })),
                      ]}
                      onChange={handleCheckerChange}
                      placeholder="Select QC checker"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inspection Details */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Inspection Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PO Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.po}
                      onChange={(e) => setFormData((prev) => ({ ...prev, po: e.target.value }))}
                      placeholder="e.g., PO-2024-001"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.client}
                      onChange={(e) => setFormData((prev) => ({ ...prev, client: e.target.value }))}
                      placeholder="e.g., Fashion Forward Inc."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scheduled Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, scheduledDate: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scheduled Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) => setFormData((prev) => ({ ...prev, scheduledTime: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority <span className="text-red-500">*</span>
                    </label>
                    <Dropdown
                      value={formData.priority}
                      options={[
                        { value: "", label: "Select priority" },
                        { value: "high", label: "High" },
                        { value: "medium", label: "Medium" },
                        { value: "low", label: "Low" },
                      ]}
                      onChange={handlePriorityChange}
                      placeholder="Select priority"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Duration <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.estimatedDuration}
                      onChange={(e) => setFormData((prev) => ({ ...prev, estimatedDuration: e.target.value }))}
                      placeholder="e.g., 4 hours"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items to Inspect */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Items to Inspect <span className="text-red-500">*</span>
                </h3>
                <p className="text-sm text-gray-600 mb-4">Select the items that will be inspected</p>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {inspectionItems.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-start p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.selectedItems.includes(item.id)}
                        onChange={() => handleItemToggle(item.id)}
                        className="h-4 w-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900 mt-1"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-semibold text-gray-900">{item.itemName}</span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{item.description}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Quantity:</span>{" "}
                            <span className="font-medium text-gray-900">{item.quantity.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Inspection Qty:</span>{" "}
                            <span className="font-medium text-gray-900">{item.inspectionQuantity}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-500">Specifications:</span>{" "}
                            <span className="text-gray-700">{item.specifications}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">AQL Level:</span>{" "}
                            <span className="font-medium text-blue-600">{item.aqlLevel}</span>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {formData.selectedItems.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">{formData.selectedItems.length}</span> item(s) selected for inspection
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            {/* Vendor Info */}
            {selectedVendor && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Factory className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Vendor Information</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-gray-600">Company</p>
                      <p className="font-medium text-gray-900">{selectedVendor.companyName}</p>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{selectedVendor.location}</span>
                    </div>
                    <div>
                      <p className="text-gray-600">Contact Person</p>
                      <p className="font-medium text-gray-900">{selectedVendor.contactPerson}</p>
                      <p className="text-gray-600 text-xs mt-1">{selectedVendor.phone}</p>
                      <p className="text-gray-600 text-xs">{selectedVendor.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Schedule Summary */}
            {formData.scheduledDate && formData.scheduledTime && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Calendar className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Schedule</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {new Date(formData.scheduledDate).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{formData.scheduledTime}</span>
                    </div>
                    {formData.estimatedDuration && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700">Duration: {formData.estimatedDuration}</span>
                      </div>
                    )}
                    {formData.priority && (
                      <div>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            formData.priority === "high"
                              ? "bg-red-100 text-red-800"
                              : formData.priority === "medium"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {formData.priority.toUpperCase()} PRIORITY
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Assignment Summary */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Summary</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Vendor Selected</span>
                    {formData.vendorId ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-300" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">QC Checker Assigned</span>
                    {formData.checkerId ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-300" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Schedule Set</span>
                    {formData.scheduledDate && formData.scheduledTime ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-300" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Items Selected</span>
                    {formData.selectedItems.length > 0 ? (
                      <span className="flex items-center gap-1">
                        <span className="font-semibold text-gray-900">{formData.selectedItems.length}</span>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </span>
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-300" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                <CheckCircle className="h-5 w-5" />
                Create Assignment
              </button>
              <Link
                href="/admin/dashboard/vendors/assign-qc-checker"
                className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 font-medium py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
