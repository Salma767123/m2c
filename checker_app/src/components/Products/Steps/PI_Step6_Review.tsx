import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { CheckCircle2, XCircle, Minus, Pencil, ChevronDown, Check } from 'lucide-react-native';
import type { PackagingItem, TestGroup } from '../PI_data';
import { ADDITIONAL_EVIDENCE_DEFS, CODE_LABELS, INSPECTION_STATUS_OPTIONS } from '../PI_data';

function badgeCls(code: number) {
  if (code <= 5) return 'bg-red-100 border-red-200';
  if (code <= 7) return 'bg-amber-100 border-amber-200';
  return 'bg-emerald-100 border-emerald-200';
}
function badgeText(code: number) {
  if (code <= 5) return 'text-red-700';
  if (code <= 7) return 'text-amber-700';
  return 'text-emerald-700';
}

const STATUS_STYLES: Record<string, { border: string; bg: string; text: string }> = {
  Approved: { border: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  Rejected: { border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-600' },
  'On Hold': { border: 'border-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-600' },
  'Re-Inspection': { border: 'border-orange-500', bg: 'bg-orange-50', text: 'text-orange-600' },
};

interface Props {
  formData: {
    serviceStartDate: string;
    serviceType: string;
    vendorData: any;
    productData: any;
    productVerifications: Record<string, { ok: boolean | null; remarks: string }>;
    productEvidencePhotos: any[];
    packagingItems: PackagingItem[];
    packagingPhotos: any[];
    inspectionLevel: string;
    sampleSize: number;
    criticalDefects: number;
    majorDefects: number;
    minorDefects: number;
    testGroups: TestGroup[];
    additionalEvidence: Record<string, any[]>;
    inspectionStatus: string;
    inspectorSignature?: string;
  };
  setFormData: (d: any) => void;
  onEditStep: (stepId: string) => void;
  errors?: Record<string, string>;
}

function SectionHeader({ title, stepLabel, onEdit }: { title: string; stepLabel: string; onEdit: () => void }) {
  return (
    <View className="flex-row items-center pb-2 border-b border-slate-200 mb-3">
      <Text className="text-sm font-bold text-slate-800 flex-1">{title}</Text>
      <Text className="text-xs text-slate-400 mr-2">{stepLabel}</Text>
      <TouchableOpacity
        onPress={onEdit}
        className="flex-row items-center bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1"
      >
        <Pencil size={11} color="#2563eb" />
        <Text className="text-xs font-semibold text-blue-600 ml-1">Edit</Text>
      </TouchableOpacity>
    </View>
  );
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <View className="flex-row justify-between items-start py-2 border-b border-slate-100" style={{ columnGap: 12 }}>
      <Text className="text-sm text-slate-500 font-medium">{label}</Text>
      <Text className="text-sm text-slate-900 font-semibold text-right flex-1">{value || '—'}</Text>
    </View>
  );
}

function VerBadge({ ok }: { ok: boolean | null }) {
  if (ok === true)
    return (
      <View className="flex-row items-center bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
        <CheckCircle2 size={11} color="#047857" />
        <Text className="text-[11px] font-bold text-emerald-700 ml-1">Yes</Text>
      </View>
    );
  if (ok === false)
    return (
      <View className="flex-row items-center bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
        <XCircle size={11} color="#b91c1c" />
        <Text className="text-[11px] font-bold text-red-700 ml-1">No</Text>
      </View>
    );
  return (
    <View className="flex-row items-center bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
      <Minus size={11} color="#64748b" />
      <Text className="text-[11px] font-bold text-slate-500 ml-1">—</Text>
    </View>
  );
}

export default function PI_Step6_Review({ formData: d, setFormData, onEditStep, errors = {} }: Props) {
  const [showStatus, setShowStatus] = useState(false);
  const v = d.vendorData || {};
  const p = d.productData || {};
  const inspectorName = d.inspectorSignature || '';

  const verEntries = Object.entries(d.productVerifications || {});
  const verYes = verEntries.filter(([, val]) => val.ok === true).length;
  const verNo = verEntries.filter(([, val]) => val.ok === false).length;
  const verTotal = verEntries.length;

  const allTests = (d.testGroups || []).flatMap((g) => g.tests);
  const testPass = allTests.filter((t) => t.pass).length;
  const testFail = allTests.filter((t) => t.fail).length;

  const pkgItems: PackagingItem[] = d.packagingItems || [];

  const statusStyle = d.inspectionStatus ? STATUS_STYLES[d.inspectionStatus] : null;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View className="border-b border-slate-200 pb-4 mb-4">
        <Text className="text-xl font-bold text-slate-900 mb-1">Inspection Review</Text>
        <Text className="text-sm text-slate-500">
          Full summary of all steps. Tap Edit on any section to go back and make changes.
        </Text>
      </View>

      {/* Summary cards */}
      <View className="flex-row flex-wrap mb-5" style={{ gap: 8 }}>
        <View className="flex-1 min-w-[45%] bg-emerald-50 border border-emerald-200 rounded-xl p-3 items-center">
          <Text className="text-2xl font-extrabold text-emerald-700">{verYes}</Text>
          <Text className="text-xs font-semibold text-emerald-700 mt-0.5">Fields Verified</Text>
        </View>
        <View className="flex-1 min-w-[45%] bg-red-50 border border-red-200 rounded-xl p-3 items-center">
          <Text className="text-2xl font-extrabold text-red-700">{verNo}</Text>
          <Text className="text-xs font-semibold text-red-700 mt-0.5">Fields Issues</Text>
        </View>
        <View className="flex-1 min-w-[45%] bg-emerald-50 border border-emerald-200 rounded-xl p-3 items-center">
          <Text className="text-2xl font-extrabold text-emerald-700">{testPass}</Text>
          <Text className="text-xs font-semibold text-emerald-700 mt-0.5">Tests Passed</Text>
        </View>
        <View className="flex-1 min-w-[45%] bg-red-50 border border-red-200 rounded-xl p-3 items-center">
          <Text className="text-2xl font-extrabold text-red-700">{testFail}</Text>
          <Text className="text-xs font-semibold text-red-700 mt-0.5">Tests Failed</Text>
        </View>
      </View>

      {/* Step 1 */}
      <View className="mb-6">
        <SectionHeader title="General Information" stepLabel="Step 1" onEdit={() => onEditStep('generalInformation')} />
        <Row label="Company" value={v.companyName} />
        <Row label="Business Type" value={v.businessType} />
        <Row label="Product" value={p.name} />
        <Row label="Inspection Date" value={d.serviceStartDate} />
        <Row label="Service Type" value={d.serviceType} />
      </View>

      {/* Step 2 */}
      <View className="mb-6">
        <SectionHeader title="Product Verification" stepLabel="Step 2" onEdit={() => onEditStep('productVerification')} />
        {verTotal === 0 ? (
          <Text className="text-sm text-slate-400 italic">No fields verified.</Text>
        ) : (
          <>
            <Text className="text-sm text-slate-600 mb-2">
              {verYes + verNo} / {verTotal} fields reviewed ({verYes} verified, {verNo} issues)
            </Text>
            {verNo > 0 && (
              <View className="mb-2">
                <Text className="text-xs font-bold text-red-700 uppercase mb-1">Fields with Issues</Text>
                {verEntries
                  .filter(([, val]) => val.ok === false)
                  .map(([key, val]) => (
                    <View key={key} className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-1">
                      <Text className="text-xs font-bold text-slate-700">{key.replace(/^pv_/, '').replace(/_/g, ' ')}</Text>
                      {!!val.remarks && <Text className="text-xs text-red-700 italic">{val.remarks}</Text>}
                    </View>
                  ))}
              </View>
            )}
            <Row label="Photo Evidence" value={`${(d.productEvidencePhotos || []).length} photo(s)`} />
          </>
        )}
      </View>

      {/* Step 3 */}
      <View className="mb-6">
        <SectionHeader title="Packaging Inspection" stepLabel="Step 3" onEdit={() => onEditStep('packagingInspection')} />
        {pkgItems.map((item) => (
          <View key={item.id} className="border border-slate-100 rounded-xl px-3 py-2.5 mb-2 flex-row items-start justify-between" style={{ columnGap: 8 }}>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-slate-800" numberOfLines={1}>{item.label}</Text>
              {item.verified === true && item.remarkCode !== null && (
                <View className={`self-start mt-1 px-2 py-0.5 rounded-full border ${badgeCls(item.remarkCode)}`}>
                  <Text className={`text-[11px] font-semibold ${badgeText(item.remarkCode)}`}>
                    Code {item.remarkCode} — {CODE_LABELS[item.remarkCode]}
                  </Text>
                </View>
              )}
              {!!item.remarks && <Text className="text-xs text-slate-500 italic mt-1">{item.remarks}</Text>}
            </View>
            <VerBadge ok={item.verified} />
          </View>
        ))}
        <Row label="Packaging Photos" value={`${(d.packagingPhotos || []).length} photo(s)`} />
      </View>

      {/* Step 4 */}
      <View className="mb-6">
        <SectionHeader title="Defects" stepLabel="Step 4" onEdit={() => onEditStep('defects')} />
        <View className="flex-row mb-3" style={{ gap: 8 }}>
          <View className="flex-1 border border-purple-200 bg-purple-50 rounded-xl p-3 items-center">
            <Text className="text-lg font-bold text-purple-700">{d.criticalDefects}</Text>
            <Text className="text-xs text-purple-600 font-semibold">Critical</Text>
          </View>
          <View className="flex-1 border border-red-200 bg-red-50 rounded-xl p-3 items-center">
            <Text className="text-lg font-bold text-red-700">{d.majorDefects}</Text>
            <Text className="text-xs text-red-600 font-semibold">Major</Text>
          </View>
          <View className="flex-1 border border-amber-200 bg-amber-50 rounded-xl p-3 items-center">
            <Text className="text-lg font-bold text-amber-700">{d.minorDefects}</Text>
            <Text className="text-xs text-amber-600 font-semibold">Minor</Text>
          </View>
        </View>
        <Row label="Inspection Level" value={d.inspectionLevel} />
        <Row label="Sample Size" value={String(d.sampleSize)} />
      </View>

      {/* Step 5 */}
      <View className="mb-6">
        <SectionHeader title="Testing" stepLabel="Step 5" onEdit={() => onEditStep('testing')} />
        {(d.testGroups || []).map((group) => {
          const gPass = group.tests.filter((t) => t.pass).length;
          const gFail = group.tests.filter((t) => t.fail).length;
          const gTotal = group.tests.length;
          return (
            <View key={group.id} className="border border-slate-200 rounded-xl px-3 py-2.5 mb-2">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-sm font-bold text-slate-800">{group.label}</Text>
                <View className="flex-row items-center" style={{ columnGap: 6 }}>
                  <Text className="text-xs text-emerald-700 font-semibold">{gPass}✓</Text>
                  <Text className="text-xs text-red-700 font-semibold">{gFail}✗</Text>
                  <Text className="text-xs text-slate-400">{gPass + gFail}/{gTotal}</Text>
                </View>
              </View>
              {group.tests.filter((t) => t.fail).map((t) => (
                <View key={t.id} className="flex-row items-center mt-0.5">
                  <XCircle size={11} color="#b91c1c" />
                  <Text className="text-xs text-red-700 ml-1">
                    {t.label}
                    {t.remarks ? <Text className="text-slate-500 italic"> — {t.remarks}</Text> : null}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}
        <View className="border border-slate-100 rounded-xl px-3 py-2.5 mt-1">
          <Text className="text-sm font-bold text-slate-700 mb-1.5">Additional Evidence</Text>
          {ADDITIONAL_EVIDENCE_DEFS.map((def) => (
            <Row
              key={def.id}
              label={def.label.split('(')[0].trim()}
              value={`${((d.additionalEvidence || {})[def.id] || []).length} photo(s)`}
            />
          ))}
        </View>
      </View>

      {/* Inspector Details */}
      <View className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4">
        <View className="bg-slate-50 border-b border-slate-200 px-4 py-3">
          <Text className="text-sm font-bold text-slate-800">Inspector Details</Text>
        </View>
        <View className="p-4">
          <Text className="text-[11px] font-semibold text-slate-500 uppercase mb-1.5">Inspector Name</Text>
          <View className="px-4 py-3 border border-slate-200 rounded-xl bg-slate-100 mb-4">
            <Text className="text-sm text-slate-700">{inspectorName || '—'}</Text>
          </View>

          <Text className="text-[11px] font-semibold text-slate-500 uppercase mb-1.5">Inspection Date</Text>
          <View className="px-4 py-3 border border-slate-200 rounded-xl bg-slate-100 mb-4">
            <Text className="text-sm text-slate-700">{d.serviceStartDate || new Date().toISOString().split('T')[0]}</Text>
          </View>

          <Text className="text-[11px] font-semibold text-slate-500 uppercase mb-1.5">
            Inspection Status <Text className="text-red-500">*</Text>
          </Text>
          <TouchableOpacity
            onPress={() => setShowStatus(true)}
            activeOpacity={0.8}
            className={`px-4 py-3 border rounded-xl flex-row items-center justify-between ${
              errors.inspectionStatus
                ? 'border-red-500 bg-red-50'
                : statusStyle
                ? `${statusStyle.border} ${statusStyle.bg}`
                : 'border-slate-300 bg-white'
            }`}
          >
            <Text className={`text-sm font-semibold ${statusStyle ? statusStyle.text : 'text-slate-400'}`}>
              {d.inspectionStatus || 'Select status…'}
            </Text>
            <ChevronDown size={16} color="#64748b" />
          </TouchableOpacity>
          {!!errors.inspectionStatus && <Text className="text-xs text-red-600 mt-1.5">{errors.inspectionStatus}</Text>}
        </View>
      </View>

      <View className="h-6" />

      {/* Status modal */}
      <Modal visible={showStatus} transparent animationType="fade" onRequestClose={() => setShowStatus(false)}>
        <Pressable className="flex-1 bg-black/40 justify-center px-6" onPress={() => setShowStatus(false)}>
          <Pressable className="bg-white rounded-2xl overflow-hidden" onPress={(e) => e.stopPropagation()}>
            <View className="px-5 py-3 border-b border-slate-100">
              <Text className="text-sm font-bold text-slate-800">Select Inspection Status</Text>
            </View>
            {INSPECTION_STATUS_OPTIONS.map((status) => {
              const selected = d.inspectionStatus === status;
              const st = STATUS_STYLES[status];
              return (
                <TouchableOpacity
                  key={status}
                  onPress={() => {
                    setFormData({ ...d, inspectionStatus: status });
                    setShowStatus(false);
                  }}
                  className={`px-5 py-3.5 flex-row items-center justify-between border-b border-slate-50 ${
                    selected ? st.bg : 'bg-white'
                  }`}
                >
                  <Text className={`text-sm ${selected ? `${st.text} font-semibold` : 'text-slate-700'}`}>{status}</Text>
                  {selected && <Check size={16} color="#2563eb" />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
