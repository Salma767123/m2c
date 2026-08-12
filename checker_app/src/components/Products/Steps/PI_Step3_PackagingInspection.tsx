import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Check, X, Camera } from 'lucide-react-native';
import type { PackagingItem } from '../PI_data';
import { CODE_LABELS } from '../PI_data';
import { StepHeader, Card, ErrorBanner, PhotoGrid, RemarkInput, Photo } from './piShared';
import { InvalidAnchor } from './piValidation';
import type { ScrollNavHandlers } from '@/components/General/ScrollNav';

// ── Remark-code colouring — mirrors web codeClass / codeBadge ────────────────
// 1-5 → REJECTED (red)   6-7 → RE-INSPECTION (amber)   8-10 → PASS (emerald)
function codeColors(code: number, selected: boolean) {
  if (selected) {
    if (code <= 5) return { bg: '#dc2626', border: '#dc2626', text: '#ffffff' };
    if (code <= 7) return { bg: '#f59e0b', border: '#f59e0b', text: '#ffffff' };
    return { bg: '#059669', border: '#059669', text: '#ffffff' };
  }
  if (code <= 5) return { bg: '#fef2f2', border: '#fecaca', text: '#ef4444' };
  if (code <= 7) return { bg: '#fffbeb', border: '#fde68a', text: '#d97706' };
  return { bg: '#ecfdf5', border: '#a7f3d0', text: '#059669' };
}

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

interface Props {
  formData: {
    packagingItems: PackagingItem[];
    packagingPhotos: Photo[];
  };
  setFormData: (d: any) => void;
  errors?: Record<string, string>;
  scrollNav?: ScrollNavHandlers;
  /** 'VIRTUAL' allows gallery uploads; 'PHYSICAL' is camera-only. */
  inspectionType?: 'PHYSICAL' | 'VIRTUAL' | null;
}

function PackagingRow({
  item,
  invalid = false,
  onChange,
}: {
  item: PackagingItem;
  /** This is the item blocking Next — highlight it and be the scroll target. */
  invalid?: boolean;
  onChange: (patch: Partial<PackagingItem>) => void;
}) {
  const needsRemarks = item.remarkCode !== null && item.remarkCode <= 7;
  const borderCls = invalid
    ? 'border-red-500'
    : item.verified === true
    ? 'border-emerald-200'
    : 'border-slate-200';

  return (
    <InvalidAnchor errorKey="packagingItems" invalid={invalid} style={{ marginBottom: 16 }}>
    <View className={`border rounded-2xl overflow-hidden bg-white ${borderCls}`}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-slate-100">
        <Text className="text-sm font-bold text-slate-900">{item.label}</Text>
        <Text className="text-xs text-slate-500 mt-0.5">{item.detail}</Text>
      </View>

      {/* Yes / No */}
      <View className="px-3 py-2.5 border-b border-slate-100">
        <Text className="text-[11px] font-semibold text-slate-600 uppercase mb-2">Inspected?</Text>
        <View className="flex-row" style={{ columnGap: 8 }}>
          <TouchableOpacity
            onPress={() => onChange({ verified: true, remarkCode: item.remarkCode ?? null })}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: item.verified === true }}
            className={`flex-1 flex-row items-center justify-center rounded-lg border-2 py-2 ${
              item.verified === true ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
            }`}
            style={{ columnGap: 6 }}
          >
            <View
              className={`w-5 h-5 rounded-full items-center justify-center ${
                item.verified === true ? 'bg-white' : 'border-2 border-slate-300'
              }`}
            >
              {item.verified === true && <Check size={13} color="#059669" strokeWidth={3.5} />}
            </View>
            <Text className={`text-sm font-bold ${item.verified === true ? 'text-white' : 'text-slate-600'}`}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onChange({ verified: false, remarkCode: null, remarks: '' })}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: item.verified === false }}
            className={`flex-1 flex-row items-center justify-center rounded-lg border-2 py-2 ${
              item.verified === false ? 'border-red-600 bg-red-600' : 'border-slate-300 bg-white'
            }`}
            style={{ columnGap: 6 }}
          >
            <View
              className={`w-5 h-5 rounded-full items-center justify-center ${
                item.verified === false ? 'bg-white' : 'border-2 border-slate-300'
              }`}
            >
              {item.verified === false && <X size={13} color="#dc2626" strokeWidth={3.5} />}
            </View>
            <Text className={`text-sm font-bold ${item.verified === false ? 'text-white' : 'text-slate-600'}`}>No</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Remark code picker — only when Yes */}
      {item.verified === true && (
        <View className="px-4 py-3 border-b border-slate-100">
          <Text className="text-[11px] font-semibold text-slate-600 uppercase mb-2">Remark Code</Text>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((code) => {
              const selected = item.remarkCode === code;
              const c = codeColors(code, selected);
              return (
                <TouchableOpacity
                  key={code}
                  activeOpacity={0.8}
                  onPress={() => onChange({ remarkCode: selected ? null : code, remarks: '' })}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: c.border,
                    backgroundColor: c.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: c.text, fontWeight: '700', fontSize: 13 }}>{code}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {item.remarkCode !== null && (
            <View className={`self-start mt-3 px-3 py-1 rounded-full border ${badgeCls(item.remarkCode)}`}>
              <Text className={`text-xs font-semibold ${badgeText(item.remarkCode)}`}>
                Code {item.remarkCode} — {CODE_LABELS[item.remarkCode]}
                {item.remarkCode <= 7 ? '  (Remarks required)' : ''}
              </Text>
            </View>
          )}

          {needsRemarks && (
            <View className="mt-3">
              <Text className="text-[11px] font-semibold text-slate-600 uppercase mb-1.5">
                Remarks <Text className="text-red-500">*</Text>
              </Text>
              <RemarkInput
                value={item.remarks}
                onChangeText={(t) => onChange({ remarks: t })}
                placeholder="Describe the issue found…"
                error
              />
            </View>
          )}
        </View>
      )}
    </View>
    </InvalidAnchor>
  );
}

