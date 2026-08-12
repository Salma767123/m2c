// Shared RN UI + photo helpers for the Product Inspection steps.
// Keeps the 7 step components consistent with the app's brand-red accent card style
// while mirroring the web QC portal's field semantics.

import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Upload, X, Eye, Phone, Mail, Send, Check, ChevronDown } from 'lucide-react-native';
import { elevation } from '@/constants/design';
import * as WebBrowser from 'expo-web-browser';
import { showImagePickerOptions, ImagePickerResult } from '@/utils/imagePicker';
import { compressImage } from '@/utils/imageCompress';
import { PhotoConfirmCrop, Prepared } from '@/components/General/PhotoCrop';
import { showErrorToast } from '@/lib/toast-utils';
import { telHref, looksLikePhone } from '@/components/Vendor/Steps/fieldHelpers';
import qcCheckerService from '@/services/qcCheckerService';
import { InvalidAnchor } from './piValidation';

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

// ── Anchored dropdown ────────────────────────────────────────────────────────
// A <select> that opens *at its own field* rather than floating in the middle
// of the screen. On press the trigger is measured in window coordinates and the
// option panel is drawn at those coordinates inside a transparent full-screen
// Modal — a Modal is the only way to paint above the sibling cards without
// being clipped by the step's ScrollView.
//
// Two details make the position land exactly on the field:
//
//  1. The Modal's own window rect is measured on layout and subtracted from the
//     trigger's. The app is edge-to-edge, so measureInWindow's y includes the
//     status bar; a Modal whose origin sits *below* the status bar would push
//     every panel ~24-48dp too low. Measuring both sides makes the maths hold
//     whatever origin the platform hands us.
//  2. The panel flips above the field when there is not enough room below, so a
//     field near the bottom of a long step still shows its options.

export type DropdownOption = {
  value: string;
  label?: string;
  /** Classes applied to the row when this option is the selected one. */
  selectedBg?: string;
  selectedText?: string;
};

type Box = { x: number; y: number; w: number; h: number };

const PANEL_GAP = 6; // breathing room between the field and the panel
const SCREEN_MARGIN = 12; // never let the panel touch a screen edge
const MIN_DROP_HEIGHT = 132; // below this, opening downward is not worth it
const MIN_PANEL_WIDTH = 180;

function measureBox(node: any, onDone: (b: Box) => void) {
  if (!node || typeof node.measureInWindow !== 'function') return;
  try {
    node.measureInWindow((x: number, y: number, w: number, h: number) => {
      if ([x, y, w, h].every((n) => typeof n === 'number' && !Number.isNaN(n))) {
        onDone({ x, y, w, h });
      }
    });
  } catch {
    /* node detached mid-measure — leave the panel closed */
  }
}

