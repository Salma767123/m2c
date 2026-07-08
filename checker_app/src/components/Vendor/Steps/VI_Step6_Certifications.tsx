// RN port of VI_Step6_Certifications.tsx — Certifications & Quality Control.

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { Award, FileText, Package } from 'lucide-react-native';
import VerifyField, { SectionBlock, DocCard, Verifications, ViewButton } from './VI_VerifyField';
import { isImageUrl } from './fieldHelpers';

interface Props {
  vendor: any;
  verifications: Verifications;
  onChange: (key: string, ok: boolean | null, remarks: string) => void;
  onRegisterFields: (keys: string[]) => void;
}

const CERT_DOC_TYPES = ['EXPORT_LICENSE', 'FACTORY_LICENSE', 'POLLUTION_CERTIFICATE', 'FIRE_SAFETY_CERTIFICATE', 'BANK_STATEMENT', 'AUDITED_FINANCIALS'];

export default function VI_Step6_Certifications({ vendor: v, verifications, onChange, onRegisterFields }: Props) {
  const vf = (key: string, label: string, value: any, type?: any) => (
    <VerifyField key={key} fieldKey={key} label={label} value={value} type={type} verifications={verifications} onChange={onChange} />
  );

  const certifications: any[] = Array.isArray(v.certifications) ? v.certifications : [];
  const certDocs = Array.isArray(v.documents) ? v.documents.filter((d: any) => CERT_DOC_TYPES.includes(d.type)) : [];

  useEffect(() => {
    const keys: string[] = [
      ...certifications.flatMap((cert: any, idx: number) => {
        const prefix = `cert_${idx}`;
        return [
          `${prefix}_name`,
          ...(cert.expiryDate ? [`${prefix}_expiryDate`] : []),
          ...(cert.description ? [`${prefix}_description`] : []),
        ];
      }),
      ...(v.complianceStandards ? ['cert_complianceStandards'] : []),
      ...(v.packagingCapabilities ? ['cert_packagingCapabilities'] : []),
      ...certDocs.map((doc: any, idx: number) => `certDoc_${doc.type || idx}`),
    ];
    onRegisterFields(keys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);

  return (
    <View style={{ rowGap: 28 }}>
      <View className="border-b border-slate-200 pb-4">
        <Text className="text-2xl font-bold text-slate-900 mb-1">Certifications & Quality Control</Text>
        <Text className="text-slate-500 text-sm">Verify all quality certifications, compliance standards, and packaging details.</Text>
      </View>

      {certifications.length > 0 ? (
        <SectionBlock title="Quality Certifications" icon={<Award size={16} color="#2563eb" />}>
          <View style={{ rowGap: 24 }}>
            {certifications.map((cert: any, idx: number) => {
              const prefix = `cert_${idx}`;
              return (
                <View key={cert.id || idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4" style={{ rowGap: 16 }}>
                  <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Certificate #{idx + 1}</Text>
                  <VerifyField
                    fieldKey={`${prefix}_name`}
                    label="Certificate Name"
                    value={cert.name}
                    verifications={verifications}
                    onChange={onChange}
                    headerAction={
                      cert.documentUrl ? (
                        <ViewButton url={cert.documentUrl} name={cert.name || 'Certificate'} isImage={isImageUrl(cert.documentUrl, cert.name)} />
                      ) : undefined
                    }
                  />
                  {cert.expiryDate && vf(`${prefix}_expiryDate`, 'Expiry Date', cert.expiryDate, 'date')}
                  {cert.description && vf(`${prefix}_description`, 'Description', cert.description)}
                </View>
              );
            })}
          </View>
        </SectionBlock>
      ) : (
        <View className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <Text className="text-sm text-amber-700 font-medium">No quality certifications were submitted by this vendor.</Text>
        </View>
      )}

      {v.complianceStandards && (
        <SectionBlock title="Compliance Standards" icon={<FileText size={16} color="#2563eb" />}>
          {vf('cert_complianceStandards', 'Compliance Standards', v.complianceStandards)}
        </SectionBlock>
      )}

      {v.packagingCapabilities && (
        <SectionBlock title="Packaging Capabilities" icon={<Package size={16} color="#2563eb" />}>
          {vf('cert_packagingCapabilities', 'Packaging Capabilities', v.packagingCapabilities)}
        </SectionBlock>
      )}

      {certDocs.length > 0 && (
        <SectionBlock title="Supporting Documents" icon={<FileText size={16} color="#2563eb" />}>
          <View style={{ rowGap: 16 }}>
            {certDocs.map((doc: any, idx: number) => (
              <DocCard key={doc.id || idx} doc={doc} index={idx} fieldKey={`certDoc_${doc.type || idx}`} verifications={verifications} onChange={onChange} />
            ))}
          </View>
        </SectionBlock>
      )}
    </View>
  );
}
