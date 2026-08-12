// RN port of VI_Step1_CompanyInfo.tsx — Company Information verification.

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { Briefcase, FileText, Image as ImageIcon, Phone } from 'lucide-react-native';
import VerifyField, { SectionBlock, DocCard, ViewButton, Verifications } from './VI_VerifyField';
import {
  formatLocalLandline,
  formatIntlLandline,
  getBusinessTypeLabel,
  getCompanyIdLabel,
  isImageUrl,
} from './fieldHelpers';

// "View" header action for a regulatory-ID card whose certificate was
// uploaded — opens the same read-only viewer/lightbox DocCard uses.
function DocViewAction({ doc }: { doc: any }) {
  const url = doc?.documentUrl || '';
  if (!url) return null;
  return <ViewButton url={url} name={doc.name || doc.type || 'Document'} isImage={isImageUrl(url, doc.name)} />;
}

const COMPANY_DOC_TYPES = ['GST_CERTIFICATE', 'PAN_CARD', 'COMPANY_REGISTRATION', 'AADHAAR_CARD', 'TRADE_LICENSE', 'EXPORT_LICENSE'];

interface Props {
  vendor: any;
  verifications: Verifications;
  onChange: (key: string, ok: boolean | null, remarks: string) => void;
  onRegisterFields: (keys: string[]) => void;
}

