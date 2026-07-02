'use client'

import { useEffect } from 'react'
import { Briefcase, FileText, Image as ImageIcon, Phone } from 'lucide-react'
import VerifyField, { SectionBlock, DocCard, Verifications } from './VI_VerifyField'
import { formatLocalLandline, formatIntlLandline } from '@/components/VendorHub/FormUI'

const COMPANY_DOC_TYPES = ['GST_CERTIFICATE', 'PAN_CARD', 'COMPANY_REGISTRATION', 'AADHAAR_CARD', 'TRADE_LICENSE', 'EXPORT_LICENSE']

function getBusinessTypeLabel(val: string) {
  const map: Record<string, string> = {
    'proprietorship': 'Proprietorship',
    'pvt-ltd': 'Private Limited Company',
    'partnership-firm': 'Partnership Firm',
    'llp': 'Limited Liability Partnership (LLP)',
    'unregistered': 'Unregistered',
  }
  return map[val] || val
}

function getCompanyIdLabel(businessType: string) {
  switch (businessType) {
    case 'pvt-ltd': return 'Company Identification Number (CIN)'
    case 'partnership-firm': return 'Partnership Deed Registration Number'
    case 'llp': return 'LLPIN'
    default: return 'Company ID Number'
  }
}

interface Props {
  vendor: any
  verifications: Verifications
  onChange: (key: string, ok: boolean | null, remarks: string) => void
  onRegisterFields: (keys: string[]) => void
}

export default function VI_Step1_CompanyInfo({ vendor: v, verifications, onChange, onRegisterFields }: Props) {
  const vf = (key: string, label: string, value: any, type?: any) => (
    <VerifyField key={key} fieldKey={key} label={label} value={value} type={type} verifications={verifications} onChange={onChange} />
  )

  const companyDocs = Array.isArray(v.documents)
    ? v.documents.filter((d: any) => COMPANY_DOC_TYPES.includes(d.type))
    : []

  const localLandline = formatLocalLandline({ countryCode: '+91', std: v.localLandlineStd, number: v.landlineNumber })
  const intlLandline = formatIntlLandline(v.intlLandline)

  useEffect(() => {
    const keys: string[] = [
      ...(v.companyLogo ? ['c_companyLogo'] : []),
      'c_companyName',
      'c_businessType',
      v.gstNumber ? 'c_gstNumber' : 'c_unregistered',
      ...(v.panNumber ? ['c_panNumber'] : []),
      ...(v.companyIdNumber ? ['c_companyIdNumber'] : []),
      ...(v.iecCode ? ['c_iecCode'] : []),
      ...(v.aadhaarNumber ? ['c_aadhaarNumber'] : []),
      ...(v.website ? ['c_website'] : []),
      ...companyDocs.map((d: any, idx: number) => `c_doc_${d.type || idx}`),
      // Business & Contact Details (moved from Step 7)
      'ct_businessPhone',
      ...(v.phoneNumber2 ? ['ct_phoneNumber2'] : []),
      'ct_businessEmail',
      ...(v.businessEmail2 ? ['ct_businessEmail2'] : []),
      ...(localLandline ? ['ct_landline'] : []),
      ...(intlLandline ? ['ct_intlLandline'] : []),
    ]
    onRegisterFields(keys)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v])

  return (
    <div className="space-y-10">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Company Information</h2>
        <p className="text-slate-500 text-sm">Verify all company registration and identity details submitted by the vendor.</p>
      </div>

      {/* Company Logo */}
      {v.companyLogo && (
        <SectionBlock title="Company Logo" icon={<ImageIcon className="w-4 h-4" />}>
          {vf('c_companyLogo', 'Company Logo', v.companyLogo, 'image')}
        </SectionBlock>
      )}

      {/* Core Identity */}
      <SectionBlock title="Company Identity" icon={<Briefcase className="w-4 h-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vf('c_companyName', 'Company Name', v.companyName)}
          {vf('c_businessType', 'Business Type', getBusinessTypeLabel(v.businessType))}
        </div>
      </SectionBlock>

      {/* Tax & Registration IDs */}
      <SectionBlock title="Tax & Registration IDs" icon={<FileText className="w-4 h-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {v.gstNumber
            ? vf('c_gstNumber', 'GST Number', v.gstNumber)
            : vf('c_unregistered', 'GST Status', 'Unregistered — no GST number')
          }
          {v.panNumber && vf('c_panNumber', v.businessType === 'proprietorship' ? 'Proprietor PAN' : 'Company PAN', v.panNumber)}
          {v.companyIdNumber && vf('c_companyIdNumber', getCompanyIdLabel(v.businessType), v.companyIdNumber)}
          {v.iecCode && vf('c_iecCode', 'IEC Code', v.iecCode)}
          {v.aadhaarNumber && vf('c_aadhaarNumber', 'Aadhaar Number', v.aadhaarNumber)}
          {v.website && vf('c_website', 'Website', v.website, 'url')}
        </div>
      </SectionBlock>

      {/* Business & Contact Details (moved here from Step 7) */}
      <SectionBlock title="Business & Contact Details" icon={<Phone className="w-4 h-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vf('ct_businessPhone', 'Primary Phone', v.businessPhone)}
          {v.phoneNumber2 && vf('ct_phoneNumber2', 'Secondary Phone', v.phoneNumber2)}
          {vf('ct_businessEmail', 'Primary Email', v.businessEmail)}
          {v.businessEmail2 && vf('ct_businessEmail2', 'Secondary Email', v.businessEmail2)}
          {localLandline && vf('ct_landline', 'Local Landline', localLandline)}
          {intlLandline && vf('ct_intlLandline', 'International Landline', intlLandline)}
        </div>
      </SectionBlock>

      {/* Company Documents */}
      {companyDocs.length > 0 && (
        <SectionBlock title="Company Documents" icon={<FileText className="w-4 h-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companyDocs.map((doc: any, idx: number) => (
              <DocCard
                key={doc.id || idx}
                doc={doc}
                index={idx}
                fieldKey={`c_doc_${doc.type || idx}`}
                verifications={verifications}
                onChange={onChange}
              />
            ))}
          </div>
        </SectionBlock>
      )}
    </div>
  )
}
