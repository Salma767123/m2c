"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Building2, User, Mail, Phone, MapPin, Calendar, CheckCircle, XCircle, FileText, ClipboardCheck, Clock, Factory, Shield, Wrench, Camera, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "../../UI/Card";
import { Breadcrumb } from "../Breadcrumb/Breadcrumb";
import { Badge } from "../../UI/Badge";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import vendorService from "@/services/vendorService";
import { hasPermission } from "@/lib/auth";
import reinspectionService, { AuditLogEntry } from "@/services/reinspectionService";
import InspectionAuditTimeline from "../ReInspection/InspectionAuditTimeline";

interface InspectionData {
  vendorName?: string;
  vendorId?: string;
  factoryName?: string;
  factoryAddress?: string;
  contactPersonName?: string;
  contactPhoneNumber?: string;
  businessRegistrationNumber?: string;
  gstTaxId?: string;
  factoryLicenseNumber?: string;
  productsManufactured?: string;
  monthlyProductionCapacity?: string;
  numberOfProductionWorkers?: string;
  categoryToInspect?: string;
  machineryAvailable?: string;
  electricityAvailable?: string;
  waterAvailable?: string;
  storageAreaAvailable?: string;
  qualityCheckProcess?: string;
  safetyEquipment?: string;
  cleanWorkingEnvironment?: string;
  inspectionDate?: string;
  inspectorName?: string;
  inspectionStatus?: string;
  inspectorRemarks?: string;
  factoryPhotos?: { name: string; data: string | null; url?: string | null; slotId?: string; label?: string }[];
  documentsUpload?: { name: string; data: string | null }[];
}