export default function VI_Step1_CompanyInfo({ vendor: v, verifications, onChange, onRegisterFields }: Props) {
  const vf = (key: string, label: string, value: any, type?: any, headerAction?: React.ReactNode) => (
    <VerifyField key={key} fieldKey={key} label={label} value={value} type={type} verifications={verifications} onChange={onChange} headerAction={headerAction} />
  );

  const companyDocs = Array.isArray(v.documents)
    ? v.documents.filter((d: any) => COMPANY_DOC_TYPES.includes(d.type))
    : [];

  const docByType = (type: string) => companyDocs.find((d: any) => d.type === type);

  // Each regulatory-ID card claims its certificate: the View button renders
  // on that card (one card = ID + its document, one verification) instead of
  // a separate "Company Documents" section duplicating every upload.
  const claimedDocs = new Set<any>();
  const claim = (doc: any) => {
    if (doc) claimedDocs.add(doc);
    return doc;
  };
  const gstDoc = v.gstNumber ? claim(docByType('GST_CERTIFICATE')) : null;
  const panDoc = v.panNumber ? claim(docByType('PAN_CARD')) : null;
  const companyIdDoc = v.companyIdNumber ? claim(docByType('COMPANY_REGISTRATION')) : null;
  // A proprietorship's type-specific certificate IS the IEC certificate
  // (stored as COMPANY_REGISTRATION, named "IEC Certificate") — attach it to
  // the IEC Code card when no separate Company ID card claims it.
  const iecDoc = v.iecCode
    ? claim(
        docByType('EXPORT_LICENSE') ||
          (v.businessType === 'proprietorship' && !v.companyIdNumber
            ? docByType('COMPANY_REGISTRATION')
            : undefined),
      )
    : null;
  const aadhaarDoc = v.aadhaarNumber ? claim(docByType('AADHAAR_CARD')) : null;

  // Anything unclaimed (e.g. TRADE_LICENSE, or a certificate uploaded without
  // its ID) still needs its own card so it never silently disappears.
  const unmatchedDocs = companyDocs.filter((d: any) => !claimedDocs.has(d));

  const localLandline = formatLocalLandline({ countryCode: '+91', std: v.localLandlineStd, number: v.landlineNumber });
  const intlLandline = formatIntlLandline(v.intlLandline);

  useEffect(() => {
    const keys: string[] = [
      ...(v.companyLogo ? ['c_companyLogo'] : []),
      'c_companyName',
      'c_businessType',
      v.gstNumber ? 'c_gstNumber' : 'c_unregistered',
      ...(v.panNumber ? ['c_panNumber'] : []),
      ...(v.companyIdNumber ? ['c_companyIdNumber'] : []),
      ...(v.hasImportExport ? ['c_hasImportExport'] : []),
      ...(v.iecCode ? ['c_iecCode'] : []),
      ...(v.aadhaarNumber ? ['c_aadhaarNumber'] : []),
      ...(v.website ? ['c_website'] : []),
      // Only docs without an owning ID card keep their own verification —
      // merged docs are verified via the ID field they're attached to.
      ...unmatchedDocs.map((d: any, idx: number) => `c_doc_${d.type || idx}`),
      'ct_businessPhone',
      ...(v.phoneNumber2 ? ['ct_phoneNumber2'] : []),
      'ct_businessEmail',
      ...(v.businessEmail2 ? ['ct_businessEmail2'] : []),
      ...(localLandline ? ['ct_landline'] : []),
      ...(intlLandline ? ['ct_intlLandline'] : []),
    ];
    onRegisterFields(keys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);

  return (
    <View style={{ rowGap: 28 }}>
      <View className="border-b border-slate-200 pb-4">
        <Text className="text-2xl font-bold text-slate-900 mb-1">Company Information</Text>
        <Text className="text-slate-500 text-sm">Verify all company registration and identity details submitted by the vendor.</Text>
      </View>

      {v.companyLogo && (
        <SectionBlock title="Company Logo" icon={<ImageIcon size={16} color="#e01a1b" />}>
          {vf('c_companyLogo', 'Company Logo', v.companyLogo, 'image')}
        </SectionBlock>
      )}

      <SectionBlock title="Company Identity" icon={<Briefcase size={16} color="#e01a1b" />}>
        <View style={{ rowGap: 16 }}>
          {vf('c_companyName', 'Company Name', v.companyName)}
          {vf('c_businessType', 'Business Type', getBusinessTypeLabel(v.businessType))}
        </View>
      </SectionBlock>

      <SectionBlock title="Regulatory IDs & Documents" icon={<FileText size={16} color="#e01a1b" />}>
        <View style={{ rowGap: 16 }}>
          {v.gstNumber
            ? vf('c_gstNumber', 'GST Number', v.gstNumber, undefined, <DocViewAction doc={gstDoc} />)
            : vf('c_unregistered', 'GST Status', 'Unregistered — no GST number')}
          {v.panNumber && vf('c_panNumber', v.businessType === 'proprietorship' ? 'Proprietor PAN' : 'Company PAN', v.panNumber, undefined, <DocViewAction doc={panDoc} />)}
          {v.companyIdNumber && vf('c_companyIdNumber', getCompanyIdLabel(v.businessType), v.companyIdNumber, undefined, <DocViewAction doc={companyIdDoc} />)}
          {v.hasImportExport && vf('c_hasImportExport', 'Import/Export Activities', v.hasImportExport === 'yes' ? 'Yes' : v.hasImportExport === 'no' ? 'No' : v.hasImportExport)}
          {v.iecCode && vf('c_iecCode', 'IEC Code', v.iecCode, undefined, <DocViewAction doc={iecDoc} />)}
          {v.aadhaarNumber && vf('c_aadhaarNumber', 'Aadhaar Number', v.aadhaarNumber, undefined, <DocViewAction doc={aadhaarDoc} />)}
          {v.website && vf('c_website', 'Website', v.website, 'url')}
          {/* Docs with no owning ID card on this vendor (e.g. trade license) */}
          {unmatchedDocs.map((doc: any, idx: number) => (
            <DocCard
              key={doc.id || idx}
              doc={doc}
              index={idx}
              fieldKey={`c_doc_${doc.type || idx}`}
              verifications={verifications}
              onChange={onChange}
            />
          ))}
        </View>
      </SectionBlock>

      <SectionBlock title="Business & Contact Details" icon={<Phone size={16} color="#e01a1b" />}>
        <View style={{ rowGap: 16 }}>
          {vf('ct_businessPhone', 'Primary Phone', v.businessPhone)}
          {v.phoneNumber2 && vf('ct_phoneNumber2', 'Secondary Phone', v.phoneNumber2)}
          {vf('ct_businessEmail', 'Primary Email', v.businessEmail)}
          {v.businessEmail2 && vf('ct_businessEmail2', 'Secondary Email', v.businessEmail2)}
          {localLandline && vf('ct_landline', 'Local Landline', localLandline)}
          {intlLandline && vf('ct_intlLandline', 'International Landline', intlLandline)}
        </View>
      </SectionBlock>
    </View>
  );
}