export default function PI_Step3_PackagingInspection({ formData, setFormData, errors = {}, scrollNav, inspectionType }: Props) {
  const items: PackagingItem[] = formData.packagingItems || [];

  // Mirror the Next-gate validation so, when the step is blocked, we can point
  // at and highlight the exact offending item — the same order validateStep
  // uses, so the highlighted row is always the one the message names.
  const firstInvalidItemId: string | null = (() => {
    if (!errors.packagingItems) return null;
    const unanswered = items.find((it) => it.verified === null || it.verified === undefined);
    if (unanswered) return unanswered.id;
    for (const it of items) {
      if (it.verified !== true) continue;
      if (it.remarkCode === null) return it.id;
      if (it.remarkCode <= 7 && !String(it.remarks || '').trim()) return it.id;
    }
    return null;
  })();

  const updateItem = (id: string, patch: Partial<PackagingItem>) => {
    setFormData({
      ...formData,
      packagingItems: items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    });
  };

  const addPhotos = (photos: Photo[]) => {
    setFormData({ ...formData, packagingPhotos: [...(formData.packagingPhotos || []), ...photos] });
  };
  const removePhoto = (idx: number) => {
    const next = [...(formData.packagingPhotos || [])];
    next.splice(idx, 1);
    setFormData({ ...formData, packagingPhotos: next });
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} {...scrollNav}>
      <StepHeader
        title="Packaging Inspection"
        subtitle="For each packaging item, mark whether it was inspected. If yes, select a remark code — codes 1–7 require remarks describing the findings."
      />

      {!!errors.packagingItems && <ErrorBanner message={errors.packagingItems} />}

      {/* Remark code legend */}
      <View className="flex-row flex-wrap mb-4" style={{ gap: 8 }}>
        <View className="flex-row items-center px-3 py-1.5 bg-red-50 border border-red-200 rounded-full">
          <View className="w-2 h-2 rounded-full bg-red-500 mr-1.5" />
          <Text className="text-xs font-semibold text-red-700">1–5 Rejected (remarks required)</Text>
        </View>
        <View className="flex-row items-center px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
          <View className="w-2 h-2 rounded-full bg-amber-500 mr-1.5" />
          <Text className="text-xs font-semibold text-amber-700">6–7 Re-inspection (remarks required)</Text>
        </View>
        <View className="flex-row items-center px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
          <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
          <Text className="text-xs font-semibold text-emerald-700">8–10 Pass (no remarks needed)</Text>
        </View>
      </View>

      {items.map((item) => (
        <PackagingRow
          key={item.id}
          item={item}
          invalid={item.id === firstInvalidItemId}
          onChange={(patch) => updateItem(item.id, patch)}
        />
      ))}

      {/* Photo upload */}
      <InvalidAnchor errorKey="packagingPhotos" invalid={!!errors.packagingPhotos}>
        <Card title="Packaging Photos" icon={<Camera size={16} color="#e01a1b" />} right={
          errors.packagingPhotos ? <Text className="text-xs text-red-600 font-medium">{errors.packagingPhotos}</Text> : undefined
        }>
          <PhotoGrid
            photos={formData.packagingPhotos || []}
            onAdd={addPhotos}
            onRemove={removePhoto}
            addLabel="Upload packaging photo"
            allowMultiple
            hasError={!!errors.packagingPhotos}
            inspectionType={inspectionType}
          />
        </Card>
      </InvalidAnchor>

      <View className="h-6" />
    </ScrollView>
  );
}
