"use client";

import React from "react";
import {
  Building2, User, Factory, Package, Wrench, ShieldCheck, Phone, Landmark, FileText, Image as ImageIcon, MapPin, Globe,
} from "lucide-react";
import { Card, CardContent } from "../../UI/Card";
import { Badge } from "../../UI/Badge";
import { buildFullName, toExternalUrl } from "@/lib/utils";
import { openDoc } from "@/lib/docViewerBus";
import { Country } from "country-state-city";

// name → ISO code for flag images (flag emoji don't render on Windows).
const COUNTRY_ISO: Record<string, string> = {};
Country.getAllCountries().forEach((c) => { COUNTRY_ISO[c.name] = c.isoCode; });

const DOC_EXT = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|rtf)(\?|$)/i;
const IMG_EXT = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i;
function isImageUrl(url?: string): boolean {
  if (!url) return false;
  if (DOC_EXT.test(url)) return false;
  if (IMG_EXT.test(url)) return true;
  try { return /\/image\/upload\//.test(new URL(url).pathname); } catch { return false; }
}

const blank = (v: any) =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);

const titleCase = (s?: string) => (s ? s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : s);

function humanize(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

// ── Small presentational helpers ──────────────────────────────────────────────
function Row({ label, value, mono, link }: { label: string; value: any; mono?: boolean; link?: boolean }) {
  if (blank(value)) return null;
  const href = link ? toExternalUrl(String(value)) : null;
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline text-right break-all">
          {String(value)}
        </a>
      ) : (
        <span className={`text-sm font-medium text-slate-900 text-right break-words ${mono ? "font-mono" : ""}`}>{String(value)}</span>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="border border-slate-200/80 rounded-2xl shadow-xs">
      <CardContent className="p-6">
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="text-brand-500">{icon}</span> {title}
        </h3>
        {children}
      </CardContent>
    </Card>
  );
}

function Badges({ items, color = "slate" }: { items: any[]; color?: string }) {
  const list = (items || []).filter(Boolean);
  if (list.length === 0) return null;
  const cls =
    color === "blue" ? "bg-blue-50 text-blue-700 border-blue-200"
      : color === "emerald" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((it, i) => (
        <Badge key={i} className={`${cls} border capitalize`}>{titleCase(String(it))}</Badge>
      ))}
    </div>
  );
}

function DocThumb({ url, name }: { url?: string; name?: string }) {
  if (!url) return null;
  const img = isImageUrl(url);
  return (
    <button type="button" onClick={() => openDoc(url, name || "Image")} className="block w-full border border-slate-200 rounded-xl overflow-hidden hover:border-brand-300 transition-colors">
      {img ? (
        <img src={url} alt={name || "Image"} className="w-full h-32 object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-32 bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-1">
          <FileText className="w-7 h-7" />
          <span className="text-xs">View Document</span>
        </div>
      )}
      {name && <div className="px-2 py-1.5 text-xs font-medium text-slate-700 truncate" title={name}>{name}</div>}
    </button>
  );
}

const FACILITY_LABELS: Record<string, string> = {
  spinning: "Spinning", weaving: "Weaving", dyeing: "Dyeing",
  printing: "Printing", stitching: "Stitching", finishing: "Finishing",
};

