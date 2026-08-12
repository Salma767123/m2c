"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Building2, User, Mail, Phone, MapPin, Calendar, CheckCircle, XCircle, FileText, ClipboardCheck, Clock, Factory, Shield, Wrench, Camera, AlertTriangle, Eye, Download, Loader2, RefreshCw, AlarmClockOff } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "../../UI/Card";
import { Badge } from "../../UI/Badge";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import vendorService from "@/services/vendorService";
import { hasPermission } from "@/lib/auth";
import reinspectionService, { AuditLogEntry, AdminReviewPayload } from "@/services/reinspectionService";
import InspectionAuditTimeline from "../ReInspection/InspectionAuditTimeline";
import RejectionModal from "./RejectionModal";
import AdminReviewModal from "../ReInspection/AdminReviewModal";
import axiosInstance from "@/lib/axios";
import { generateFactoryInspectionPdf, pdfFileName } from "@/lib/factoryInspectionReportPdf";
import { computeInspectionDurations } from "@/lib/inspectionDuration";
import { fieldLabelForKey as humanizeFieldKey } from "@/lib/inspectionFieldLabel";
import VendorInspectionData from "./VendorInspectionData";
import InspectionChecklist from "./InspectionChecklist";

// Fetch a remote (e.g. Cloudinary) image and convert to a data URL so jsPDF can
// embed it — mirrors the helper the checker's sign-off screen uses.
async function fetchImgDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function openDataUriInTab(dataUri: string, mimeType: string) {
  try {
    const b64 = dataUri.split(",")[1];
    const bytes = atob(b64);
    const ab = new ArrayBuffer(bytes.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < bytes.length; i++) ia[i] = bytes.charCodeAt(i);
    const blob = new Blob([ab], { type: mimeType });
    window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer");
  } catch { /* ignore */ }
}

interface InspectionData {
  vendorName?: string;
  vendorId?: string;
  factoryName?: string;
  factoryAddress?: string;
  contactPersonName?: string;
  contactPhoneNumber?: string;
  gstTaxId?: string;
  panNumber?: string;
  iecCode?: string;
  companyIdNumber?: string;
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
  const [reportBusy, setReportBusy] = useState<null | "view" | "download">(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reinspectModalOpen, setReinspectModalOpen] = useState(false);
  const [checkers, setCheckers] = useState<{ id: string; name: string }[]>([]);

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

  const handleRejectConfirm = async (reason: string) => {
    setRejecting(true);
    try {
      await vendorService.rejectVendor(vendorId, reason);
      showSuccessToast("Vendor Rejected", "The vendor has been notified of the rejection.");
      setRejectModalOpen(false);
      await loadVendor();
    } catch (err: any) {
      console.error("Reject vendor failed:", err);
      const msg = err?.response?.data?.error || err?.message || "Could not reject vendor. Please try again.";
      showErrorToast("Rejection Failed", msg);
    } finally {
      setRejecting(false);
    }
  };

