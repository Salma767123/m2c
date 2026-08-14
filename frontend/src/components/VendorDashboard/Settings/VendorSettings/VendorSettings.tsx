"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Building2,
  Mail,
  MapPin,
  Factory,
  Phone,
  Globe,
  Package,
  Warehouse,
  Award,
  FileText,
  Loader2,
  UserCircle,
  Image as ImageIcon,
  Download,
  Eye,
  RotateCw,
  Map as MapIcon,
  Truck,
  Briefcase,
  Lock,
  Pencil,
  Plus,
  Save,
  X,
  Upload,
} from "lucide-react";
import VendorService, { VendorProfile } from "@/services/vendorService";
import { categoryService } from "@/services/categoryService";
import { buildFullName, toExternalUrl } from "@/lib/utils";
import ResultModal from "@/components/UI/ResultModal";
import { PhoneInput, LocalLandlineInput, getLandlineDisplay } from "@/components/VendorHub/FormUI";
import { downloadDoc, isDocImageUrl } from "@/lib/docDownload";
import { openDoc } from "@/lib/docViewerBus";
import { formatSqFt } from "@/lib/units";

// A certificate may only be edited/replaced when it is expired or within this
// many days of expiring. Valid certs (and certs with no expiry) stay locked.
// Keep this in sync with CERT_EXPIRY_THRESHOLD_DAYS in vendorSettingsController.js.
const CERT_EXPIRY_THRESHOLD_DAYS = 30;

const isCertificateEditable = (expiryDate?: string | null): boolean => {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  if (isNaN(expiry.getTime())) return false;
  const daysUntilExpiry = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry <= CERT_EXPIRY_THRESHOLD_DAYS;
};

const isImageUrl = isDocImageUrl;

// Only allow http(s) URLs to prevent javascript:/data: XSS injection via
// vendor-supplied links. Delegates to the shared normalizer, which also
// prepends https:// for scheme-less values ("www.company.com") so they
// stay clickable instead of resolving as relative paths.
const safeExternalUrl = toExternalUrl;

function formatDate(input?: string | Date | null): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatAddressHelper(...parts: Array<string | null | undefined>): string | null {
  const joined = parts
    .map((p) => (p ?? "").toString().trim())
    .filter(Boolean)
    .join(", ");
  return joined.length > 0 ? joined : null;
}

const getEmployeeCountLabel = (count: string): string => {
  const labels: Record<string, string> = {
    "10-20": "10-20 employees",
    "20-50": "20-50 employees",
    "50-100": "50-100 employees",
    "100+": "100+ employees",
  };
  return labels[count] || count;
};

const getOwnershipTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    owned: "Owned",
    rented: "Rented",
    lease: "Lease",
  };
  return labels[type] || type;
};

const getBusinessTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    proprietorship: "Proprietorship",
    "pvt-ltd": "Pvt Ltd",
    "partnership-firm": "Partnership Firm",
    llp: "LLP",
    unregistered: "Unregistered Vendor",
    sole: "Sole Proprietorship",
    partnership: "Partnership",
    corporation: "Corporation",
    llc: "Limited Liability Company (LLC)",
  };
  return labels[type] || type;
};

const getCompanyIdLabel = (businessType?: string): string => {
  const labels: Record<string, string> = {
    proprietorship: "IEC Code",
    "pvt-ltd": "CIN Number",
    "partnership-firm": "Partnership Deed",
    llp: "LLPIN Number",
  };
  return labels[businessType || ""] || "Business Registration ID";
};

const getCertificateStatus = (expiryDate: string) => {
  if (!expiryDate) return null;
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilExpiry < 0) {
    return { message: "Expired", color: "text-red-700 bg-red-50 border border-red-200/50" };
  } else if (daysUntilExpiry <= 30) {
    return { message: `Expires in ${daysUntilExpiry} days`, color: "text-amber-700 bg-amber-50 border border-amber-200/50 font-medium" };
  } else if (daysUntilExpiry <= 90) {
    return { message: `Expires in ${daysUntilExpiry} days`, color: "text-yellow-700 bg-yellow-50 border border-yellow-200/50 font-medium" };
  }
  return { message: `Valid until ${expiry.toLocaleDateString()}`, color: "text-emerald-700 bg-emerald-50 border border-emerald-200/50 font-medium" };
};

function composeContactName(c: any): string {
  if (!c) return "";
  if (c.name) return c.name.toString().trim();
  return [c.firstName, c.middleName, c.lastName].map((p) => (p ?? "").toString().trim()).filter(Boolean).join(" ");
}

const hasData = (val: any) => {
  if (val === null || val === undefined || val === "") return false;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "object") return Object.keys(val).length > 0;
  return true;
};

interface ResolvedField {
  label: string;
  value: any;
  type?: string;
}

// Build a resolved field or null if the underlying value is empty.
const mk = (
  label: string,
  raw: any,
  opts?: { type?: string; transform?: (x: any) => any }
): ResolvedField | null => {
  if (!hasData(raw)) return null;
  const value = opts?.transform ? opts.transform(raw) : raw;
  return { label, value, type: opts?.type };
};

const compact = (arr: Array<ResolvedField | null>): ResolvedField[] =>
  arr.filter(Boolean) as ResolvedField[];

// Resolve a person's landline fields (main owner or additional owner) into
// display strings that include the country code. Handles both the split shape
// (std + number) and the concatenated `localLandline` / legacy `landline`
// values stored at registration. Local landlines are domestic → default +91.
const resolveLandline = (parts: {
  std?: string | null;
  number?: string | null;
  concat?: string | null;
  intl?: string | null;
  legacy?: string | null;
}) => {
  const std = (parts.std || "").trim();
  let number = (parts.number || "").trim();
  if (!number) {
    const raw = (parts.concat || "").trim();
    number = std && raw.startsWith(std) ? raw.slice(std.length) : raw;
  }
  return getLandlineDisplay({
    localLandlineCountryCode: "+91",
    localLandlineStd: std,
    localLandline: number,
    intlLandline: parts.intl,
    landline: parts.legacy,
  });
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="min-w-0">
      <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5 block">{label}</label>
      <p className="text-sm font-semibold text-slate-900 leading-snug break-words">{value.toString()}</p>
    </div>
  );
}

