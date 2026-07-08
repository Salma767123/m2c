'use client';

import React, { useState } from 'react';
import { SquarePen, Calendar, Building2, Warehouse, UserCircle, Tags, Factory, ShieldCheck, Briefcase, Globe, FileText } from 'lucide-react';
import { AccordionSection, getLandlineDisplay } from '../FormUI';
import { buildFullName, calculateDuration } from '@/lib/utils';

/**
 * Read-only summary of a vendor's collected registration data. Shared by
 * the vendor-facing `ReviewSubmit` (Step 8) and the admin-facing
 * `AdminReviewSubmitStep` (inside AddEditVendor) so the two flows stay
 * field-identical by construction. If `onGoToStep` is provided, each
 * section header renders an Edit button that jumps back to that step.
 *
 * `categoryNameMap` is optional — when provided (vendor flow fetches it
 * from the category service), product category IDs are resolved to
 * human-readable names. Otherwise the raw ID is shown.
 */

interface VendorDataSummaryProps {
  data: any;
  onGoToStep?: (step: number) => void;
  categoryNameMap?: Record<string, string>;
}

interface Certificate {
  id: string;
  label: string;
}

interface CertificateStatus {
  status: 'expired' | 'expiring' | 'warning' | 'valid';
  message: string;
  color: string;
}

// ── Local presentational helpers ────────────────────────────────────────

const InfoRow: React.FC<{ label: string; value: string | React.ReactNode }> = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-start py-3 border-b border-slate-100 last:border-0 px-6">
    <span className="text-sm font-medium text-slate-500 sm:w-1/3 shrink-0">{label}</span>
    <span className="text-sm font-medium text-slate-900 sm:w-2/3">{value || '—'}</span>
  </div>
);

// Address block rendered field-by-field in the same order as the address
// form (Line 1 / 2 / 3, Landmark, City, State, Country, ZIP) instead of a
// single concatenated "Address" row. Optional lines only render when filled.
const AddressRows: React.FC<{
  line1?: string;
  line2?: string;
  line3?: string;
  landmark?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
}> = ({ line1, line2, line3, landmark, city, state, country, zip }) => (
  <>
    <InfoRow label="Address Line 1" value={line1} />
    {line2 && <InfoRow label="Address Line 2" value={line2} />}
    {line3 && <InfoRow label="Address Line 3" value={line3} />}
    {landmark && <InfoRow label="Landmark" value={landmark} />}
    <InfoRow label="City" value={city} />
    <InfoRow label="State / Province" value={state} />
    <InfoRow label="Country" value={country} />
    <InfoRow label="ZIP / Postal Code" value={zip} />
  </>
);

// Resolve a previewable URL from the many shapes a stored file/photo can take:
// a plain string (blob/data/remote URL), a File object, or a wrapper
// `{ file, preview/url/name }` produced by the upload helpers.
const resolveImageUrl = (val: any): string | null => {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (typeof File !== 'undefined' && val instanceof File) {
    try { return URL.createObjectURL(val); } catch { return null; }
  }
  if (typeof val === 'object') {
    return val.preview || val.url || val.dataUrl || null;
  }
  return null;
};

// Small thumbnail used for photos (owner, contact) and image documents.
// Uses a plain <img> because previews are blob:/data: URLs that next/image
// can't optimize.
const Thumb: React.FC<{ src: string; alt: string; rounded?: boolean }> = ({ src, alt, rounded }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={src}
    alt={alt}
    className={`w-20 h-20 object-cover border border-slate-200 ${rounded ? 'rounded-full' : 'rounded-lg'}`}
  />
);

// Render either an image thumbnail (when the underlying file really is an
// image) or a document chip for non-image uploads (PDF / DOC / XLS). The
// image check must inspect the original File's MIME type / file name — a
// PDF File resolves to an extension-less `blob:` URL, and feeding that to
// <img> renders a broken thumbnail.
const DocValue: React.FC<{ src: any; alt: string }> = ({ src, alt }) => {
  const file: File | null =
    typeof File !== 'undefined' && src instanceof File
      ? src
      : typeof File !== 'undefined' && src?.file instanceof File
        ? src.file
        : null;
  const rawName: string =
    file?.name ||
    (src && typeof src === 'object' ? src.name || '' : '') ||
    (typeof src === 'string' ? src : '');
  // Basename without query string — string sources can be full URLs.
  const fileName = rawName.split(/[/\\]/).pop()?.split('?')[0] || '';
  const isNonImageDoc =
    (file ? !file.type.startsWith('image/') : false) ||
    /\.(pdf|docx?|xlsx?)$/i.test(fileName) ||
    /^data:application\//i.test(typeof src === 'string' ? src : '');

  const url = resolveImageUrl(src);
  if (!isNonImageDoc && url && /^(blob:|data:image|https?:)/.test(url)) {
    return <Thumb src={url} alt={alt} />;
  }
  if (src) {
    return (
      <span className="inline-flex items-center gap-2 max-w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <FileText className="w-4 h-4 text-brand-500 shrink-0" aria-hidden="true" />
        <span className="text-xs font-semibold text-slate-700 truncate">{fileName || alt}</span>
        <span className="text-[10px] font-bold text-success-700 bg-success-50 border border-success-200/50 rounded px-1.5 py-0.5 shrink-0">
          Uploaded
        </span>
      </span>
    );
  }
  return <span className="text-slate-400">Not uploaded</span>;
};