export default function VendorInspectionDetail({ vendorId }: { vendorId: string }) {
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [inspection, setInspection] = useState<any>(null);
  const [vendor, setVendor] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadVendor = async () => {
    try {
      const res = await vendorService.getVendorById(vendorId);
      if (res.vendor) setVendor(res.vendor);
    } catch (err) {
      console.error("Failed to refresh vendor:", err);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setFetchError(null);
        const [inspRes, vendorRes] = await Promise.all([
          vendorService.getInspectionByVendorId(vendorId),
          vendorService.getVendorById(vendorId),
        ]);

        if (inspRes.success && inspRes.inspection) {
          setInspection(inspRes.inspection);
          // Fetch audit trail for this inspection
          reinspectionService.getAuditTrail('FACTORY_INSPECTION', inspRes.inspection.id)
            .then(res => setAuditLogs(res.logs || []))
            .catch(() => {}); // Non-critical
        }
        if (vendorRes.vendor) setVendor(vendorRes.vendor);
      } catch (err: any) {
        console.error("Failed to fetch inspection data:", err);
        setFetchError(err?.message || "Failed to load inspection data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [vendorId]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      // Re-check latest vendor state to avoid concurrent-approval race
      const fresh = await vendorService.getVendorById(vendorId);
      if (fresh.vendor?.status !== 'UNDER_REVIEW') {
        setVendor(fresh.vendor);
        showErrorToast(
          "Approval Blocked",
          `Vendor status is now "${fresh.vendor?.status}". The page has been refreshed.`
        );
        return;
      }

      await vendorService.approveVendor(vendorId);
      showSuccessToast("Vendor Approved", "Login credentials have been sent to the vendor's email.");
      await loadVendor();
    } catch (err: any) {
      console.error("Approve vendor failed:", err);
      const msg = err?.response?.data?.error || err?.message || "Could not approve vendor. Please try again.";
      showErrorToast("Approval Failed", msg);
    } finally {
      setApproving(false);
    }
  };

  const formData: InspectionData = inspection?.itemsToInspect && typeof inspection.itemsToInspect === 'object' && !Array.isArray(inspection.itemsToInspect)
    ? inspection.itemsToInspect
    : {};

  const factoryPhotos = Array.isArray(formData.factoryPhotos) ? formData.factoryPhotos : [];

  const getResultBadge = (result: string | null) => {
    switch (result) {
      case 'PASSED':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-base px-4 py-2"><CheckCircle className="w-4 h-4 mr-2" />Passed</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800 border-red-200 text-base px-4 py-2"><XCircle className="w-4 h-4 mr-2" />Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 text-base px-4 py-2"><Clock className="w-4 h-4 mr-2" />Pending</Badge>;
    }
  };

  const getYesNoBadge = (value: string | undefined) => {
    if (value === "Yes") return <span className="flex items-center gap-1 text-emerald-700 font-medium"><CheckCircle className="w-4 h-4" /> Yes</span>;
    if (value === "No") return <span className="flex items-center gap-1 text-red-700 font-medium"><XCircle className="w-4 h-4" /> No</span>;
    return <span className="text-gray-500">N/A</span>;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading inspection report...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-6">
        <Breadcrumb />
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/dashboard/vendors/assign-qc" className="text-gray-600 hover:text-gray-900"><ArrowLeft className="h-6 w-6" /></Link>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Inspection Details</h1>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-16 w-16 text-red-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load</h3>
            <p className="text-gray-500">{fetchError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="p-6">
        <Breadcrumb />
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/dashboard/vendors/assign-qc" className="text-gray-600 hover:text-gray-900"><ArrowLeft className="h-6 w-6" /></Link>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Inspection Details</h1>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Inspection Found</h3>
            <p className="text-gray-500">No inspection has been assigned or completed for this vendor yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCompleted = inspection.status === 'COMPLETED';
  const vendorStatus = vendor?.status;

  return (
    <div className="p-6">
      <Breadcrumb />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard/vendors/assign-qc" className="text-gray-600 hover:text-gray-900"><ArrowLeft className="h-6 w-6" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inspection Report</h1>
            <p className="text-gray-600 mt-1">{vendor?.companyName || formData.vendorName || "Vendor"}</p>
          </div>
        </div>
        {isCompleted && vendorStatus === 'UNDER_REVIEW' && hasPermission('edit_vendors') && (
          <button
            onClick={handleApprove}
            disabled={approving}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            <CheckCircle className="h-5 w-5" />
            {approving ? "Approving..." : "Approve Vendor"}
          </button>
        )}
        {vendorStatus === 'APPROVED' && (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-base px-4 py-2">
            <CheckCircle className="w-4 h-4 mr-2" /> Vendor Approved
          </Badge>
        )}
      </div>

      {/* Inspection Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Inspection Status</div>
            <div className="mt-1">{getResultBadge(inspection.result)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Inspector</div>
            <div className="text-lg font-bold text-gray-900 mt-1">{formData.inspectorName || "N/A"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Inspection Date</div>
            <div className="text-lg font-bold text-gray-900 mt-1">
              {inspection.completedAt ? new Date(inspection.completedAt).toLocaleDateString() : formData.inspectionDate || "N/A"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Vendor Status</div>
            <div className="text-lg font-bold mt-1">
              {vendorStatus === 'APPROVED' ? <span className="text-emerald-600">Approved</span> :
               vendorStatus === 'UNDER_REVIEW' ? <span className="text-blue-600">Under Review</span> :
               vendorStatus === 'REJECTED' ? <span className="text-red-600">Rejected</span> :
               <span className="text-gray-600">{vendorStatus || "N/A"}</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inspector Remarks */}
      {formData.inspectorRemarks && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" /> Inspector Remarks
            </h3>
            <p className="text-gray-700 bg-gray-50 p-4 rounded-lg border">{formData.inspectorRemarks}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Factory Details */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Factory className="h-5 w-5 text-blue-600" /> Factory Details
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-gray-600">Factory Name</span><span className="font-medium">{formData.factoryName || "N/A"}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Address</span><span className="font-medium">{formData.factoryAddress || "N/A"}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Contact Person</span><span className="font-medium">{formData.contactPersonName || "N/A"}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Phone</span><span className="font-medium">{formData.contactPhoneNumber || "N/A"}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Legal & Registration */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" /> Legal & Registration
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-gray-600">Business Reg. No.</span><span className="font-medium">{formData.businessRegistrationNumber || "N/A"}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">GST / Tax ID</span><span className="font-medium">{formData.gstTaxId || "N/A"}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Factory License No.</span><span className="font-medium">{formData.factoryLicenseNumber || "N/A"}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Production Info */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-blue-600" /> Production Info
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-gray-600">Products Manufactured</span><span className="font-medium">{formData.productsManufactured || "N/A"}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Monthly Capacity</span><span className="font-medium">{formData.monthlyProductionCapacity || "N/A"}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Workers</span><span className="font-medium">{formData.numberOfProductionWorkers || "N/A"}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Category</span><span className="font-medium">{formData.categoryToInspect || "N/A"}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Infrastructure Check */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" /> Infrastructure Check
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-gray-600">Machinery Available</span>{getYesNoBadge(formData.machineryAvailable)}</div>
              <div className="flex justify-between items-center"><span className="text-gray-600">Electricity Available</span>{getYesNoBadge(formData.electricityAvailable)}</div>
              <div className="flex justify-between items-center"><span className="text-gray-600">Water Available</span>{getYesNoBadge(formData.waterAvailable)}</div>
              <div className="flex justify-between items-center"><span className="text-gray-600">Storage Area Available</span>{getYesNoBadge(formData.storageAreaAvailable)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality & Safety */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" /> Quality & Safety
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Quality Check Process</span>{getYesNoBadge(formData.qualityCheckProcess)}</div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Safety Equipment</span>{getYesNoBadge(formData.safetyEquipment)}</div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Clean Environment</span>{getYesNoBadge(formData.cleanWorkingEnvironment)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Factory Photos */}
      {factoryPhotos.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-600" /> Factory Photos
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {factoryPhotos.map((photo, idx) => {
                const src = photo.data || photo.url || null;
                const caption = photo.label || photo.name || `Photo ${idx + 1}`;
                return (
                  <div key={idx} className="border rounded-lg overflow-hidden">
                    {src ? (
                      <img src={src} alt={caption} className="w-full h-40 object-cover" />
                    ) : (
                      <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">{caption}</div>
                    )}
                    <div className="p-2 text-xs font-semibold text-gray-700 truncate" title={caption}>{caption}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Trail */}
      {auditLogs.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" /> Inspection Audit Trail
            </h2>
            <InspectionAuditTimeline logs={auditLogs} />
          </CardContent>
        </Card>
      )}

      {/* Approve Action at Bottom */}
      {isCompleted && vendorStatus === 'UNDER_REVIEW' && hasPermission('edit_vendors') && (
        <Card className="border-2 border-emerald-200 bg-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Ready for Approval</h3>
                <p className="text-gray-600 mt-1">QC inspection is complete. Review the report above and approve the vendor to send login credentials.</p>
              </div>
              <button
                onClick={handleApprove}
                disabled={approving}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckCircle className="h-5 w-5" />
                {approving ? "Approving..." : "Approve Vendor"}
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