export function Dropdown({
  value,
  placeholder = 'Select…',
  options,
  onSelect,
  triggerClassName,
  valueClassName,
  maxHeight = 300,
  disabled = false,
  accessibilityLabel,
}: {
  value?: string | null;
  placeholder?: string;
  options: readonly (DropdownOption | string)[];
  onSelect: (value: string) => void;
  /** Styling for the closed field, so each step keeps its own error/status look. */
  triggerClassName?: string;
  valueClassName?: string;
  maxHeight?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const insets = useSafeAreaInsets();
  const triggerRef = useRef<View>(null);
  const overlayRef = useRef<View>(null);
  // `anchor` doubles as the open flag — the Modal only mounts once we know
  // where the panel goes, so it can never flash at the wrong spot first.
  const [anchor, setAnchor] = useState<Box | null>(null);
  const [frame, setFrame] = useState<Box | null>(null);

  const items: DropdownOption[] = useMemo(
    () => options.map((o) => (typeof o === 'string' ? { value: o } : o)),
    [options],
  );

  const open = () => {
    if (disabled) return;
    measureBox(triggerRef.current, setAnchor);
  };

  const close = () => {
    setAnchor(null);
    setFrame(null);
  };

  const placement = useMemo(() => {
    if (!anchor || !frame) return null;

    // Trigger position expressed in the Modal's own coordinate space.
    const ax = anchor.x - frame.x;
    const ay = anchor.y - frame.y;

    const below = frame.h - insets.bottom - SCREEN_MARGIN - (ay + anchor.h + PANEL_GAP);
    const above = ay - PANEL_GAP - insets.top - SCREEN_MARGIN;
    const dropUp = below < MIN_DROP_HEIGHT && above > below;

    const width = Math.min(Math.max(anchor.w, MIN_PANEL_WIDTH), frame.w - SCREEN_MARGIN * 2);
    const left = Math.min(Math.max(ax, SCREEN_MARGIN), Math.max(SCREEN_MARGIN, frame.w - width - SCREEN_MARGIN));
    const room = Math.max(0, Math.min(maxHeight, dropUp ? above : below));

    return dropUp
      ? { left, width, maxHeight: room, bottom: frame.h - ay + PANEL_GAP }
      : { left, width, maxHeight: room, top: ay + anchor.h + PANEL_GAP };
  }, [anchor, frame, insets.bottom, insets.top, maxHeight]);

  const selected = items.find((o) => o.value === value);

  return (
    <>
      {/* collapsable={false} keeps the host view alive on Android so it stays
          measurable — a plain wrapper View can be flattened away. */}
      <View ref={triggerRef} collapsable={false}>
        <TouchableOpacity
          onPress={open}
          activeOpacity={0.8}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ expanded: !!anchor, disabled }}
          className={
            triggerClassName ??
            'px-4 py-3 border border-slate-300 rounded-xl bg-white flex-row items-center justify-between'
          }
        >
          <Text className={valueClassName ?? (selected ? 'text-sm text-slate-900' : 'text-sm text-slate-400')}>
            {selected?.label ?? selected?.value ?? placeholder}
          </Text>
          <ChevronDown size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      <Modal visible={!!anchor} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
        {/* A light scrim, not the usual black/40 — the point of anchoring is
            that the checker can still see which field is being edited. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          className="bg-black/20"
          onPress={close}
          accessibilityLabel="Close options"
        >
          <View
            ref={overlayRef}
            style={StyleSheet.absoluteFill}
            collapsable={false}
            pointerEvents="box-none"
            onLayout={() => measureBox(overlayRef.current, setFrame)}
          >
            {!!placement && (
              <Pressable
                onPress={(e) => e.stopPropagation()}
                style={[
                  {
                    position: 'absolute',
                    left: placement.left,
                    width: placement.width,
                    maxHeight: placement.maxHeight,
                    ...('top' in placement ? { top: placement.top } : { bottom: placement.bottom }),
                  },
                  elevation.dropdown,
                ]}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden"
              >
                <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
                  {items.map((opt, i) => {
                    const isSelected = opt.value === value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => {
                          onSelect(opt.value);
                          close();
                        }}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        className={`px-4 py-3 flex-row items-center justify-between ${
                          i > 0 ? 'border-t border-slate-100' : ''
                        } ${isSelected ? opt.selectedBg ?? 'bg-brand-50' : 'bg-white'}`}
                      >
                        <Text
                          className={`text-sm flex-1 ${
                            isSelected ? `${opt.selectedText ?? 'text-brand-600'} font-semibold` : 'text-slate-700'
                          }`}
                        >
                          {opt.label ?? opt.value}
                        </Text>
                        {isSelected && <Check size={16} color="#e01a1b" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
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
  options?: { allowGallery?: boolean },
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
  }, allowMultiple, { allowsEditing: false, allowGallery: options?.allowGallery });
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
  icon,
  right,
  children,
}: {
  title?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4">
      {!!title && (
        <View className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex-row items-center" style={{ columnGap: 8 }}>
          {icon}
          <Text className="text-sm font-bold text-slate-800 flex-1">{title}</Text>
          {right}
        </View>
      )}
      <View className="p-4">{children}</View>
    </View>
  );
}

// ── Tappable contact values (phone / email) ─────────────────────────────────
// Mirrors the vendor inspection form (VI_VerifyField): phone & email labels
// auto-upgrade to tappable values — tap a number to open the dialer via tel:
// (landline included), tap an email for mailto: plus a "Test" button that
// sends a real test email through the backend.
const PHONE_LABEL_RE = /phone|mobile|landline|whats\s*app|fax|contact\s*(no|number)/i;
const EMAIL_LABEL_RE = /e-?mail/i;
const EMAIL_VALUE_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
        accessibilityRole="link"
        accessibilityLabel={`Email ${value}`}
        className="flex-row items-center"
        style={{ columnGap: 6 }}
      >
        <Mail size={14} color="#e01a1b" />
        <Text className="text-sm font-medium text-brand-600 flex-shrink">{value}</Text>
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

// Convert a YYYY-MM-DD date string to DD-MM-YYYY for display. Keeps the stored
// value in ISO form for the backend but shows the checker a day-first date,
// matching the web portal's en-IN rendering.
export function formatDateDMY(value?: string | null): string {
  const m = String(value ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(value ?? '');
}

export function InfoBlock({ label, value }: { label: string; value?: string | null }) {
  const text = (value ?? '').trim();
  const isEmail = EMAIL_LABEL_RE.test(label) && EMAIL_VALUE_RE.test(text);
  const isPhone = !isEmail && PHONE_LABEL_RE.test(label) && looksLikePhone(text);
  return (
    <View className="mb-3">
      <Text className="text-[11px] font-semibold text-slate-500 uppercase mb-0.5">{label}</Text>
      {isEmail ? (
        <EmailValue value={text} />
      ) : isPhone ? (
        <PhoneValue value={text} />
      ) : (
        <Text className="text-sm text-slate-900 font-medium">{value || '—'}</Text>
      )}
    </View>
  );
}

// ── Photo grid with add + remove ─────────────────────────────────────────────
// Adding a photo goes through the shared OK / Crop flow: the picked shot is
// normalised, the checker confirms it (OK uploads as-is, Crop opens the crop
// surface), and only the accepted image is handed to `onAdd`. Multiple photos
// are confirmed one at a time.
export function PhotoGrid({
  photos,
  onAdd,
  onRemove,
  addLabel = 'Add photo',
  allowMultiple = false,
  hasError = false,
  thumb = 80,
  inspectionType,
}: {
  photos: Photo[];
  onAdd: (photos: Photo[]) => void;
  onRemove: (index: number) => void;
  addLabel?: string;
  allowMultiple?: boolean;
  hasError?: boolean;
  thumb?: number;
  /** 'VIRTUAL' allows uploading from the gallery; 'PHYSICAL' is camera-only. */
  inspectionType?: 'PHYSICAL' | 'VIRTUAL' | null;
}) {
  // Raw picked shots awaiting the checker's OK / Crop decision, confirmed one
  // at a time.
  const [queue, setQueue] = useState<ImagePickerResult[]>([]);
  const [busy, setBusy] = useState(false);
  const current = queue[0] ?? null;

  const allowGallery = inspectionType === 'VIRTUAL';

  const startPick = () => {
    showImagePickerOptions(
      (images) => setQueue((q) => [...q, ...images]),
      allowMultiple,
      { allowsEditing: false, allowGallery },
    );
  };

  const advance = () => setQueue((q) => q.slice(1));

  const accept = async (prepared: Prepared) => {
    if (busy || !current) return;
    setBusy(true);
    try {
      const data = await compressImage(prepared.uri);
      onAdd([{ name: current.name || 'image.jpg', data }]);
      advance();
    } catch (err: any) {
      showErrorToast('Upload Failed', err?.message || 'Could not upload this photo.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => advance();

  const retake = () => {
    // Drop the current shot and re-open the picker for a replacement.
    setQueue((q) => q.slice(1));
    setTimeout(() => {
      showImagePickerOptions(
        (images) => setQueue((q) => (images.length > 0 ? [images[0], ...q] : q)),
        false,
        { allowsEditing: false, allowGallery },
      );
    }, 350);
  };

  return (
    <View>
      {photos.length === 0 ? (
        <TouchableOpacity
          onPress={startPick}
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
              onPress={startPick}
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

      {current && (
        <PhotoConfirmCrop
          visible={!!current}
          label={addLabel}
          source={current}
          busy={busy}
          onAccept={accept}
          onCancel={cancel}
          onRetake={retake}
        />
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
  headerAction,
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
  /** Optional node rendered on the right of the label (e.g. a colour swatch). */
  headerAction?: React.ReactNode;
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

  // Every unverified field registers under the step's single error key; the
  // registry keeps mount order, so Next scrolls to the FIRST one still missing
  // a decision rather than an arbitrary later one.
  return (
    <InvalidAnchor errorKey="productVerifications" invalid={needsHighlight} style={{ marginBottom: 12 }}>
    <View className={`rounded-xl border ${borderCls}`}>
      <View className="p-3">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-[11px] font-semibold text-slate-500 uppercase flex-1">{label}</Text>
          {!!headerAction && <View className="ml-2">{headerAction}</View>}
          {!!onView && (
            <TouchableOpacity
              onPress={onView}
              className="flex-row items-center bg-brand-50 border border-brand-100 rounded-lg px-2 py-0.5 ml-2"
            >
              <Eye size={12} color="#c41617" />
              <Text className="text-[11px] font-semibold text-brand-600 ml-1">View</Text>
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
        <View className="flex-row" style={{ columnGap: 8 }}>
          <TouchableOpacity
            onPress={() => onChange(true, v.remarks)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: v.ok === true }}
            className={`flex-1 flex-row items-center justify-center rounded-lg border-2 py-2 ${
              v.ok === true ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
            }`}
            style={{ columnGap: 6 }}
          >
            <View
              className={`w-5 h-5 rounded-full items-center justify-center ${
                v.ok === true ? 'bg-white' : 'border-2 border-slate-300'
              }`}
            >
              {v.ok === true && <Check size={13} color="#059669" strokeWidth={3.5} />}
            </View>
            <Text className={`text-sm font-bold ${v.ok === true ? 'text-white' : 'text-slate-600'}`}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onChange(false, v.remarks)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: v.ok === false }}
            className={`flex-1 flex-row items-center justify-center rounded-lg border-2 py-2 ${
              v.ok === false ? 'border-red-600 bg-red-600' : 'border-slate-300 bg-white'
            }`}
            style={{ columnGap: 6 }}
          >
            <View
              className={`w-5 h-5 rounded-full items-center justify-center ${
                v.ok === false ? 'bg-white' : 'border-2 border-slate-300'
              }`}
            >
              {v.ok === false && <X size={13} color="#dc2626" strokeWidth={3.5} />}
            </View>
            <Text className={`text-sm font-bold ${v.ok === false ? 'text-white' : 'text-slate-600'}`}>No</Text>
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
    </InvalidAnchor>
  );
}

export function LoadingOverlay({ label }: { label: string }) {
  return (
    <View className="absolute inset-0 bg-black/50 items-center justify-center" style={{ zIndex: 100 }}>
      <View className="bg-white rounded-2xl p-8 mx-8 items-center">
        <ActivityIndicator size="large" color="#e01a1b" />
        <Text className="text-base font-bold text-slate-900 mt-4 text-center">{label}</Text>
      </View>
    </View>
  );
}