  const openReinspectModal = async () => {
    // Lazy-load active checkers for the optional reassignment dropdown
    if (checkers.length === 0) {
      try {
        const res = await axiosInstance.get("/qc-checkers", { params: { limit: 50, status: "ACTIVE" } });
        setCheckers(
          (res.data.checkers || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))
        );
      } catch { /* dropdown simply stays empty */ }
    }
    setReinspectModalOpen(true);
  };

  const handleReinspectionSubmit = async (payload: AdminReviewPayload) => {
    // AdminReviewModal surfaces thrown errors inline, so no try/catch here
    await reinspectionService.reviewFactoryInspection(inspection.id, payload);
    showSuccessToast(
      "Re-Inspection Requested",
      "A new inspection cycle has been created and the checker has been notified."
    );
    // Refresh inspection + vendor + audit trail so the page reflects the new cycle
    const [inspRes] = await Promise.all([
      vendorService.getInspectionByVendorId(vendorId),
      loadVendor(),
    ]);
    if (inspRes?.success && inspRes.inspection) {
      setInspection(inspRes.inspection);
      reinspectionService.getAuditTrail("FACTORY_INSPECTION", inspRes.inspection.id)
        .then((res) => setAuditLogs(res.logs || []))
        .catch(() => {});
    }
  };

  const formData: InspectionData = inspection?.itemsToInspect && typeof inspection.itemsToInspect === 'object' && !Array.isArray(inspection.itemsToInspect)
    ? inspection.itemsToInspect
    : {};

  // Detect new 9-step form format
  const isNewFormat = typeof (formData as any).verifications === 'object' && (formData as any).verifications !== null;
  const vf: Record<string, { ok: boolean | null; remarks: string }> = isNewFormat ? (formData as any).verifications : {};
  // Prefer the fully-fetched vendor record (getVendorById) — the one nested on
  // the inspection is a thin projection missing company/owner/contact fields,
  // which is why the info cards were showing N/A.
  const v = { ...(inspection?.vendor || {}), ...(vendor || {}) };

  const factoryPhotos = Array.isArray(formData.factoryPhotos) ? formData.factoryPhotos : [];

  const hasSignature = !!(formData as any).clientSignature;

  // Rebuild the same signed factory-inspection report the checker generated at
  // sign-off, from the persisted inspection data. The signed PDF itself is not
  // stored, but every input to it is (vendor record, verifications, inspector
  // meta and the captured client signature), so we regenerate it on demand.
  const buildReport = async () => {
    const vendorObj = vendor || v;

    // Client signature — stored as a Cloudinary URL (or inline data URL) in the
    // inspection payload. jsPDF needs a data URL to embed it.
    let signatureDataUrl: string | null = null;
    const rawSig = (formData as any).clientSignature;
    if (rawSig) signatureDataUrl = String(rawSig).startsWith("data:") ? rawSig : await fetchImgDataUrl(rawSig);

    // Factory images uploaded against the vendor (type OTHER), plus profile photos.
    const vendorDocs: any[] = Array.isArray(vendorObj?.documents) ? vendorObj.documents : [];
    const otherDocs = vendorDocs.filter((d: any) => d?.type === "OTHER" && d?.documentUrl);
    const vendorFactoryImages = (
      await Promise.all(
        otherDocs.map(async (d: any) => {
          const dataUrl = await fetchImgDataUrl(d.documentUrl);
          return dataUrl ? { label: d.name || "Factory Image", dataUrl } : null;
        })
      )
    ).filter((x): x is { label: string; dataUrl: string } => x !== null);

    const [companyLogoDataUrl, ownerPhotoDataUrl, mainContactPhotoDataUrl] = await Promise.all([
      vendorObj?.companyLogo ? fetchImgDataUrl(vendorObj.companyLogo) : Promise.resolve(null),
      vendorObj?.ownerPhoto ? fetchImgDataUrl(vendorObj.ownerPhoto) : Promise.resolve(null),
      vendorObj?.mainContact?.photo ? fetchImgDataUrl(vendorObj.mainContact.photo) : Promise.resolve(null),
    ]);
    // Additional owners' photos — index-aligned with additionalOwners.
    const additionalOwnerPhotoDataUrls = await Promise.all(
      (Array.isArray(vendorObj?.additionalOwners) ? vendorObj.additionalOwners : []).map(
        (o: any) => (o?.photo ? fetchImgDataUrl(o.photo) : Promise.resolve(null)),
      ),
    );

    const qc = vendorObj?.assignedQc || null;
    const reportMeta = {
      inspectorName: (formData as any).inspectorName || "",
      inspectionDate: (formData as any).inspectionDate,
      inspectionStartedAt: inspection?.startedAt ?? undefined,
      overallResult: (formData as any).inspectionStatus,
      inspectorRemarks: (formData as any).inspectorRemarks || inspection?.notes,
      checker: qc
        ? { name: qc.name, checkerId: qc.checkerId, email: qc.email, phone: qc.phone || qc.mobile }
        : ((formData as any).inspectorName ? { name: (formData as any).inspectorName } : null),
      inspectionType: inspection?.inspectionType,
      location:
        inspection?.checkerLatitude != null && inspection?.checkerLongitude != null
          ? { latitude: inspection.checkerLatitude, longitude: inspection.checkerLongitude }
          : null,
      // Stamp the report with when it was actually signed/submitted, not "now",
      // so re-opening it always shows a stable date.
      generatedAt: inspection?.submittedAt
        ? new Date(inspection.submittedAt)
        : inspection?.completedAt
          ? new Date(inspection.completedAt)
          : new Date(),
      inspectionCompletedAt: inspection?.submittedAt || inspection?.completedAt || undefined,
      // Active / paused / total duration breakdown for the report.
      ...(() => {
        const d = computeInspectionDurations(inspection);
        return d.totalMs > 0
          ? { activeDurationMs: d.activeMs, pausedDurationMs: d.pausedMs, totalDurationMs: d.totalMs, scheduledDurationMs: d.scheduledMs, exceededSchedule: d.exceeded }
          : {};
      })(),
    };

    // Inspector evidence photos captured during the visit — persisted on the
    // inspection form data as [{ label, dataUrl }] (dataUrl is a hosted URL).
    // jsPDF needs a data URL, so fetch each one.
    const rawEvidence = Array.isArray((formData as any).inspectorEvidenceImages)
      ? (formData as any).inspectorEvidenceImages
      : [];
    const inspectorEvidenceImages = (
      await Promise.all(
        rawEvidence.map(async (e: any) => {
          const src = e?.dataUrl || e?.url;
          if (!src) return null;
          const dataUrl = String(src).startsWith("data:") ? src : await fetchImgDataUrl(src);
          return dataUrl ? { label: e?.label || "Inspector Evidence", dataUrl } : null;
        })
      )
    ).filter((x): x is { label: string; dataUrl: string } => x !== null);

    const doc = generateFactoryInspectionPdf(vendorObj, vf as any, reportMeta, {
      clientSignatureDataUrl: signatureDataUrl,
      vendorFactoryImages: vendorFactoryImages.length > 0 ? vendorFactoryImages : null,
      inspectorEvidenceImages: inspectorEvidenceImages.length > 0 ? inspectorEvidenceImages : null,
      companyLogoDataUrl,
      ownerPhotoDataUrl,
      mainContactPhotoDataUrl,
      additionalOwnerPhotoDataUrls,
    });
    return { doc, reportMeta };
  };

  const viewSignedReport = async () => {
    setReportBusy("view");
    try {
      const { doc } = await buildReport();
      openDataUriInTab(doc.output("datauristring"), "application/pdf");
    } catch (err: any) {
      console.error("Failed to generate inspection report:", err);
      showErrorToast("Report Error", "Could not generate the inspection report. Please try again.");
    } finally {
      setReportBusy(null);
    }
  };

  const downloadSignedReport = async () => {
    setReportBusy("download");
    try {
      const { doc, reportMeta } = await buildReport();
      doc.save(pdfFileName(reportMeta, hasSignature));
    } catch (err: any) {
      console.error("Failed to download inspection report:", err);
      showErrorToast("Report Error", "Could not generate the inspection report. Please try again.");
    } finally {
      setReportBusy(null);
    }
  };

  // The checker's Pass/Fail verdict (`inspection.result`) is only final once the
  // inspection is COMPLETED. While it is still SUBMITTED / under admin review the
  // card must show the lifecycle status — not a premature "Passed". Uses only
  // existing inspection statuses.
  const getInspectionStatusBadge = (insp: { status?: string | null; result?: string | null } | null) => {
    const status = (insp?.status || '').toUpperCase();
    const result = (insp?.result || '').toUpperCase();
    const base = "text-base px-4 py-2 border";
    switch (status) {
      case 'COMPLETED':
        if (result === 'FAILED')
          return <Badge className={`bg-red-50 text-red-700 border border-red-200 border-red-200 ${base}`}><XCircle className="w-4 h-4 mr-2" />Failed</Badge>;
        return <Badge className={`bg-emerald-50 text-emerald-700 border border-emerald-200 border-emerald-200 ${base}`}><CheckCircle className="w-4 h-4 mr-2" />{result === 'PASSED' ? 'Passed' : 'Completed'}</Badge>;
      case 'SUBMITTED':
      case 'UNDER_ADMIN_REVIEW':
        return <Badge className={`bg-blue-50 text-blue-700 border border-blue-200 border-blue-200 ${base}`}><Clock className="w-4 h-4 mr-2" />Under Review by Admin</Badge>;
      case 'SCHEDULED':
        return <Badge className={`bg-slate-100 text-slate-700 border-slate-200 ${base}`}><Clock className="w-4 h-4 mr-2" />Scheduled</Badge>;
      case 'IN_PROGRESS':
        return <Badge className={`bg-amber-50 text-amber-700 border border-amber-200 border-amber-200 ${base}`}><Clock className="w-4 h-4 mr-2" />In Progress</Badge>;
      case 'REJECTED':
        return <Badge className={`bg-red-50 text-red-700 border border-red-200 border-red-200 ${base}`}><XCircle className="w-4 h-4 mr-2" />Rejected</Badge>;
      case 'REINSPECTION':
        return <Badge className={`bg-amber-50 text-amber-700 border border-amber-200 border-amber-200 ${base}`}><Clock className="w-4 h-4 mr-2" />Re-Inspection</Badge>;
      case 'CANCELLED':
        return <Badge className={`bg-slate-100 text-slate-600 border-slate-200 ${base}`}><XCircle className="w-4 h-4 mr-2" />Cancelled</Badge>;
      default:
        return <Badge className={`bg-slate-50 text-slate-700 border border-slate-200 ${base}`}><Clock className="w-4 h-4 mr-2" />{status ? status.replace(/_/g, ' ') : 'Pending'}</Badge>;
    }
  };

  const getYesNoBadge = (value: string | undefined) => {
    if (value === "Yes") return <span className="flex items-center gap-1 text-emerald-700 font-medium"><CheckCircle className="w-4 h-4" /> Yes</span>;
    if (value === "No") return <span className="flex items-center gap-1 text-red-700 font-medium"><XCircle className="w-4 h-4" /> No</span>;
    return <span className="text-slate-500">N/A</span>;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto mb-4"></div>
          <p className="text-slate-500">Loading inspection report...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/dashboard/vendors/assign-qc" className="text-slate-500 hover:text-slate-900"><ArrowLeft className="h-6 w-6" /></Link>
          <h1 className="text-2xl font-bold text-slate-900">Vendor Inspection Details</h1>
        </div>
        <Card className="border border-slate-200/80 rounded-2xl shadow-xs">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-16 w-16 text-red-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Failed to Load</h3>
            <p className="text-slate-500">{fetchError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/dashboard/vendors/assign-qc" className="text-slate-500 hover:text-slate-900"><ArrowLeft className="h-6 w-6" /></Link>
          <h1 className="text-2xl font-bold text-slate-900">Vendor Inspection Details</h1>
        </div>
        <Card className="border border-slate-200/80 rounded-2xl shadow-xs">
          <CardContent className="p-12 text-center">
            <ClipboardCheck className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Inspection Found</h3>
            <p className="text-slate-500">No inspection has been assigned or completed for this vendor yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // The checker submits the inspection as SUBMITTED (→ UNDER_ADMIN_REVIEW);
  // it only becomes COMPLETED after the admin approves. Gating the approve
  // button on COMPLETED alone made it unreachable at exactly the moment the
  // admin needs it.
  const isAwaitingAdminAction = ['SUBMITTED', 'UNDER_ADMIN_REVIEW', 'COMPLETED'].includes(inspection.status);
  const vendorStatus = vendor?.status;

  return (
    <div className="p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard/vendors/assign-qc" className="text-slate-500 hover:text-slate-900"><ArrowLeft className="h-6 w-6" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inspection Report</h1>
            <p className="text-slate-500 mt-1">{vendor?.companyName || formData.vendorName || "Vendor"}</p>
          </div>
        </div>
        {isAwaitingAdminAction && vendorStatus === 'UNDER_REVIEW' && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {hasPermission('vendor_management:approve') && (
              <button
                onClick={handleApprove}
                disabled={approving}
                className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                <CheckCircle className="h-5 w-5" />
                {approving ? "Approving..." : "Approve Vendor"}
              </button>
            )}
            {hasPermission('reinspection_review:approve') && (
              <button
                onClick={openReinspectModal}
                className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors"
              >
                <RefreshCw className="h-5 w-5" />
                Request Reinspection
              </button>
            )}
            {hasPermission('vendor_management:approve') && (
              <button
                onClick={() => setRejectModalOpen(true)}
                className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
              >
                <XCircle className="h-5 w-5" />
                Reject Vendor
              </button>
            )}
          </div>
        )}
        {vendorStatus === 'APPROVED' && (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 border-emerald-200 text-base px-4 py-2">
            <CheckCircle className="w-4 h-4 mr-2" /> Vendor Approved
          </Badge>
        )}
      </div>

      {/* Inspection Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border border-slate-200/80 rounded-2xl shadow-xs">
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">Inspection Status</div>
            <div className="mt-1">{getInspectionStatusBadge(inspection)}</div>
            {computeInspectionDurations(inspection).exceeded && (
              <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border bg-red-50 text-red-700 border-red-200">
                <AlarmClockOff className="w-3 h-3" /> Exceeded schedule
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 rounded-2xl shadow-xs">
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">Inspector</div>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {(isNewFormat ? (formData as any).inspectorName : formData.inspectorName) || "N/A"}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 rounded-2xl shadow-xs">
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">Inspection Date</div>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {inspection.completedAt
                ? new Date(inspection.completedAt).toLocaleDateString()
                : (isNewFormat ? (formData as any).inspectionDate : formData.inspectionDate) || "N/A"}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 rounded-2xl shadow-xs">
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">Admin Status</div>
            <div className="text-lg font-bold mt-1">
              {(() => {
                // Admin's decision/review state on the vendor. Labels match the
                // admin Vendor Management / Assign QC Checker pages.
                const s = (vendorStatus || '').toUpperCase();
                const map: Record<string, { label: string; cls: string }> = {
                  APPROVED:     { label: 'Approved',      cls: 'text-emerald-600' },
                  UNDER_REVIEW: { label: 'Under Review',  cls: 'text-blue-600' },
                  REJECTED:     { label: 'Rejected',      cls: 'text-red-600' },
                  REINSPECTION: { label: 'Re-Inspection', cls: 'text-amber-600' },
                  SUSPENDED:    { label: 'Suspended',     cls: 'text-orange-600' },
                  PENDING:      { label: 'Pending',       cls: 'text-slate-600' },
                };
                const m = map[s];
                return m
                  ? <span className={m.cls}>{m.label}</span>
                  : <span className="text-slate-500">{vendorStatus || 'N/A'}</span>;
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Signed Inspection Report — vendor-driven, available for new and legacy inspections */}
      {inspection && (
        <Card className="mb-6 border border-slate-200/80 rounded-2xl shadow-xs">
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Inspection Report</h3>
                <p className="text-sm text-slate-600">
                  {hasSignature
                    ? "Full report with the client signature captured during the inspection."
                    : "Full factory inspection report generated from the submitted data."}
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={viewSignedReport}
                disabled={reportBusy !== null}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white transition-colors shadow-sm shadow-brand-500/10 disabled:opacity-60"
              >
                {reportBusy === "view" ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</> : <><Eye className="w-4 h-4" /> View Report</>}
              </button>
              <button
                type="button"
                onClick={downloadSignedReport}
                disabled={reportBusy !== null}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-700 transition-colors disabled:opacity-60"
              >
                {reportBusy === "download" ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</> : <><Download className="w-4 h-4" /> Download</>}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inspector Remarks */}
      {((isNewFormat ? (formData as any).inspectorRemarks : formData.inspectorRemarks) || inspection.notes) && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" /> Inspector Remarks
            </h3>
            <p className="text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {(isNewFormat ? (formData as any).inspectorRemarks : formData.inspectorRemarks) || inspection.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Full vendor registration data — values + images. Vendor-driven, so it
          renders for both new (9-step) and legacy inspections. */}
      <div className="mb-6">
        <VendorInspectionData vendor={v} />
      </div>

      {/* ── NEW FORMAT: 9-step inspection summary ── */}
      {isNewFormat && (() => {
        const allEntries = Object.entries(vf);
        const ok = allEntries.filter(([, val]) => val.ok === true).length;
        const fail = allEntries.filter(([, val]) => val.ok === false).length;
        const pending = allEntries.filter(([, val]) => val.ok === null).length;
        const total = allEntries.length;
        const issues = allEntries.filter(([, val]) => val.ok === false);
        return (
          <div className="space-y-6 mb-6">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border border-slate-200/80 rounded-2xl shadow-xs"><CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">{total}</div>
                <div className="text-sm text-slate-500">Total Fields</div>
              </CardContent></Card>
              <Card className="border border-slate-200/80 rounded-2xl shadow-xs"><CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-emerald-600">{ok}</div>
                <div className="text-sm text-slate-500">Verified OK</div>
              </CardContent></Card>
              <Card className="border border-slate-200/80 rounded-2xl shadow-xs"><CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{fail}</div>
                <div className="text-sm text-slate-500">Issues Found</div>
              </CardContent></Card>
              <Card className="border border-slate-200/80 rounded-2xl shadow-xs"><CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-amber-500">{pending}</div>
                <div className="text-sm text-slate-500">Pending</div>
              </CardContent></Card>
            </div>

            {/* Issues */}
            {issues.length > 0 && (
              <Card className="border border-slate-200/80 rounded-2xl shadow-xs">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" /> Issues Found ({issues.length})
                  </h3>
                  <div className="space-y-2">
                    {issues.map(([key, val]) => (
                      <div key={key} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-red-700">{humanizeFieldKey(key)}</p>
                          {val.remarks
                            ? <p className="text-sm text-red-800 mt-0.5">{val.remarks}</p>
                            : <p className="text-sm text-red-500 italic mt-0.5">No remarks.</p>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Full checklist — collapsible accordion, one step open at a time */}
            <InspectionChecklist verifications={vf} />
          </div>
        );
      })()}

      {/* ── OLD FORMAT: legacy form sections ── */}
      {!isNewFormat && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Factory Details */}
            <Card className="border border-slate-200/80 rounded-2xl shadow-xs">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Factory className="h-5 w-5 text-blue-600" /> Factory Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-slate-500">Factory Name</span><span className="font-medium text-slate-900">{formData.factoryName || "N/A"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Address</span><span className="font-medium text-slate-900">{formData.factoryAddress || "N/A"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Contact Person Name</span><span className="font-medium text-slate-900">{formData.contactPersonName || "N/A"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Contact Phone Number</span><span className="font-medium text-slate-900">{formData.contactPhoneNumber || "N/A"}</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Legal & Registration */}
            <Card className="border border-slate-200/80 rounded-2xl shadow-xs">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" /> Legal & Registration
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-slate-500">GST Number</span><span className="font-medium text-slate-900">{formData.gstTaxId || "N/A"}</span></div>
                  {formData.panNumber && <div className="flex justify-between"><span className="text-slate-500">PAN Number</span><span className="font-medium font-mono text-slate-900">{formData.panNumber}</span></div>}
                  {formData.iecCode && <div className="flex justify-between"><span className="text-slate-500">IEC Code</span><span className="font-medium font-mono text-slate-900">{formData.iecCode}</span></div>}
                  {formData.companyIdNumber && <div className="flex justify-between"><span className="text-slate-500">Company ID / CIN</span><span className="font-medium font-mono text-slate-900">{formData.companyIdNumber}</span></div>}
                </div>
              </CardContent>
            </Card>

            {/* Production Info */}
            <Card className="border border-slate-200/80 rounded-2xl shadow-xs">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-blue-600" /> Production Info
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-slate-500">Products Manufactured</span><span className="font-medium text-slate-900">{formData.productsManufactured || "N/A"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Monthly Production Capacity</span><span className="font-medium text-slate-900">{formData.monthlyProductionCapacity || "N/A"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Number of Production Workers</span><span className="font-medium text-slate-900">{formData.numberOfProductionWorkers || "N/A"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Category to Inspect</span><span className="font-medium text-slate-900">{formData.categoryToInspect || "N/A"}</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Infrastructure Check */}
            <Card className="border border-slate-200/80 rounded-2xl shadow-xs">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" /> Infrastructure Check
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center"><span className="text-slate-500">Machinery Available</span>{getYesNoBadge(formData.machineryAvailable)}</div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">Electricity Available</span>{getYesNoBadge(formData.electricityAvailable)}</div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">Water Available</span>{getYesNoBadge(formData.waterAvailable)}</div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">Storage Area Available</span>{getYesNoBadge(formData.storageAreaAvailable)}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quality & Safety */}
          <Card className="mb-6 border border-slate-200/80 rounded-2xl shadow-xs">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600" /> Quality & Safety
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200"><span className="text-slate-500">Quality Check Process</span>{getYesNoBadge(formData.qualityCheckProcess)}</div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200"><span className="text-slate-500">Safety Equipment</span>{getYesNoBadge(formData.safetyEquipment)}</div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200"><span className="text-slate-500">Clean Environment</span>{getYesNoBadge(formData.cleanWorkingEnvironment)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Factory Photos */}
          {factoryPhotos.length > 0 && (
            <Card className="mb-6 border border-slate-200/80 rounded-2xl shadow-xs">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Camera className="h-5 w-5 text-blue-600" /> Factory Photos
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {factoryPhotos.map((photo, idx) => {
                    const src = photo.data || photo.url || null;
                    const caption = photo.label || photo.name || `Photo ${idx + 1}`;
                    return (
                      <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                        {src ? (
                          <img src={src} alt={caption} className="w-full h-40 object-cover" />
                        ) : (
                          <div className="w-full h-40 bg-slate-100 flex items-center justify-center text-slate-400 text-sm">{caption}</div>
                        )}
                        <div className="p-2 text-xs font-semibold text-slate-700 truncate" title={caption}>{caption}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Audit Trail */}
      {auditLogs.length > 0 && (
        <Card className="border border-slate-200/80 rounded-2xl shadow-xs">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" /> Inspection Audit Trail
            </h2>
            <InspectionAuditTimeline logs={auditLogs} />
          </CardContent>
        </Card>
      )}

      {/* Decision Actions at Bottom */}
      {isAwaitingAdminAction && vendorStatus === 'UNDER_REVIEW' && (
        <Card className="border-2 border-emerald-200 bg-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Ready for Decision</h3>
                <p className="text-slate-500 mt-1">QC inspection is complete. Review the report above, then approve the vendor, send it back for re-inspection, or reject.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {hasPermission('vendor_management:approve') && (
                  <button
                    onClick={handleApprove}
                    disabled={approving}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="h-5 w-5" />
                    {approving ? "Approving..." : "Approve Vendor"}
                  </button>
                )}
                {hasPermission('reinspection_review:approve') && (
                  <button
                    onClick={openReinspectModal}
                    className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors"
                  >
                    <RefreshCw className="h-5 w-5" />
                    Request Reinspection
                  </button>
                )}
                {hasPermission('vendor_management:approve') && (
                  <button
                    onClick={() => setRejectModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
                  >
                    <XCircle className="h-5 w-5" />
                    Reject Vendor
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reject Vendor modal (reason + category, same flow as Vendor Management) */}
      <RejectionModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onConfirm={handleRejectConfirm}
        vendor={vendor ? {
          id: vendor.id,
          companyName: vendor.companyName || v.companyName || 'Vendor',
          ownerName: vendor.ownerName || v.ownerName || '',
          email: vendor.email || v.email || '',
        } : null}
        isLoading={rejecting}
      />

      {/* Request Re-Inspection modal (locked to RAISE_REINSPECTION) */}
      {inspection && (
        <AdminReviewModal
          isOpen={reinspectModalOpen}
          onClose={() => setReinspectModalOpen(false)}
          onSubmit={handleReinspectionSubmit}
          entityType="factory"
          entityName={vendor?.companyName || v.companyName || 'Vendor'}
          cycleNumber={inspection.cycleNumber || 1}
          checkers={checkers}
          lockedDecision="RAISE_REINSPECTION"
        />
      )}
    </div>
  );
}
