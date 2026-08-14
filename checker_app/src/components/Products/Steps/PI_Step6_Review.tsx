import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { CheckCircle2, XCircle, Minus, Pencil, ClipboardList, Package, Box, AlertTriangle, FlaskConical, UserCheck } from 'lucide-react-native';
import type { PackagingItem, TestGroup } from '../PI_data';
import { ADDITIONAL_EVIDENCE_DEFS, CODE_LABELS, INSPECTION_STATUS_OPTIONS } from '../PI_data';
import { getBusinessTypeLabel } from '@/components/Vendor/Steps/fieldHelpers';
import { RemarkInput, formatDateDMY, Dropdown } from './piShared';
import type { DropdownOption } from './piShared';
import { InvalidAnchor } from './piValidation';
import type { ScrollNavHandlers } from '@/components/General/ScrollNav';

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

// Carry each status' own colour into the option rows so the open panel reads
// the same as the closed field.
const STATUS_DROPDOWN_OPTIONS: DropdownOption[] = INSPECTION_STATUS_OPTIONS.map((status) => ({
  value: status,
  selectedBg: STATUS_STYLES[status]?.bg,
  selectedText: STATUS_STYLES[status]?.text,
}));

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
    maxAllowedCritical?: number;
    maxAllowedMajor?: number;
    maxAllowedMinor?: number;
    criticalDefectDetails?: string;
    majorDefectDetails?: string;
    minorDefectDetails?: string;
    testGroups: TestGroup[];
    additionalEvidence: Record<string, any[]>;
    inspectionStatus: string;
    reviewerRemarks?: string;
    inspectorSignature?: string;
  };
  setFormData: (d: any) => void;
  onEditStep: (stepId: string) => void;
  errors?: Record<string, string>;
  scrollNav?: ScrollNavHandlers;
}

