// RN port of VI_Step8_FinalReview.tsx — Final Review & Submission.

import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { ClipboardList, User, Calendar, MessageSquare, Pencil, Check } from 'lucide-react-native';
import { Verifications } from './VI_VerifyField';

export interface InspectorMeta {
  inspectorName: string;
  inspectionDate: string;
  overallResult: 'Approved' | 'Rejected' | 'On Hold' | 'Re-inspection Required' | '';
  inspectorRemarks: string;
}

interface Props {
  vendor: any;
  inspection: any;
  verifications: Verifications;
  meta: InspectorMeta;
  onMetaChange: (patch: Partial<InspectorMeta>) => void;
  onGoToStep?: (step: number, fieldKey?: string) => void;
}

const RESULT_OPTIONS: InspectorMeta['overallResult'][] = ['Approved', 'Rejected', 'On Hold', 'Re-inspection Required'];

// Selected-pill colors, mirroring the web RESULT_COLORS.
const RESULT_STYLE: Record<string, { text: string; bg: string; border: string }> = {
  Approved: { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300' },
  Rejected: { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300' },
  'On Hold': { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300' },
  'Re-inspection Required': { text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300' },
};

// Field-key → step mapping (mirrors getStepForKey in the web source).
function getStepForKey(key: string): { step: number; label: string } {
  if (key.startsWith('certDoc_') || key.startsWith('cert_')) return { step: 6, label: 'Certifications' };
  if (key.startsWith('vt_')) return { step: 4, label: 'Vendor & Products' };
  if (key.startsWith('mf_')) return { step: 5, label: 'Manufacturing' };
  if (key.startsWith('ct_')) return { step: 7, label: 'Contact & Trade' };
  if (key.startsWith('c_')) return { step: 1, label: 'Company Info' };
  if (key.startsWith('w_')) return { step: 2, label: 'Warehouse & Factory' };
  if (key.startsWith('o_')) return { step: 3, label: 'Owner Profile' };
  return { step: 1, label: 'Unknown' };
}

function buildIssues(verifications: Verifications) {
  return Object.entries(verifications).filter(([, v]) => v.ok === false);
}

export default function VI_Step8_FinalReview({ verifications, meta, onMetaChange, onGoToStep }: Props) {
  const rejected = buildIssues(verifications);

  return (
    <View style={{ rowGap: 28 }}>
      <View className="border-b border-slate-200 pb-4">
        <Text className="text-2xl font-bold text-slate-900 mb-1">Final Review & Submission</Text>
        <Text className="text-slate-500 text-sm">Review flagged issues, record the inspection result, and add your overall remarks.</Text>
      </View>

      {/* Issues list */}
      {rejected.length > 0 && (
        <View className="bg-red-50 border border-red-200 rounded-xl p-4" style={{ rowGap: 12 }}>
          <View className="flex-row items-center pb-2 border-b border-red-200" style={{ columnGap: 8 }}>
            <ClipboardList size={16} color="#dc2626" />
            <Text className="text-sm font-bold text-red-700">Fields with Issues ({rejected.length})</Text>
          </View>
          <View style={{ rowGap: 8 }}>
            {rejected.map(([key, val]) => {
              const { step, label } = getStepForKey(key);
              return (
                <View key={key} className="bg-white border border-red-100 rounded-lg px-4 py-2.5 flex-row items-start justify-between" style={{ columnGap: 12 }}>
                  <View className="flex-1">
                    <View className="flex-row items-center mb-0.5" style={{ columnGap: 8 }}>
                      <View className="px-1.5 py-0.5 bg-brand-50 border border-brand-200 rounded">
                        <Text className="text-xs font-bold text-brand-600">Step {step}</Text>
                      </View>
                      <Text className="text-xs font-semibold text-slate-600">{label}</Text>
                    </View>
                    {val.remarks ? <Text className="text-xs text-red-700 italic">{val.remarks}</Text> : null}
                  </View>
                  {onGoToStep && (
                    <TouchableOpacity
                      onPress={() => onGoToStep(step, key)}
                      className="flex-row items-center px-2.5 py-1.5 bg-white border border-brand-200 rounded-lg"
                      style={{ columnGap: 4 }}
                    >
                      <Pencil size={12} color="#e01a1b" />
                      <Text className="text-xs font-semibold text-brand-600">Edit</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Inspector Details */}
      <View className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <View className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex-row items-center" style={{ columnGap: 8 }}>
          <User size={16} color="#e01a1b" />
          <Text className="text-sm font-bold text-slate-800">Inspector Details</Text>
        </View>
        <View className="p-4" style={{ rowGap: 20 }}>
          {/* Inspector Name — read-only */}
          <View>
            <View className="flex-row items-center mb-1.5" style={{ columnGap: 4 }}>
              <User size={12} color="#475569" />
              <Text className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Inspector Name</Text>
            </View>
            <View className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 min-h-[42px] justify-center">
              {meta.inspectorName ? (
                <Text className="text-sm text-slate-700">{meta.inspectorName}</Text>
              ) : (
                <Text className="text-sm text-slate-400 italic">Auto-filled</Text>
              )}
            </View>
          </View>

          {/* Inspection Date — read-only */}
          <View>
            <View className="flex-row items-center mb-1.5" style={{ columnGap: 4 }}>
              <Calendar size={12} color="#475569" />
              <Text className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Inspection Date</Text>
            </View>
            <View className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 min-h-[42px] justify-center">
              {meta.inspectionDate ? (
                <Text className="text-sm text-slate-700">{meta.inspectionDate}</Text>
              ) : (
                <Text className="text-sm text-slate-400 italic">Auto-filled</Text>
              )}
            </View>
          </View>

          {/* Overall Result — pill selector (4 exact options) */}
          <View>
            <Text className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">
              Overall Inspection Result <Text className="text-red-500">*</Text>
            </Text>
            <View style={{ rowGap: 8 }}>
              {RESULT_OPTIONS.map((opt) => {
                const active = meta.overallResult === opt;
                const s = RESULT_STYLE[opt];
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => onMetaChange({ overallResult: opt })}
                    activeOpacity={0.8}
                    className={`px-4 py-3 rounded-xl border flex-row items-center justify-between ${active ? `${s.bg} ${s.border}` : 'bg-white border-slate-300'}`}
                  >
                    <Text className={`text-sm font-semibold ${active ? s.text : 'text-slate-500'}`}>{opt}</Text>
                    {active && <Check size={16} color="#0f172a" strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Overall Remarks */}
          <View>
            <View className="flex-row items-center mb-1.5" style={{ columnGap: 4 }}>
              <MessageSquare size={12} color="#475569" />
              <Text className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Overall Inspector Remarks <Text className="text-red-500">*</Text></Text>
            </View>
            <TextInput
              value={meta.inspectorRemarks}
              onChangeText={(t) => onMetaChange({ inspectorRemarks: t })}
              placeholder="Summary notes about the inspection visit, any notable observations, or context for the admin reviewing this report…"
              placeholderTextColor="#94a3b8"
              multiline
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              style={{ minHeight: 100, textAlignVertical: 'top' }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
