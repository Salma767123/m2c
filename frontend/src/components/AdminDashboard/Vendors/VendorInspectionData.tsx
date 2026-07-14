"use client";

import React from "react";
import {
  Building2, User, Factory, Warehouse, Package, Wrench, ShieldCheck, Phone, Landmark, FileText, Image as ImageIcon, MapPin, Globe, Eye, Download,
} from "lucide-react";
import { Card, CardContent } from "../../UI/Card";
import { Badge } from "../../UI/Badge";
import { buildFullName, toExternalUrl } from "@/lib/utils";
import { openDoc } from "@/lib/docViewerBus";
import { downloadDoc } from "@/lib/docDownload";
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
// Compact label-over-value cell. Unlike Row (justify-between, which strands the
// value against the far edge with a dead gap), this stacks a small caption over
// the value so many fit neatly across a responsive grid. `wide` spans 2 grid
// columns (for addresses / longer values); `full` spans the whole row.
function Field({ label, value, mono, link, wide, full }: { label: string; value: any; mono?: boolean; link?: boolean; wide?: boolean; full?: boolean }) {
  if (blank(value)) return null;
  const href = link ? toExternalUrl(String(value)) : null;
  const span = full ? "col-span-full" : wide ? "col-span-2" : "";
  return (
    <div className={`min-w-0 ${span}`}>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline break-all">
          {String(value)}
        </a>
      ) : (
        <p className={`text-sm font-semibold text-slate-900 break-words ${mono ? "font-mono" : ""}`}>{String(value)}</p>
      )}
    </div>
  );
}

