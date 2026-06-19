"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  MapPin,
  Factory,
  Phone,
  Globe,
  Briefcase,
  Package,
  Warehouse,
  Award,
  FileText,
  Loader2,
  UserCircle,
  Image as ImageIcon,
  Download,
  RotateCw,
} from "lucide-react";
import VendorService, { VendorProfile } from "@/services/vendorService";

const isImageUrl = (url?: string) =>
  !!url && /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url);

// Only allow http(s) URLs to prevent javascript:/data: XSS injection via vendor-supplied links.
function safeExternalUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

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

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">{label}</label>
      <p className="text-sm font-semibold text-slate-900 leading-normal">{value.toString()}</p>
    </div>
  );
}

const hasData = (val: any) => {
  if (val === null || val === undefined || val === "") return false;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "object") return Object.keys(val).length > 0;
  return true;
};

interface SectionField {
  key: string;
  label: string;
  type?: string;
  valueOverride?: any;
  condition?: any;
  transform?: (val: any) => any;
}

export default function VendorSettings() {
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVendorProfile();
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
      <div className="space-y-6">
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

  const sections: Array<{ id: string; title: string; icon: React.ReactNode; fields: SectionField[] }> = [
    {
      id: "company",
      title: "Company Details",
      icon: <Briefcase className="w-5 h-5 text-brand-600" />,
      fields: [
        { key: "companyName", label: "Company Name" },
        { key: "businessType", label: "Business Type", transform: (val: string) => getBusinessTypeLabel(val) },
        { key: "gstNumber", label: "GST Number" },
        { key: "companyIdNumber", label: getCompanyIdLabel(v.businessType), condition: v.companyIdNumber },
        { key: "iecCode", label: "IEC Code" },
        { key: "panNumber", label: "PAN Number" },
        { key: "aadhaarNumber", label: "Aadhaar Number" },
        { key: "website", label: "Website", type: "url" },
        { key: "factoryOwnershipType", label: "Factory Ownership Type", transform: (val: string) => getOwnershipTypeLabel(val) },
      ],
    },
    {
      id: "warehouse",
      title: "Warehouse / Factory Address",
      icon: <Warehouse className="w-5 h-5 text-brand-600" />,
      fields: [
        { key: "ownershipType", label: "Warehouse Ownership Type", transform: (val: string) => getOwnershipTypeLabel(val) },
        {
          key: "warehouseAddress",
          label: "Warehouse Address",
          valueOverride: formatAddressHelper(
            v.warehouseAddress,
            v.warehouseAddressLine2,
            v.warehouseAddressLine3,
            v.warehouseLandmark,
            v.warehouseCity,
            v.warehouseState,
            v.warehouseZipCode,
            v.warehouseCountry
          ),
        },
        { key: "storageCapacity", label: "Warehousing Capacity" },
        { key: "mapLink", label: "Google Maps Link", type: "url" },
      ],
    },
    {
      id: "owner_profile",
      title: "Owner Profile",
      icon: <UserCircle className="w-5 h-5 text-brand-600" />,
      fields: [
        { key: "ownerEmail", label: "Owner Email" },
        { key: "ownerEmail2", label: "Owner Email 2" },
        { key: "ownerPhone", label: "Owner Phone" },
        { key: "ownerPhone2", label: "Owner Phone 2" },
        { key: "ownerLandline", label: "Owner Landline" },
        { key: "businessStartDate", label: "Business Start Date", type: "date" },
        { key: "employeeCount", label: "Employee Count", transform: (val: string) => getEmployeeCountLabel(val) },
      ],
    },
    {
      id: "capabilities",
      title: "Vendor Type & Products",
      icon: <Package className="w-5 h-5 text-brand-600" />,
      fields: [
        { key: "vendorType", label: "Vendor Role Type", type: "badge" },
        { key: "vendorTypes", label: "Vendor Types", type: "list" },
        { key: "primaryMarkets", label: "Market Type", type: "list" },
        { key: "productCategories", label: "Product Categories", type: "list" },
        { key: "productTypes", label: "Product Types", type: "list" },
        { key: "categoryRemarks", label: "Category Remarks" },
      ],
    },
    {
      id: "facilities",
      title: "Manufacturing Facilities",
      icon: <Factory className="w-5 h-5 text-brand-600" />,
      fields: [],
    },
    {
      id: "certifications",
      title: "Certifications & Logistics",
      icon: <Award className="w-5 h-5 text-brand-600" />,
      fields: [
        { key: "qualityControl", label: "Quality Control Process" },
        { key: "complianceStandards", label: "Compliance Standards" },
        { key: "packagingCapabilities", label: "Packaging Capabilities" },
        { key: "logisticsPartners", label: "Logistics Partners" },
        { key: "shippingMethods", label: "Shipping Methods", type: "list" },
      ],
    },
    {
      id: "contact",
      title: "Contact Information",
      icon: <Phone className="w-5 h-5 text-brand-600" />,
      fields: [
        { key: "ownerName", label: "Owner Name" },
        { key: "designation", label: "Designation" },
        { key: "businessPhone", label: "Business Phone" },
        { key: "businessEmail", label: "Business Email" },
        { key: "phoneNumber2", label: "Alternate Phone" },
        { key: "businessEmail2", label: "Alternate Email" },
        { key: "landlineNumber", label: "Landline Number" },
        {
          key: "businessAddress",
          label: "Business Address",
          valueOverride: formatAddressHelper(
            v.businessAddress,
            v.addressLine2,
            v.addressLine3,
            v.landmark,
            v.businessCity,
            v.businessState,
            v.businessZipCode,
            v.businessCountry
          ),
        },
      ],
    },
    {
      id: "main_contact",
      title: "Main Contact Person",
      icon: <UserCircle className="w-5 h-5 text-brand-600" />,
      fields: [],
    },
    {
      id: "trade",
      title: "Trade & Regulatory ID Details",
      icon: <FileText className="w-5 h-5 text-brand-600" />,
      fields: [
        { key: "importExperience", label: "Import Experience", transform: (val: boolean) => (val ? "Yes" : "No") },
        { key: "exportExperience", label: "Export Experience", transform: (val: boolean) => (val ? "Yes" : "No") },
        { key: "importCountries", label: "Import Countries", type: "list" },
        { key: "exportCountries", label: "Export Countries", type: "list" },
        { key: "tradeLicenseNumber", label: "Trade License Number" },
        { key: "businessRegistrationNumber", label: "Business Registration Number" },
        { key: "taxIdentificationNumber", label: "Tax Identification Number" },
      ],
    },
  ];

  const allDocs: any[] = Array.isArray(v.documents) ? v.documents : [];
  const COMPANY_DOC_TYPES = ["GST_CERTIFICATE", "PAN_CARD", "COMPANY_REGISTRATION", "AADHAAR_CARD"];
  const companyDocs = allDocs.filter((d) => COMPANY_DOC_TYPES.includes(d.type));
  const factoryImages = allDocs
    .filter((d) => d.type === "OTHER")
    .map((d) => ({ label: d.name || "Factory Image", url: d.documentUrl }));
  const otherDocs = allDocs.filter((d) => !COMPANY_DOC_TYPES.includes(d.type) && d.type !== "OTHER");

  const productPhotos: Array<{ label: string; url: string }> = [];
  const collectProducts = (catLabel: string, products: any[]) => {
    (Array.isArray(products) ? products : []).forEach((p: any, i: number) => {
      (Array.isArray(p?.photos) ? p.photos : []).forEach((ph: any) => {
        const url = ph?.url || ph?.preview;
        if (url) productPhotos.push({ label: `${catLabel} · ${p?.name || `Product ${i + 1}`}`, url });
      });
    });
  };
  if (v.categoryProducts && typeof v.categoryProducts === "object") {
    Object.entries(v.categoryProducts).forEach(([catId, products]: [string, any]) => collectProducts(catId, products));
  }
  if (Array.isArray(v.additionalCategories)) {
    v.additionalCategories.forEach((cat: any) => collectProducts(cat?.name || "Custom Category", cat?.products));
  }

  const renderImageStrip = (heading: string, icon: React.ReactNode, items: Array<{ label: string; url: string }>) => (
    <div>
      <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">{icon} {heading}</h4>
      <div className="flex flex-wrap gap-4">
        {items.map((m, i) => (
          <a key={`${m.label}-${i}`} href={m.url} target="_blank" rel="noopener noreferrer" className="group block">
            <img
              src={m.url}
              alt={m.label}
              className="w-28 h-28 object-cover rounded-xl border border-slate-200 group-hover:border-brand-300 transition-colors"
            />
            <p className="text-xs font-semibold text-slate-600 mt-1.5 text-center max-w-28 truncate" title={m.label}>{m.label}</p>
          </a>
        ))}
      </div>
    </div>
  );

  const renderDocsGrid = (heading: string, docs: any[]) => (
    <div>
      <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
        <FileText className="w-4.5 h-4.5 text-slate-400" /> {heading} ({docs.length})
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {docs.map((doc: any, idx: number) => (
          <div key={doc.id || idx} className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-3 space-y-2">
            {isImageUrl(doc.documentUrl) ? (
              <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer">
                <img src={doc.documentUrl} alt={doc.name} className="w-full h-32 object-cover rounded-lg border border-slate-200" />
              </a>
            ) : (
              <div className="w-full h-32 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-300">
                <FileText className="w-10 h-10" />
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-700 truncate" title={doc.name}>{doc.name}</p>
              {doc.documentUrl && (
                <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-brand-600 hover:text-brand-700" title="View / Download">
                  <Download className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Vendor Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Your registered business profile and submitted documents</p>
      </div>

      <div className="space-y-6">
        {sections.map((section) => {
          const activeFields = section.fields
            .map((field) => {
              const rawVal = field.valueOverride !== undefined ? field.valueOverride : v[field.key];
              if (!hasData(rawVal)) return null;
              if (field.condition === false) return null;
              const finalVal = field.transform ? field.transform(rawVal) : rawVal;
              return { label: field.label, value: finalVal, type: field.type };
            })
            .filter(Boolean) as Array<{ label: string; value: any; type?: string }>;

          let hasCustomData = false;
          let customContent: React.ReactNode = null;

          if (section.id === "company") {
            if (v.companyLogo || companyDocs.length > 0) {
              hasCustomData = true;
              customContent = (
                <div className="col-span-full space-y-6 border-t border-slate-100 pt-6 mt-4">
                  {v.companyLogo &&
                    renderImageStrip("Company Logo", <ImageIcon className="w-4.5 h-4.5 text-slate-400" />, [
                      { label: "Company Logo", url: v.companyLogo },
                    ])}
                  {companyDocs.length > 0 && renderDocsGrid("Registration Documents", companyDocs)}
                </div>
              );
            }
          } else if (section.id === "warehouse") {
            if (factoryImages.length > 0) {
              hasCustomData = true;
              customContent = (
                <div className="col-span-full border-t border-slate-100 pt-6 mt-4">
                  {renderImageStrip(
                    `Factory Images (${factoryImages.length})`,
                    <ImageIcon className="w-4.5 h-4.5 text-slate-400" />,
                    factoryImages
                  )}
                </div>
              );
            }
          } else if (section.id === "owner_profile") {
            const additional = v.additionalOwners;
            const hasOwnerPhoto = !!v.ownerPhoto;
            const hasAdditional = Array.isArray(additional) && additional.length > 0;
            if (hasOwnerPhoto || hasAdditional) {
              hasCustomData = true;
              customContent = (
                <div className="col-span-full space-y-6 border-t border-slate-100 pt-6 mt-4">
                  {hasOwnerPhoto &&
                    renderImageStrip("Owner Photo", <ImageIcon className="w-4.5 h-4.5 text-slate-400" />, [
                      { label: "Owner Photo", url: v.ownerPhoto },
                    ])}
                  {hasAdditional && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                        <UserCircle className="w-4.5 h-4.5 text-slate-400" /> Additional Owners ({additional.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {additional.map((owner: any, idx: number) => (
                          <div key={idx} className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                            <p className="text-sm font-bold text-slate-800">Owner {idx + 2}</p>
                            {owner.name && <Field label="Name" value={owner.name} />}
                            {owner.designation && <Field label="Designation" value={owner.designation} />}
                            {owner.email && <Field label="Email" value={owner.email} />}
                            {owner.email2 && <Field label="Secondary Email" value={owner.email2} />}
                            {owner.phone && <Field label="Phone" value={owner.phone} />}
                            {owner.phone2 && <Field label="Secondary Phone" value={owner.phone2} />}
                            {owner.landline && <Field label="Landline" value={owner.landline} />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            }
          } else if (section.id === "capabilities") {
            if (productPhotos.length > 0) {
              hasCustomData = true;
              customContent = (
                <div className="col-span-full border-t border-slate-100 pt-6 mt-4">
                  {renderImageStrip(
                    `Product Photos (${productPhotos.length})`,
                    <Package className="w-4.5 h-4.5 text-slate-400" />,
                    productPhotos
                  )}
                </div>
              );
            }
          } else if (section.id === "facilities") {
            const enabledFacilities = v.enabledFacilities || {};
            const detailsMap = v.facilityDetails || {};
            const labelMap: Record<string, string> = {
              spinning: "Spinning",
              weaving: "Weaving",
              dyeing: "Dyeing",
              printing: "Printing",
              stitching: "Stitching",
              finishing: "Finishing",
            };
            const enabledList: string[] = [];
            for (const [fac, enabled] of Object.entries(enabledFacilities)) {
              if (enabled) enabledList.push(labelMap[fac] || fac);
            }
            if (enabledList.length > 0 || Object.keys(detailsMap).length > 0) {
              hasCustomData = true;
              customContent = (
                <div className="col-span-full space-y-6">
                  {enabledList.length > 0 && (
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Active Facilities</label>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {enabledList.map((f, i) => (
                          <span key={i} className="px-2.5 py-1 bg-brand-50 text-brand-700 text-xs font-bold rounded-lg border border-brand-100">{f}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {Object.entries(detailsMap).map(([facilityId, details]: [string, any]) => {
                    if (!enabledFacilities[facilityId]) return null;
                    const facilityName = labelMap[facilityId] || facilityId;
                    const hasDetailFields = Object.values(details || {}).some((val) => val !== null && val !== undefined && val !== "");
                    if (!hasDetailFields) return null;
                    return (
                      <div key={facilityId} className="border-l-2 border-brand-500/80 pl-4 py-1 space-y-4">
                        <p className="font-bold text-sm text-slate-800 uppercase tracking-wide">{facilityName} Facility Details</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                </div>
              );
            }
          } else if (section.id === "certifications") {
            const certs = v.certifications || [];
            if (certs.length > 0) {
              hasCustomData = true;
              customContent = (
                <div className="col-span-full border-t border-slate-100 pt-6 mt-4">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                    <Award className="w-4.5 h-4.5 text-slate-400" /> Catalog Certifications ({certs.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {certs.map((cert: any, idx: number) => {
                      const status = cert.expiryDate ? getCertificateStatus(cert.expiryDate) : null;
                      return (
                        <div key={cert.id || idx} className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center px-2.5 py-0.5 bg-brand-50 text-brand-700 border border-brand-100 rounded text-xs font-bold">
                              {cert.name}
                            </span>
                            {cert.documentUrl && (
                              <a
                                href={cert.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-brand-600 hover:text-brand-700 hover:underline font-bold flex items-center gap-1"
                              >
                                <FileText className="w-3.5 h-3.5" /> View File
                              </a>
                            )}
                          </div>
                          {cert.issuedBy && <Field label="Issued By" value={cert.issuedBy} />}
                          {cert.certificateNumber && <Field label="Certificate #" value={cert.certificateNumber} />}
                          {cert.expiryDate ? (
                            <div>
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Expiry Date</label>
                              <div className="flex items-center gap-2">
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
          } else if (section.id === "main_contact") {
            const mc = v.mainContact;
            const hasMc = mc && typeof mc === "object" && Object.keys(mc).length > 0;
            const mcName = composeContactName(mc);
            if (hasMc) {
              hasCustomData = true;
              customContent = (
                <div className="col-span-full space-y-6">
                  {mc.photo &&
                    renderImageStrip("Contact Photo", <ImageIcon className="w-4.5 h-4.5 text-slate-400" />, [
                      { label: mcName || "Contact Photo", url: mc.photo },
                    ])}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                    {mcName && <Field label="Name" value={mcName} />}
                    {(mc.customDesignation || mc.designation) && (
                      <Field label="Designation" value={mc.customDesignation || mc.designation} />
                    )}
                    {(mc.email1 || mc.email) && <Field label="Email" value={mc.email1 || mc.email} />}
                    {mc.email2 && <Field label="Secondary Email" value={mc.email2} />}
                    {(mc.phone1 || mc.phone) && <Field label="Phone" value={mc.phone1 || mc.phone} />}
                    {mc.phone2 && <Field label="Secondary Phone" value={mc.phone2} />}
                    {mc.landline && <Field label="Landline" value={mc.landline} />}
                    {(mc.customDepartment || mc.department) && (
                      <Field label="Department" value={mc.customDepartment || mc.department} />
                    )}
                  </div>
                </div>
              );
            }
          } else if (section.id === "trade") {
            const alternate = v.alternateContacts;
            const hasAlternate = Array.isArray(alternate) && alternate.length > 0;
            if (hasAlternate || otherDocs.length > 0) {
              hasCustomData = true;
              customContent = (
                <div className="col-span-full space-y-6 border-t border-slate-100 pt-6 mt-4">
                  {hasAlternate && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                        <UserCircle className="w-4.5 h-4.5 text-slate-400" /> Alternate Contacts ({alternate.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {alternate.map((contact: any, idx: number) => {
                          const cName = composeContactName(contact);
                          return (
                            <div key={idx} className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                              <div className="flex items-center gap-3">
                                {contact.photo ? (
                                  <a href={contact.photo} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                    <img src={contact.photo} alt={cName || `Contact ${idx + 1}`} className="h-10 w-10 rounded-full object-cover border border-slate-200" />
                                  </a>
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                                    <UserCircle className="h-5 w-5 text-brand-500" />
                                  </div>
                                )}
                                <p className="text-sm font-bold text-slate-800">{cName || `Contact ${idx + 1}`}</p>
                              </div>
                              {(contact.customDesignation || contact.designation) && (
                                <Field label="Designation" value={contact.customDesignation || contact.designation} />
                              )}
                              {(contact.email1 || contact.email) && <Field label="Email" value={contact.email1 || contact.email} />}
                              {contact.email2 && <Field label="Secondary Email" value={contact.email2} />}
                              {(contact.phone1 || contact.phone) && <Field label="Phone" value={contact.phone1 || contact.phone} />}
                              {contact.phone2 && <Field label="Secondary Phone" value={contact.phone2} />}
                              {contact.landline && <Field label="Landline" value={contact.landline} />}
                              {(contact.customDepartment || contact.department) && (
                                <Field label="Department" value={contact.customDepartment || contact.department} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {otherDocs.length > 0 && renderDocsGrid("Other Documents", otherDocs)}
                </div>
              );
            }
          }

          if (activeFields.length === 0 && !hasCustomData) return null;

          return (
            <div key={section.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 hover:shadow-sm transition-all duration-200">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <span className="p-2 bg-brand-50 rounded-xl text-brand-600">{section.icon}</span>
                {section.title}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                {activeFields.map((field) => (
                  <div key={field.label}>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">{field.label}</label>
                    <div className="text-sm font-semibold text-slate-900 leading-relaxed">
                      {field.type === "list" && Array.isArray(field.value) ? (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {field.value.map((item, idx) => (
                            <span key={idx} className="px-2.5 py-0.5 bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-200">
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : field.type === "badge" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-100 capitalize mt-1">
                          {field.value.toString().replace(/_/g, " ").toLowerCase()}
                        </span>
                      ) : field.type === "url" ? (
                        (() => {
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
                        })()
                      ) : field.type === "date" ? (
                        <span className="text-slate-800 font-semibold">{formatDate(field.value)}</span>
                      ) : (
                        <span className="text-slate-800 font-semibold">{field.value.toString()}</span>
                      )}
                    </div>
                  </div>
                ))}
                {customContent}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