// ── Label resolvers ─────────────────────────────────────────────────────

const getVendorTypeLabel = (types: string | string[]): string => {
  const labels: Record<string, string> = {
    'manufacturer': 'Manufacturer',
    'importer': 'Importer',
    'exporter': 'Exporter',
    'trader': 'Trader',
  };
  if (Array.isArray(types)) return types.map((t) => labels[t] || t).join(', ');
  return labels[types] || types;
};

const getMarketTypeLabel = (type: string | string[]): string => {
  const labels: Record<string, string> = {
    'domestic': 'Domestic',
    'international': 'International',
  };
  if (Array.isArray(type)) return type.map((t) => labels[t] || t).join(', ');
  return labels[type] || type;
};

const getBusinessTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'proprietorship': 'Proprietorship',
    'pvt-ltd': 'Pvt Ltd',
    'partnership-firm': 'Partnership Firm',
    'llp': 'LLP',
    // Legacy values still in the wild
    'sole': 'Sole Proprietorship',
    'partnership': 'Partnership',
    'corporation': 'Corporation',
    'llc': 'Limited Liability Company (LLC)',
  };
  return labels[type] || type;
};

const getEmployeeCountLabel = (count: string): string => {
  const labels: Record<string, string> = {
    '10-20': '10-20 employees',
    '20-50': '20-50 employees',
    '50-100': '50-100 employees',
    '100+': '100+ employees',
  };
  return labels[count] || count;
};

const getOwnershipTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'owned': 'Owned',
    'rented': 'Rented',
    'lease': 'Lease',
  };
  return labels[type] || type;
};

const getCompanyIdLabel = (businessType: string): string => {
  const labels: Record<string, string> = {
    'proprietorship': 'IEC Code',
    'pvt-ltd': 'CIN Number',
    'partnership-firm': 'Partnership Deed',
    'llp': 'LLPIN Number',
  };
  return labels[businessType] || 'Business Registration ID';
};

const getCertificateStatus = (expiryDate: string): CertificateStatus | null => {
  if (!expiryDate) return null;
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilExpiry < 0) {
    return { status: 'expired', message: 'Expired', color: 'text-error-700 bg-error-50 border border-error-200/50' };
  } else if (daysUntilExpiry <= 30) {
    return { status: 'expiring', message: `Expires in ${daysUntilExpiry} days`, color: 'text-amber-700 bg-amber-50 border border-amber-200/50 font-medium' };
  } else if (daysUntilExpiry <= 90) {
    return { status: 'warning', message: `Expires in ${daysUntilExpiry} days`, color: 'text-yellow-700 bg-yellow-50 border border-yellow-200/50 font-medium' };
  } else {
    return { status: 'valid', message: `Valid until ${expiry.toLocaleDateString('en-IN')}`, color: 'text-success-700 bg-success-50 border border-success-200/50 font-medium' };
  }
};

const isManufacturerFromData = (data: any): boolean => {
  const types = data.vendorType || [];
  return Array.isArray(types) ? types.includes('manufacturer') : types === 'manufacturer';
};

// ── Component ───────────────────────────────────────────────────────────

