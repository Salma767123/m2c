// RN port of frontend/src/components/Checker/Vendor/Steps/VI_VerifyField.tsx
// Tri-state verification card (Yes / No + remarks-on-No), highlight context,
// value renderer, SectionBlock, InfoRow, and DocCard (image lightbox + doc
// open-in-browser).

import React, { createContext, useContext, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Modal, Linking, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { FileText, Eye, X, ExternalLink, Check, Mail, Send, Phone } from 'lucide-react-native';
import {
  isImageUrl,
  docFilename,
  getProxyUrl,
  normalizeUrl,
  looksLikeUrl,
  telHref,
  looksLikePhone,
} from './fieldHelpers';
import qcCheckerService from '@/services/qcCheckerService';

// Labels that identify a field as an email address (mirrors web EMAIL_LABEL_RE).
const EMAIL_LABEL_RE = /e-?mail/i;
const EMAIL_VALUE_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone / website labels — steps pass these values as plain text, so detect
// them here once instead of tagging a type at every call site.
const PHONE_LABEL_RE = /phone|mobile|landline|whats\s*app|fax|contact\s*(no|number)/i;
const URL_LABEL_RE = /website|web\s*site|url|link/i;

// Phone value: tap the number to open the dialer with it prefilled.
function PhoneValue({ value }: { value: string }) {
  const href = telHref(value);
  return (
    <TouchableOpacity
      onPress={() => href && Linking.openURL(href).catch(() => {})}
      disabled={!href}
      hitSlop={6}
      accessibilityRole="link"
      accessibilityLabel={`Call ${value}`}
      className="flex-row items-center self-start"
      style={{ columnGap: 6 }}
    >
      <Phone size={14} color="#e01a1b" />
      <Text className="text-sm font-semibold text-brand-600">{value}</Text>
    </TouchableOpacity>
  );
}

// Website / map link: tap to open in the in-app browser. Values are normalized
// first so scheme-less domains ("acme.com") still open.
function UrlValue({ value }: { value: string }) {
  const target = normalizeUrl(value);
  return (
    <TouchableOpacity
      onPress={() => target && openDocument(target)}
      disabled={!target}
      hitSlop={6}
      accessibilityRole="link"
      accessibilityLabel={`Open ${value}`}
      className="flex-row items-center self-start"
      style={{ columnGap: 6 }}
    >
      <ExternalLink size={14} color="#e01a1b" />
      <Text className="text-sm font-semibold text-brand-600 underline">{value}</Text>
    </TouchableOpacity>
  );
}

// Email value with a mailto: link plus a "Test" button that sends a real test
// email through the backend so the checker can confirm the address is
// reachable before marking it verified. Mirrors web VI_VerifyField EmailValue.
function EmailValue({ value, onTestSent }: { value: string; onTestSent?: () => void }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  const sendTest = async () => {
    if (status === 'sending') return;
    setStatus('sending');
    try {
      await qcCheckerService.sendTestEmail(value);
      setStatus('sent');
      onTestSent?.(); // unlocks this field's Yes/No once the test mail is out
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
        accessibilityRole="link"
        accessibilityLabel={`Email ${value}`}
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

// Colour families a country list can be rendered in. Steps can give Import and
// Export different tones so the two lists don't read as one block.
export type ListTone = 'brand' | 'sky' | 'emerald' | 'amber';

const LIST_TONES: Record<ListTone, { chip: string; text: string }> = {
  brand: { chip: 'bg-brand-50 border-brand-200', text: 'text-brand-700' },
  sky: { chip: 'bg-sky-50 border-sky-200', text: 'text-sky-700' },
  emerald: { chip: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  amber: { chip: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
};

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
  listTone,
}: {
  value: any;
  type?: ValueType;
  label?: string;
  onImagePress?: (url: string) => void;
  listTone?: ListTone;
}) {
  if (value === null || value === undefined || value === '') {
    return <Text className="text-slate-400 italic text-sm">Not provided</Text>;
  }

  // Email / phone / website — explicit type or auto-detected from the field
  // label, so every step gets tappable contact values without extra wiring.
  if (typeof value === 'string') {
    const text = value.trim();
    const isEmail =
      type === 'email' ||
      (!type && !!label && EMAIL_LABEL_RE.test(label) && EMAIL_VALUE_RE.test(text));
    if (isEmail) return <EmailValue value={text} />;

    const isPhone =
      type === 'phone' ||
      (!type && !!label && PHONE_LABEL_RE.test(label) && looksLikePhone(text));
    if (isPhone) return <PhoneValue value={text} />;

    const isUrl =
      type === 'url' || (!type && !!label && URL_LABEL_RE.test(label) && looksLikeUrl(text));
    if (isUrl) return <UrlValue value={text} />;
  }

  if (type === 'image' || (type !== 'document' && typeof value === 'string' && isImageUrl(value))) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => onImagePress?.(value)}>
        <Image
          source={{ uri: value }}
          style={{ width: '100%', aspectRatio: 1, borderRadius: 12 }}
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
    const tone = LIST_TONES[listTone ?? 'brand'] ?? LIST_TONES.brand;
    // Country lists always highlight, since a flag chip is already a piece of
    // data the checker reads one by one. Every other list stays grey unless the
    // step asks for a tone — if everything were tinted, nothing would stand out.
    const forceTone = !!listTone;
    return (
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {items.map((item, i) => {
          // Items are either a plain string, or a { flagIso, label } object for
          // countries.
          const isCountry = !!item && typeof item === 'object' && 'label' in item;
          const highlight = isCountry || forceTone;
          const iso = isCountry ? (item as any).flagIso : undefined;
          const text = isCountry ? (item as any).label : String(item);
          return (
            <View
              key={i}
              className={
                highlight
                  ? `flex-row items-center px-3 py-1.5 rounded-full border ${tone.chip}`
                  : 'flex-row items-center px-2.5 py-0.5 rounded-full border bg-slate-100 border-slate-200'
              }
              style={{ columnGap: 6 }}
            >
              {iso ? (
                // w40 rather than w20: at a 20pt render width, w20 is visibly
                // soft on 2x/3x screens.
                <Image
                  source={{ uri: `https://flagcdn.com/w40/${String(iso).toLowerCase()}.png` }}
                  style={{
                    width: 20,
                    height: 14,
                    borderRadius: 2,
                    borderWidth: 1,
                    borderColor: 'rgba(15,23,42,0.12)',
                  }}
                />
              ) : null}
              <Text
                className={
                  highlight
                    ? `text-[13px] font-bold ${tone.text}`
                    : 'text-slate-700 text-xs font-medium'
                }
              >
                {text}
              </Text>
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
  /**
   * Attach a document to this card AND lock its Yes/No until the checker has
   * opened it once. Renders its own View button (so the press can report back),
   * which is why this replaces `headerAction` rather than sitting beside it.
   */
  requireDocView?: { url: string; name?: string };
  /** Tighter padding + stacked Yes/No — for half-width grid cells. */
  compact?: boolean;
  /** Tint the list chips. Country lists tint regardless; other lists only
   *  when this is set. */
  listTone?: ListTone;
}

export default function VerifyField({
  fieldKey,
  label,
  value,
  verifications,
  onChange,
  type,
  headerAction,
  requireDocView,
  compact = false,
  listTone,
}: VerifyFieldProps) {
  const highlightedKeys = useContext(HighlightedFieldsCtx);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const v = verifications[fieldKey] ?? { ok: null, remarks: '' };
  const isEmpty =
    value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
  const needsHighlight = highlightedKeys.has(fieldKey) && v.ok === null;

  // Is this an email field? Explicit type, or auto-detected from label + value —
  // the same detection RenderValue uses, so every email in the form is gated and
  // not just the ones a step remembered to tag.
  const isEmailField =
    !isEmpty &&
    typeof value === 'string' &&
    (type === 'email' ||
      (!type && !!label && EMAIL_LABEL_RE.test(label) && EMAIL_VALUE_RE.test(value.trim())));

  // Verification gate: an email's Yes/No stays LOCKED until the checker has
  // actually sent a test mail, so an unreachable address can't be rubber-stamped.
  const [emailTested, setEmailTested] = useState(false);
  // Same idea for an attached document: a certificate can't be judged without
  // opening it, so the card stays locked until the View button has been used.
  const [docViewed, setDocViewed] = useState(false);
  const docGated = !!requireDocView?.url && !docViewed;
  const gated = (isEmailField && !emailTested) || docGated;
  const [showGateHint, setShowGateHint] = useState(false);

  const setOk = (ok: boolean) => {
    if (gated) {
      setShowGateHint(true);
      return;
    }
    onChange(fieldKey, ok, v.remarks);
  };
  const setRemarks = (remarks: string) => onChange(fieldKey, v.ok, remarks);

  const borderCls = needsHighlight
    ? 'border-red-500 bg-red-50'
    : v.ok === true
      ? 'border-emerald-200 bg-emerald-50/40'
      : v.ok === false
        ? 'border-red-200 bg-red-50/40'
        : 'border-slate-200 bg-white';

  // Compact cells sit two-per-row, so the Yes/No pair shrinks a little and the
  // padding tightens — everything else behaves identically.
  const pad = compact ? 'p-2.5' : 'p-3';
  const footPad = compact ? 'px-2.5 py-2' : 'px-3 py-2';
  const btnPad = 'py-2';
  const btnText = 'text-sm';
  const dot = 'w-5 h-5';
  const dotIcon = 13;

  return (
    <View className={`rounded-xl border ${borderCls}`}>
      <View className={pad}>
        <View className="flex-row items-center justify-between mb-1" style={{ columnGap: 8 }}>
          <Text className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex-1">{label}</Text>
          {requireDocView?.url ? (
            <ViewButton
              url={requireDocView.url}
              name={requireDocView.name || label}
              isImage={isImageUrl(requireDocView.url, requireDocView.name)}
              onViewed={() => { setDocViewed(true); setShowGateHint(false); }}
            />
          ) : (
            headerAction
          )}
        </View>
        <View style={{ minHeight: 24 }}>
          {isEmpty ? (
            <Text className="text-slate-400 italic text-sm">Not provided</Text>
          ) : isEmailField ? (
            // Rendered here rather than via RenderValue so the "Test" button can
            // report back and unlock this card's Yes/No.
            <EmailValue
              value={String(value).trim()}
              onTestSent={() => { setEmailTested(true); setShowGateHint(false); }}
            />
          ) : (
            <RenderValue
              value={value}
              type={type}
              label={label}
              listTone={listTone}
              // Opening the in-card preview counts as viewing the document too —
              // gating only on the header button would tell a checker who just
              // studied the image full-screen that they still haven't looked.
              onImagePress={(u) => {
                setLightbox(u);
                setDocViewed(true);
                setShowGateHint(false);
              }}
            />
          )}
        </View>
      </View>

      <View className={`border-t border-slate-100 ${footPad}`} style={{ rowGap: 8 }}>
        {!compact && (
          <Text className="text-xs font-semibold text-slate-600">
            Verification
            {gated ? (
              <Text className="font-normal text-amber-600">
                {docGated ? ' · view the document to unlock' : ' · send a test email to unlock'}
              </Text>
            ) : null}
          </Text>
        )}
        {/* Large segmented Yes/No — the primary action on every card, so it
            fills the row and the picked side stays solid-filled. */}
        {/* Dimmed rather than disabled while gated — a tap still lands so it can
            explain why, instead of feeling broken. */}
        <View className="flex-row" style={{ columnGap: compact ? 8 : 12, opacity: gated ? 0.55 : 1 }}>
          <TouchableOpacity
            onPress={() => setOk(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: v.ok === true }}
            className={`flex-1 flex-row items-center justify-center rounded-lg border-2 ${btnPad} ${
              v.ok === true ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
            }`}
            style={{ columnGap: 6 }}
          >
            <View
              className={`${dot} rounded-full items-center justify-center ${
                v.ok === true ? 'bg-white' : 'border-2 border-slate-300'
              }`}
            >
              {v.ok === true && <Check size={dotIcon} color="#059669" strokeWidth={3.5} />}
            </View>
            <Text className={`${btnText} font-bold ${v.ok === true ? 'text-white' : 'text-slate-600'}`}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setOk(false)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: v.ok === false }}
            className={`flex-1 flex-row items-center justify-center rounded-lg border-2 ${btnPad} ${
              v.ok === false ? 'border-red-600 bg-red-600' : 'border-slate-300 bg-white'
            }`}
            style={{ columnGap: 6 }}
          >
            <View
              className={`${dot} rounded-full items-center justify-center ${
                v.ok === false ? 'bg-white' : 'border-2 border-slate-300'
              }`}
            >
              {v.ok === false && <X size={dotIcon} color="#dc2626" strokeWidth={3.5} />}
            </View>
            <Text className={`${btnText} font-bold ${v.ok === false ? 'text-white' : 'text-slate-600'}`}>No</Text>
          </TouchableOpacity>
        </View>
        {showGateHint && gated && (
          <View className="flex-row items-center bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5" style={{ columnGap: 6 }}>
            {docGated ? <Eye size={12} color="#b45309" /> : <Send size={12} color="#b45309" />}
            <Text className="text-xs text-amber-700 font-medium flex-1">
              {docGated
                ? 'Please open the document first, then mark Yes or No.'
                : 'Please send a test email first, then mark Yes or No.'}
            </Text>
          </View>
        )}
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
  compact,
}: {
  doc: { name?: string; documentUrl?: string; type?: string };
  index: number;
  fieldKey: string;
  verifications: Verifications;
  onChange: (key: string, ok: boolean | null, remarks: string) => void;
  compact?: boolean;
}) {
  const url = doc.documentUrl || '';
  const name = doc.name || doc.type || `Document ${index + 1}`;
  const isImg = isImageUrl(url, doc.name);

  return (
    <VerifyField
      fieldKey={fieldKey}
      label={name}
      value={url}
      type={isImg ? 'image' : 'document'}
      verifications={verifications}
      onChange={onChange}
      compact={compact}
      // The card IS the document, so its Yes/No stays locked until the file has
      // actually been opened — a PDF renders here as a filename and nothing else.
      requireDocView={url ? { url, name } : undefined}
    />
  );
}

// Shared icon-only "view" action for image/doc header actions inside steps.
// The eye icon alone carries the meaning — the label is exposed to screen
// readers instead of taking up header width.
export function ViewButton({
  url,
  name,
  isImage,
  onViewed,
}: {
  url: string;
  name: string;
  isImage: boolean;
  /** Fired on press — lets a gated VerifyField unlock its Yes/No. */
  onViewed?: () => void;
}) {
  const [lightbox, setLightbox] = useState(false);
  if (!url) return null;
  return (
    <>
      <TouchableOpacity
        onPress={() => {
          onViewed?.();
          if (isImage) setLightbox(true);
          else openDocument(url);
        }}
        activeOpacity={0.7}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`View ${name}`}
        className="items-center justify-center bg-brand-50 border border-brand-200 rounded-lg"
        style={{ width: 32, height: 32 }}
      >
        <Eye size={16} color="#c41617" strokeWidth={2.25} />
      </TouchableOpacity>
      {lightbox && <ImageLightbox url={url} name={name} onClose={() => setLightbox(false)} />}
    </>
  );
}

export { ImageLightbox };