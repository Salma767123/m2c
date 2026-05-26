'use client';

import React from 'react';
import { SquarePen, Calendar } from 'lucide-react';

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

const FormCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
    {children}
  </section>
);

const InfoRow: React.FC<{ label: string; value: string | React.ReactNode }> = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-start py-3 border-b border-slate-100 last:border-0 px-6">
    <span className="text-sm font-medium text-slate-500 sm:w-1/3 shrink-0">{label}</span>
    <span className="text-sm font-medium text-slate-900 sm:w-2/3">{value || '—'}</span>
  </div>
);

// ── Label resolvers ─────────────────────────────────────────────────────

const getVendorTypeLabel = (types: string | string[]): string => {
  const labels: Record<string, string> = {
    'manufacturer': 'Manufacturer',
    'importer': 'Importer',
    'exporter': 'Exporter',
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
    return { status: 'valid', message: `Valid until ${expiry.toLocaleDateString()}`, color: 'text-success-700 bg-success-50 border border-success-200/50 font-medium' };
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

  // Step indices skip Manufacturing for non-manufacturers, matching the
  // VendorPanel / AddEditVendor step-filtering logic.
  const getStepNumber = (logicalStep: string): number => {
    const stepMap: Record<string, number> = {
      'company': 0,
      'warehouse': 1,
      'owner': 2,
      'vendor': 3,
      'manufacturing': 4,
      'certifications': isManufacturer ? 5 : 4,
      'contact': isManufacturer ? 6 : 5,
    };
    return stepMap[logicalStep] ?? 0;
  };

  const SectionHeader = ({ title, step }: { title: string; step: number }) => (
    <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">{title}</h3>
      {onGoToStep && (
        <button
          type="button"
          onClick={() => onGoToStep(step)}
          className="text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors px-3 py-1.5 rounded-md flex items-center gap-1 text-sm font-semibold"
        >
          <SquarePen className="w-4 h-4" aria-hidden="true" />
          Edit
        </button>
      )}
    </div>
  );

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
      <FormCard>
        <SectionHeader title="Company Details" step={getStepNumber('company')} />
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
          {data.panNumber && <InfoRow label="PAN Number" value={data.panNumber} />}
          <InfoRow label="Email 1" value={data.email} />
          {data.email2 && <InfoRow label="Email 2" value={data.email2} />}
          <InfoRow label="Phone" value={data.phone} />
          {data.phoneNumber2 && <InfoRow label="Phone 2" value={data.phoneNumber2} />}
          {data.landlineNumber && <InfoRow label="Landline" value={data.landlineNumber} />}
          <InfoRow label="Website" value={data.website} />
          {/* Address rendered multi-line so Line 2 / 3 / landmark are visible. */}
          <InfoRow
            label="Address"
            value={
              <span className="block">
                <span className="block">{data.address || '—'}</span>
                {data.addressLine2 && <span className="block">{data.addressLine2}</span>}
                {data.addressLine3 && <span className="block">{data.addressLine3}</span>}
                {data.landmark && (
                  <span className="block text-slate-500 text-xs mt-0.5">
                    Landmark: {data.landmark}
                  </span>
                )}
                <span className="block">
                  {[data.city, data.state, data.zipCode].filter(Boolean).join(', ')}
                </span>
              </span>
            }
          />
          <InfoRow label="Country" value={data.country} />
          {data.factoryOwnershipType && (
            <InfoRow
              label="Factory Ownership"
              value={<span className="capitalize">{data.factoryOwnershipType}</span>}
            />
          )}
          <InfoRow label="Same as Warehouse" value={data.sameAsWarehouse ? 'Yes' : 'No'} />
          <InfoRow label="Company Logo" value={data.logo ? 'Uploaded' : 'Not uploaded'} />
          <InfoRow label="GST Certificate" value={data.gstFile || data.gstDocument ? 'Uploaded' : 'Not uploaded'} />
          <InfoRow label="PAN Card" value={data.panCardFile || data.panCardDocument ? 'Uploaded' : 'Not uploaded'} />
          {(data.typeCertFile || data.typeCertDocument) && (
            <InfoRow label="Business Reg. Certificate" value="Uploaded" />
          )}
        </div>
      </FormCard>

      <FormCard>
        <SectionHeader title="Warehouse / Factory" step={getStepNumber('warehouse')} />
        <div className="flex flex-col">
          <InfoRow label="Ownership Type" value={getOwnershipTypeLabel(data.ownershipType)} />
          <InfoRow
            label="Address"
            value={
              <span className="block">
                <span className="block">{data.warehouseAddress || '—'}</span>
                {data.warehouseAddressLine2 && <span className="block">{data.warehouseAddressLine2}</span>}
                {data.warehouseAddressLine3 && <span className="block">{data.warehouseAddressLine3}</span>}
                {data.warehouseLandmark && (
                  <span className="block text-slate-500 text-xs mt-0.5">
                    Landmark: {data.warehouseLandmark}
                  </span>
                )}
                <span className="block">
                  {[data.warehouseCity, data.warehouseState, data.warehouseZip].filter(Boolean).join(', ')}
                </span>
              </span>
            }
          />
          <InfoRow label="Country" value={data.warehouseCountry} />
          <InfoRow label="Factory Images" value={`${(data.factoryImages ? (Array.isArray(data.factoryImages) ? data.factoryImages.length : Object.keys(data.factoryImages).length) : 0)} file(s) uploaded`} />
          <InfoRow label="Map Link" value={data.mapLink ? 'Provided' : 'Not provided'} />
        </div>
      </FormCard>

      <FormCard>
        <SectionHeader title="Owner Profile" step={getStepNumber('owner')} />
        <div className="flex flex-col">
          <InfoRow label="Owner Name" value={data.ownerName} />
          {data.designation && (
            <InfoRow
              label="Designation"
              value={<span className="capitalize">{data.designation}</span>}
            />
          )}
          <InfoRow label="Email 1" value={data.ownerEmail} />
          {data.ownerEmail2 && <InfoRow label="Email 2" value={data.ownerEmail2} />}
          <InfoRow label="Phone 1" value={data.ownerPhone} />
          {data.ownerPhone2 && <InfoRow label="Phone 2" value={data.ownerPhone2} />}
          {data.ownerLandline && <InfoRow label="Landline" value={data.ownerLandline} />}
          {data.businessStartDate ? (
            <InfoRow
              label="Business Start Date"
              value={new Date(data.businessStartDate).toLocaleDateString()}
            />
          ) : (
            <InfoRow label="Year Established" value={data.yearEstablished} />
          )}
          <InfoRow label="Employee Count" value={getEmployeeCountLabel(data.employeeCount)} />
          <InfoRow
            label="Years in Business"
            value={(() => {
              const startYear = data.businessStartDate
                ? new Date(data.businessStartDate).getFullYear()
                : data.yearEstablished
                  ? parseInt(data.yearEstablished, 10)
                  : null;
              return startYear ? `${new Date().getFullYear() - startYear} years` : 'N/A';
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
                  <InfoRow label="Name" value={owner.name} />
                  <InfoRow label="Email" value={owner.email} />
                  <InfoRow label="Phone" value={owner.phone} />
                </div>
              ))}
            </>
          )}
        </div>
      </FormCard>

      <FormCard>
        <SectionHeader title="Vendor Type & Products" step={getStepNumber('vendor')} />
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
      </FormCard>

      {isManufacturer && (
        <FormCard>
          <SectionHeader title="Manufacturing Facilities" step={getStepNumber('manufacturing')} />
          <div className="flex flex-col">
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
          </div>
        </FormCard>
      )}

      <FormCard>
        <SectionHeader title="Certifications & Logistics" step={getStepNumber('certifications')} />
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
                              Expires: {new Date(expiryDate).toLocaleDateString()}
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
          <InfoRow label="Packaging Capabilities" value={data.packagingCapabilities || 'Not provided'} />
          <InfoRow label="Warehousing Capacity" value={data.warehousingCapacity ? `${data.warehousingCapacity} sq ft` : 'Not provided'} />
          <InfoRow label="Logistics Partners" value={data.logisticsPartners || 'Not provided'} />
          <InfoRow
            label="Shipping Methods"
            value={
              (data.shippingMethods || []).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {data.shippingMethods.map((method: string) => (
                    <span key={method} className="inline-flex items-center px-2.5 py-0.5 bg-slate-100 text-slate-800 rounded text-xs font-semibold border border-slate-200">
                      {method}
                    </span>
                  ))}
                </div>
              ) : (
                'None selected'
              )
            }
          />
        </div>
      </FormCard>

      <FormCard>
        <SectionHeader title="Contact & Trade" step={getStepNumber('contact')} />
        <div className="flex flex-col">
          <InfoRow label="Main Contact Name" value={data.mainContact?.name || 'Not provided'} />
          <InfoRow label="Main Contact Designation" value={data.mainContact?.designation || 'Not provided'} />
          <InfoRow label="Main Contact Email" value={data.mainContact?.email1 || data.mainContact?.email || 'Not provided'} />
          {data.mainContact?.email2 && (
            <InfoRow label="Main Contact Email 2" value={data.mainContact.email2} />
          )}
          <InfoRow label="Main Contact Phone" value={data.mainContact?.phone1 || data.mainContact?.phone || 'Not provided'} />
          {data.mainContact?.phone2 && (
            <InfoRow label="Main Contact Phone 2" value={data.mainContact.phone2} />
          )}
          {data.mainContact?.landline && (
            <InfoRow label="Main Contact Landline" value={data.mainContact.landline} />
          )}
          <InfoRow label="Main Contact Department" value={data.mainContact?.department || 'Not provided'} />
          <InfoRow label="Alternate Contacts" value={`${(data.alternateContacts || []).length} contact(s) added`} />
          {(data.alternateContacts || []).length > 0 && (
            <div className="ml-4 space-y-2 border-l-2 border-slate-200 pl-4 my-2">
              {data.alternateContacts.map((contact: any, index: number) => (
                <div key={contact.id || index} className="space-y-1">
                  <div className="font-bold text-sm text-slate-900 px-6 py-2">Contact {index + 1}:</div>
                  <InfoRow label="Name" value={contact.name || 'Not provided'} />
                  <InfoRow label="Designation" value={contact.designation || 'Not provided'} />
                  <InfoRow label="Email" value={contact.email1 || contact.email || 'Not provided'} />
                  <InfoRow label="Phone" value={contact.phone1 || contact.phone || 'Not provided'} />
                </div>
              ))}
            </div>
          )}
          {data.hasImportExport === 'yes' && (
            <>
              <InfoRow label="Import/Export Activities" value="Yes" />
              <InfoRow label="Import Countries" value={(data.importCountries || []).join(', ') || 'None'} />
              <InfoRow label="Export Countries" value={(data.exportCountries || []).join(', ') || 'None'} />
            </>
          )}
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
      </FormCard>
    </div>
  );
}
