"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Clock, Factory, MapPin, FileText, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "../../UI/Card";
import Dropdown from "../../UI/Dropdown";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { formatTime12 } from "@/lib/utils";
import vendorService from "@/services/vendorService";
import qcCheckerService from "@/services/qcCheckerService";
import { formatCheckerName } from "@/lib/checkerUtils";
import { useSearchParams } from 'next/navigation';

interface Vendor {
  id: string;
  companyName: string;
  location: string;
  contactPerson: string;
  phone: string;
  email: string;
  productCategories?: string[];
  productTypes?: string[];
  specializations?: string[];
}

interface QCChecker {
  id: string;
  /** Human-readable checker code (e.g. QC-001) — shown in the dropdown so
   *  two checkers with the same name stay distinguishable. */
  checkerId?: string;
  name: string;
  assignedVendors: number;
}

export default function CreateAssignment() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedVendorId = searchParams.get('vendorId');

  const todayStr = new Date().toISOString().slice(0, 10);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [qcCheckers, setQcCheckers] = useState<QCChecker[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [inspectionId, setInspectionId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const vendorRes = await vendorService.getAllVendors({ limit: 100 });
        const AllVendors = vendorRes.vendors.map((v: any) => {
          // "Contact Person" must be one coherent person: prefer the Main
          // Contact from the Contact & Trade step (with THEIR phone/email),
          // fall back to the owner's profile. The old mapping mixed three
          // unrelated fields (owner name + business phone + login email).
          const mc = v.mainContact && typeof v.mainContact === 'object' ? v.mainContact : null;
          const mcName = mc
            ? [mc.title, mc.firstName, mc.middleName, mc.lastName].filter(Boolean).join(' ') || mc.name
            : '';
          return {
            id: v.id,
            companyName: v.companyName,
            location: [v.businessCity, v.businessState].filter(Boolean).join(', ') || '—',
            contactPerson: mcName || v.ownerName || '—',
            phone: (mc && (mc.phone1 || mc.phone)) || v.ownerPhone || v.businessPhone || '',
            email: (mc && (mc.email1 || mc.email)) || v.ownerEmail || v.businessEmail || v.email || '',
            productCategories: v.productCategories || [],
            productTypes: v.productTypes || [],
            specializations: v.specializations || [],
          };
        });
        setVendors(AllVendors);

        const checkersResponse = await qcCheckerService.getAllQCCheckers();
        if (checkersResponse.success) {
          setQcCheckers(checkersResponse.data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const [formData, setFormData] = useState({
    vendorId: preSelectedVendorId || "",
    checkerId: "",
    client: "",
    scheduledDate: "",
    scheduledTime: "",
    priority: "",
    estimatedDuration: "",
    selectedItems: [] as (string | number)[],
  });

  useEffect(() => {
    if (preSelectedVendorId) {
      setFormData(prev => ({ ...prev, vendorId: preSelectedVendorId }))
      // Fetch existing inspection data if any
      const fetchExisting = async () => {
        try {
          const res = await vendorService.getInspectionByVendorId(preSelectedVendorId);
          if (res.success && res.inspection) {
            const insp = res.inspection;
            setIsEditing(true);
            setInspectionId(insp.id);
            setFormData(prev => ({
              ...prev,
              checkerId: insp.checkerId || "",
              // Keep the auto-filled company name when the stored assignment
              // has no client of its own.
              client: insp.clientName || prev.client,
              scheduledDate: insp.scheduledDate || "",
              scheduledTime: insp.scheduledTime || "",
              priority: insp.priority || "",
              estimatedDuration: insp.estimatedDuration || "",
              selectedItems: Array.isArray(insp.itemsToInspect) ? insp.itemsToInspect.map((i: any) => i.id) : []
            }));
          }
        } catch (error) {
          console.log("No existing assignment found for this vendor, will create new.");
        }
      };
      fetchExisting();
    }
  }, [preSelectedVendorId])

  // Auto-fill Client Name with the selected vendor's company name once the
  // vendor list has loaded (covers both the ?vendorId= deep link and manual
  // dropdown selection). Only fills when empty — an admin-typed value or a
  // stored assignment's client is never overwritten.
  useEffect(() => {
    if (!formData.vendorId || vendors.length === 0) return;
    const v = vendors.find((x) => x.id === formData.vendorId);
    if (!v) return;
    setFormData(prev => (prev.client ? prev : { ...prev, client: v.companyName }));
  }, [formData.vendorId, vendors]);

  // Dynamically generate inspection items based on the selected vendor.
  // Factory/vendor inspections audit capability at the category level, so we
  // source from productCategories (not productTypes, which are subcategories).
  const selectedVendor = vendors.find((v) => v.id === formData.vendorId);

  const handleVendorChange = (value: string | string[]) => {
    const selectedId = value as string;
    const vendor = vendors.find(v => v.id === selectedId);

    setFormData((prev) => ({
      ...prev,
      vendorId: selectedId,
      client: vendor ? vendor.companyName : prev.client,
      selectedItems: [] // reset items on vendor change
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.vendorId ||
      !formData.checkerId ||
      !formData.client ||
      !formData.scheduledDate ||
      !formData.scheduledTime ||
      !formData.priority ||
      !formData.estimatedDuration
    ) {
      showErrorToast("Incomplete Form", "Please fill in all required fields.");
      return;
    }

    try {
      setLoading(true);

      // Category selection was removed from this form; the API still expects an
      // itemsToInspect array, so send an empty list.
      const itemsToInspect: { id: string; itemName: string; description: string }[] = [];

      const vendor = vendors.find((v) => v.id === formData.vendorId);
      const checker = qcCheckers.find((c) => c.id === formData.checkerId);

      if (isEditing && inspectionId) {
        await vendorService.updateInspection(
          inspectionId,
          formData.checkerId,
          "", // PO Number is removed but api expects string
          formData.client,
          formData.scheduledDate,
          formData.scheduledTime,
          formData.priority,
          formData.estimatedDuration,
          itemsToInspect
        );
        showSuccessToast(
          "Assignment Updated!",
          `Inspection details for ${vendor?.companyName} have been updated.`
        );
      } else {
        await vendorService.assignQc(
          formData.vendorId,
          formData.checkerId,
          "", // PO Number is removed but api expects string
          formData.client,
          formData.scheduledDate,
          formData.scheduledTime,
          formData.priority,
          formData.estimatedDuration,
          itemsToInspect
        );
        showSuccessToast(
          "Assignment Created!",
          `Inspection scheduled for ${vendor?.companyName} with Quality Checker ${checker?.name}.`
        );
      }

      // Redirect back to Assign QC Checker page after a short delay
      setTimeout(() => {
        router.push("/admin/dashboard/vendors/assign-qc");
      }, 1000);
    } catch (error) {
      showErrorToast("Assignment Failed", "Failed to create assignment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/dashboard/vendors/assign-qc"
          className="text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isEditing ? "Update QC Assignment" : "Create QC Assignment"}</h1>
          <p className="text-slate-500 mt-1">{isEditing ? "Modify an existing quality control inspection" : "Schedule a new quality control inspection"}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vendor & Checker Selection */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Vendor & Inspector Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Select QC Checker <span className="text-red-500">*</span>
                    </label>
                    <Dropdown
                      value={formData.checkerId}
                      options={[
                        { value: "", label: "Choose a QC checker" },
                        ...qcCheckers.map((checker) => ({
                          value: checker.id,
                          label: `${formatCheckerName(checker)}${checker.checkerId ? ` · ${checker.checkerId}` : ''} (${checker.assignedVendors} vendor${checker.assignedVendors === 1 ? '' : 's'})`,
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
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Inspection Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Client Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.client}
                      onChange={(e) => setFormData((prev) => ({ ...prev, client: e.target.value }))}
                      placeholder="e.g., Fashion Forward Inc."
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Scheduled Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.scheduledDate}
                      min={todayStr}
                      onChange={(e) => setFormData((prev) => ({ ...prev, scheduledDate: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Scheduled Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) => setFormData((prev) => ({ ...prev, scheduledTime: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Estimated Duration <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.estimatedDuration}
                      onChange={(e) => setFormData((prev) => ({ ...prev, estimatedDuration: e.target.value }))}
                      placeholder="e.g., 4 hours"
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>
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
                    <div className="p-2 bg-blue-100 rounded-xl">
                      <Factory className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">Vendor Information</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-slate-500">Company</p>
                      <p className="font-medium text-slate-900">{selectedVendor.companyName}</p>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span>{selectedVendor.location}</span>
                    </div>
                    <div>
                      <p className="text-slate-500">Contact Person</p>
                      <p className="font-medium text-slate-900">{selectedVendor.contactPerson}</p>
                      <p className="text-slate-500 text-xs mt-1">{selectedVendor.phone}</p>
                      <p className="text-slate-500 text-xs">{selectedVendor.email}</p>
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
                    <div className="p-2 bg-green-100 rounded-xl">
                      <Calendar className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">Schedule</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-900">
                        {new Date(formData.scheduledDate).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{formatTime12(formData.scheduledTime)}</span>
                    </div>
                    {formData.estimatedDuration && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">Duration: {formData.estimatedDuration}</span>
                      </div>
                    )}
                    {formData.priority && (
                      <div>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${formData.priority === "high"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : formData.priority === "medium"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-green-50 text-green-700 border border-green-200"
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
                  <div className="p-2 bg-purple-100 rounded-xl">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Summary</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Vendor Selected</span>
                    {formData.vendorId ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-slate-300" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">QC Checker Assigned</span>
                    {formData.checkerId ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-slate-300" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Schedule Set</span>
                    {formData.scheduledDate && formData.scheduledTime ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-slate-300" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                disabled={loading}
              >
                <CheckCircle className="h-5 w-5" />
                {isEditing ? "Update Assignment" : "Create Assignment"}
              </button>
              <Link
                href="/admin/dashboard/vendors/assign-qc"
                className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600 font-medium py-3 px-6 rounded-xl hover:bg-slate-50 transition-colors"
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