// Responsive grid for Field cells. Default packs 2 → 3 → 4 across breakpoints so
// wide sections stay dense with even spacing instead of one field per line.
function FieldGrid({ children, cols }: { children: React.ReactNode; cols?: string }) {
  return <div className={`grid ${cols || "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"} gap-x-6 gap-y-4`}>{children}</div>;
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

// Compact document row — icon + label + View/Download, matching the vendor
// profile document cards elsewhere. Replaces the tall placeholder tiles so
// non-image documents (GST / PAN / CIN / IEC / certificates) stay small.
function DocRow({ url, label, sub }: { url?: string; label: string; sub?: string }) {
  if (!url) return null;
  const img = isImageUrl(url);
  return (
    <div className="flex items-center gap-3 p-2.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors">
      {img ? (
        <img src={url} alt={label} className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" loading="lazy" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-500 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate" title={label}>{label}</p>
        {sub && sub !== label && <p className="text-xs text-slate-500 truncate" title={sub}>{sub}</p>}
      </div>
      <div className="flex gap-1 shrink-0">
        <button type="button" onClick={() => openDoc(url, label)} className="inline-flex items-center gap-1 h-7 px-2 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
          <Eye className="w-3 h-3" /> View
        </button>
        <button type="button" onClick={() => downloadDoc(url, label)} className="inline-flex items-center gap-1 h-7 px-2 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
          <Download className="w-3 h-3" /> Download
        </button>
      </div>
    </div>
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
      <FieldGrid cols="grid-cols-2">
        <Field label="Name" value={name} />
        <Field label="Designation" value={c.designation === "Others" ? c.customDesignation : titleCase(c.designation)} />
        <Field label="Department" value={c.department === "Others" ? c.customDepartment : c.department} />
        <Field label="Primary Email" value={c.email1 || c.email} />
        <Field label="Secondary Email" value={c.email2} />
        <Field label="Primary Phone" value={c.phone1 || c.phone} />
        <Field label="Secondary Phone" value={c.phone2} />
      </FieldGrid>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function VendorInspectionData({ vendor: v }: { vendor: any }) {
  if (!v) return null;

  const documents: any[] = Array.isArray(v.documents) ? v.documents : [];
  const factoryImages = documents.filter((d) => d?.type === "OTHER" && isImageUrl(d.documentUrl));
  const fileDocs = documents.filter((d) => !(d?.type === "OTHER" && isImageUrl(d.documentUrl)));

  // Split the vendor's factory/warehouse photos the same way the checker
  // inspection form does: "Factory Site …" photos belong to the Legal Address
  // & Factory Site; every other "Factory …" photo is a Warehouse photo.
  const isFactorySiteDoc = (name?: string) => (name || "").startsWith("Factory Site");
  const legalImages = factoryImages.filter((d) => isFactorySiteDoc(d.name));
  const warehouseImages = factoryImages.filter((d) => !isFactorySiteDoc(d.name));

  // Warehouse counts as "same as" the Legal Address & Factory Site when the
  // vendor entered no separate warehouse address, or one that matches the
  // factory address field-for-field (registration mirrors the factory address
  // into the warehouse columns when "Same as warehouse" is ticked).
  const eqStr = (a: any, b: any) => (a || "").toString().trim() === (b || "").toString().trim();
  const sameAsWarehouse =
    (!v.warehouseAddress && !v.warehouseCity) ||
    (eqStr(v.warehouseAddress, v.factoryAddress) &&
      eqStr(v.warehouseCity, v.factoryCity) &&
      eqStr(v.warehouseState, v.factoryState) &&
      eqStr(v.warehouseZipCode, v.factoryZipCode) &&
      eqStr(v.warehouseCountry, v.factoryCountry));
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
        <div className="flex flex-col-reverse lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <FieldGrid>
              <Field label="Company Name" value={v.companyName} />
              <Field label="Business Type" value={titleCase(v.businessType)} />
              <Field label="GST Number" value={v.gstNumber || (v.businessType === "unregistered" ? "Unregistered" : undefined)} mono />
              <Field label="PAN Number" value={v.panNumber} mono />
              <Field label="IEC Code" value={v.iecCode} mono />
              <Field label="Company ID / CIN" value={v.companyIdNumber} mono />
              <Field label="Aadhaar Number" value={v.aadhaarNumber} mono />
              <Field label="Website" value={v.website} link />
              <Field label="Established Year" value={v.establishedYear} />
              <Field label="Employee Count" value={v.employeeCount} />
              <Field label="Annual Turnover" value={v.annualTurnover} />
              <Field label="Description" value={v.companyDescription} full />
            </FieldGrid>
          </div>
          {v.companyLogo && (
            <div className="shrink-0">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Company Logo</p>
              <img src={v.companyLogo} alt="Company Logo" className="w-28 h-28 object-contain rounded-xl border border-slate-200 bg-white" />
            </div>
          )}
        </div>
      </Section>

      {/* Owner Profile */}
      <Section title="Owner Profile" icon={<User className="h-5 w-5" />}>
        <div className="flex flex-col sm:flex-row gap-6">
          {v.ownerPhoto && (
            <div className="shrink-0">
              <img src={v.ownerPhoto} alt="Owner" className="w-24 h-24 object-cover rounded-xl border border-slate-200" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <FieldGrid>
              <Field label="Owner Name" value={buildFullName(v.ownerTitle, v.ownerFirstName, v.ownerMiddleName, v.ownerLastName, v.ownerName)} />
              <Field label="Designation" value={v.designation === "Others" ? v.customDesignation : titleCase(v.designation)} />
              <Field label="Business Start Date" value={v.businessStartDate ? new Date(v.businessStartDate).toLocaleDateString() : undefined} />
              <Field label="Primary Email" value={v.ownerEmail} />
              <Field label="Secondary Email" value={v.ownerEmail2} />
              <Field label="Primary Phone" value={v.ownerPhone} />
              <Field label="Secondary Phone" value={v.ownerPhone2} />
              <Field label="Address" value={[v.ownerAddress, v.ownerCity, v.ownerState, v.ownerZipCode, v.ownerCountry].filter(Boolean).join(", ")} wide />
            </FieldGrid>
          </div>
        </div>
        {additionalOwners.length > 0 && (
          <div className="mt-6">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Additional Owners ({additionalOwners.length})</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {additionalOwners.map((o, i) => (
                <div key={i} className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 flex gap-4">
                  {o.photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={o.photo}
                      alt={`Owner ${i + 2} profile`}
                      className="w-14 h-14 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                  )}
                  <FieldGrid cols="grid-cols-2">
                    <Field label="Name" value={buildFullName(o.title, o.firstName, o.middleName, o.lastName, o.name)} />
                    <Field label="Designation" value={o.designation === "Others" ? o.customDesignation : titleCase(o.designation)} />
                    <Field label="Email" value={o.email} />
                    <Field label="Phone" value={o.phone} />
                  </FieldGrid>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Legal Address & Factory Site — mirrors the vendor registration form */}
      <Section title="Legal Address & Factory Site" icon={<Factory className="h-5 w-5" />}>
        <FieldGrid>
          <Field label="Ownership Type" value={titleCase(v.factoryOwnershipType || v.ownershipType)} />
          <Field label="Warehousing Capacity" value={v.factorySize} />
          <Field label="Address Line 1" value={v.factoryAddress} wide />
          <Field label="Address Line 2" value={v.addressLine2} />
          <Field label="Address Line 3" value={v.addressLine3} />
          <Field label="Landmark" value={v.landmark} />
          <Field label="City" value={v.factoryCity} />
          <Field label="State" value={v.factoryState} />
          <Field label="ZIP / Postal Code" value={v.factoryZipCode} />
          <Field label="Country" value={v.factoryCountry} />
        </FieldGrid>
        {v.mapLink && (
          <a href={v.mapLink.match(/src=["']([^"']+)["']/i)?.[1] || v.mapLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-sm text-brand-600 hover:underline">
            <MapPin className="w-4 h-4" /> View Map Location
          </a>
        )}
        {legalImages.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Factory Images ({legalImages.length})</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {legalImages.map((d, i) => <DocThumb key={i} url={d.documentUrl} name={d.name} />)}
            </div>
          </div>
        )}
      </Section>

      {/* Warehouse Details — separate section; collapses to a note when the
          vendor selected "Same as Legal Address & Factory Site". */}
      <Section title="Warehouse Details" icon={<Warehouse className="h-5 w-5" />}>
        {sameAsWarehouse ? (
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 font-medium">
              Warehouse details are the same as the Legal Address &amp; Factory Site.
            </p>
          </div>
        ) : (
          <>
            <FieldGrid>
              <Field label="Ownership Type" value={titleCase(v.ownershipType)} />
              <Field label="Warehousing Capacity" value={v.warehouseSize} />
              <Field label="Address Line 1" value={v.warehouseAddress} wide />
              <Field label="Address Line 2" value={v.warehouseAddressLine2} />
              <Field label="Address Line 3" value={v.warehouseAddressLine3} />
              <Field label="Landmark" value={v.warehouseLandmark} />
              <Field label="City" value={v.warehouseCity} />
              <Field label="State" value={v.warehouseState} />
              <Field label="ZIP / Postal Code" value={v.warehouseZipCode} />
              <Field label="Country" value={v.warehouseCountry} />
            </FieldGrid>
            {warehouseImages.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Warehouse Images ({warehouseImages.length})</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {warehouseImages.map((d, i) => <DocThumb key={i} url={d.documentUrl} name={d.name} />)}
                </div>
              </div>
            )}
          </>
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
            {v.categoryRemarks && <Field label="Remarks" value={v.categoryRemarks} />}
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
          {activeFacilities.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeFacilities.map((fid) => {
                const details = facilityDetails[fid] || {};
                return (
                  <div key={fid} className="bg-slate-50/60 border border-slate-200 rounded-xl p-4">
                    <p className="text-sm font-bold text-slate-800 mb-3">{FACILITY_LABELS[fid] || titleCase(fid)}</p>
                    <FieldGrid cols="grid-cols-2">
                      {Object.entries(details).filter(([, val]) => !blank(val)).map(([k, val]) => (
                        <Field key={k} label={humanize(k.replace(fid, ""))} value={val as any} />
                      ))}
                    </FieldGrid>
                  </div>
                );
              })}
            </div>
          )}
          {v.shippingMethods?.length > 0 && (
            <div className="mt-4"><p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Shipping Methods</p><Badges items={v.shippingMethods} /></div>
          )}
          <div className="mt-4">
            <FieldGrid>
              <Field label="Quality Control" value={v.qualityControl} wide />
              <Field label="Packaging Capabilities" value={v.packagingCapabilities} wide />
              <Field label="Logistics Partners" value={v.logisticsPartners} wide />
              <Field label="Compliance Standards" value={v.complianceStandards} wide />
            </FieldGrid>
          </div>
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
                  <DocRow url={c.documentUrl} label="Certificate" sub={c.name} />
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
          <div className="mt-4">
            <FieldGrid cols="grid-cols-2 lg:grid-cols-3">
              <Field label="Trade License Number" value={v.tradeLicenseNumber} mono />
              <Field label="Business Registration Number" value={v.businessRegistrationNumber} mono />
              <Field label="Tax Identification Number" value={v.taxIdentificationNumber} mono />
            </FieldGrid>
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
          <FieldGrid>
            <Field label="Account Holder Name" value={bank.accountHolderName} />
            <Field label="Bank Name" value={bank.bankName} />
            <Field label="Account Number" value={bank.accountNumber} mono />
            <Field label="Account Type" value={titleCase(bank.accountType)} />
            <Field label="IFSC Code" value={bank.ifscCode} mono />
            <Field label="SWIFT / BIC" value={bank.swiftCode} mono />
            <Field label="IBAN" value={bank.iban} mono />
            <Field label="Branch" value={[bank.branchName, bank.branchAddress].filter(Boolean).join(", ")} wide />
          </FieldGrid>
        </Section>
      )}

      {/* Documents */}
      {fileDocs.length > 0 && (
        <Section title={`Documents (${fileDocs.length})`} icon={<FileText className="h-5 w-5" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {fileDocs.map((d, i) => <DocRow key={i} url={d.documentUrl} label={d.name || titleCase(d.type) || "Document"} />)}
          </div>
        </Section>
      )}
    </div>
  );
}
