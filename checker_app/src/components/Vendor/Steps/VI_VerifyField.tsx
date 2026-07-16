// RN port of frontend/src/components/Checker/Vendor/Steps/VI_VerifyField.tsx
// Tri-state verification card (Yes / No + remarks-on-No), highlight context,
// value renderer, SectionBlock, InfoRow, and DocCard (image lightbox + doc
// open-in-browser).

import React, { createContext, useContext, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Modal, Linking, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { FileText, Eye, X, ExternalLink, Check, Mail, Send } from 'lucide-react-native';
import { isImageUrl, docFilename, getProxyUrl } from './fieldHelpers';
import qcCheckerService from '@/services/qcCheckerService';

// Labels that identify a field as an email address (mirrors web EMAIL_LABEL_RE).
const EMAIL_LABEL_RE = /e-?mail/i;
const EMAIL_VALUE_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Email value with a mailto: link plus a "Test" button that sends a real test
// email through the backend so the checker can confirm the address is
// reachable before marking it verified. Mirrors web VI_VerifyField EmailValue.
function EmailValue({ value }: { value: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  const sendTest = async () => {
    if (status === 'sending') return;
    setStatus('sending');
    try {
      await qcCheckerService.sendTestEmail(value);
      setStatus('sent');
    } catch {
      setStatus('failed');
    }
  };

  const btnCls =
    status === 'sent'
      ? 'border-emerald-200 bg-emerald-50'
      : status === 'failed'
        ? 'border-red-200 bg-red-50'
        : 'border-brand-200 bg-brand-50';
  const btnTextCls =
    status === 'sent' ? 'text-emerald-700' : status === 'failed' ? 'text-red-700' : 'text-brand-700';
  const iconColor = status === 'sent' ? '#047857' : status === 'failed' ? '#b91c1c' : '#c41617';

  return (
    <View className="flex-row items-center flex-wrap" style={{ columnGap: 8, rowGap: 6 }}>
      <TouchableOpacity
        onPress={() => Linking.openURL(`mailto:${value}`).catch(() => {})}
        className="flex-row items-center"
        style={{ columnGap: 6 }}
      >
        <Mail size={14} color="#e01a1b" />
        <Text className="text-sm font-medium text-brand-600">{value}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={sendTest}
        disabled={status === 'sending'}
        className={`flex-row items-center px-2.5 py-1 rounded-lg border ${btnCls}`}
        style={{ columnGap: 4, opacity: status === 'sending' ? 0.6 : 1 }}
      >
        {status === 'sending' ? (
          <ActivityIndicator size="small" color="#c41617" />
        ) : status === 'sent' ? (
          <Check size={12} color={iconColor} strokeWidth={3} />
        ) : (
          <Send size={12} color={iconColor} />
        )}
        <Text className={`text-xs font-semibold ${btnTextCls}`}>
          {status === 'sending' ? 'Sending…' : status === 'sent' ? 'Test Sent' : status === 'failed' ? 'Retry Test' : 'Test'}
        </Text>
      </TouchableOpacity>
      {status === 'failed' && (
        <Text className="text-xs text-red-600 w-full">Failed to send — check SMTP config.</Text>
      )}
    </View>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────
export type FieldVerification = { ok: boolean | null; remarks: string };
export type Verifications = Record<string, FieldVerification>;

export type ValueType = 'text' | 'image' | 'document' | 'list' | 'date' | 'url' | 'badge' | 'phone' | 'email';

// ── Highlight context (set by the form on validation failure) ───────────────
const HighlightedFieldsCtx = createContext<Set<string>>(new Set());

export function HighlightFieldsProvider({
  keys,
  children,
}: {
  keys: Set<string>;
  children: React.ReactNode;
}) {
  return <HighlightedFieldsCtx.Provider value={keys}>{children}</HighlightedFieldsCtx.Provider>;
}

// ── Fullscreen image lightbox ───────────────────────────────────────────────
function ImageLightbox({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/90">
        <View className="flex-row items-center justify-between px-4 pt-14 pb-3">
          <Text className="text-white text-sm font-semibold flex-1 mr-3" numberOfLines={1}>
            {name}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} className="w-9 h-9 rounded-full bg-white/10 items-center justify-center">
            <X size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center px-4 pb-10">
          <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        </View>
      </View>
    </Modal>
  );
}

// Open a document (PDF / other) in an in-app browser, routing Cloudinary
// through the backend document-proxy — same URL logic as the web DocViewerModal.
export async function openDocument(url: string) {
  const target = getProxyUrl(url);
  try {
    await WebBrowser.openBrowserAsync(target);
  } catch {
    Linking.openURL(target).catch(() => {});
  }
}

// ── Value renderer ──────────────────────────────────────────────────────────
export function RenderValue({
  value,
  type,
  label,
  onImagePress,
}: {
  value: any;
  type?: ValueType;
  label?: string;
  onImagePress?: (url: string) => void;
}) {
  if (value === null || value === undefined || value === '') {
    return <Text className="text-slate-400 italic text-sm">Not provided</Text>;
  }

  // Email — explicit type or auto-detected from the field label (mirrors web).
  if (typeof value === 'string') {
    const isEmail =
      type === 'email' ||
      (!type && !!label && EMAIL_LABEL_RE.test(label) && EMAIL_VALUE_RE.test(value.trim()));
    if (isEmail) return <EmailValue value={value.trim()} />;
  }

  if (type === 'image' || (type !== 'document' && typeof value === 'string' && isImageUrl(value))) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => onImagePress?.(value)}>
        <Image
          source={{ uri: value }}
          style={{ width: 128, height: 128, borderRadius: 12 }}
          className="border border-slate-200"
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  }

  if (type === 'document' && typeof value === 'string') {
    return (
      <View className="flex-row items-center" style={{ columnGap: 8 }}>
        <FileText size={16} color="#94a3b8" />
        <Text className="text-sm text-slate-700 flex-1">{docFilename(value)}</Text>
      </View>
    );
  }

  if (type === 'url' && typeof value === 'string') {
    return (
      <TouchableOpacity onPress={() => Linking.openURL(value).catch(() => {})}>
        <Text className="text-brand-600 text-sm underline">{value}</Text>
      </TouchableOpacity>
    );
  }

  if (type === 'date' && value) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      const formatted = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
      return <Text className="text-slate-900 text-sm">{formatted}</Text>;
    }
  }

  if (Array.isArray(value) || type === 'list') {
    const items = Array.isArray(value) ? value : [value];
    if (items.length === 0) return <Text className="text-slate-400 italic text-sm">None</Text>;
    return (
      <View className="flex-row flex-wrap" style={{ gap: 6 }}>
        {items.map((item, i) => {
          // Items may be a plain string, or a { flagIso, label } object for
          // countries — the latter renders a real flag image (flagcdn).
          const iso = item && typeof item === 'object' ? item.flagIso : undefined;
          const text = item && typeof item === 'object' ? item.label : String(item);
          return (
            <View
              key={i}
              className="flex-row items-center px-2.5 py-0.5 bg-slate-100 rounded-full border border-slate-200"
              style={{ columnGap: 5 }}
            >
              {iso ? (
                <Image
                  source={{ uri: `https://flagcdn.com/w20/${String(iso).toLowerCase()}.png` }}
                  style={{ width: 16, height: 11, borderRadius: 2 }}
                />
              ) : null}
              <Text className="text-slate-700 text-xs font-medium">{text}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  if (type === 'badge' && typeof value === 'string') {
    return (
      <View className="px-2.5 py-0.5 bg-brand-50 rounded-full border border-brand-100 self-start">
        <Text className="text-brand-700 text-xs font-bold">{value}</Text>
      </View>
    );
  }

  if (typeof value === 'boolean') {
    return <Text className="text-slate-900 text-sm">{value ? 'Yes' : 'No'}</Text>;
  }

  return <Text className="text-slate-900 text-sm">{String(value)}</Text>;
}

// ── VerifyField ─────────────────────────────────────────────────────────────
interface VerifyFieldProps {
  fieldKey: string;
  label: string;
  value: any;
  verifications: Verifications;
  onChange: (key: string, ok: boolean | null, remarks: string) => void;
  type?: ValueType;
  /** Optional action rendered in the top-right (e.g. a View button). */
  headerAction?: React.ReactNode;
}

export default function VerifyField({
  fieldKey,
  label,
  value,
  verifications,
  onChange,
  type,
  headerAction,
}: VerifyFieldProps) {
  const highlightedKeys = useContext(HighlightedFieldsCtx);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const v = verifications[fieldKey] ?? { ok: null, remarks: '' };
  const isEmpty =
    value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
  const needsHighlight = highlightedKeys.has(fieldKey) && v.ok === null;

  const setOk = (ok: boolean) => onChange(fieldKey, ok, v.remarks);
  const setRemarks = (remarks: string) => onChange(fieldKey, v.ok, remarks);

  const borderCls = needsHighlight
    ? 'border-red-500 bg-red-50'
    : v.ok === true
      ? 'border-emerald-200 bg-emerald-50/40'
      : v.ok === false
        ? 'border-red-200 bg-red-50/40'
        : 'border-slate-200 bg-white';

  return (
    <View className={`rounded-xl border ${borderCls}`}>
      <View className="p-4">
        <View className="flex-row items-center justify-between mb-1" style={{ columnGap: 8 }}>
          <Text className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex-1">{label}</Text>
          {headerAction}
        </View>
        <View style={{ minHeight: 24 }}>
          {isEmpty ? (
            <Text className="text-slate-400 italic text-sm">Not provided</Text>
          ) : (
            <RenderValue value={value} type={type} label={label} onImagePress={(u) => setLightbox(u)} />
          )}
        </View>
      </View>

      <View className="border-t border-slate-100 px-4 py-3" style={{ rowGap: 8 }}>
        <Text className="text-xs font-semibold text-slate-600">Verification</Text>
        <View className="flex-row" style={{ columnGap: 24 }}>
          <TouchableOpacity onPress={() => setOk(true)} activeOpacity={0.7} className="flex-row items-center" style={{ columnGap: 8 }}>
            <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${v.ok === true ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'}`}>
              {v.ok === true && <Check size={12} color="#ffffff" strokeWidth={3} />}
            </View>
            <Text className={`text-sm font-semibold ${v.ok === true ? 'text-emerald-700' : 'text-slate-600'}`}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setOk(false)} activeOpacity={0.7} className="flex-row items-center" style={{ columnGap: 8 }}>
            <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${v.ok === false ? 'border-red-600 bg-red-600' : 'border-slate-300'}`}>
              {v.ok === false && <View className="w-2 h-2 rounded-full bg-white" />}
            </View>
            <Text className={`text-sm font-semibold ${v.ok === false ? 'text-red-700' : 'text-slate-600'}`}>No</Text>
          </TouchableOpacity>
        </View>
        {needsHighlight && (
          <Text className="text-xs text-red-600 font-medium">Please complete this verification before continuing.</Text>
        )}
        {v.ok === false && (
          <>
            <Text className="text-xs font-semibold text-slate-600">
              Reason <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={v.remarks}
              onChangeText={setRemarks}
              placeholder="Reason for marking No (required)…"
              placeholderTextColor="#94a3b8"
              multiline
              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-900"
              style={{ minHeight: 56, textAlignVertical: 'top' }}
            />
          </>
        )}
      </View>

      {lightbox && (
        <ImageLightbox url={lightbox} name={label} onClose={() => setLightbox(null)} />
      )}
    </View>
  );
}

// ── SectionBlock ────────────────────────────────────────────────────────────
export function SectionBlock({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={{ rowGap: 16 }}>
      <View className="flex-row items-center pb-2 border-b border-slate-200" style={{ columnGap: 8 }}>
        {icon}
        <Text className="text-base font-bold text-slate-800">{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ── DocCard — document/image card with view action ──────────────────────────
export function DocCard({
  doc,
  index,
  fieldKey,
  verifications,
  onChange,
}: {
  doc: { name?: string; documentUrl?: string; type?: string };
  index: number;
  fieldKey: string;
  verifications: Verifications;
  onChange: (key: string, ok: boolean | null, remarks: string) => void;
}) {
  const [lightbox, setLightbox] = useState(false);
  const url = doc.documentUrl || '';
  const name = doc.name || doc.type || `Document ${index + 1}`;
  const isImg = isImageUrl(url, doc.name);

  const viewButton = url ? (
    <TouchableOpacity
      onPress={() => (isImg ? setLightbox(true) : openDocument(url))}
      className="flex-row items-center px-2.5 py-1 bg-brand-50 border border-brand-200 rounded-lg"
      style={{ columnGap: 4 }}
    >
      <Eye size={12} color="#c41617" />
      <Text className="text-xs font-semibold text-brand-700">View</Text>
    </TouchableOpacity>
  ) : undefined;

  return (
    <>
      <VerifyField
        fieldKey={fieldKey}
        label={name}
        value={url}
        type={isImg ? 'image' : 'document'}
        verifications={verifications}
        onChange={onChange}
        headerAction={viewButton}
      />
      {lightbox && url && (
        <ImageLightbox url={url} name={name} onClose={() => setLightbox(false)} />
      )}
    </>
  );
}

// Shared "View" button for image/doc header actions inside steps.
export function ViewButton({ url, name, isImage }: { url: string; name: string; isImage: boolean }) {
  const [lightbox, setLightbox] = useState(false);
  if (!url) return null;
  return (
    <>
      <TouchableOpacity
        onPress={() => (isImage ? setLightbox(true) : openDocument(url))}
        className="flex-row items-center px-2.5 py-1 bg-brand-50 border border-brand-200 rounded-lg"
        style={{ columnGap: 4 }}
      >
        <Eye size={12} color="#c41617" />
        <Text className="text-xs font-semibold text-brand-700">View</Text>
      </TouchableOpacity>
      {lightbox && <ImageLightbox url={url} name={name} onClose={() => setLightbox(false)} />}
    </>
  );
}

export { ImageLightbox };