function SectionHeader({ title, stepLabel, onEdit, icon }: { title: string; stepLabel: string; onEdit: () => void; icon?: React.ReactNode }) {
  return (
    <View className="flex-row items-center pb-2 border-b border-slate-200 mb-3" style={{ columnGap: 8 }}>
      {icon}
      <Text className="text-sm font-bold text-slate-800 flex-1">{title}</Text>
      <Text className="text-xs text-slate-400 mr-2">{stepLabel}</Text>
      <TouchableOpacity
        onPress={onEdit}
        className="flex-row items-center bg-brand-50 border border-brand-100 rounded-lg px-2.5 py-1"
      >
        <Pencil size={11} color="#c41617" />
        <Text className="text-xs font-semibold text-brand-600 ml-1">Edit</Text>
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

export default function PI_Step6_Review({ formData: d, setFormData, onEditStep, errors = {}, scrollNav }: Props) {
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
    <ScrollView showsVerticalScrollIndicator={false} {...scrollNav}>
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
        <SectionHeader title="General Information" stepLabel="Step 1" onEdit={() => onEditStep('generalInformation')} icon={<ClipboardList size={16} color="#e01a1b" />} />
        <Row label="Company" value={v.companyName} />
        <Row label="Business Type" value={getBusinessTypeLabel(v.businessType)} />
        <Row label="Product" value={p.name} />
        <Row label="Inspection Date" value={formatDateDMY(d.serviceStartDate)} />
        <Row label="Service Type" value={d.serviceType} />
      </View>

      {/* Step 2 */}
      <View className="mb-6">
        <SectionHeader title="Product Verification" stepLabel="Step 2" onEdit={() => onEditStep('productVerification')} icon={<Package size={16} color="#e01a1b" />} />
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
        <SectionHeader title="Packaging Inspection" stepLabel="Step 3" onEdit={() => onEditStep('packagingInspection')} icon={<Box size={16} color="#e01a1b" />} />
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
        <SectionHeader title="Defects" stepLabel="Step 4" onEdit={() => onEditStep('defects')} icon={<AlertTriangle size={16} color="#e01a1b" />} />
        {(() => {
          const rows = [
            { key: 'C', label: 'Critical', found: Number(d.criticalDefects || 0), max: d.maxAllowedCritical, details: d.criticalDefectDetails, border: 'border-purple-200 bg-purple-50', text: 'text-purple-700', sub: 'text-purple-600' },
            { key: 'Ma', label: 'Major', found: Number(d.majorDefects || 0), max: d.maxAllowedMajor, details: d.majorDefectDetails, border: 'border-red-200 bg-red-50', text: 'text-red-700', sub: 'text-red-600' },
            { key: 'Mi', label: 'Minor', found: Number(d.minorDefects || 0), max: d.maxAllowedMinor, details: d.minorDefectDetails, border: 'border-amber-200 bg-amber-50', text: 'text-amber-700', sub: 'text-amber-600' },
          ];
          const failed = rows.some((r) => r.max != null && r.found > Number(r.max));
          return (
            <>
              <View className="flex-row mb-3" style={{ gap: 8 }}>
                {rows.map((r) => {
                  const exceeded = r.max != null && r.found > Number(r.max);
                  return (
                    <View
                      key={r.key}
                      className={`flex-1 border ${r.border} rounded-xl p-3 items-center ${exceeded ? 'border-2 border-red-400' : ''}`}
                    >
                      <Text className={`text-lg font-bold ${r.text}`}>{r.found}</Text>
                      <Text className={`text-xs ${r.sub} font-semibold`}>{r.label}</Text>
                      <Text className="text-[10px] text-slate-500 mt-0.5">Max {r.max ?? '—'}</Text>
                    </View>
                  );
                })}
              </View>
              <Row label="Inspection Level" value={d.inspectionLevel} />
              <Row label="Sample Size" value={String(d.sampleSize)} />
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-sm text-slate-500 font-medium">AQL Result</Text>
                <View className={`px-2.5 py-1 rounded-full ${failed ? 'bg-red-100' : 'bg-emerald-100'}`}>
                  <Text className={`text-xs font-bold ${failed ? 'text-red-700' : 'text-emerald-700'}`}>
                    {failed ? 'FAIL' : 'PASS'}
                  </Text>
                </View>
              </View>
              {(d.criticalDefectDetails || d.majorDefectDetails || d.minorDefectDetails) && (
                <View style={{ rowGap: 6 }} className="mt-1">
                  {rows.filter((r) => r.details).map((r) => (
                    <View key={r.key} className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                      <Text className="text-xs">
                        <Text className="font-semibold text-slate-600">{r.label}: </Text>
                        <Text className="text-slate-700">{r.details}</Text>
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          );
        })()}
      </View>

      {/* Step 5 */}
      <View className="mb-6">
        <SectionHeader title="Testing" stepLabel="Step 5" onEdit={() => onEditStep('testing')} icon={<FlaskConical size={16} color="#e01a1b" />} />
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
        <View className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex-row items-center" style={{ columnGap: 8 }}>
          <UserCheck size={16} color="#e01a1b" />
          <Text className="text-sm font-bold text-slate-800">Inspector Details</Text>
        </View>
        <View className="p-4">
          <Text className="text-[11px] font-semibold text-slate-500 uppercase mb-1.5">Inspector Name</Text>
          <View className="px-4 py-3 border border-slate-200 rounded-xl bg-slate-100 mb-4">
            <Text className="text-sm text-slate-700">{inspectorName || '—'}</Text>
          </View>

          <Text className="text-[11px] font-semibold text-slate-500 uppercase mb-1.5">Inspection Date</Text>
          <View className="px-4 py-3 border border-slate-200 rounded-xl bg-slate-100 mb-4">
            <Text className="text-sm text-slate-700">{formatDateDMY(d.serviceStartDate || new Date().toLocaleDateString('en-CA'))}</Text>
          </View>

          <InvalidAnchor errorKey="inspectionStatus" invalid={!!errors.inspectionStatus}>
            <Text className="text-[11px] font-semibold text-slate-500 uppercase mb-1.5">
              Inspection Status <Text className="text-red-500">*</Text>
            </Text>
            <Dropdown
              value={d.inspectionStatus}
              placeholder="Select status…"
              options={STATUS_DROPDOWN_OPTIONS}
              onSelect={(inspectionStatus) => setFormData({ ...d, inspectionStatus })}
              accessibilityLabel="Inspection Status"
              triggerClassName={`px-4 py-3 border rounded-xl flex-row items-center justify-between ${
                errors.inspectionStatus
                  ? 'border-red-500 bg-red-50'
                  : statusStyle
                  ? `${statusStyle.border} ${statusStyle.bg}`
                  : 'border-slate-300 bg-white'
              }`}
              valueClassName={`text-sm font-semibold ${statusStyle ? statusStyle.text : 'text-slate-400'}`}
            />
            {!!errors.inspectionStatus && <Text className="text-xs text-red-600 mt-1.5">{errors.inspectionStatus}</Text>}
          </InvalidAnchor>

          {/* Reviewer remarks — required when the decision is a rejection so the
              reject endpoint always receives a real reason (F-08). */}
          <InvalidAnchor errorKey="reviewerRemarks" invalid={!!errors.reviewerRemarks} style={{ marginTop: 16 }}>
            <Text className="text-[11px] font-semibold text-slate-500 uppercase mb-1.5">
              Reviewer Remarks {d.inspectionStatus === 'Rejected' && <Text className="text-red-500">*</Text>}
            </Text>
            <RemarkInput
              value={d.reviewerRemarks || ''}
              onChangeText={(t) => setFormData({ ...d, reviewerRemarks: t })}
              placeholder={
                d.inspectionStatus === 'Rejected'
                  ? 'Reason for rejection (required)…'
                  : 'Optional notes explaining this decision…'
              }
              error={!!errors.reviewerRemarks}
            />
            {!!errors.reviewerRemarks && <Text className="text-xs text-red-600 mt-1.5">{errors.reviewerRemarks}</Text>}
          </InvalidAnchor>
        </View>
      </View>

      <View className="h-6" />
    </ScrollView>
  );
}