function contactBlock(c: any) {
  const name = buildFullName(c.title, c.firstName, c.middleName, c.lastName, c.name);
  return (
    <div className="space-y-3">
      {c.photo && <img src={c.photo} alt={name} className="w-20 h-20 rounded-full object-cover border border-slate-200" />}
      <div>
        <Row label="Name" value={name} />
        <Row label="Designation" value={c.designation === "Others" ? c.customDesignation : titleCase(c.designation)} />
        <Row label="Department" value={c.department === "Others" ? c.customDepartment : c.department} />
        <Row label="Primary Email" value={c.email1 || c.email} />
        <Row label="Secondary Email" value={c.email2} />
        <Row label="Primary Phone" value={c.phone1 || c.phone} />
        <Row label="Secondary Phone" value={c.phone2} />
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function VendorInspectionData({ vendor: v }: { vendor: any }) {
  if (!v) return null;

  const documents: any[] = Array.isArray(v.documents) ? v.documents : [];
  const factoryImages = documents.filter((d) => d?.type === "OTHER" && isImageUrl(d.documentUrl));
  const fileDocs = documents.filter((d) => !(d?.type === "OTHER" && isImageUrl(d.documentUrl)));
  const certifications: any[] = Array.isArray(v.certifications) ? v.certifications : [];
  const additionalOwners: any[] = Array.isArray(v.additionalOwners) ? v.additionalOwners : [];
  const alternateContacts: any[] = Array.isArray(v.alternateContacts) ? v.alternateContacts : [];
  const enabledFacilities: Record<string, boolean> = v.enabledFacilities && typeof v.enabledFacilities === "object" ? v.enabledFacilities : {};
  const facilityDetails: Record<string, any> = v.facilityDetails && typeof v.facilityDetails === "object" ? v.facilityDetails : {};
  const activeFacilities = Object.keys(enabledFacilities).filter((k) => enabledFacilities[k]);
  const bank = v.bankDetails || null;
  const mainContact = v.mainContact || null;

  // Flatten every product photo across categoryProducts + additionalCategories.
  const productPhotos: { name: string; url: string }[] = [];
  const pushPhotos = (name: string, photos: any[]) => {
    (photos || []).forEach((p) => {
      const url = p?.preview || p?.url;
      if (url) productPhotos.push({ name, url });
    });
  };
  if (v.categoryProducts && typeof v.categoryProducts === "object") {
    Object.values(v.categoryProducts).forEach((list: any) => {
      (Array.isArray(list) ? list : []).forEach((prod: any) => pushPhotos(prod?.name || "Product", prod?.photos));
    });
  }
  if (Array.isArray(v.additionalCategories)) {
    v.additionalCategories.forEach((cat: any) => (cat?.products || []).forEach((prod: any) => pushPhotos(prod?.name || "Product", prod?.photos)));
  }

  const countryChips = (arr: string[], color: string) => (
    <div className="flex flex-wrap gap-1.5">
      {(arr || []).map((name) => {
        const iso = COUNTRY_ISO[name];
        return (
          <Badge key={name} className={`${color} border inline-flex items-center gap-1.5`}>
            {iso && <img src={`https://flagcdn.com/w20/${iso.toLowerCase()}.png`} alt="" className="w-4 h-auto rounded-[2px] shrink-0" loading="lazy" />}
            {name}
          </Badge>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Company Info */}
      <Section title="Company Information" icon={<Building2 className="h-5 w-5" />}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Row label="Company Name" value={v.companyName} />
            <Row label="Business Type" value={titleCase(v.businessType)} />
            <Row label="GST Number" value={v.gstNumber || (v.businessType === "unregistered" ? "Unregistered" : undefined)} mono />
            <Row label="PAN Number" value={v.panNumber} mono />
            <Row label="IEC Code" value={v.iecCode} mono />
            <Row label="Company ID / CIN" value={v.companyIdNumber} mono />
            <Row label="Aadhaar Number" value={v.aadhaarNumber} mono />
            <Row label="Website" value={v.website} link />
            <Row label="Established Year" value={v.establishedYear} />
            <Row label="Employee Count" value={v.employeeCount} />
            <Row label="Annual Turnover" value={v.annualTurnover} />
            <Row label="Description" value={v.companyDescription} />
          </div>
          {v.companyLogo && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Company Logo</p>
              <img src={v.companyLogo} alt="Company Logo" className="w-32 h-32 object-contain rounded-xl border border-slate-200 bg-white" />
            </div>
          )}
        </div>
      </Section>

      {/* Owner Profile */}
      <Section title="Owner Profile" icon={<User className="h-5 w-5" />}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {v.ownerPhoto && (
            <div>
              <img src={v.ownerPhoto} alt="Owner" className="w-28 h-28 object-cover rounded-xl border border-slate-200" />
            </div>
          )}
          <div className="lg:col-span-2">
            <Row label="Owner Name" value={buildFullName(v.ownerTitle, v.ownerFirstName, v.ownerMiddleName, v.ownerLastName, v.ownerName)} />
            <Row label="Designation" value={v.designation === "Others" ? v.customDesignation : titleCase(v.designation)} />
            <Row label="Primary Email" value={v.ownerEmail} />
            <Row label="Secondary Email" value={v.ownerEmail2} />
            <Row label="Primary Phone" value={v.ownerPhone} />
            <Row label="Secondary Phone" value={v.ownerPhone2} />
            <Row label="Address" value={[v.ownerAddress, v.ownerCity, v.ownerState, v.ownerZipCode, v.ownerCountry].filter(Boolean).join(", ")} />
            <Row label="Business Start Date" value={v.businessStartDate ? new Date(v.businessStartDate).toLocaleDateString() : undefined} />
          </div>
        </div>
        {additionalOwners.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Additional Owners ({additionalOwners.length})</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {additionalOwners.map((o, i) => (
                <div key={i} className="bg-slate-50/60 border border-slate-200 rounded-xl p-3">
                  {o.photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={o.photo}
                      alt={`Owner ${i + 2} profile`}
                      className="w-14 h-14 rounded-full object-cover border border-slate-200 mb-2"
                    />
                  )}
                  <Row label="Name" value={buildFullName(o.title, o.firstName, o.middleName, o.lastName, o.name)} />
                  <Row label="Designation" value={o.designation === "Others" ? o.customDesignation : titleCase(o.designation)} />
                  <Row label="Email" value={o.email} />
                  <Row label="Phone" value={o.phone} />
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Warehouse & Factory */}
      <Section title="Warehouse & Factory" icon={<Factory className="h-5 w-5" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <Row label="Ownership Type" value={titleCase(v.ownershipType || v.factoryOwnershipType)} />
            <Row label="Warehouse Address" value={[v.warehouseAddress, v.warehouseAddressLine2, v.warehouseAddressLine3, v.warehouseLandmark].filter(Boolean).join(", ")} />
            <Row label="Warehouse Location" value={[v.warehouseCity, v.warehouseState, v.warehouseZipCode, v.warehouseCountry].filter(Boolean).join(", ")} />
            <Row label="Warehouse Size" value={v.warehouseSize} />
            <Row label="Storage Capacity" value={v.storageCapacity} />
          </div>
          <div>
            <Row label="Factory Address" value={[v.factoryAddress, v.factoryCity, v.factoryState, v.factoryZipCode, v.factoryCountry].filter(Boolean).join(", ")} />
            <Row label="Factory Size" value={v.factorySize} />
            <Row label="Production Capacity" value={v.productionCapacity} />
          </div>
        </div>
        {v.mapLink && (
          <a href={v.mapLink.match(/src=["']([^"']+)["']/i)?.[1] || v.mapLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-sm text-brand-600 hover:underline">
            <MapPin className="w-4 h-4" /> View Map Location
          </a>
        )}
        {factoryImages.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Factory & Warehouse Images ({factoryImages.length})</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {factoryImages.map((d, i) => <DocThumb key={i} url={d.documentUrl} name={d.name} />)}
            </div>
          </div>
        )}
      </Section>

      {/* Products & Services */}
      {(v.vendorTypes?.length || v.vendorType || v.productCategories?.length || v.productTypes?.length || v.categoryRemarks || productPhotos.length > 0) && (
        <Section title="Products & Services" icon={<Package className="h-5 w-5" />}>
          <div className="space-y-4">
            {(v.vendorTypes?.length || v.vendorType) && (
              <div><p className="text-xs font-semibold text-slate-400 uppercase mb-2">Vendor Type</p><Badges items={v.vendorTypes?.length ? v.vendorTypes : [v.vendorType]} color="blue" /></div>
            )}
            {v.productCategories?.length > 0 && (
              <div><p className="text-xs font-semibold text-slate-400 uppercase mb-2">Product Categories</p><Badges items={[...new Set(v.productCategories)]} /></div>
            )}
            {v.productTypes?.length > 0 && (
              <div><p className="text-xs font-semibold text-slate-400 uppercase mb-2">Product Types</p><Badges items={v.productTypes} /></div>
            )}
            {v.specializations?.length > 0 && (
              <div><p className="text-xs font-semibold text-slate-400 uppercase mb-2">Specializations</p><Badges items={v.specializations} /></div>
            )}
            {v.categoryRemarks && <Row label="Remarks" value={v.categoryRemarks} />}
            {productPhotos.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Product Photos ({productPhotos.length})</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {productPhotos.map((p, i) => <DocThumb key={i} url={p.url} name={p.name} />)}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Manufacturing Facilities */}
      {(activeFacilities.length > 0 || v.qualityControl || v.shippingMethods?.length) && (
        <Section title="Manufacturing & Logistics" icon={<Wrench className="h-5 w-5" />}>
          {v.qualityControl && <Row label="Quality Control" value={v.qualityControl} />}
          {activeFacilities.length > 0 && (
            <div className="mt-3 space-y-3">
              {activeFacilities.map((fid) => {
                const details = facilityDetails[fid] || {};
                return (
                  <div key={fid} className="bg-slate-50/60 border border-slate-200 rounded-xl p-3">
                    <p className="text-sm font-bold text-slate-800 mb-1">{FACILITY_LABELS[fid] || titleCase(fid)}</p>
                    {Object.entries(details).filter(([, val]) => !blank(val)).map(([k, val]) => (
                      <Row key={k} label={humanize(k.replace(fid, ""))} value={val as any} />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
          {v.shippingMethods?.length > 0 && (
            <div className="mt-3"><p className="text-xs font-semibold text-slate-400 uppercase mb-2">Shipping Methods</p><Badges items={v.shippingMethods} /></div>
          )}
          <Row label="Packaging Capabilities" value={v.packagingCapabilities} />
          <Row label="Logistics Partners" value={v.logisticsPartners} />
          <Row label="Compliance Standards" value={v.complianceStandards} />
        </Section>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <Section title={`Certifications (${certifications.length})`} icon={<ShieldCheck className="h-5 w-5" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certifications.map((c, i) => (
              <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-800">{c.name}</p>
                  {c.isCustom && <Badge className="bg-amber-50 text-amber-700 border border-amber-200">Custom</Badge>}
                </div>
                {/* Label-over-value pairs — the full-width justify-between Row
                    pushed values against the card's right edge with a large
                    dead gap in the middle. */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {!blank(c.issuedBy) && (
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Issued By</p>
                      <p className="text-sm font-medium text-slate-900">{c.issuedBy}</p>
                    </div>
                  )}
                  {c.expiryDate && (
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Expiry Date</p>
                      <p className="text-sm font-medium text-slate-900">{new Date(c.expiryDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  {!blank(c.description) && (
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500 mb-0.5">Description</p>
                      <p className="text-sm font-medium text-slate-900 break-words">{c.description}</p>
                    </div>
                  )}
                </div>
                {c.documentUrl && (
                  <div className="w-40">
                    <DocThumb url={c.documentUrl} name="Certificate" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Contact & Trade */}
      {(mainContact || alternateContacts.length > 0 || v.importExperience || v.exportExperience || v.tradeLicenseNumber) && (
        <Section title="Contact & Trade" icon={<Phone className="h-5 w-5" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mainContact && (
              <div><p className="text-xs font-semibold text-slate-400 uppercase mb-2">Main Contact</p>{contactBlock(mainContact)}</div>
            )}
            {alternateContacts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Additional Contacts ({alternateContacts.length})</p>
                <div className="space-y-4">{alternateContacts.map((c, i) => <div key={i}>{contactBlock(c)}</div>)}</div>
              </div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <Row label="Trade License Number" value={v.tradeLicenseNumber} mono />
            <Row label="Business Registration Number" value={v.businessRegistrationNumber} mono />
            <Row label="Tax Identification Number" value={v.taxIdentificationNumber} mono />
          </div>
          {(v.importExperience || v.importCountries?.length > 0) && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Import Experience: {v.importExperience ? "Yes" : "No"}</p>
              {v.importCountries?.length > 0 && countryChips(v.importCountries, "bg-blue-50 text-blue-700 border-blue-200")}
            </div>
          )}
          {(v.exportExperience || v.exportCountries?.length > 0) && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Export Experience: {v.exportExperience ? "Yes" : "No"}</p>
              {v.exportCountries?.length > 0 && countryChips(v.exportCountries, "bg-emerald-50 text-emerald-700 border-emerald-200")}
            </div>
          )}
        </Section>
      )}

      {/* Bank Details */}
      {bank && (
        <Section title="Bank Details" icon={<Landmark className="h-5 w-5" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <Row label="Account Holder Name" value={bank.accountHolderName} />
              <Row label="Bank Name" value={bank.bankName} />
              <Row label="Account Number" value={bank.accountNumber} mono />
              <Row label="Account Type" value={titleCase(bank.accountType)} />
            </div>
            <div>
              <Row label="IFSC Code" value={bank.ifscCode} mono />
              <Row label="SWIFT / BIC" value={bank.swiftCode} mono />
              <Row label="IBAN" value={bank.iban} mono />
              <Row label="Branch" value={[bank.branchName, bank.branchAddress].filter(Boolean).join(", ")} />
            </div>
          </div>
        </Section>
      )}

      {/* Documents */}
      {fileDocs.length > 0 && (
        <Section title={`Documents (${fileDocs.length})`} icon={<FileText className="h-5 w-5" />}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {fileDocs.map((d, i) => <DocThumb key={i} url={d.documentUrl} name={d.name || titleCase(d.type)} />)}
          </div>
        </Section>
      )}
    </div>
  );
}