// A structured address block — keeps the address on tidy lines inside a card
// instead of one long comma-joined string that wraps unpredictably.
function AddressCard({
  line1,
  line2,
  line3,
  landmark,
  city,
  state,
  country,
  zip,
}: {
  line1?: string | null;
  line2?: string | null;
  line3?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip?: string | null;
}) {
  const clean = (s?: string | null) => (s ?? "").toString().trim();
  const midLine = [line2, line3, landmark].map(clean).filter(Boolean).join(", ");
  const cityLine = [city, state, country, zip].map(clean).filter(Boolean).join(", ");
  if (!clean(line1) && !midLine && !cityLine) return null;
  return (
    <div className="flex items-start gap-3 bg-slate-50/70 border border-slate-200 rounded-xl p-4 max-w-2xl">
      <MapPin className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
      <div className="space-y-0.5 text-sm min-w-0">
        {clean(line1) && <p className="font-semibold text-slate-900">{clean(line1)}</p>}
        {midLine && <p className="text-slate-600">{midLine}</p>}
        {cityLine && <p className="text-slate-700 font-medium">{cityLine}</p>}
      </div>
    </div>
  );
}

function FieldValue({ field }: { field: ResolvedField }) {
  if (field.type === "list" && Array.isArray(field.value)) {
    return (
      <div className="flex flex-wrap gap-1.5 mt-1">
        {field.value.map((item: any, idx: number) => (
          <span key={idx} className="px-2.5 py-0.5 bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-200">
            {item}
          </span>
        ))}
      </div>
    );
  }
  if (field.type === "badge") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-100 capitalize mt-1">
        {field.value.toString().replace(/_/g, " ").toLowerCase()}
      </span>
    );
  }
  if (field.type === "url") {
    const url = safeExternalUrl(field.value);
    return url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-700 hover:underline font-bold flex items-center gap-1 mt-1 break-all">
        <Globe className="w-4 h-4 shrink-0" /> {field.value}
      </a>
    ) : (
      <span className="text-slate-700 font-semibold flex items-center gap-1 mt-1 break-all">
        <Globe className="w-4 h-4 shrink-0 text-slate-400" /> {field.value}
      </span>
    );
  }
  if (field.type === "date") {
    return <span className="text-slate-800 font-semibold">{formatDate(field.value)}</span>;
  }
  return <span className="text-slate-800 font-semibold">{field.value.toString()}</span>;
}

