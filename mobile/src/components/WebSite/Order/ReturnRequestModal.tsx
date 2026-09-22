/**
 * Raise a return — port of
 * frontend/src/components/WebSite/Order/ReturnRequestModal.tsx.
 *
 * A stepped sheet: pick the item and a reason, attach evidence, choose refund
 * or replacement, then review and confirm. The step list is dynamic — the
 * refund-details step only exists for a refund, the replacement step only for a
 * replacement — exactly as on the web.
 *
 * This is what was missing for mobile's returns feature to be usable at all:
 * `returnService.createReturn` existed but nothing called it, so a customer
 * could track returns on the phone but only raise one on the website.
 *
 * Evidence photos go up as base64 data URIs, the shape the backend expects.
 * The web reads them with a FileReader; expo-image-picker returns the base64
 * directly, so the encoding is the same and the wire format is unchanged.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  Check,
  CheckCircle2,
  CreditCard,
  Package,
  Truck,
  Wallet,
  X,
  Zap,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatPrice } from '@/lib/currency';
import {
  returnService,
  RETURN_REASONS,
  type ReturnResolution,
} from '@/services/returnService';
import type { Order } from '@/services/orderService';
import { Fonts } from '@/constants/theme';

const MAX_PHOTOS = 2;
const BRAND = '#e01a1b';

type StepId = 'reason' | 'evidence' | 'resolution' | 'refund' | 'replacement' | 'review';

export default function ReturnRequestModal({
  open,
  order,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onSubmitted?: (returnId: string) => void;
}) {
  const insets = useSafeAreaInsets();

  const [stepIdx, setStepIdx] = useState(0);
  const [itemId, setItemId] = useState('');
  const [reason, setReason] = useState('');
  const [reasonNote, setReasonNote] = useState('');
  const [photos, setPhotos] = useState<{ id: string; dataUri: string }[]>([]);
  const [resolution, setResolution] = useState<ReturnResolution | ''>('');
  const [replacementMethod, setReplacementMethod] = useState<'CREDIT' | 'ITEM' | ''>('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ returnId: string } | null>(null);
  const [error, setError] = useState('');

  const money = (n: number) => formatPrice(n, order?.currency === 'USD' ? 'USD' : 'INR');

  /** Only items the admin marked return-eligible can be returned. */
  const returnableItems = useMemo(
    () => (order?.items || []).filter((i) => i.returnable !== false),
    [order],
  );

  /*
   * Reset ONLY on the closed → open edge. Keying this off `order` identity too
   * was a bug on the web: after a successful submit the parent refetches and
   * re-renders with a new order object, the effect re-fired, and it wiped
   * `submitted` back to null — so the form reappeared instead of the success
   * screen. A ref tracks the open edge so re-renders cannot reset it.
   */
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      wasOpenRef.current = true;
      setStepIdx(0);
      setItemId(returnableItems[0]?.id || '');
      setReason('');
      setReasonNote('');
      setPhotos([]);
      setResolution('');
      setReplacementMethod('');
      setConfirmed(false);
      setSubmitted(null);
      setError('');
    }
    if (!open) wasOpenRef.current = false;
  }, [open, returnableItems]);

  const reasonMeta = RETURN_REASONS.find((r) => r.code === reason);
  const evidenceRequired = !!reasonMeta?.requiresEvidence;

  const steps: { id: StepId; label: string }[] = useMemo(() => {
    const base: { id: StepId; label: string }[] = [
      { id: 'reason', label: 'Reason' },
      { id: 'evidence', label: 'Evidence' },
      { id: 'resolution', label: 'Resolution' },
    ];
    if (resolution === 'REFUND') base.push({ id: 'refund', label: 'Refund Details' });
    else if (resolution === 'REPLACEMENT') base.push({ id: 'replacement', label: 'Replacement' });
    base.push({ id: 'review', label: 'Review' });
    return base;
  }, [resolution]);

  const currentStep = steps[Math.min(stepIdx, steps.length - 1)]?.id;
  const selectedItem = returnableItems.find((i) => i.id === itemId) || null;

  // ── Photos ────────────────────────────────────────────────────────────────
  const addPhoto = async () => {
    setError('');
    if (photos.length >= MAX_PHOTOS) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Photo access is needed to attach evidence.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
    });
    if (res.canceled) return;

    const added = res.assets
      .filter((a) => a.base64)
      .map((a, i) => ({
        id: `${Date.now()}-${i}`,
        dataUri: `data:${a.mimeType || 'image/jpeg'};base64,${a.base64}`,
      }));
    setPhotos((p) => [...p, ...added].slice(0, MAX_PHOTOS));
  };

  const removePhoto = (id: string) => setPhotos((p) => p.filter((x) => x.id !== id));

  // ── Per-step validation, verbatim from the web ────────────────────────────
  const canContinue = (): string | null => {
    if (currentStep === 'reason') {
      if (!itemId) return 'Please select the item you want to return.';
      if (!reason) return 'Please select a return reason.';
      if (reason === 'other' && !reasonNote.trim()) return 'Please describe your reason.';
      return null;
    }
    if (currentStep === 'evidence') {
      if (evidenceRequired && photos.length < 2) return 'Please upload at least 2 clear photos.';
      return null;
    }
    if (currentStep === 'resolution') {
      if (!resolution) return 'Please choose refund or replacement.';
      return null;
    }
    if (currentStep === 'replacement') {
      if (!replacementMethod) return 'Please choose how to receive your replacement.';
      return null;
    }
    if (currentStep === 'review') {
      if (!confirmed) return 'Please confirm the information is accurate.';
      return null;
    }
    // 'refund' is informational — refunds always go to the wallet.
    return null;
  };

  const next = () => {
    const err = canContinue();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setStepIdx((i) => Math.min(i + 1, steps.length - 1));
  };

  const back = () => {
    setError('');
    setStepIdx((i) => Math.max(i - 1, 0));
  };

  const submit = async () => {
    const err = canContinue();
    if (err) {
      setError(err);
      return;
    }
    if (!order) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await returnService.createReturn({
        orderId: order.id,
        orderItemId: itemId,
        reason,
        reasonNote: reasonNote.trim() || undefined,
        evidenceImages: photos.map((p) => p.dataUri),
        resolution: resolution as ReturnResolution,
        refundMethod: resolution === 'REFUND' ? 'WALLET' : undefined,
        replacementMethod:
          resolution === 'REPLACEMENT' ? (replacementMethod as 'CREDIT' | 'ITEM') : undefined,
        confirmed,
      });
      setSubmitted({ returnId: res.data.returnId });
      onSubmitted?.(res.data.returnId);
    } catch (e: any) {
      setError(e?.message || 'Could not submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !order) return null;

  const isLast = currentStep === 'review';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.backdrop}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => !submitting && onClose()}
          accessibilityLabel="Close"
        />

        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {submitted ? (
            <SubmittedView returnId={submitted.returnId} onClose={onClose} />
          ) : (
            <>
              <View style={s.head}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.title}>Return request</Text>
                  <Text style={s.subtitle}>
                    Step {Math.min(stepIdx + 1, steps.length)} of {steps.length} ·{' '}
                    {steps[Math.min(stepIdx, steps.length - 1)]?.label}
                  </Text>
                </View>
                <Pressable
                  onPress={onClose}
                  disabled={submitting}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <X size={20} color="#9ca3af" />
                </Pressable>
              </View>

              {/* Progress — the web shows a labelled step strip; a bar reads
                  better at phone width, where five labels will not fit. */}
              <View style={s.progressTrack}>
                <View
                  style={[
                    s.progressFill,
                    { width: `${((stepIdx + 1) / steps.length) * 100}%` },
                  ]}
                />
              </View>

              <ScrollView
                contentContainerStyle={{ padding: 20, gap: 14 }}
                keyboardShouldPersistTaps="handled"
              >
                {currentStep === 'reason' ? (
                  <>
                    <Text style={s.question}>Which item are you returning?</Text>
                    <View style={{ gap: 8 }}>
                      {returnableItems.map((it) => {
                        const active = itemId === it.id;
                        return (
                          <Pressable
                            key={it.id}
                            onPress={() => {
                              setItemId(it.id);
                              setError('');
                            }}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: active }}
                            accessibilityLabel={it.productName}
                            style={[s.itemRow, active && s.itemRowActive]}
                          >
                            <View style={s.thumb}>
                              {it.productImage ? (
                                <Image
                                  source={{ uri: it.productImage }}
                                  style={StyleSheet.absoluteFill}
                                  contentFit="cover"
                                />
                              ) : (
                                <Package size={18} color="#c9bcae" />
                              )}
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={s.itemName} numberOfLines={1}>
                                {it.productName}
                              </Text>
                              <Text style={s.itemMeta}>
                                Qty {it.quantity} · {money(it.unitPrice)}
                              </Text>
                            </View>
                            {active ? <Check size={16} color={BRAND} strokeWidth={3} /> : null}
                          </Pressable>
                        );
                      })}
                    </View>

                    <Text style={[s.question, { marginTop: 6 }]}>Reason for return</Text>
                    <View style={{ gap: 8 }}>
                      {RETURN_REASONS.map((r) => {
                        const active = reason === r.code;
                        return (
                          <Pressable
                            key={r.code}
                            onPress={() => {
                              setReason(r.code);
                              setError('');
                            }}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: active }}
                            accessibilityLabel={r.label}
                            style={[s.option, active && s.optionActive]}
                          >
                            <View style={[s.radio, active && s.radioActive]}>
                              {active ? <Check size={11} color="#fff" strokeWidth={3} /> : null}
                            </View>
                            <Text style={[s.optionText, active && s.optionTextActive]}>
                              {r.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {reason === 'other' ? (
                      <TextInput
                        value={reasonNote}
                        onChangeText={(v) => {
                          setReasonNote(v);
                          setError('');
                        }}
                        placeholder="Tell us a little more"
                        placeholderTextColor="#a89a8d"
                        multiline
                        style={s.textarea}
                        accessibilityLabel="Your reason"
                      />
                    ) : null}
                  </>
                ) : null}

                {currentStep === 'evidence' ? (
                  <>
                    <Text style={s.question}>
                      {evidenceRequired ? 'Photos needed' : 'Add photos (optional)'}
                    </Text>
                    <Text style={s.help}>
                      {evidenceRequired
                        ? 'Please add at least 2 clear photos of the issue.'
                        : 'Photos help us review your request faster.'}
                    </Text>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                      {photos.map((ph) => (
                        <View key={ph.id} style={s.photo}>
                          <Image
                            source={{ uri: ph.dataUri }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                          />
                          <Pressable
                            onPress={() => removePhoto(ph.id)}
                            hitSlop={6}
                            accessibilityRole="button"
                            accessibilityLabel="Remove photo"
                            style={s.photoRemove}
                          >
                            <X size={12} color="#fff" strokeWidth={3} />
                          </Pressable>
                        </View>
                      ))}

                      {photos.length < MAX_PHOTOS ? (
                        <Pressable
                          onPress={addPhoto}
                          accessibilityRole="button"
                          accessibilityLabel="Add photo"
                          style={s.photoAdd}
                        >
                          <Camera size={20} color="#8b8079" />
                          <Text style={s.photoAddText}>Add photo</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </>
                ) : null}

                {currentStep === 'resolution' ? (
                  <>
                    <Text style={s.question}>How would you like us to resolve this?</Text>
                    <PickCard
                      active={resolution === 'REFUND'}
                      onPress={() => {
                        setResolution('REFUND');
                        setError('');
                      }}
                      Icon={CreditCard}
                      title="Refund"
                      desc="Get your eligible amount back."
                      amount={selectedItem ? money(selectedItem.unitPrice) : undefined}
                    />
                    <PickCard
                      active={resolution === 'REPLACEMENT'}
                      onPress={() => {
                        setResolution('REPLACEMENT');
                        setError('');
                      }}
                      Icon={Package}
                      title="Replacement"
                      desc="Request a replacement for the item."
                      amount={selectedItem ? money(selectedItem.unitPrice) : undefined}
                    />
                  </>
                ) : null}

                {currentStep === 'refund' ? (
                  <>
                    <Text style={s.question}>Your refund</Text>
                    <View style={s.infoCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Wallet size={17} color="#047857" />
                        <Text style={s.infoTitle}>M2C Wallet credit only</Text>
                      </View>
                      <Text style={s.infoBody}>
                        Approved refunds are added to your M2C Wallet.
                      </Text>
                      {selectedItem ? (
                        <Text style={s.infoAmount}>{money(selectedItem.unitPrice)}</Text>
                      ) : null}
                    </View>
                  </>
                ) : null}

                {currentStep === 'replacement' ? (
                  <>
                    <Text style={s.question}>How would you like your replacement?</Text>
                    <PickCard
                      active={replacementMethod === 'CREDIT'}
                      onPress={() => {
                        setReplacementMethod('CREDIT');
                        setError('');
                      }}
                      Icon={Wallet}
                      title="Replacement credit to Wallet"
                      desc={`Get ${selectedItem ? money(selectedItem.unitPrice) : ''} as store credit to reorder anything.`}
                      badge="Instant"
                    />
                    <PickCard
                      active={replacementMethod === 'ITEM'}
                      onPress={() => {
                        setReplacementMethod('ITEM');
                        setError('');
                      }}
                      Icon={Truck}
                      title="Ship the replacement item"
                      desc="We'll send the same item with your next eligible order — no extra delivery charge."
                    />
                  </>
                ) : null}

                {currentStep === 'review' ? (
                  <>
                    <Text style={s.question}>Review your request</Text>
                    <View style={s.rows}>
                      <Row label="Item" value={selectedItem?.productName || '—'} />
                      <Row label="Reason" value={reasonMeta?.label || '—'} />
                      {reasonNote.trim() ? <Row label="Note" value={reasonNote.trim()} /> : null}
                      <Row
                        label="Resolution"
                        value={resolution === 'REFUND' ? 'Refund' : 'Replacement'}
                      />
                      {resolution === 'REFUND' ? (
                        <Row label="Refund to" value="M2C Wallet (store credit)" />
                      ) : (
                        <Row
                          label="Replacement"
                          value={
                            replacementMethod === 'CREDIT'
                              ? 'Wallet credit'
                              : 'Ship item with next order'
                          }
                        />
                      )}
                      {photos.length > 0 ? (
                        <Row label="Evidence" value={`${photos.length} photo${photos.length > 1 ? 's' : ''}`} />
                      ) : null}
                    </View>

                    <Pressable
                      onPress={() => {
                        setConfirmed((c) => !c);
                        setError('');
                      }}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: confirmed }}
                      accessibilityLabel="I confirm that the information provided is accurate."
                      style={s.confirmRow}
                    >
                      <View style={[s.checkbox, confirmed && s.checkboxOn]}>
                        {confirmed ? <Check size={12} color="#fff" strokeWidth={3} /> : null}
                      </View>
                      <Text style={s.confirmText}>
                        I confirm that the information provided is accurate.
                      </Text>
                    </Pressable>
                  </>
                ) : null}

                {error ? <Text style={s.error}>{error}</Text> : null}
              </ScrollView>

              <View style={s.foot}>
                {stepIdx > 0 ? (
                  <Pressable
                    onPress={back}
                    disabled={submitting}
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    style={[s.footBtn, s.footGhost]}
                  >
                    <Text style={s.footGhostText}>Back</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={isLast ? submit : next}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityLabel={isLast ? 'Submit Return Request' : 'Continue'}
                  accessibilityState={{ busy: submitting, disabled: submitting }}
                  style={[s.footBtn, s.footPrimary, submitting && { opacity: 0.75 }]}
                >
                  {submitting ? <ActivityIndicator size="small" color="#fff" /> : null}
                  <Text style={s.footPrimaryText}>
                    {submitting
                      ? 'Submitting…'
                      : isLast
                        ? 'Submit Return Request'
                        : 'Continue'}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function SubmittedView({ returnId, onClose }: { returnId: string; onClose: () => void }) {
  return (
    <View style={{ padding: 28, alignItems: 'center' }}>
      <View style={s.successDisc}>
        <CheckCircle2 size={34} color="#059669" />
      </View>
      <Text style={s.successTitle}>Return request submitted</Text>
      <Text style={s.successBody}>
        We&rsquo;ll review your request and update you once a decision is made.
      </Text>

      <View style={s.successMeta}>
        <View style={s.successMetaRow}>
          <Text style={s.successMetaLabel}>Request ID</Text>
          <Text style={s.successMetaValue}>{returnId}</Text>
        </View>
        <View style={s.successMetaRow}>
          <Text style={s.successMetaLabel}>Status</Text>
          <Text style={s.successMetaValue}>Pending review</Text>
        </View>
      </View>
      <Text style={s.successFoot}>Once approved by our team.</Text>

      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Done"
        style={[s.footBtn, s.footPrimary, { alignSelf: 'stretch', marginTop: 20 }]}
      >
        <Text style={s.footPrimaryText}>Done</Text>
      </Pressable>
    </View>
  );
}

function PickCard({
  active,
  onPress,
  Icon,
  title,
  desc,
  amount,
  badge,
}: {
  active: boolean;
  onPress: () => void;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  desc: string;
  amount?: string;
  badge?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${title}. ${desc}`}
      style={[s.pick, active && s.pickActive]}
    >
      <View style={[s.pickIcon, active && s.pickIconActive]}>
        <Icon size={18} color={active ? '#fff' : '#8b8079'} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={[s.pickTitle, active && s.pickTitleActive]}>{title}</Text>
          {badge ? (
            <View style={s.pickBadge}>
              <Zap size={10} color="#047857" />
              <Text style={s.pickBadgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={s.pickDesc}>{desc}</Text>
      </View>
      {amount ? <Text style={s.pickAmount}>{amount}</Text> : null}
    </Pressable>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '92%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },

  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    // Poppins_600SemiBold is the loaded file.
    fontWeight: '600',
    letterSpacing: -0.4,
    color: '#1a1a1a',
  },
  subtitle: { fontFamily: Fonts.sans, fontSize: 12, color: '#8b8079', marginTop: 2 },

  progressTrack: { height: 3, backgroundColor: '#f1ece6', marginHorizontal: 20 },
  progressFill: { height: 3, backgroundColor: BRAND },

  question: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  help: { fontFamily: Fonts.sans, fontSize: 12.5, lineHeight: 18, color: '#5f5550' },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#efe4d8',
    borderRadius: 12,
    padding: 10,
  },
  itemRowActive: { borderColor: BRAND, backgroundColor: '#fff6f6' },
  thumb: {
    width: 42,
    height: 42,
    borderRadius: 9,
    overflow: 'hidden',
    backgroundColor: '#f6efe8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  itemMeta: { fontFamily: Fonts.sans, fontSize: 11.5, color: '#8b8079', marginTop: 1 },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#efe4d8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionActive: { borderColor: BRAND, backgroundColor: '#fff6f6' },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#d9ccbd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { backgroundColor: BRAND, borderColor: BRAND },
  optionText: { fontFamily: Fonts.sans, fontSize: 14, color: '#3d352f', flex: 1 },
  optionTextActive: { fontFamily: Fonts.sansSemibold, fontWeight: '600', color: '#1a1a1a' },

  textarea: {
    fontFamily: Fonts.sans,
    borderWidth: 1,
    borderColor: '#e6dcd0',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#1a1a1a',
    minHeight: 88,
    textAlignVertical: 'top',
    backgroundColor: '#fdfbf9',
  },

  photo: { width: 88, height: 88, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f6efe8' },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(15,23,42,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAdd: {
    width: 88,
    height: 88,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#d9ccbd',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#fdfbf9',
  },
  photoAddText: { fontFamily: Fonts.sans, fontSize: 11, color: '#8b8079' },

  pick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#efe4d8',
    borderRadius: 14,
    padding: 14,
  },
  pickActive: { borderColor: BRAND, backgroundColor: '#fff6f6' },
  pickIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#f4f1ec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickIconActive: { backgroundColor: BRAND },
  pickTitle: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  pickTitleActive: { color: '#1a1a1a' },
  pickDesc: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 17, color: '#5f5550', marginTop: 2 },
  pickAmount: {
    fontFamily: Fonts.sansBold,
    fontSize: 13.5,
    // Outfit is static: the weight must name the loaded file (Outfit_700Bold).
    fontWeight: '700',
    color: '#1a1a1a',
  },
  pickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#d1fae5',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  pickBadgeText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 10.5,
    fontWeight: '600',
    color: '#047857',
  },

  infoCard: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  infoTitle: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#065f46',
  },
  infoBody: { fontFamily: Fonts.sans, fontSize: 12.5, lineHeight: 18, color: '#047857' },
  infoAmount: {
    fontFamily: Fonts.sansBold,
    fontSize: 22,
    fontWeight: '700',
    color: '#065f46',
    marginTop: 2,
  },

  rows: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowLabel: { fontFamily: Fonts.sans, fontSize: 12.5, color: '#8b8079', width: 104 },
  rowValue: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12.5,
    fontWeight: '500',
    color: '#3d352f',
    flex: 1,
  },

  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#d9ccbd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: BRAND, borderColor: BRAND },
  confirmText: { fontFamily: Fonts.sans, fontSize: 13, color: '#3d352f', flex: 1 },

  error: { fontFamily: Fonts.sans, fontSize: 12.5, color: '#dc2626' },

  foot: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f3ece5',
  },
  footBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footGhost: { borderWidth: 1, borderColor: '#e6dcd0', backgroundColor: '#ffffff' },
  footGhostText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 14,
    fontWeight: '600',
    color: '#5f5550',
  },
  footPrimary: { backgroundColor: BRAND },
  footPrimaryText: {
    fontFamily: Fonts.sansBold,
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },

  successDisc: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontFamily: Fonts.heading,
    fontSize: 19,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  successBody: {
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 20,
    color: '#5f5550',
    textAlign: 'center',
    marginTop: 6,
  },
  successMeta: {
    alignSelf: 'stretch',
    backgroundColor: '#faf7f3',
    borderWidth: 1,
    borderColor: '#efe4d8',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    marginTop: 18,
  },
  successMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  successMetaLabel: { fontFamily: Fonts.sans, fontSize: 12.5, color: '#8b8079' },
  successMetaValue: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  successFoot: { fontFamily: Fonts.sans, fontSize: 11.5, color: '#a89a8d', marginTop: 8 },
});
