import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { CheckCircle2, XCircle, Camera } from 'lucide-react-native';
import type { PackagingItem } from '../PI_data';
import { CODE_LABELS } from '../PI_data';
import { StepHeader, Card, ErrorBanner, PhotoGrid, RemarkInput, Photo } from './piShared';

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
}

function PackagingRow({
  item,
  onChange,
}: {
  item: PackagingItem;
  onChange: (patch: Partial<PackagingItem>) => void;
}) {
  const needsRemarks = item.remarkCode !== null && item.remarkCode <= 7;
  const borderCls = item.verified === true ? 'border-emerald-200' : 'border-slate-200';

  return (
    <View className={`border rounded-2xl overflow-hidden mb-4 bg-white ${borderCls}`}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-slate-100">
        <Text className="text-sm font-bold text-slate-900">{item.label}</Text>
        <Text className="text-xs text-slate-500 mt-0.5">{item.detail}</Text>
      </View>

      {/* Yes / No */}
      <View className="px-4 py-3 border-b border-slate-100 flex-row items-center" style={{ columnGap: 24 }}>
        <Text className="text-[11px] font-semibold text-slate-600 uppercase mr-1">Inspected?</Text>
        <TouchableOpacity
          className="flex-row items-center"
          activeOpacity={0.7}
          onPress={() => onChange({ verified: true, remarkCode: item.remarkCode ?? null })}
        >
          <CheckCircle2 size={16} color={item.verified === true ? '#059669' : '#94a3b8'} />
          <Text className={`ml-1.5 text-sm font-semibold ${item.verified === true ? 'text-emerald-700' : 'text-slate-500'}`}>
            Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-row items-center"
          activeOpacity={0.7}
          onPress={() => onChange({ verified: false, remarkCode: null, remarks: '' })}
        >
          <XCircle size={16} color={item.verified === false ? '#475569' : '#94a3b8'} />
          <Text className={`ml-1.5 text-sm font-semibold ${item.verified === false ? 'text-slate-700' : 'text-slate-500'}`}>
            No
          </Text>
        </TouchableOpacity>
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
  );
}

export default function PI_Step3_PackagingInspection({ formData, setFormData, errors = {} }: Props) {
  const items: PackagingItem[] = formData.packagingItems || [];

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
    <ScrollView showsVerticalScrollIndicator={false}>
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
        <PackagingRow key={item.id} item={item} onChange={(patch) => updateItem(item.id, patch)} />
      ))}

      {/* Photo upload */}
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
        />
      </Card>

      <View className="h-6" />
    </ScrollView>
  );
}