function FieldsGrid({ items }: { items: ResolvedField[] }) {
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 items-start">
      {items.map((field) => {
        // List/url values can be long — let them span the full row so they
        // never get squeezed into a narrow column and wrap awkwardly.
        const wide = field.type === "list" || field.type === "url";
        return (
          <div key={field.label} className={`min-w-0 ${wide ? "sm:col-span-2 lg:col-span-3" : ""}`}>
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5 block">{field.label}</label>
            <div className="text-sm font-semibold text-slate-900 leading-snug break-words">
              <FieldValue field={field} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// A titled sub-section inside a section card (mirrors the registration form's
// accordion sub-sections, e.g. "Business Profile", "Contact & Communication").
function SubSection({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 border-l-2 border-brand-500 pl-2.5">
        {icon && <span className="text-brand-500">{icon}</span>}
        <h4 className="text-[15px] font-bold text-slate-900 tracking-tight">{title}</h4>
        {description && <span className="text-xs text-slate-400 hidden md:inline">· {description}</span>}
      </div>
      {children}
    </div>
  );
}

// Body of a tab panel — groups the section's sub-sections with dividers.
// Equal padding on both sides of every divider keeps the spacing above and
// below each section heading symmetric (24px each side); the panel edges are
// trimmed so the first/last section sit flush.
function SectionBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-slate-100 [&>*]:py-6 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">{children}</div>
  );
}

// A heading shown above grouped content inside a tab panel.
function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">{children}</h5>
  );
}

function ImageStrip({
  heading,
  icon,
  items,
}: {
  heading: string;
  icon: React.ReactNode;
  items: Array<{ label: string; url: string }>;
}) {
  return (
    <div>
      <SubHeading>{icon} {heading}</SubHeading>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
        {items.map((m, i) => (
          <button key={`${m.label}-${i}`} type="button" onClick={() => openDoc(m.url, m.label)} className="group block" title={m.label}>
            <img
              src={m.url}
              alt={m.label}
              className="w-full aspect-square object-cover rounded-lg border border-slate-200 group-hover:border-brand-300 transition-colors"
            />
            <p className="text-[10px] font-medium text-slate-500 mt-1 text-center truncate" title={m.label}>{m.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function DocsGrid({ heading, docs }: { heading: string; docs: any[] }) {
  return (
    <div>
      <SubHeading><FileText className="w-3.5 h-3.5 text-slate-400" /> {heading} ({docs.length})</SubHeading>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {docs.map((doc: any, idx: number) => {
          const typeLabel = (doc.type || "DOCUMENT").toString().replace(/_/g, " ");
          const uploaded = formatDate(doc.uploadedAt || doc.createdAt);
          const isImg = isImageUrl(doc.documentUrl, doc.name);
          return (
            <div key={doc.id || idx} className="flex items-center gap-3 p-2.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors">
              {isImg ? (
                <img src={doc.documentUrl} alt={doc.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" loading="lazy" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-500 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate" title={doc.name}>{doc.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold uppercase tracking-wide">{typeLabel}</span>
                  {uploaded && <span className="text-[10px] text-slate-400 truncate">{uploaded}</span>}
                </div>
              </div>
              {doc.documentUrl && (
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => openDoc(doc.documentUrl, doc.name)} className="inline-flex items-center gap-1 h-7 px-2 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
                    <Eye className="w-3 h-3" /> View
                  </button>
                  <button type="button" onClick={() => downloadDoc(doc.documentUrl, doc.name)} className="inline-flex items-center gap-1 h-7 px-2 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
                    <Download className="w-3 h-3" /> Download
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type SaveResult = { type: "success" | "error"; text: string };

function EditInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 block">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm font-medium text-slate-900 border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
      />
    </div>
  );
}

// A read-only field rendered inside an edit form, with a lock affordance so the
// vendor understands it can't be changed (used for primary email/phone).
function LockedField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
        {label} <Lock className="w-3 h-3 text-slate-400" />
      </label>
      <div className="w-full text-sm font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 cursor-not-allowed select-none">
        {value || "—"}
      </div>
    </div>
  );
}

// Main Contact Person — editable except for the primary email/phone, which are
// locked read-only per requirements.
function MainContactSection({
  mc,
  onResult,
  onReload,
}: {
  mc: any;
  onResult: (r: SaveResult) => void;
  onReload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  const primaryEmail = mc.email1 || mc.email || "";
  const primaryPhone = mc.phone1 || mc.phone || "";
  const mcName = composeContactName(mc);

  const startEdit = () => {
    setForm({
      name: mc.name || mcName || "",
      designation: mc.customDesignation || mc.designation || "",
      department: mc.customDepartment || mc.department || "",
      email2: mc.email2 || "",
      phone2: mc.phone2 || "",
      // New split landline fields. For legacy records that only have the old
      // single `landline`, carry it into the local number so it isn't lost.
      localLandlineCountryCode: mc.localLandlineCountryCode || "+91",
      localLandlineStd: mc.localLandlineStd || "",
      localLandline: mc.localLandline || (mc.localLandlineStd ? "" : mc.landline) || "",
      intlLandline: mc.intlLandline || "",
    });
    setEditing(true);
  };

  const set = (k: string) => (val: string) => setForm((f: any) => ({ ...f, [k]: val }));

  const save = async () => {
    setSaving(true);
    try {
      // Merge edits onto the existing contact, but force the locked primary
      // email/phone to keep their original values regardless of any tampering.
      const merged = {
        ...mc,
        name: form.name,
        designation: form.designation,
        department: form.department,
        email2: form.email2,
        phone2: form.phone2,
        localLandlineCountryCode: form.localLandlineCountryCode || "+91",
        localLandlineStd: form.localLandlineStd || "",
        localLandline: form.localLandline || "",
        intlLandline: form.intlLandline || "",
        // Legacy single landline is superseded once a local landline is set.
        landline: form.localLandline ? "" : (mc.landline || ""),
        email1: mc.email1,
        email: mc.email,
        phone1: mc.phone1,
        phone: mc.phone,
      };
      await VendorService.updateVendorProfile({ mainContact: merged } as any);
      await onReload();
      onResult({ type: "success", text: "Main contact updated successfully." });
      setEditing(false);
    } catch (e: any) {
      onResult({ type: "error", text: e?.message || "Failed to update main contact." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SubSection
      title="Contact Person (Main)"
      icon={<UserCircle className="w-4 h-4" />}
    >
      <div className="space-y-4">
        <div className="flex justify-end -mt-8">
          {!editing ? (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 px-2.5 py-1 rounded-lg hover:bg-brand-50 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(false)}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
              </button>
            </div>
          )}
        </div>

        {mc.photo && (
          <ImageStrip heading="Profile Photo" icon={<ImageIcon className="w-4 h-4 text-slate-400" />} items={[{ label: mcName || "Contact Photo", url: mc.photo }]} />
        )}

        {!editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
            {mcName && <Field label="Main Contact Name" value={mcName} />}
            {mc.designation && <Field label="Designation" value={mc.designation} />}
            {mc.designation === 'Others' && mc.customDesignation && (
              <Field label="Custom Designation" value={mc.customDesignation} />
            )}
            {mc.department && <Field label="Department" value={mc.department} />}
            {mc.department === 'Others' && mc.customDepartment && (
              <Field label="Custom Department" value={mc.customDepartment} />
            )}
            {primaryEmail && <Field label="Primary Email" value={primaryEmail} />}
            {mc.email2 && <Field label="Secondary Email" value={mc.email2} />}
            {primaryPhone && <Field label="Primary Phone" value={primaryPhone} />}
            {mc.phone2 && <Field label="Secondary Phone" value={mc.phone2} />}
            {(() => {
              const ll = getLandlineDisplay(mc);
              return (
                <>
                  {ll.local && <Field label="Local Landline Number" value={ll.local} />}
                  {ll.intl && <Field label="International Landline Number" value={ll.intl} />}
                  {!ll.hasNew && ll.legacy && <Field label="Landline" value={ll.legacy} />}
                </>
              );
            })()}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
            <EditInput label="Name" value={form.name} onChange={set("name")} />
            <EditInput label="Designation" value={form.designation} onChange={set("designation")} />
            <EditInput label="Department" value={form.department} onChange={set("department")} />
            <LockedField label="Primary Email" value={primaryEmail} />
            <EditInput label="Secondary Email" type="email" value={form.email2} onChange={set("email2")} />
            <LockedField label="Primary Phone" value={primaryPhone} />
            <EditInput label="Secondary Phone" value={form.phone2} onChange={set("phone2")} />
            <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 block">
                  Local Landline
                </label>
                <LocalLandlineInput
                  value={{
                    countryCode: form.localLandlineCountryCode || "+91",
                    std: form.localLandlineStd || "",
                    number: form.localLandline || "",
                  }}
                  onChange={(v) =>
                    setForm((f: any) => ({
                      ...f,
                      localLandlineCountryCode: v.countryCode,
                      localLandlineStd: v.std,
                      localLandline: v.number,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 block">
                  International Landline
                </label>
                <PhoneInput
                  value={form.intlLandline || ""}
                  onChange={(v) => setForm((f: any) => ({ ...f, intlLandline: v }))}
                  placeholder="44 2817 5000"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </SubSection>
  );
}

// One editable certificate row form (used for both editing an existing cert and
// adding a new one).
function CertForm({
  initial,
  saving,
  requireFile,
  onCancel,
  onSubmit,
}: {
  initial: { name: string; issuedBy: string; certificateNumber: string; issuedDate: string; expiryDate: string };
  saving: boolean;
  requireFile?: boolean;
  onCancel: () => void;
  onSubmit: (data: typeof initial, file: File | null) => void;
}) {
  const [form, setForm] = useState(initial);
  const [file, setFile] = useState<File | null>(null);
  const set = (k: keyof typeof initial) => (val: string) => setForm((f) => ({ ...f, [k]: val }));
  const canSubmit = form.name.trim() && form.issuedBy.trim() && (!requireFile || file);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
        <EditInput label="Certificate Name" required value={form.name} onChange={set("name")} />
        <EditInput label="Issued By" required value={form.issuedBy} onChange={set("issuedBy")} />
        <EditInput label="Certificate Number" value={form.certificateNumber} onChange={set("certificateNumber")} />
        <EditInput label="Issued Date" type="date" value={form.issuedDate} onChange={set("issuedDate")} />
        <EditInput label="Expiry Date" type="date" value={form.expiryDate} onChange={set("expiryDate")} />
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
            {requireFile ? "Certificate File" : "Replace File"}{requireFile && <span className="text-red-500">*</span>}
          </label>
          <label
            tabIndex={0}
            role="button"
            aria-label="Choose certificate file"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.currentTarget.click();
              }
            }}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 border border-dashed border-slate-300 rounded-lg px-3 py-1.5 cursor-pointer hover:border-brand-400 hover:bg-brand-50/40 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 focus-visible:border-brand-500"
          >
            <Upload className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{file ? file.name : "Choose file…"}</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
        <button
          onClick={() => canSubmit && onSubmit(form, file)}
          disabled={saving || !canSubmit}
          className="flex items-center gap-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
        </button>
      </div>
    </div>
  );
}

// Certifications — existing valid certs are locked; expired/near-expiry certs
// can be edited/replaced; new certs can always be added without touching
// existing ones.
function CertificationsSection({
  certs,
  onResult,
  onReload,
}: {
  certs: any[];
  onResult: (r: SaveResult) => void;
  onReload: () => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toIsoDateInput = (d?: string | null) => {
    if (!d) return "";
    const date = new Date(d);
    return isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  };

  const handleAdd = async (data: any, file: File | null) => {
    setSaving(true);
    try {
      await VendorService.addVendorCertification(
        {
          name: data.name,
          issuedBy: data.issuedBy,
          certificateNumber: data.certificateNumber || undefined,
          issuedDate: data.issuedDate || undefined,
          expiryDate: data.expiryDate || undefined,
        } as any,
        file ?? undefined
      );
      await onReload();
      onResult({ type: "success", text: "Certificate added successfully." });
      setAdding(false);
    } catch (e: any) {
      onResult({ type: "error", text: e?.response?.data?.error || e?.message || "Failed to add certificate." });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, data: any, file: File | null) => {
    setSaving(true);
    try {
      await VendorService.updateVendorCertification(
        id,
        {
          name: data.name,
          issuedBy: data.issuedBy,
          certificateNumber: data.certificateNumber || undefined,
          issuedDate: data.issuedDate || undefined,
          expiryDate: data.expiryDate || undefined,
        },
        file ?? undefined
      );
      await onReload();
      onResult({ type: "success", text: "Certificate updated successfully." });
      setEditingId(null);
    } catch (e: any) {
      onResult({ type: "error", text: e?.response?.data?.error || e?.message || "Failed to update certificate." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SubSection title={`Available Certifications (${certs.length})`} icon={<Award className="w-4 h-4" />}>
      <div className="space-y-4">
        <div className="flex justify-end -mt-8">
          {!adding && (
            <button
              onClick={() => { setAdding(true); setEditingId(null); }}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Certificate
            </button>
          )}
        </div>

        {adding && (
          <div className="bg-brand-50/40 border border-brand-200/70 rounded-xl p-4">
            <p className="text-sm font-bold text-slate-800 mb-3">New Certificate</p>
            <CertForm
              initial={{ name: "", issuedBy: "", certificateNumber: "", issuedDate: "", expiryDate: "" }}
              saving={saving}
              requireFile
              onCancel={() => setAdding(false)}
              onSubmit={handleAdd}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {certs.map((cert: any, idx: number) => {
            const editable = isCertificateEditable(cert.expiryDate);
            const status = cert.expiryDate ? getCertificateStatus(cert.expiryDate) : null;
            const isEditing = editingId === cert.id;
            return (
              <div key={cert.id || idx} className={`bg-slate-50/50 border rounded-xl p-4 space-y-3 ${isEditing ? "border-brand-300 md:col-span-2 lg:col-span-3" : "border-slate-200/80"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 bg-brand-50 text-brand-700 border border-brand-100 rounded text-xs font-bold">
                    {cert.name}
                  </span>
                  {!isEditing && (
                    editable ? (
                      <button
                        onClick={() => { setEditingId(cert.id); setAdding(false); }}
                        className="shrink-0 flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 px-2 py-0.5 rounded-lg hover:bg-amber-50 transition-colors"
                        title="This certificate is expired or nearing expiry and can be replaced"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit / Replace
                      </button>
                    ) : (
                      <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-slate-400" title="Valid certificates cannot be modified">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    )
                  )}
                </div>

                {isEditing ? (
                  <CertForm
                    initial={{
                      name: cert.name || "",
                      issuedBy: cert.issuedBy || "",
                      certificateNumber: cert.certificateNumber || "",
                      issuedDate: toIsoDateInput(cert.issuedDate),
                      expiryDate: toIsoDateInput(cert.expiryDate),
                    }}
                    saving={saving}
                    onCancel={() => setEditingId(null)}
                    onSubmit={(data, file) => handleUpdate(cert.id, data, file)}
                  />
                ) : (
                  <>
                    {cert.documentUrl && (
                      <button type="button" onClick={() => downloadDoc(cert.documentUrl, cert.name)} className="text-xs text-brand-600 hover:text-brand-700 hover:underline font-bold flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    )}
                    {cert.issuedBy && <Field label="Issued By" value={cert.issuedBy} />}
                    {cert.certificateNumber && <Field label="Certificate #" value={cert.certificateNumber} />}
                    {cert.expiryDate ? (
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Expiry Date</label>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-semibold text-slate-800">{formatDate(cert.expiryDate)}</span>
                          {status && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${status.color}`}>{status.message}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No expiry date set</p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </SubSection>
  );
}

export default function VendorSettings() {
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("company");
  const [result, setResult] = useState<SaveResult | null>(null);
  const [categoryNameMap, setCategoryNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    loadVendorProfile();
  }, []);

  useEffect(() => {
    categoryService.getCategoryTree({ status: "ACTIVE", includeInactive: false })
      .then((res: any) => {
        const map: Record<string, string> = {};
        (res.data || []).forEach((cat: any) => { map[cat.id] = cat.name; });
        setCategoryNameMap(map);
      })
      .catch(() => {});
  }, []);

  const loadVendorProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await VendorService.getVendorProfile();
      setVendor(response.vendor);
    } catch (err: any) {
      console.error("Failed to load vendor profile:", err);
      setError(err?.message || "Failed to load vendor profile");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-brand-500" />
          <p className="text-slate-600">Loading vendor profile...</p>
        </div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Vendor Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Your registered business profile</p>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-6 flex items-center justify-between gap-4 flex-wrap">
          <span>{error || "Failed to load vendor profile"}</span>
          <button
            onClick={loadVendorProfile}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            <RotateCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const v: any = vendor;

  // ----- Documents (split the flat documents array the same way registration groups them) -----
  const allDocs: any[] = Array.isArray(v.documents) ? v.documents : [];
  const COMPANY_DOC_TYPES = ["GST_CERTIFICATE", "PAN_CARD", "COMPANY_REGISTRATION", "AADHAAR_CARD"];
  const companyDocs = allDocs.filter((d) => COMPANY_DOC_TYPES.includes(d.type));
  const otherDocs = allDocs.filter((d) => !COMPANY_DOC_TYPES.includes(d.type) && d.type !== "OTHER");
  const registrationDocs = [...companyDocs, ...otherDocs];
  const factoryImages = allDocs
    .filter((d) => d.type === "OTHER")
    .map((d) => ({ label: d.name || "Factory Image", url: d.documentUrl }));
  // "Factory Site …" photos belong to the Legal Address & Factory Site;
  // everything else is a Warehouse photo. Shown under separate headings.
  const factorySiteImages = factoryImages.filter((m) => (m.label || "").startsWith("Factory Site"));
  const warehouseImages = factoryImages.filter((m) => !(m.label || "").startsWith("Factory Site"));

  // ----- Product photos collected from category products -----
  const productPhotos: Array<{ label: string; url: string }> = [];
  const collectProducts = (catLabel: string, products: any[]) => {
    (Array.isArray(products) ? products : []).forEach((p: any, i: number) => {
      (Array.isArray(p?.photos) ? p.photos : []).forEach((ph: any) => {
        const url = ph?.url || ph?.preview;
        const prodName = p?.name || `Product ${i + 1}`;
        if (url) productPhotos.push({ label: catLabel ? `${catLabel} · ${prodName}` : prodName, url });
      });
    });
  };
  if (v.categoryProducts && typeof v.categoryProducts === "object") {
    Object.entries(v.categoryProducts).forEach(([catId, products]: [string, any]) => collectProducts(categoryNameMap[catId] || "", products));
  }
  if (Array.isArray(v.additionalCategories)) {
    v.additionalCategories.forEach((cat: any) => collectProducts(cat?.name || "Custom Category", cat?.products));
  }

  // ===================================================================
  // SECTION 1 — COMPANY DETAILS
  // ===================================================================
  const businessProfile = compact([
    mk("Business Type", v.businessType, { transform: getBusinessTypeLabel }),
    v.hasImportExport ? mk("Import/Export Activities", v.hasImportExport === 'yes' ? 'Yes' : v.hasImportExport === 'no' ? 'No' : v.hasImportExport) : null,
    mk("Company Name", v.companyName),
    mk("GST Number", v.gstNumber),
    mk(getCompanyIdLabel(v.businessType), v.companyIdNumber),
    v.hasImportExport !== 'no' ? mk("IEC Code", v.iecCode) : null,
    mk(v.businessType === 'proprietorship' ? 'Proprietor PAN Number' : 'Company PAN Number', v.panNumber),
    mk("Aadhaar Number", v.aadhaarNumber),
    mk("Website", v.website, { type: "url" }),
  ]);
  const companyContact = compact([
    mk("Primary Email", v.businessEmail),
    mk("Secondary Email", v.businessEmail2),
    mk("Primary Phone", v.businessPhone),
    mk("Secondary Phone", v.phoneNumber2),
    mk("Local Landline Number", v.landlineNumber),
  ]);
  const companyAddress = compact([
    mk(
      "Business Address",
      formatAddressHelper(
        v.businessAddress,
        v.addressLine2,
        v.addressLine3,
        v.landmark,
        v.businessCity,
        v.businessState,
        v.businessZipCode,
        v.businessCountry
      )
    ),
    mk("Factory Ownership Type", v.factoryOwnershipType, { transform: getOwnershipTypeLabel }),
  ]);
  const hasCompanyDocs = !!v.companyLogo || registrationDocs.length > 0;
  const showCompany =
    businessProfile.length || companyContact.length || companyAddress.length || hasCompanyDocs;

  // ===================================================================
  // SECTION 2 — WAREHOUSE DETAILS
  // ===================================================================
  const warehouseOwnership = compact([
    mk("Ownership Type", v.ownershipType, { transform: getOwnershipTypeLabel }),
    mk("Warehousing Capacity", formatSqFt(v.warehouseSize || v.storageCapacity)),
    // Which address QC checkers inspect your products at (location-verified there).
    mk("Product Inspection Site", String((v as any).productInspectionSite).toUpperCase() === 'WAREHOUSE' ? 'Warehouse address' : 'Legal / Factory address'),
  ]);
  const warehouseAddress = compact([
    mk(
      "Warehouse Address",
      formatAddressHelper(
        v.warehouseAddress,
        v.warehouseAddressLine2,
        v.warehouseAddressLine3,
        v.warehouseLandmark,
        v.warehouseCity,
        v.warehouseState,
        v.warehouseZipCode,
        v.warehouseCountry
      )
    ),
  ]);
  const locationMap = compact([mk("Google Maps Link", v.mapLink, { type: "url" })]);
  const showWarehouse =
    warehouseOwnership.length || warehouseAddress.length || factoryImages.length || locationMap.length;

  // ===================================================================
  // SECTION 3 — OWNER PROFILE
  // ===================================================================
  const ownerIdentity = compact([
    mk("Designation", v.designation),
    v.designation === 'Others' && v.customDesignation ? mk("Custom Designation", v.customDesignation) : null,
    mk("Owner Name", buildFullName(v.ownerTitle, v.ownerFirstName, v.ownerMiddleName, v.ownerLastName, v.ownerName)),
  ]);
  const ownerLandline = resolveLandline({
    std: v.ownerLocalLandlineStd,
    number: v.ownerLocalLandlineNumber,
    concat: v.ownerLandline,
    intl: v.ownerIntlLandline,
    legacy: v.ownerLandline,
  });
  const ownerContact = compact([
    mk("Primary Email", v.ownerEmail),
    mk("Secondary Email", v.ownerEmail2),
    mk("Primary Phone", v.ownerPhone),
    mk("Secondary Phone", v.ownerPhone2),
    mk("Local Landline Number", ownerLandline.local || (!ownerLandline.hasNew ? ownerLandline.legacy : "")),
    mk("International Landline Number", ownerLandline.intl),
  ]);
  const businessHistory = compact([
    mk("Start Business Date", v.businessStartDate, { type: "date" }),
  ]);
  const companySize = compact([
    mk("Number of Employees", v.employeeCount, { transform: getEmployeeCountLabel }),
  ]);
  const additionalOwners: any[] = Array.isArray(v.additionalOwners) ? v.additionalOwners : [];
  const showOwner =
    ownerIdentity.length ||
    !!v.ownerPhoto ||
    ownerContact.length ||
    additionalOwners.length ||
    businessHistory.length ||
    companySize.length;

  // ===================================================================
  // SECTION 4 — VENDOR TYPE & PRODUCTS
  // ===================================================================
  const vendorTypeFields = compact([
    mk("Vendor Type", v.vendorTypes, { type: "list" }) ||
      mk("Vendor Type", v.vendorType, { type: "badge" }),
  ]);
  const marketFocus = compact([mk("Market Focus", v.primaryMarkets, { type: "list" })]);
  const productOfferings = compact([
    mk("Product Categories", v.productCategories, { type: "list" }),
    mk("Product Types", v.productTypes, { type: "list" }),
  ]);
  const additionalCategories = compact([mk("Category Remarks", v.categoryRemarks)]);
  const showProducts =
    vendorTypeFields.length ||
    marketFocus.length ||
    productOfferings.length ||
    productPhotos.length ||
    additionalCategories.length;

  // ===================================================================
  // SECTION 5 — MANUFACTURING FACILITIES
  // ===================================================================
  const facilityLabelMap: Record<string, string> = {
    spinning: "Spinning",
    weaving: "Weaving",
    dyeing: "Dyeing",
    printing: "Printing",
    stitching: "Stitching",
    finishing: "Finishing",
    packing: "Final Packing & Dispatch",
  };
  const enabledFacilities = v.enabledFacilities || {};
  const facilityDetails = v.facilityDetails || {};
  const enabledFacilityList: string[] = [];
  for (const [fac, enabled] of Object.entries(enabledFacilities)) {
    if (enabled) enabledFacilityList.push(facilityLabelMap[fac] || fac);
  }
  const showFacilities = enabledFacilityList.length > 0 || Object.keys(facilityDetails).length > 0;

  // ===================================================================
  // SECTION 6 — CERTIFICATIONS & LOGISTICS
  // ===================================================================
  const certs: any[] = Array.isArray(v.certifications) ? v.certifications : [];
  const qualityControl = compact([
    mk("Quality Control Process", v.qualityControl),
    mk("Compliance Standards", v.complianceStandards),
  ]);
  const logistics = compact([
    mk("Packaging Capabilities", v.packagingCapabilities),
    mk("Logistics Partners", v.logisticsPartners),
    mk("Shipping Methods", v.shippingMethods, { type: "list" }),
  ]);

  // ===================================================================
  // SECTION 7 — CONTACT & TRADE INFORMATION
  // ===================================================================
  const mc = v.mainContact;
  const hasMainContact = mc && typeof mc === "object" && Object.keys(mc).length > 0;
  const alternateContacts: any[] = Array.isArray(v.alternateContacts) ? v.alternateContacts : [];
  const tradeFlow = compact([
    v.hasImportExport ? mk("Import/Export Activities", v.hasImportExport === 'yes' ? 'Yes' : v.hasImportExport === 'no' ? 'No' : v.hasImportExport) : null,
    mk("Import Experience", v.importExperience, { transform: (x: boolean) => (x ? "Yes" : "No") }),
    mk("Export Experience", v.exportExperience, { transform: (x: boolean) => (x ? "Yes" : "No") }),
    mk("Import Countries", v.importCountries, { type: "list" }),
    mk("Export Countries", v.exportCountries, { type: "list" }),
  ]);
  const tradeIds = compact([
    mk("Trade License Number", v.tradeLicenseNumber),
    mk("Business Registration Number", v.businessRegistrationNumber),
    mk("Tax Identification Number", v.taxIdentificationNumber),
  ]);
  const showContact =
    hasMainContact || alternateContacts.length || tradeFlow.length || tradeIds.length;

  const renderContactCard = (contact: any, idx: number) => {
    const cName = composeContactName(contact);
    return (
      <div key={idx} className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          {contact.photo ? (
            <button type="button" onClick={() => openDoc(contact.photo, cName || `Contact ${idx + 1}`)} className="shrink-0">
              <img src={contact.photo} alt={cName || `Contact ${idx + 1}`} className="h-10 w-10 rounded-full object-cover border border-slate-200" />
            </button>
          ) : (
            <div className="h-10 w-10 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
              <UserCircle className="h-5 w-5 text-brand-500" />
            </div>
          )}
          <p className="text-sm font-bold text-slate-800">{cName || `Contact ${idx + 1}`}</p>
        </div>
        {contact.designation && <Field label="Designation" value={contact.designation} />}
        {contact.designation === 'Others' && contact.customDesignation && (
          <Field label="Custom Designation" value={contact.customDesignation} />
        )}
        {contact.department && <Field label="Department" value={contact.department} />}
        {contact.department === 'Others' && contact.customDepartment && (
          <Field label="Custom Department" value={contact.customDepartment} />
        )}
        {(contact.email1 || contact.email) && <Field label="Primary Email" value={contact.email1 || contact.email} />}
        {contact.email2 && <Field label="Secondary Email" value={contact.email2} />}
        {(contact.phone1 || contact.phone) && <Field label="Primary Phone" value={contact.phone1 || contact.phone} />}
        {contact.phone2 && <Field label="Secondary Phone" value={contact.phone2} />}
        {contact.landline && <Field label="Landline" value={contact.landline} />}
      </div>
    );
  };

  const tabs = [
    { id: "company", title: "Company Details", icon: Building2, available: !!showCompany },
    { id: "warehouse", title: "Warehouse Details", icon: Warehouse, available: !!showWarehouse },
    { id: "owner", title: "Owner Profile", icon: UserCircle, available: !!showOwner },
    { id: "products", title: "Vendor Type & Products", icon: Package, available: !!showProducts },
    { id: "facilities", title: "Manufacturing Facilities", icon: Factory, available: !!showFacilities },
    { id: "certs", title: "Certifications & Quality Control", icon: Award, available: true },
    { id: "contact", title: "Contact & Trade Information", icon: Phone, available: !!showContact },
  ].filter((t) => t.available);

  const effectiveTab = tabs.some((t) => t.id === activeTab)
    ? activeTab
    : tabs[0]?.id ?? "company";

  if (tabs.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Vendor Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Your registered business profile</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 text-slate-600 rounded-xl p-6 text-center">
          No profile information available yet.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Vendor Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Your registered business profile and submitted documents</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
      {/* Tab navigation — dedicated sidebar card on desktop, horizontal scroll on mobile */}
      <nav className="lg:w-64 lg:shrink-0">
        <div className="lg:sticky lg:top-4 bg-white border border-slate-200 rounded-xl shadow-sm p-2">
          <p className="hidden lg:block text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-1.5 pb-2">Settings</p>
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible scrollbar-thin">
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = t.id === effectiveTab;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`group flex items-center gap-2.5 px-3 py-2.5 text-sm whitespace-nowrap rounded-lg transition-all lg:w-full text-left border-l-2 ${
                    isActive
                      ? "bg-brand-50 text-brand-700 font-bold border-brand-600 shadow-xs"
                      : "border-transparent text-slate-600 font-medium hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600"}`} />
                  {t.title}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Tab panel */}
      <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl shadow-sm p-5 sm:p-6">

      {/* ============ SECTION 1: COMPANY DETAILS ============ */}
      {effectiveTab === "company" && showCompany && (
        <SectionBody>
          {v.companyLogo && (
            <div className="flex items-center gap-4 pb-2">
              <button type="button" onClick={() => openDoc(v.companyLogo!, "Company Logo")} className="group block shrink-0">
                <img src={v.companyLogo} alt="Company Logo" className="w-20 h-20 object-cover rounded-xl border border-slate-200 group-hover:border-brand-300 transition-colors" />
              </button>
              <div>
                <p className="text-sm font-bold text-slate-800">Company Logo</p>
                <p className="text-xs text-slate-500">Your brand logo shown across the portal</p>
              </div>
            </div>
          )}
          {businessProfile.length > 0 && (
            <SubSection title="Business Profile" description="Business type, company identity, and regulatory IDs" icon={<Briefcase className="w-4 h-4" />}>
              <FieldsGrid items={businessProfile} />
            </SubSection>
          )}
          {companyContact.length > 0 && (
            <SubSection title="Contact & Communication" description="Business emails, phone numbers, and landline" icon={<Mail className="w-4 h-4" />}>
              <FieldsGrid items={companyContact} />
            </SubSection>
          )}
          {(companyAddress.length > 0 || factorySiteImages.length > 0) && (
            <SubSection title="Legal Address & Factory Site" description="Registered legal address & factory site" icon={<MapPin className="w-4 h-4" />}>
              <div className="space-y-4">
                <FieldsGrid items={compact([
                  mk("Ownership Type", v.factoryOwnershipType, { transform: getOwnershipTypeLabel }),
                  mk("Warehousing Capacity", formatSqFt(v.factorySize)),
                ])} />
                <AddressCard
                  line1={v.businessAddress}
                  line2={v.addressLine2}
                  line3={v.addressLine3}
                  landmark={v.landmark}
                  city={v.businessCity}
                  state={v.businessState}
                  country={v.businessCountry}
                  zip={v.businessZipCode}
                />
                {factorySiteImages.length > 0 && (
                  <ImageStrip heading={`Factory Images (${factorySiteImages.length})`} icon={<ImageIcon className="w-4 h-4 text-slate-400" />} items={factorySiteImages} />
                )}
              </div>
            </SubSection>
          )}
          {registrationDocs.length > 0 && (
            <SubSection title="Documents" description="Registration certificates" icon={<FileText className="w-4 h-4" />}>
              <DocsGrid heading="Registration Documents" docs={registrationDocs} />
            </SubSection>
          )}
        </SectionBody>
      )}

      {/* ============ SECTION 2: WAREHOUSE DETAILS ============ */}
      {effectiveTab === "warehouse" && showWarehouse && (
        <SectionBody>
          {warehouseOwnership.length > 0 && (
            <SubSection title="Facility Ownership & Capacity" icon={<Factory className="w-4 h-4" />}>
              <FieldsGrid items={warehouseOwnership} />
            </SubSection>
          )}
          {warehouseAddress.length > 0 && (
            <SubSection title="Warehouse Address" icon={<MapPin className="w-4 h-4" />}>
              <AddressCard
                line1={v.warehouseAddress}
                line2={v.warehouseAddressLine2}
                line3={v.warehouseAddressLine3}
                landmark={v.warehouseLandmark}
                city={v.warehouseCity}
                state={v.warehouseState}
                country={v.warehouseCountry}
                zip={v.warehouseZipCode}
              />
            </SubSection>
          )}
          {warehouseImages.length > 0 && (
            <SubSection title="Warehouse Photos" icon={<ImageIcon className="w-4 h-4" />}>
              <ImageStrip heading={`Warehouse Images (${warehouseImages.length})`} icon={<ImageIcon className="w-4 h-4 text-slate-400" />} items={warehouseImages} />
            </SubSection>
          )}
          {locationMap.length > 0 && (
            <SubSection title="Location Map" icon={<MapIcon className="w-4 h-4" />}>
              <FieldsGrid items={locationMap} />
            </SubSection>
          )}
        </SectionBody>
      )}

      {/* ============ SECTION 3: OWNER PROFILE ============ */}
      {effectiveTab === "owner" && showOwner && (
        <SectionBody>
          {(ownerIdentity.length > 0 || v.ownerPhoto || ownerContact.length > 0 || additionalOwners.length > 0) && (
            <SubSection title="Owners" icon={<UserCircle className="w-4 h-4" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Owner 1 (Primary) — same card format as additional owners */}
                <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {v.ownerPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.ownerPhoto}
                        alt="Owner 1 profile"
                        className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                        <UserCircle className="w-6 h-6 text-slate-300" />
                      </div>
                    )}
                    <p className="text-sm font-bold text-slate-800">Owner 1</p>
                  </div>
                  {buildFullName(v.ownerTitle, v.ownerFirstName, v.ownerMiddleName, v.ownerLastName, v.ownerName) && (
                    <Field label="Name" value={buildFullName(v.ownerTitle, v.ownerFirstName, v.ownerMiddleName, v.ownerLastName, v.ownerName)} />
                  )}
                  {v.designation && <Field label="Designation" value={v.designation === 'Others' && v.customDesignation ? v.customDesignation : v.designation} />}
                  {v.ownerEmail && <Field label="Primary Email" value={v.ownerEmail} />}
                  {v.ownerEmail2 && <Field label="Secondary Email" value={v.ownerEmail2} />}
                  {v.ownerPhone && <Field label="Primary Phone" value={v.ownerPhone} />}
                  {v.ownerPhone2 && <Field label="Secondary Phone" value={v.ownerPhone2} />}
                  {ownerLandline.local && <Field label="Local Landline Number" value={ownerLandline.local} />}
                  {ownerLandline.intl && <Field label="International Landline Number" value={ownerLandline.intl} />}
                  {!ownerLandline.hasNew && ownerLandline.legacy && <Field label="Landline" value={ownerLandline.legacy} />}
                </div>
                {/* Additional owners */}
                {additionalOwners.map((owner: any, idx: number) => (
                  <div key={idx} className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      {owner.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={owner.photo}
                          alt={`Owner ${idx + 2} profile`}
                          className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                          <UserCircle className="w-6 h-6 text-slate-300" />
                        </div>
                      )}
                      <p className="text-sm font-bold text-slate-800">{buildFullName(owner.title, owner.firstName, owner.middleName, owner.lastName, owner.name) || `Owner ${idx + 2}`}</p>
                    </div>
                    {owner.designation && <Field label="Designation" value={owner.designation} />}
                    {owner.email && <Field label="Primary Email" value={owner.email} />}
                    {owner.email2 && <Field label="Secondary Email" value={owner.email2} />}
                    {owner.phone && <Field label="Primary Phone" value={owner.phone} />}
                    {owner.phone2 && <Field label="Secondary Phone" value={owner.phone2} />}
                    {(() => {
                      const ll = resolveLandline({
                        std: owner.localLandlineStd,
                        number: owner.localLandlineNumber,
                        concat: owner.localLandline,
                        intl: owner.intlLandline,
                        legacy: owner.landline,
                      });
                      return (
                        <>
                          {ll.local && <Field label="Local Landline Number" value={ll.local} />}
                          {ll.intl && <Field label="International Landline Number" value={ll.intl} />}
                          {!ll.hasNew && ll.legacy && <Field label="Landline" value={ll.legacy} />}
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </SubSection>
          )}
          {businessHistory.length > 0 && (
            <SubSection title="Business History" icon={<Calendar className="w-4 h-4" />}>
              <FieldsGrid items={businessHistory} />
            </SubSection>
          )}
          {companySize.length > 0 && (
            <SubSection title="Company Size" icon={<UserCircle className="w-4 h-4" />}>
              <FieldsGrid items={companySize} />
            </SubSection>
          )}
        </SectionBody>
      )}

      {/* ============ SECTION 4: VENDOR TYPE & PRODUCTS ============ */}
      {effectiveTab === "products" && showProducts && (
        <SectionBody>
          {vendorTypeFields.length > 0 && (
            <SubSection title="Vendor Type" icon={<Briefcase className="w-4 h-4" />}>
              <FieldsGrid items={vendorTypeFields} />
            </SubSection>
          )}
          {marketFocus.length > 0 && (
            <SubSection title="Market Focus" icon={<Globe className="w-4 h-4" />}>
              <FieldsGrid items={marketFocus} />
            </SubSection>
          )}
          {(productOfferings.length > 0 || productPhotos.length > 0) && (
            <SubSection title="Product Categories & Offerings" icon={<Package className="w-4 h-4" />}>
              <div className="space-y-4">
                <FieldsGrid items={productOfferings} />
                {productPhotos.length > 0 && (
                  <ImageStrip heading={`Product Photos (${productPhotos.length})`} icon={<Package className="w-4 h-4 text-slate-400" />} items={productPhotos} />
                )}
              </div>
            </SubSection>
          )}
          {additionalCategories.length > 0 && (
            <SubSection title="Additional Categories & Remarks" icon={<FileText className="w-4 h-4" />}>
              <FieldsGrid items={additionalCategories} />
            </SubSection>
          )}
        </SectionBody>
      )}

      {/* ============ SECTION 5: MANUFACTURING FACILITIES ============ */}
      {effectiveTab === "facilities" && showFacilities && (
        <SectionBody>
          {enabledFacilityList.length > 0 && (
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Active Facilities</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {enabledFacilityList.map((f, i) => (
                  <span key={i} className="px-2.5 py-1 bg-brand-50 text-brand-700 text-xs font-bold rounded-lg border border-brand-100">{f}</span>
                ))}
              </div>
            </div>
          )}
          {Object.entries(facilityDetails).map(([facilityId, details]: [string, any]) => {
            if (!enabledFacilities[facilityId]) return null;
            const facilityName = facilityLabelMap[facilityId] || facilityId;
            const hasDetailFields = Object.values(details || {}).some((val) => val !== null && val !== undefined && val !== "");
            if (!hasDetailFields) return null;
            return (
              <div key={facilityId} className="border-l-2 border-brand-500/80 pl-4 py-1 space-y-4">
                <p className="font-bold text-sm text-slate-800 uppercase tracking-wide">{facilityName} Facility Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(details || {}).map(([key, value]: [string, any]) => {
                    if (value === null || value === undefined || value === "") return null;
                    const fieldLabel = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
                    return (
                      <div key={key}>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">{fieldLabel}</label>
                        <p className="text-sm font-semibold text-slate-900">{value.toString()}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </SectionBody>
      )}

      {/* ============ SECTION 6: CERTIFICATIONS & LOGISTICS ============ */}
      {effectiveTab === "certs" && (
        <SectionBody>
          <CertificationsSection certs={certs} onResult={setResult} onReload={loadVendorProfile} />
          {qualityControl.length > 0 && (
            <SubSection title="Quality Control Process" icon={<Award className="w-4 h-4" />}>
              <FieldsGrid items={qualityControl} />
            </SubSection>
          )}
          {logistics.length > 0 && (
            <SubSection title="Logistics" icon={<Truck className="w-4 h-4" />}>
              <FieldsGrid items={logistics} />
            </SubSection>
          )}
        </SectionBody>
      )}

      {/* ============ SECTION 7: CONTACT & TRADE INFORMATION ============ */}
      {effectiveTab === "contact" && showContact && (
        <SectionBody>
          {hasMainContact && (
            <MainContactSection mc={mc} onResult={setResult} onReload={loadVendorProfile} />
          )}
          {alternateContacts.length > 0 && (
            <SubSection title={`Alternate Contacts (${alternateContacts.length})`} icon={<UserCircle className="w-4 h-4" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {alternateContacts.map((contact: any, idx: number) => renderContactCard(contact, idx))}
              </div>
            </SubSection>
          )}
          {tradeFlow.length > 0 && (
            <SubSection title="Trade Flow" icon={<Globe className="w-4 h-4" />}>
              <FieldsGrid items={tradeFlow} />
            </SubSection>
          )}
          {tradeIds.length > 0 && (
            <SubSection title="Regulatory IDs" icon={<FileText className="w-4 h-4" />}>
              <FieldsGrid items={tradeIds} />
            </SubSection>
          )}
        </SectionBody>
      )}
      </div>
      </div>

      <ResultModal
        show={!!result}
        type={result?.type ?? "success"}
        text={result?.text ?? ""}
        onClose={() => setResult(null)}
      />
    </div>
  );
}
