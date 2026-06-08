"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, User, Mail, Phone, MapPin, Shield, FileText, ExternalLink,
  RefreshCw, Calendar, BadgeCheck,
} from "lucide-react";
import { Card, CardContent } from "../../UI/Card";
import { Breadcrumb } from "../Breadcrumb/Breadcrumb";
import { qcCheckerService, QCCheckerData } from "@/services/qcCheckerService";
import { showErrorToast } from "@/lib/toast-utils";

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <label className="block text-slate-500 font-medium mb-1.5 text-xs uppercase tracking-wide">{label}</label>
      <div className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 text-sm min-h-[46px] flex items-center">
        {value !== undefined && value !== null && value !== "" ? value : <span className="text-slate-400">—</span>}
      </div>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <Icon className="h-5 w-5 text-brand-500" />
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function formatDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN");
}

export default function QCCheckerDetail() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");

  const [checker, setChecker] = useState<QCCheckerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await qcCheckerService.getQCCheckerById(id);
        if (res.success) setChecker(res.data);
      } catch (error: any) {
        showErrorToast("Error", error.message || "Failed to load QC checker details");
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const statusStyle =
    checker?.status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : checker?.status === "SUSPENDED"
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-slate-100 text-slate-600 border-slate-200";

  const isPdfIdProof = checker?.idProof?.startsWith("data:application/pdf") || checker?.idProof?.toLowerCase().endsWith(".pdf");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Breadcrumb />

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push("/admin/dashboard/qc-checker")}
          className="text-slate-500 hover:text-brand-600 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">QC Checker Details</h1>
          <p className="text-slate-600 mt-1">Read-only view of the quality control checker profile.</p>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-3" />
          <p className="text-slate-500">Loading details...</p>
        </div>
      ) : !checker ? (
        <div className="p-16 text-center text-slate-500">QC checker not found.</div>
      ) : (
        <div className="space-y-6">
          {/* Identity banner */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="w-24 h-24 rounded-full border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                  {checker.profilePhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={checker.profilePhoto} alt={checker.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-bold text-slate-900">{checker.name}</h2>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg border text-xs font-semibold ${statusStyle}`}>
                      <BadgeCheck className="w-3.5 h-3.5" />{checker.status}
                    </span>
                  </div>
                  <div className="text-sm text-brand-600 font-mono mt-1">{checker.checkerId}</div>
                  <div className="flex items-center gap-4 text-sm text-slate-500 mt-2 flex-wrap">
                    <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{checker.email}</span>
                    <span className="flex items-center gap-1"><Phone className="w-4 h-4" />{checker.phone}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />Joined {formatDate(checker.joiningDate) || "—"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <SectionCard icon={Mail} title="Contact Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Email Address" value={checker.email} />
              <Field label="Phone Number" value={checker.phone} />
              <Field label="Alternate Email" value={checker.alternateEmail} />
              <Field label="Alternate Phone" value={checker.alternatePhone} />
            </div>
          </SectionCard>

          {/* Personal */}
          <SectionCard icon={User} title="Personal Information">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field label="Date of Birth" value={formatDate(checker.dateOfBirth)} />
              <Field label="Joining Date" value={formatDate(checker.joiningDate)} />
            </div>
          </SectionCard>

          {/* Address */}
          <SectionCard icon={MapPin} title="Address Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Street Address" value={checker.address} />
              <Field label="City" value={checker.city} />
              <Field label="State / Province" value={checker.state} />
              <Field label="ZIP / Postal Code" value={checker.zipCode} />
              <Field label="Country" value={checker.country} />
            </div>
          </SectionCard>

          {/* Professional */}
          <SectionCard icon={Shield} title="Professional Information">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field label="Specialization" value={checker.specialization} />
              <Field label="Years of Experience" value={checker.experience} />
            </div>
            <div className="mt-6">
              <Field label="Certifications" value={checker.certifications} />
            </div>
          </SectionCard>

          {/* Documents */}
          <SectionCard icon={FileText} title="ID Proof">
            <div>
              <label className="block text-slate-500 font-medium mb-1.5 text-xs uppercase tracking-wide">ID Proof</label>
              {checker.idProof ? (
                <a
                  href={checker.idProof}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-brand-700 bg-brand-50 border border-brand-200 rounded-xl hover:bg-brand-100 transition-colors"
                >
                  <FileText className="w-4 h-4" /> View ID Proof{isPdfIdProof ? " (PDF)" : ""} <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <div className="px-4 py-3 border border-dashed border-slate-200 rounded-xl text-sm text-slate-400">No ID proof uploaded</div>
              )}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
