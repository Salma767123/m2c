// Shared RN UI + photo helpers for the Product Inspection steps.
// Keeps the 7 step components consistent with the app's blue-accent card style
// while mirroring the web QC portal's field semantics.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Modal, Pressable, ScrollView, TextInput } from 'react-native';
import { Upload, X, CheckCircle2, XCircle, Eye } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { showImagePickerOptions, ImagePickerResult } from '@/utils/imagePicker';
import { compressImage } from '@/utils/imageCompress';

export type Photo = { name: string; data: string };

// ── Fullscreen image lightbox ────────────────────────────────────────────────
export function PhotoLightbox({
  image,
  onClose,
}: {
  image: { url: string; label?: string } | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={!!image} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/90 items-center justify-center px-4" onPress={onClose}>
        {!!image && (
          <>
            <Image
              source={{ uri: image.url }}
              style={{ width: '100%', height: '80%' }}
              resizeMode="contain"
            />
            {!!image.label && (
              <Text className="text-white/80 text-sm mt-3 text-center">{image.label}</Text>
            )}
          </>
        )}
        <TouchableOpacity
          onPress={onClose}
          className="absolute top-14 right-6 w-10 h-10 rounded-full bg-white items-center justify-center"
        >
          <X size={18} color="#334155" />
        </TouchableOpacity>
      </Pressable>
    </Modal>
  );
}

/** Open a remote document / PDF URL in the in-app browser (matches web target=_blank). */
export async function openDocUrl(url?: string | null) {
  if (!url) return;
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    /* ignore */
  }
}

// ── Remarks textarea ─────────────────────────────────────────────────────────
export function RemarkInput({
  value,
  onChangeText,
  placeholder,
  error = false,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  error?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#94a3b8"
      multiline
      textAlignVertical="top"
      className={`rounded-xl px-3 py-2.5 bg-white text-sm text-slate-900 min-h-[64px] border ${
        error ? 'border-red-300' : 'border-slate-300'
      }`}
    />
  );
}

/**
 * Launch the picker (camera / gallery), compress each selected image to the
 * web-matching 1200px / JPEG 0.7, and hand back `{ name, data }` items whose
 * `data` is a `data:image/jpeg;base64,...` URI — identical shape to what the
 * web crop flow stores.
 */
export function pickPhotos(
  onPicked: (photos: Photo[]) => void,
  allowMultiple: boolean = false,
) {
  showImagePickerOptions(async (images: ImagePickerResult[]) => {
    const out: Photo[] = [];
    for (const img of images) {
      let data = img.data || img.uri;
      try {
        data = await compressImage(img.uri || img.data);
      } catch {
        // Fall back to the picker's already-base64 data if compression fails.
      }
      out.push({ name: img.name || 'image.jpg', data });
    }
    if (out.length > 0) onPicked(out);
  }, allowMultiple);
}

// ── Section heading ──────────────────────────────────────────────────────────
export function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="border-b border-slate-200 pb-4 mb-4">
      <Text className="text-xl font-bold text-slate-900 mb-1">{title}</Text>
      {!!subtitle && <Text className="text-sm text-slate-500">{subtitle}</Text>}
    </View>
  );
}

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
      <Text className="text-sm font-semibold text-red-700">{message}</Text>
    </View>
  );
}

// ── Card (bordered white block with a slate header) ──────────────────────────
export function Card({
  title,
  right,
  children,
}: {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4">
      {!!title && (
        <View className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex-row items-center">
          <Text className="text-sm font-bold text-slate-800 flex-1">{title}</Text>
          {right}
        </View>
      )}
      <View className="p-4">{children}</View>
    </View>
  );
}

export function InfoBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <View className="mb-3">
      <Text className="text-[11px] font-semibold text-slate-500 uppercase mb-0.5">{label}</Text>
      <Text className="text-sm text-slate-900 font-medium">{value || '—'}</Text>
    </View>
  );
}

