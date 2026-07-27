"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Package, Factory, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "../../UI/Card";
import Dropdown from "../../UI/Dropdown";
import { Breadcrumb } from "../Breadcrumb/Breadcrumb";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { formatTime12 } from "@/lib/utils";
import { adminProductService, AdminProduct } from "@/services/adminProductService";
import qcCheckerService from "@/services/qcCheckerService";
import { formatCheckerName } from "@/lib/checkerUtils";

interface QCChecker {
  id: string;
  checkerId?: string;
  name: string;
  assignedVendors: number;
}

const BACK_URL = "/admin/dashboard/products/vendor-requests";

/**
 * Full-page QC-checker assignment for a PRODUCT. Mirrors the factory "Create QC
 * Assignment" page (CreateAssignment.tsx) field-for-field, but the product — and thus
 * its vendor — is fixed (it comes from the row the admin clicked), so the vendor is
 * shown read-only instead of being a picker. The schedule (vendor, date, time,
 * duration) is persisted on Product.qcAssignment.
 */
export default function AssignQCToProduct({ productId }: { productId: string }) {
  const router = useRouter();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [qcCheckers, setQcCheckers] = useState<QCChecker[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [formData, setFormData] = useState({
    checkerId: "",
    client: "",
    scheduledDate: "",
    scheduledTime: "",
    estimatedDuration: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [prodRes, checkersRes] = await Promise.all([
          adminProductService.getProduct(productId),
          qcCheckerService.getAllQCCheckers(),
        ]);
        if (prodRes.success && prodRes.data) {
          const p = prodRes.data;
          setProduct(p);
          const a = p.qcAssignment || {};
          // Prefill: existing assignment wins; else default the client to the vendor.
          setFormData({
            checkerId: p.assignedQcId || "",
            client: a.clientName || p.vendor?.companyName || "",
            scheduledDate: a.scheduledDate || "",
            scheduledTime: a.scheduledTime || "",
            estimatedDuration: a.estimatedDuration || "",
          });
        } else {
          setNotFound(true);
        }
        if (checkersRes.success) setQcCheckers(checkersRes.data);
      } catch (e) {
        console.error("Failed to load product assignment data:", e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [productId]);

  const isReassign = Boolean(product?.assignedQcId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.checkerId ||
      !formData.client ||
      !formData.scheduledDate ||
      !formData.scheduledTime ||
      !formData.estimatedDuration
    ) {
      showErrorToast("Incomplete Form", "Please fill in all required fields.");
      return;
    }
    try {
      setSaving(true);
      const checker = qcCheckers.find((c) => c.id === formData.checkerId);
      await adminProductService.assignQCChecker(productId, formData.checkerId, {
        clientName: formData.client,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        estimatedDuration: formData.estimatedDuration,
      });
      showSuccessToast(
        isReassign ? "QC Checker Reassigned!" : "QC Checker Assigned!",
        `${product?.name} scheduled for inspection with ${checker?.name || "the selected checker"}.`,
      );
      setTimeout(() => router.push(BACK_URL), 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to assign QC checker. Please try again.";
      showErrorToast("Assignment Failed", message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="p-6 text-center py-24 text-slate-500">
        <p>Product not found.</p>
        <Link href={BACK_URL} className="inline-flex items-center gap-2 mt-4 text-brand-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Vendor Requests
        </Link>
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 focus:outline-none transition-all";

  return (
    <div className="p-6">
      <Breadcrumb />

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={BACK_URL} className="text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isReassign ? "Reassign QC Checker" : "Create QC Assignment"}
          </h1>
          <p className="text-slate-500 mt-1">Schedule a quality control inspection for this product</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product & Inspector Details */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Product &amp; Inspector Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Product — fixed (from the row), shown read-only */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Product</label>
                    <div className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-medium truncate">
                      {product.name}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">SKU: {product.baseSku || "—"}</p>
                  </div>

                  {/* Vendor — fixed (the product's vendor), read-only */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Vendor</label>
                    <div className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-medium truncate">
                      {product.vendor?.companyName || "—"}
                    </div>
                  </div>

                  {/* QC Checker */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Select QC Checker <span className="text-red-500">*</span>
                    </label>
                    <Dropdown
                      value={formData.checkerId}
                      options={[
                        { value: "", label: "Choose a QC checker" },
                        ...qcCheckers.map((checker) => ({
                          value: checker.id,
                          label: `${formatCheckerName(checker)}${checker.checkerId ? ` · ${checker.checkerId}` : ""} (${checker.assignedVendors} vendor${checker.assignedVendors === 1 ? "" : "s"})`,
                        })),
                      ]}
                      onChange={(v) => setFormData((prev) => ({ ...prev, checkerId: v as string }))}
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
                      Vendor <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.client}
                      onChange={(e) => setFormData((prev) => ({ ...prev, client: e.target.value }))}
                      placeholder="Vendor name"
                      className={inputClass}
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
                      className={inputClass}
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
                      className={inputClass}
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
                      className={inputClass}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            {/* Product Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Product Information</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-slate-500">Product</p>
                    <p className="font-medium text-slate-900">{product.name}</p>
                    <p className="text-slate-500 text-xs mt-1">SKU: {product.baseSku || "—"}</p>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Factory className="h-4 w-4 text-slate-400" />
                    <span>{product.vendor?.companyName || "—"}</span>
                  </div>
                  {product.category && (
                    <div>
                      <p className="text-slate-500">Category</p>
                      <p className="font-medium text-slate-900">{product.category}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

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
                    <span className="text-slate-500">QC Checker Assigned</span>
                    {formData.checkerId ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-slate-300" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Client Set</span>
                    {formData.client ? (
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
                className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-60"
                disabled={saving}
              >
                <CheckCircle className="h-5 w-5" />
                {saving ? "Saving…" : isReassign ? "Reassign QC Checker" : "Create Assignment"}
              </button>
              <Link
                href={BACK_URL}
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
