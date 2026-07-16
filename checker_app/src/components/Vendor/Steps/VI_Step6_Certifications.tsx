// RN port of VI_Step6_Certifications.tsx — Certifications & Quality Control.

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { Award, ShieldCheck } from 'lucide-react-native';
import VerifyField, { SectionBlock, Verifications, ViewButton } from './VI_VerifyField';
import { isImageUrl } from './fieldHelpers';

interface Props {
  vendor: any;
  verifications: Verifications;
  onChange: (key: string, ok: boolean | null, remarks: string) => void;
  onRegisterFields: (keys: string[]) => void;
}

export default function VI_Step6_Certifications({ vendor: v, verifications, onChange, onRegisterFields }: Props) {
  const vf = (key: string, label: string, value: any, type?: any) => (
    <VerifyField key={key} fieldKey={key} label={label} value={value} type={type} verifications={verifications} onChange={onChange} />
  );

  const certifications: any[] = Array.isArray(v.certifications) ? v.certifications : [];

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
      ...(v.qualityControl ? ['cert_qualityControlProcess'] : []),
    ];
    onRegisterFields(keys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);

  return (
    <View style={{ rowGap: 28 }}>
      <View className="border-b border-slate-200 pb-4">
        <Text className="text-2xl font-bold text-slate-900 mb-1">Certifications & Quality Control</Text>
        <Text className="text-slate-500 text-sm">Verify all quality certifications and the quality control process submitted by the vendor.</Text>
      </View>

      {certifications.length > 0 ? (
        <SectionBlock title="Quality Certifications" icon={<Award size={16} color="#e01a1b" />}>
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

      {v.qualityControl && (
        <SectionBlock title="Quality Control Process" icon={<ShieldCheck size={16} color="#e01a1b" />}>
          {vf('cert_qualityControlProcess', 'Quality Control Process Description', v.qualityControl)}
        </SectionBlock>
      )}
    </View>
  );
}