// ── Photo grid with add + remove ─────────────────────────────────────────────
export function PhotoGrid({
  photos,
  onAdd,
  onRemove,
  addLabel = 'Add photo',
  allowMultiple = false,
  hasError = false,
  thumb = 80,
}: {
  photos: Photo[];
  onAdd: (photos: Photo[]) => void;
  onRemove: (index: number) => void;
  addLabel?: string;
  allowMultiple?: boolean;
  hasError?: boolean;
  thumb?: number;
}) {
  return (
    <View>
      {photos.length === 0 ? (
        <TouchableOpacity
          onPress={() => pickPhotos(onAdd, allowMultiple)}
          activeOpacity={0.8}
          className={`border-2 border-dashed rounded-xl py-6 items-center ${
            hasError ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-slate-50'
          }`}
        >
          <Upload size={22} color={hasError ? '#ef4444' : '#94a3b8'} />
          <Text className="text-xs text-slate-500 mt-1">{addLabel}</Text>
        </TouchableOpacity>
      ) : (
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {photos.map((ph, i) => (
            <View key={i} style={{ width: thumb, height: thumb }} className="rounded-xl overflow-hidden relative bg-slate-100">
              <Image source={{ uri: ph.data }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              <TouchableOpacity
                onPress={() => onRemove(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 items-center justify-center"
              >
                <X size={11} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          ))}
          {allowMultiple && (
            <TouchableOpacity
              onPress={() => pickPhotos(onAdd, allowMultiple)}
              activeOpacity={0.8}
              style={{ width: thumb, height: thumb }}
              className="rounded-xl border-2 border-dashed border-slate-300 items-center justify-center bg-slate-50"
            >
              <Upload size={18} color="#94a3b8" />
              <Text className="text-[10px] text-slate-400 mt-0.5">Add</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ── Yes / No verification row (Step 2) ───────────────────────────────────────
export function VerifyField({
  fieldKey,
  label,
  value,
  imageUrl,
  verification,
  onChange,
  highlight = false,
  onView,
}: {
  fieldKey: string;
  label: string;
  value?: React.ReactNode;
  /** When set, renders a thumbnail with a View action instead of a text value */
  imageUrl?: string | null;
  verification: { ok: boolean | null; remarks: string };
  onChange: (ok: boolean | null, remarks: string) => void;
  highlight?: boolean;
  onView?: () => void;
}) {
  const v = verification ?? { ok: null, remarks: '' };
  const needsHighlight = highlight && v.ok === null;
  const borderCls = needsHighlight
    ? 'border-red-500 bg-red-50'
    : v.ok === true
    ? 'border-emerald-200 bg-emerald-50'
    : v.ok === false
    ? 'border-red-200 bg-red-50'
    : 'border-slate-200 bg-white';

  return (
    <View className={`rounded-xl border mb-3 ${borderCls}`}>
      <View className="p-3">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-[11px] font-semibold text-slate-500 uppercase flex-1">{label}</Text>
          {!!onView && (
            <TouchableOpacity
              onPress={onView}
              className="flex-row items-center bg-blue-50 border border-blue-100 rounded-lg px-2 py-0.5 ml-2"
            >
              <Eye size={12} color="#2563eb" />
              <Text className="text-[11px] font-semibold text-blue-600 ml-1">View</Text>
            </TouchableOpacity>
          )}
        </View>
        {imageUrl ? (
          <TouchableOpacity onPress={onView} activeOpacity={0.9}>
            <Image
              source={{ uri: imageUrl }}
              style={{ width: 96, height: 96 }}
              className="rounded-lg border border-slate-200"
              resizeMode="cover"
            />
          </TouchableOpacity>
        ) : typeof value === 'string' || typeof value === 'number' ? (
          <Text className="text-sm text-slate-900">{value === '' || value == null ? '—' : String(value)}</Text>
        ) : (
          value ?? <Text className="text-sm text-slate-400 italic">Not provided</Text>
        )}
      </View>
      <View className="border-t border-slate-100 px-3 py-2.5">
        <View className="flex-row" style={{ columnGap: 24 }}>
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => onChange(true, v.remarks)}
            activeOpacity={0.7}
          >
            <CheckCircle2 size={16} color={v.ok === true ? '#059669' : '#94a3b8'} />
            <Text className={`ml-1.5 text-sm font-semibold ${v.ok === true ? 'text-emerald-700' : 'text-slate-500'}`}>
              Yes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => onChange(false, v.remarks)}
            activeOpacity={0.7}
          >
            <XCircle size={16} color={v.ok === false ? '#dc2626' : '#94a3b8'} />
            <Text className={`ml-1.5 text-sm font-semibold ${v.ok === false ? 'text-red-700' : 'text-slate-500'}`}>
              No
            </Text>
          </TouchableOpacity>
        </View>
        {needsHighlight && (
          <Text className="text-xs text-red-600 font-medium mt-1.5">
            Please complete this verification before continuing.
          </Text>
        )}
        {v.ok === false && (
          <View className="mt-2">
            <RemarkInput
              value={v.remarks}
              onChangeText={(t) => onChange(v.ok, t)}
              placeholder="Remarks for this field…"
              error
            />
          </View>
        )}
      </View>
    </View>
  );
}

export function LoadingOverlay({ label }: { label: string }) {
  return (
    <View className="absolute inset-0 bg-black/50 items-center justify-center" style={{ zIndex: 100 }}>
      <View className="bg-white rounded-2xl p-8 mx-8 items-center">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-base font-bold text-slate-900 mt-4 text-center">{label}</Text>
      </View>
    </View>
  );
}