export default function VendorDataSummary({
  data,
  onGoToStep,
  categoryNameMap = {},
}: VendorDataSummaryProps) {
  const isManufacturer = isManufacturerFromData(data);

  const [activeSection, setActiveSection] = useState<string>('company');

  // Canonical step indices into the 8-step wizard. VendorPanel / AddEditVendor
  // always render all 8 steps in the sidebar; Manufacturing Facilities (index 4)
  // is auto-skipped at nav-time for non-manufacturers, so no mapping is needed here.
  const getStepNumber = (logicalStep: string): number => {
    const stepMap: Record<string, number> = {
      'company': 0,
      'warehouse': 1,
      'owner': 2,
      'vendor': 3,
      'manufacturing': 4,
      'certifications': 5,
      'contact': 6,
    };
    return stepMap[logicalStep] ?? 0;
  };

  const renderEditBtn = (step: number) => {
    if (!onGoToStep) return null;
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onGoToStep(step); }}
        className="text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors px-3 py-1.5 rounded-md flex items-center gap-1 text-sm font-semibold"
      >
        <SquarePen className="w-4 h-4" aria-hidden="true" />
        Edit
      </button>
    );
  };

  const sectionProps = (id: string, title: string, subtitle: string, icon: any, stepNum: number) => ({
    id,
    title,
    subtitle,
    icon,
    isOpen: activeSection === id,
    status: 'complete' as const,
    hasErrors: false,
    onActivate: () => setActiveSection(activeSection === id ? '' : id),
    headerExtra: renderEditBtn(stepNum)
  });

  // Manufacturing Facilities labels
  const enabledFacilities = Object.entries(data.enabledFacilities || {})
    .filter(([_, enabled]) => enabled)
    .map(([id]) => {
      const facilityLabels: Record<string, string> = {
        spinning: 'Spinning',
        weaving: 'Weaving',
        dyeing: 'Dyeing',
        printing: 'Printing',
        stitching: 'Stitching',
        finishing: 'Finishing',
      };
      return facilityLabels[id] || id;
    })
    .filter(Boolean);

  // Certifications
  const selectedCerts: Certificate[] = (data.selectedCertifications || []).map((c: string) => {
    const certLabels: Record<string, string> = {
      'oeko-tex': 'OEKO-TEX',
      'gots': 'GOTS',
      'grs': 'GRS',
      'smeta': 'SMETA / Sedex',
      'iso-9001': 'ISO 9001',
      'iso-14001': 'ISO 14001',
      'bsci': 'BSCI',
      'fsc': 'FSC',
      'fair-trade': 'Fair Trade',
      'wrap': 'WRAP',
      'bci': 'BCI',
    };
    return { id: c, label: certLabels[c] || c };
  });

  // Selected product categories (IDs resolved to names via categoryNameMap)
  const getSelectedCategories = (): string[] => {
    const categories = data.selectedCategories || {};
    const result: string[] = [];
    Object.entries(categories).forEach(([categoryId, subCategories]) => {
      if (Array.isArray(subCategories) && subCategories.length > 0) {
        const categoryName = categoryNameMap[categoryId] || categoryId;
        result.push(`${categoryName}: ${subCategories.join(', ')}`);
      }
    });
    return result;
  };

  return (
    <div className="space-y-6">
      <AccordionSection {...sectionProps('company', 'Company Details', 'Business identity and registration info', <Building2 className="w-4.5 h-4.5" aria-hidden="true" />, getStepNumber('company'))}>
        <div className="flex flex-col">
          <InfoRow label="Business Type" value={getBusinessTypeLabel(data.businessType)} />
          <InfoRow label="Company Name" value={data.companyName} />
          <InfoRow label="GST Number" value={data.gstNumber || 'Not provided'} />
          {/* Type-specific regulatory ID — IEC / CIN / Deed / LLPIN. */}
          {data.companyIdNumber && (
            <InfoRow
              label={getCompanyIdLabel(data.businessType)}
              value={data.companyIdNumber}
            />
          )}
          {data.panNumber && <InfoRow label={data.businessType === 'proprietorship' ? 'Proprietor PAN Number' : 'Company PAN Number'} value={data.panNumber} />}
          {data.aadhaarNumber && <InfoRow label="Aadhaar Number" value={data.aadhaarNumber} />}
          <InfoRow label="Primary Email" value={data.email} />
          {data.email2 && <InfoRow label="Secondary Email" value={data.email2} />}
          <InfoRow label="Primary Phone" value={data.phone} />
          {data.phoneNumber2 && <InfoRow label="Secondary Phone" value={data.phoneNumber2} />}
          {data.landlineNumber && <InfoRow label="Local Landline" value={data.landlineNumber} />}
          {data.intlLandline && <InfoRow label="International Landline" value={data.intlLandline} />}
          <InfoRow label="Website" value={data.website} />
          <AddressRows
            line1={data.address}
            line2={data.addressLine2}
            line3={data.addressLine3}
            landmark={data.landmark}
            city={data.city}
            state={data.state}
            country={data.country}
            zip={data.zipCode}
          />
          {data.factoryOwnershipType && (
            <InfoRow
              label="Factory Ownership Type"
              value={<span className="capitalize">{data.factoryOwnershipType}</span>}
            />
          )}
          <InfoRow label="Same as Warehouse" value={data.sameAsWarehouse ? 'Yes' : 'No'} />
          {/* Factory-site capacity + photos collected on Step 1. When the
              "Same as warehouse" link is on they're mirrored into the
              warehouse fields and shown in that section instead, so only
              render here when the link is off to avoid duplicate rows. */}
          {!data.sameAsWarehouse && data.factorySiteCapacity && (
            <InfoRow label="Factory Site Capacity" value={`${data.factorySiteCapacity} sq ft`} />
          )}
          {!data.sameAsWarehouse && (() => {
            const fsi = data.factorySiteImages;
            const entries = fsi ? Object.entries(fsi) : [];
            const thumbs = entries
              .map(([key, val]: [string, any]) => ({ key, url: resolveImageUrl(val?.preview || val?.url || val?.file || val) }))
              .filter((t) => !!t.url);
            if (thumbs.length === 0) return null;
            return (
              <InfoRow
                label="Factory Site Images"
                value={
                  <div className="flex flex-wrap gap-2">
                    {thumbs.map((t) => (
                      <Thumb key={t.key} src={t.url as string} alt="Factory site image" />
                    ))}
                  </div>
                }
              />
            );
          })()}
          <InfoRow label="Company Logo" value={<DocValue src={data.logo || data.logoFile} alt="Company logo" />} />
          <InfoRow label="GST Certificate" value={<DocValue src={data.gstDocument || data.gstFile} alt="GST certificate" />} />
          <InfoRow label={data.businessType === 'proprietorship' ? 'Proprietor PAN Card' : 'Company PAN Card'} value={<DocValue src={data.panCardDocument || data.panCardFile} alt="PAN card" />} />
          {(data.typeCertFile || data.typeCertDocument) && (
            <InfoRow label="Business Reg. Certificate" value={<DocValue src={data.typeCertDocument || data.typeCertFile} alt="Business registration certificate" />} />
          )}
          {(data.aadhaarFile || data.aadhaarDocument) && (
            <InfoRow label="Aadhaar Card" value={<DocValue src={data.aadhaarDocument || data.aadhaarFile} alt="Aadhaar card" />} />
          )}
        </div>
      </AccordionSection>

      <AccordionSection {...sectionProps('warehouse', 'Warehouse / Factory', 'Operating locations and premises', <Warehouse className="w-4.5 h-4.5" aria-hidden="true" />, getStepNumber('warehouse'))}>
        <div className="flex flex-col">
          {data.sameAsWarehouse ? (
            /* Linked to Company Details — repeating the mirrored address /
               photos here would just duplicate the section above. */
            <div className="px-6 py-4 text-sm font-semibold text-slate-700">
              Same as Warehouse — uses the company address &amp; factory photos from Company Details.
            </div>
          ) : (
            <>
              <InfoRow label="Ownership Type" value={getOwnershipTypeLabel(data.ownershipType)} />
              {data.warehousingCapacity && (
                <InfoRow label="Warehousing Capacity" value={`${data.warehousingCapacity} sq ft`} />
              )}
              <AddressRows
                line1={data.warehouseAddress}
                line2={data.warehouseAddressLine2}
                line3={data.warehouseAddressLine3}
                landmark={data.warehouseLandmark}
                city={data.warehouseCity}
                state={data.warehouseState}
                country={data.warehouseCountry}
                zip={data.warehouseZip}
              />
              {(() => {
                const fi = data.factoryImages;
                const entries: { key: string; val: any }[] = fi
                  ? Array.isArray(fi)
                    ? fi.map((v: any, i: number) => ({ key: String(i), val: v }))
                    : Object.entries(fi).map(([k, v]) => ({ key: k, val: v }))
                  : [];
                const thumbs = entries
                  .map((e) => ({ key: e.key, url: resolveImageUrl(e.val?.preview || e.val?.url || e.val?.file || e.val) }))
                  .filter((t) => !!t.url);
                return (
                  <InfoRow
                    label="Factory Images"
                    value={
                      thumbs.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {thumbs.map((t) => (
                            <Thumb key={t.key} src={t.url as string} alt="Factory image" />
                          ))}
                        </div>
                      ) : (
                        `${entries.length} file(s) uploaded`
                      )
                    }
                  />
                );
              })()}
              <InfoRow label="Map Link" value={data.mapLink ? 'Provided' : 'Not provided'} />
            </>
          )}
        </div>
      </AccordionSection>

      <AccordionSection {...sectionProps('owner', 'Owner Profile', 'Key personnel details', <UserCircle className="w-4.5 h-4.5" aria-hidden="true" />, getStepNumber('owner'))}>
        <div className="flex flex-col">
          {(() => {
            const ownerPhotoUrl = resolveImageUrl(data.ownerPhoto || data.ownerPhotoFile);
            return ownerPhotoUrl ? (
              <InfoRow label="Profile Photo" value={<Thumb src={ownerPhotoUrl} alt="Owner profile photo" rounded />} />
            ) : null;
          })()}
          <InfoRow label="Owner Name" value={buildFullName(data.ownerTitle, data.ownerFirstName, data.ownerMiddleName, data.ownerLastName, data.ownerName)} />
          {data.designation && (
            <InfoRow
              label="Designation"
              value={<span className="capitalize">{data.designation}</span>}
            />
          )}
          {data.designation === 'Others' && data.customDesignation && (
            <InfoRow label="Custom Designation" value={data.customDesignation} />
          )}
          <InfoRow label="Primary Email" value={data.ownerEmail} />
          {data.ownerEmail2 && <InfoRow label="Secondary Email" value={data.ownerEmail2} />}
          <InfoRow label="Primary Phone" value={data.ownerPhone} />
          {data.ownerPhone2 && <InfoRow label="Secondary Phone" value={data.ownerPhone2} />}
          {data.ownerLandline && <InfoRow label="Local Landline" value={data.ownerLandline} />}
          {data.ownerIntlLandline && <InfoRow label="International Landline" value={data.ownerIntlLandline} />}
          {data.businessStartDate ? (
            <InfoRow
              label="Business Start Date"
              value={new Date(data.businessStartDate).toLocaleDateString('en-IN')}
            />
          ) : (
            <InfoRow label="Year Established" value={data.yearEstablished} />
          )}
          <InfoRow label="Employee Count" value={getEmployeeCountLabel(data.employeeCount)} />
          {/* Same formatter as the form's read-only "Total Business Duration"
              field (e.g. "13 Years / 6 Months / 12 Days") so the review shows
              exactly what the vendor saw while filling the step. */}
          <InfoRow
            label="Total Business Duration"
            value={(() => {
              const duration = calculateDuration(data.businessStartDate || '');
              if (duration) return duration;
              // Legacy records that only carry a year of establishment.
              if (data.yearEstablished) {
                const years = new Date().getFullYear() - parseInt(data.yearEstablished, 10);
                if (!isNaN(years) && years >= 0) return `${years} Year${years === 1 ? '' : 's'}`;
              }
              return 'N/A';
            })()}
          />
          {data.additionalOwners && data.additionalOwners.length > 0 && (
            <>
              <div className="border-t border-slate-100 pt-2 mt-2 px-6">
                <p className="text-sm font-bold text-slate-900 mb-1">
                  Additional Owners ({data.additionalOwners.length})
                </p>
              </div>
              {data.additionalOwners.map((owner: any, index: number) => (
                <div key={index} className="pl-4 border-l-2 border-slate-200 space-y-1 my-2">
                  <p className="text-sm font-bold text-slate-800 px-6 mt-2">Owner {index + 2}</p>
                  <InfoRow label="Name" value={buildFullName(owner.title, owner.firstName, owner.middleName, owner.lastName, owner.name)} />
                  {owner.designation && <InfoRow label="Designation" value={owner.designation} />}
                  {owner.designation === 'Others' && owner.customDesignation && (
                    <InfoRow label="Custom Designation" value={owner.customDesignation} />
                  )}
                  <InfoRow label="Primary Email" value={owner.email} />
                  {owner.email2 && <InfoRow label="Secondary Email" value={owner.email2} />}
                  <InfoRow label="Primary Phone" value={owner.phone} />
                  {owner.phone2 && <InfoRow label="Secondary Phone" value={owner.phone2} />}
                  {owner.localLandline && <InfoRow label="Local Landline" value={owner.localLandline} />}
                  {owner.intlLandline && <InfoRow label="International Landline" value={owner.intlLandline} />}
                  {!owner.localLandline && !owner.intlLandline && owner.landline && (
                    <InfoRow label="Landline" value={owner.landline} />
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </AccordionSection>

      <AccordionSection {...sectionProps('vendor', 'Vendor Type & Products', 'Business model and catalogue', <Tags className="w-4.5 h-4.5" aria-hidden="true" />, getStepNumber('vendor'))}>
        <div className="flex flex-col">
          <InfoRow label="Vendor Type" value={getVendorTypeLabel(data.vendorType)} />
          <InfoRow label="Market Focus" value={getMarketTypeLabel(data.marketType)} />
          <InfoRow
            label="Product Categories"
            value={
              getSelectedCategories().length > 0 ? (
                <div className="space-y-1">
                  {getSelectedCategories().map((category, index) => (
                    <div key={index} className="text-sm">{category}</div>
                  ))}
                </div>
              ) : (
                'None selected'
              )
            }
          />
          {(() => {
            const categoryProducts: Record<string, any[]> = data.categoryProducts || {};
            const additionalCategories: any[] = data.additionalCategories || [];
            const groups: { name: string; products: any[] }[] = [];
            Object.entries(categoryProducts).forEach(([catId, products]) => {
              if (Array.isArray(products) && products.length > 0) {
                groups.push({ name: categoryNameMap[catId] || catId, products });
              }
            });
            additionalCategories.forEach((cat) => {
              if (cat && Array.isArray(cat.products) && cat.products.length > 0) {
                groups.push({ name: cat.name || 'Custom Category', products: cat.products });
              }
            });
            if (groups.length === 0) return null;
            return (
              <InfoRow
                label="Products"
                value={
                  <div className="space-y-3">
                    {groups.map((group, gi) => (
                      <div key={gi}>
                        <p className="text-xs font-semibold text-slate-500 mb-1.5">{group.name}</p>
                        <div className="space-y-2">
                          {group.products.map((product: any, pi: number) => {
                            const photos = Array.isArray(product.photos) ? product.photos : [];
                            return (
                              <div key={product.id || pi} className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 bg-slate-100 text-slate-800 rounded text-xs font-semibold border border-slate-200">
                                  {product.name || `Product ${pi + 1}`}
                                </span>
                                {photos.map((photo: any, phi: number) => {
                                  const url = resolveImageUrl(photo?.preview || photo?.file || photo);
                                  return url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      key={phi}
                                      src={url}
                                      alt={product.name || 'Product photo'}
                                      className="w-12 h-12 object-cover rounded border border-slate-200"
                                    />
                                  ) : null;
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                }
              />
            );
          })()}
          {data.categoryRemarks && (
            <InfoRow
              label="Category Remarks"
              value={
                <div className="text-sm bg-slate-50/50 p-2.5 rounded-lg border border-slate-200 leading-relaxed text-slate-700">
                  {data.categoryRemarks}
                </div>
              }
            />
          )}
        </div>
      </AccordionSection>

      {/* Always rendered so the review mirrors the 8-step sidebar. For
          non-manufacturers with no facility data the step is nav-skipped,
          so the section states "Not applicable" instead of vanishing —
          a missing section reads as lost data. Facility data is still
          shown even if vendorType is missing/out-of-sync. */}
      <AccordionSection {...sectionProps('manufacturing', 'Manufacturing Facilities', 'Production capabilities', <Factory className="w-4.5 h-4.5" aria-hidden="true" />, getStepNumber('manufacturing'))}>
        <div className="flex flex-col">
          {isManufacturer || enabledFacilities.length > 0 ? (
            <>
              <InfoRow
                label="Active Facilities"
                value={enabledFacilities.length > 0 ? enabledFacilities.join(', ') : 'None selected'}
              />
              {Object.entries(data.facilityDetails || {}).map(([facilityId, details]: [string, any]) => {
                if (!data.enabledFacilities?.[facilityId]) return null;
                const facilityName = enabledFacilities.find((f) => f.toLowerCase().includes(facilityId)) || facilityId;
                return (
                  <div key={facilityId} className="ml-4 space-y-1 border-l-2 border-slate-200 pl-4 my-2">
                    <div className="font-bold text-sm text-slate-900 px-6 py-2">{facilityName} Details:</div>
                    {Object.entries(details || {}).map(([key, value]: [string, any]) => (
                      <InfoRow
                        key={key}
                        label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        value={value}
                      />
                    ))}
                  </div>
                );
              })}
            </>
          ) : (
            <InfoRow
              label="Manufacturing Facilities"
              value="Not applicable — vendor type does not include Manufacturer"
            />
          )}
        </div>
      </AccordionSection>

      <AccordionSection {...sectionProps('certifications', 'Certifications & Quality Control', 'Quality standards and certifications', <ShieldCheck className="w-4.5 h-4.5" aria-hidden="true" />, getStepNumber('certifications'))}>
        <div className="flex flex-col">
          <InfoRow
            label="Certifications"
            value={
              selectedCerts.length > 0 ? (
                <div className="space-y-3">
                  {selectedCerts.map((cert: Certificate) => {
                    const expiryDate = data.certificationExpiryDates?.[cert.id];
                    const status = expiryDate ? getCertificateStatus(expiryDate) : null;
                    const hasFile = data.certificationFiles?.[cert.id];
                    return (
                      <div key={cert.id} className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 hover:border-slate-300 transition-colors duration-150">
                        <div className="flex items-center justify-between mb-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-brand-50 text-brand-600 border border-brand-100/30 rounded text-xs font-semibold">
                            {cert.label}
                          </span>
                          <div className="flex items-center gap-2 text-xs">
                            {hasFile ? (
                              <span className="text-success-700 bg-success-50 px-2.5 py-0.5 rounded border border-success-200/50 font-semibold">
                                ✓ File Uploaded
                              </span>
                            ) : (
                              <span className="text-slate-500 bg-slate-100/80 px-2.5 py-0.5 rounded border border-slate-200/50 font-medium">
                                No File
                              </span>
                            )}
                          </div>
                        </div>
                        {expiryDate ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-600 font-medium">
                              Expires: {new Date(expiryDate).toLocaleDateString('en-IN')}
                            </span>
                            {status && (
                              <span className={`text-xs px-2 py-0.5 rounded border ${status.color} ml-2`}>
                                {status.message}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-300" />
                            <span className="text-sm text-slate-400 font-medium">No expiry date set</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                'None selected'
              )
            }
          />
          {Array.isArray(data.otherCertifications) && data.otherCertifications.length > 0 && (
            <InfoRow
              label="Other Certifications"
              value={
                <div className="space-y-2">
                  {data.otherCertifications.map((cert: any) => (
                    <div key={cert.id} className="border border-orange-200 bg-orange-50/40 rounded-lg p-3">
                      <p className="text-sm font-semibold text-slate-900">{cert.name}</p>
                      {cert.description && (
                        <p className="text-xs text-slate-600 mt-1">{cert.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              }
            />
          )}
          <InfoRow label="Quality Control Process" value={data.qualityControlProcess || 'Not provided'} />
          <InfoRow label="Compliance Standards" value={data.complianceStandards || 'Not provided'} />
          {data.packagingCapabilities && <InfoRow label="Packaging Capabilities" value={data.packagingCapabilities} />}
          {data.logisticsPartners && <InfoRow label="Logistics Partners" value={data.logisticsPartners} />}
          {Array.isArray(data.shippingMethods) && data.shippingMethods.length > 0 && (
            <InfoRow
              label="Shipping Methods"
              value={
                <div className="flex flex-wrap gap-2">
                  {data.shippingMethods.map((method: string) => (
                    <span key={method} className="inline-flex items-center px-2.5 py-0.5 bg-slate-100 text-slate-800 rounded text-xs font-semibold border border-slate-200">
                      {method}
                    </span>
                  ))}
                </div>
              }
            />
          )}
        </div>
      </AccordionSection>

      <AccordionSection {...sectionProps('contact', 'Contact & Trade', 'Key contacts and regulatory IDs', <Briefcase className="w-4.5 h-4.5" aria-hidden="true" />, getStepNumber('contact'))}>
        <div className="flex flex-col">
          {/* Contact Person 1 — mirrors the "Main Contact Person" section of the
              Contact & Trade form, which numbers additional contacts from 2. */}
          <div className="font-bold text-sm text-slate-900 px-6 py-2">Contact Person 1</div>
          {(() => {
            const contactPhotoUrl = resolveImageUrl(data.mainContact?.photo || data.mainContact?.photoFile);
            return contactPhotoUrl ? (
              <InfoRow label="Profile Photo" value={<Thumb src={contactPhotoUrl} alt="Contact person 1 photo" rounded />} />
            ) : null;
          })()}
          <InfoRow label="Name" value={buildFullName(data.mainContact?.title, data.mainContact?.firstName, data.mainContact?.middleName, data.mainContact?.lastName, data.mainContact?.name) || 'Not provided'} />
          <InfoRow
            label="Designation"
            value={data.mainContact?.designation || 'Not provided'}
          />
          {data.mainContact?.designation === 'Others' && data.mainContact?.customDesignation && (
            <InfoRow label="Custom Designation" value={data.mainContact.customDesignation} />
          )}
          <InfoRow label="Primary Email" value={data.mainContact?.email1 || data.mainContact?.email || 'Not provided'} />
          {data.mainContact?.email2 && (
            <InfoRow label="Secondary Email" value={data.mainContact.email2} />
          )}
          <InfoRow label="Primary Phone" value={data.mainContact?.phone1 || data.mainContact?.phone || 'Not provided'} />
          {data.mainContact?.phone2 && (
            <InfoRow label="Secondary Phone" value={data.mainContact.phone2} />
          )}
          {(() => {
            const ll = getLandlineDisplay(data.mainContact);
            return (
              <>
                {ll.local && <InfoRow label="Local Landline" value={ll.local} />}
                {ll.intl && <InfoRow label="International Landline" value={ll.intl} />}
                {!ll.hasNew && ll.legacy && <InfoRow label="Landline" value={ll.legacy} />}
              </>
            );
          })()}
          <InfoRow
            label="Department"
            value={data.mainContact?.department || 'Not provided'}
          />
          {data.mainContact?.department === 'Others' && data.mainContact?.customDepartment && (
            <InfoRow label="Custom Department" value={data.mainContact.customDepartment} />
          )}
          {(data.alternateContacts || []).map((contact: any, index: number) => (
            <div key={contact.id || index}>
              <div className="font-bold text-sm text-slate-900 px-6 py-2">Contact Person {index + 2}</div>
              <InfoRow label="Name" value={buildFullName(contact.title, contact.firstName, contact.middleName, contact.lastName, contact.name) || 'Not provided'} />
              <InfoRow
                label="Designation"
                value={contact.designation || 'Not provided'}
              />
              {contact.designation === 'Others' && contact.customDesignation && (
                <InfoRow label="Custom Designation" value={contact.customDesignation} />
              )}
              <InfoRow label="Primary Email" value={contact.email1 || contact.email || 'Not provided'} />
              {contact.email2 && <InfoRow label="Secondary Email" value={contact.email2} />}
              <InfoRow label="Primary Phone" value={contact.phone1 || contact.phone || 'Not provided'} />
              {contact.phone2 && <InfoRow label="Secondary Phone" value={contact.phone2} />}
              {(() => {
                const ll = getLandlineDisplay(contact);
                return (
                  <>
                    {ll.local && <InfoRow label="Local Landline" value={ll.local} />}
                    {ll.intl && <InfoRow label="International Landline" value={ll.intl} />}
                    {!ll.hasNew && ll.legacy && <InfoRow label="Landline" value={ll.legacy} />}
                  </>
                );
              })()}
              {contact.department && (
                <InfoRow label="Department" value={contact.department} />
              )}
              {contact.department === 'Others' && contact.customDepartment && (
                <InfoRow label="Custom Department" value={contact.customDepartment} />
              )}
            </div>
          ))}
          {data.tradeLicenseNumber && <InfoRow label="Trade License Number" value={data.tradeLicenseNumber} />}
          {data.businessRegistrationNumber && <InfoRow label="Business Registration Number" value={data.businessRegistrationNumber} />}
          {data.taxIdentificationNumber && <InfoRow label="Tax Identification Number" value={data.taxIdentificationNumber} />}
          {data.bankingDetails?.bankName && (
            <>
              <InfoRow label="Bank Name" value={data.bankingDetails.bankName} />
              {data.bankingDetails.accountNumber && (
                <InfoRow label="Account Number" value={'****' + data.bankingDetails.accountNumber.slice(-4)} />
              )}
              {data.bankingDetails.swiftCode && <InfoRow label="SWIFT / BIC Code" value={data.bankingDetails.swiftCode} />}
              {data.bankingDetails.iban && <InfoRow label="IBAN" value={data.bankingDetails.iban} />}
            </>
          )}
        </div>
      </AccordionSection>

      {/* Import / Export lives in its own section — the yes/no + IEC come from
          Company Details (step 1) and the countries from Contact & Trade
          (step 7); the Edit button targets the countries step. */}
      <AccordionSection {...sectionProps('importExport', 'Import & Export', 'Trade activity, IEC and countries', <Globe className="w-4.5 h-4.5" aria-hidden="true" />, getStepNumber('contact'))}>
        <div className="flex flex-col">
          <InfoRow
            label="Import/Export Activities"
            value={data.hasImportExport === 'yes' ? 'Yes' : data.hasImportExport === 'no' ? 'No' : 'Not specified'}
          />
          {data.hasImportExport === 'yes' && (
            <>
              {data.iecCode && <InfoRow label="IEC Code" value={data.iecCode} />}
              {(data.iecCertFile || data.iecCertDocument) && (
                <InfoRow label="IEC Certificate" value={<DocValue src={data.iecCertDocument || data.iecCertFile} alt="IEC certificate" />} />
              )}
              <InfoRow label="Import Countries" value={(data.importCountries || []).join(', ') || 'None'} />
              <InfoRow label="Export Countries" value={(data.exportCountries || []).join(', ') || 'None'} />
            </>
          )}
        </div>
      </AccordionSection>
    </div>
  );
}
