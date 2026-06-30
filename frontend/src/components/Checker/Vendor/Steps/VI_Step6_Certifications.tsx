'use client'

import { useEffect } from 'react'
import { Award, FileText, Package } from 'lucide-react'
import VerifyField, { SectionBlock, DocCard, Verifications } from './VI_VerifyField'

interface Props {
  vendor: any
  verifications: Verifications
  onChange: (key: string, ok: boolean | null, remarks: string) => void
  onRegisterFields: (keys: string[]) => void
}

export default function VI_Step6_Certifications({ vendor: v, verifications, onChange, onRegisterFields }: Props) {
  const vf = (key: string, label: string, value: any, type?: any) => (
    <VerifyField key={key} fieldKey={key} label={label} value={value} type={type} verifications={verifications} onChange={onChange} />
  )

  const certifications: any[] = Array.isArray(v.certifications) ? v.certifications : []

  const CERT_DOC_TYPES = ['EXPORT_LICENSE', 'FACTORY_LICENSE', 'POLLUTION_CERTIFICATE', 'FIRE_SAFETY_CERTIFICATE', 'BANK_STATEMENT', 'AUDITED_FINANCIALS']
  const certDocs = Array.isArray(v.documents)
    ? v.documents.filter((d: any) => CERT_DOC_TYPES.includes(d.type))
    : []

  useEffect(() => {
    const keys: string[] = [
      ...certifications.flatMap((cert: any, idx: number) => {
        const prefix = `cert_${idx}`
        return [
          `${prefix}_name`,
          ...(cert.issuedBy ? [`${prefix}_issuedBy`] : []),
          ...(cert.certificateNumber ? [`${prefix}_number`] : []),
          ...(cert.issuedDate ? [`${prefix}_issuedDate`] : []),
          ...(cert.expiryDate ? [`${prefix}_expiryDate`] : []),
          ...(cert.description ? [`${prefix}_description`] : []),
          ...(cert.documentUrl ? [`${prefix}_document`] : []),
        ]
      }),
      ...(v.complianceStandards ? ['cert_complianceStandards'] : []),
      ...(v.packagingCapabilities ? ['cert_packagingCapabilities'] : []),
      ...certDocs.map((doc: any, idx: number) => `certDoc_${doc.type || idx}`),
    ]
    onRegisterFields(keys)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v])

  return (
    <div className="space-y-10">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Certifications & Quality Control</h2>
        <p className="text-slate-500 text-sm">Verify all quality certifications, compliance standards, and packaging details.</p>
      </div>

      {/* Quality Certifications */}
      {certifications.length > 0 ? (
        <SectionBlock title="Quality Certifications" icon={<Award className="w-4 h-4" />}>
          <div className="space-y-6">
            {certifications.map((cert: any, idx: number) => {
              const prefix = `cert_${idx}`
              return (
                <div key={cert.id || idx} className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 space-y-4">
                  <p className="text-sm font-bold text-slate-700">Certificate #{idx + 1}: {cert.name}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vf(`${prefix}_name`, 'Certificate Name', cert.name)}
                    {cert.issuedBy && vf(`${prefix}_issuedBy`, 'Issued By', cert.issuedBy)}
                    {cert.certificateNumber && vf(`${prefix}_number`, 'Certificate Number', cert.certificateNumber)}
                    {cert.issuedDate && vf(`${prefix}_issuedDate`, 'Issue Date', cert.issuedDate, 'date')}
                    {cert.expiryDate && vf(`${prefix}_expiryDate`, 'Expiry Date', cert.expiryDate, 'date')}
                    {cert.description && vf(`${prefix}_description`, 'Description', cert.description)}
                  </div>
                  {cert.documentUrl && (
                    <DocCard
                      doc={{ name: `${cert.name} — Certificate Document`, documentUrl: cert.documentUrl }}
                      index={idx}
                      fieldKey={`${prefix}_document`}
                      verifications={verifications}
                      onChange={onChange}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </SectionBlock>
      ) : (
        <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-700 font-medium">No quality certifications were submitted by this vendor.</p>
        </div>
      )}

      {/* Compliance Standards */}
      {v.complianceStandards && (
        <SectionBlock title="Compliance Standards" icon={<FileText className="w-4 h-4" />}>
          {vf('cert_complianceStandards', 'Compliance Standards', v.complianceStandards)}
        </SectionBlock>
      )}

      {/* Packaging */}
      {v.packagingCapabilities && (
        <SectionBlock title="Packaging Capabilities" icon={<Package className="w-4 h-4" />}>
          {vf('cert_packagingCapabilities', 'Packaging Capabilities', v.packagingCapabilities)}
        </SectionBlock>
      )}

      {/* Certification-related documents */}
      {certDocs.length > 0 && (
        <SectionBlock title="Supporting Documents" icon={<FileText className="w-4 h-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certDocs.map((doc: any, idx: number) => (
              <DocCard
                key={doc.id || idx}
                doc={doc}
                index={idx}
                fieldKey={`certDoc_${doc.type || idx}`}
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
