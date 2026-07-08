// RN port of VI_Step5_Manufacturing.tsx — Manufacturing Facilities verification.

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { Settings } from 'lucide-react-native';
import VerifyField, { SectionBlock, Verifications } from './VI_VerifyField';
import { FACILITY_META, withUnit } from './fieldHelpers';

interface Props {
  vendor: any;
  verifications: Verifications;
  onChange: (key: string, ok: boolean | null, remarks: string) => void;
  onRegisterFields: (keys: string[]) => void;
}

export default function VI_Step5_Manufacturing({ vendor: v, verifications, onChange, onRegisterFields }: Props) {
  const vf = (key: string, label: string, value: any, type?: any) => (
    <VerifyField key={key} fieldKey={key} label={label} value={value} type={type} verifications={verifications} onChange={onChange} />
  );

  const enabledFacilities: Record<string, boolean> = v.enabledFacilities || {};
  const facilityDetails: Record<string, any> = v.facilityDetails || {};
  const activeFacilities = Object.keys(FACILITY_META).filter((f) => enabledFacilities[f]);

  useEffect(() => {
    const keys: string[] = activeFacilities.flatMap((facilityKey) => {
      const meta = FACILITY_META[facilityKey];
      const details = facilityDetails[facilityKey] || {};
      const prefix = `mf_${facilityKey}`;
      return [
        `${prefix}_active`,
        ...meta.detailFields.filter(({ key }) => !!details[key]).map(({ key }) => `${prefix}_${key}`),
      ];
    });
    onRegisterFields(keys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);

  return (
    <View style={{ rowGap: 28 }}>
      <View className="border-b border-slate-200 pb-4">
        <Text className="text-2xl font-bold text-slate-900 mb-1">Manufacturing Facilities</Text>
        <Text className="text-slate-500 text-sm">Verify the production facilities, machinery, and capacity information submitted by the vendor.</Text>
      </View>

      <SectionBlock title="Active Facilities" icon={<Settings size={16} color="#2563eb" />}>
        {activeFacilities.length === 0 ? (
          <Text className="text-sm text-slate-400 italic">No facilities declared.</Text>
        ) : (
          <View style={{ rowGap: 24 }}>
            {activeFacilities.map((facilityKey) => {
              const meta = FACILITY_META[facilityKey];
              const details = facilityDetails[facilityKey] || {};
              const prefix = `mf_${facilityKey}`;
              return (
                <View key={facilityKey} className="bg-slate-50 border border-slate-200 rounded-xl p-4" style={{ rowGap: 16 }}>
                  <View className="flex-row items-center pb-2 border-b border-slate-200" style={{ columnGap: 8 }}>
                    <View className="w-2 h-2 rounded-full bg-blue-600" />
                    <Text className="text-sm font-bold text-slate-800">{meta.label}</Text>
                    <View className="ml-auto px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full">
                      <Text className="text-xs font-bold text-emerald-700">Active</Text>
                    </View>
                  </View>
                  {vf(`${prefix}_active`, `${meta.label} Facility Active`, 'Yes — declared as active')}
                  {meta.detailFields.map(({ key, label, unit }) => {
                    const val = details[key];
                    if (!val) return null;
                    return vf(`${prefix}_${key}`, label, withUnit(val, unit));
                  })}
                </View>
              );
            })}
          </View>
        )}
      </SectionBlock>
    </View>
  );
}
