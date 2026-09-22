/**
 * Returns & Replacements — port of
 * frontend/src/components/WebSite/Profile/ReturnsSection.tsx.
 *
 * Tracks return, refund and replacement requests: a list of cards, and a detail
 * sheet carrying the full record, the evidence photographs and the activity
 * timeline. The web reaches this as a tab inside Profile; on a phone it is its
 * own screen.
 *
 * An INR-region feature. The web gates the tab behind `getRegion() === 'IN'`
 * and hides it on .com, so the Profile menu entry here carries the same gate.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Package, ShieldCheck, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import ScreenHeader from '@/components/WebSite/Shared/ScreenHeader';
import EmptyState from '@/components/WebSite/Shared/EmptyState';
import { useConfirm } from '@/components/WebSite/Shared/ConfirmDialog';
import { showErrorToast, showSuccessToast } from '@/lib/toast-utils';
import { formatPrice } from '@/lib/currency';
import {
  returnService,
  reasonLabel,
  returnStatusStyle,
  type ReturnRequest,
} from '@/services/returnService';
import { userAuthService } from '@/services/userAuthService';
import { Fonts, Palette } from '@/constants/theme';

/** An order's own currency, not the app region — same rule as the order screens. */
const money = (n: number, currency?: string) =>
  formatPrice(n || 0, currency === 'USD' ? 'USD' : 'INR');

const fmtDate = (d?: string) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '';

const fmtDateTime = (d?: string) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '';

export default function ReturnsSection() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAuth, setIsAuth] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const auth = await userAuthService.isAuthenticated();
    setIsAuth(auth);
    if (!auth) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const res = await returnService.getMyReturns();
      setReturns(res.data || []);
    } catch {
      setReturns([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (!isAuth) {
    return (
      <View style={s.root}>
        <ScreenHeader onBack={() => router.back()} title="Returns & Replacements" />
        <EmptyState
          icon={Package}
          title="Login Required"
          subtitle="Sign in to track your returns and replacements."
          ctaLabel="Login to Continue"
          onPress={() => router.push('/(auth)/Login' as any)}
        />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScreenHeader
        onBack={() => router.back()}
        title="Returns & Replacements"
        subtitle="Track your return, refund and replacement requests."
      />

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={Palette.primary} />
        </View>
      ) : returns.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No returns yet"
          subtitle="When you request a return, it will appear here."
          ctaLabel="View My Orders"
          onPress={() => router.push('/(tabs)/orders' as any)}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.primary} />
          }
        >
          {returns.map((r) => {
            const st = returnStatusStyle(r.status);
            const value =
              r.resolution === 'REFUND'
                ? (r.refundAmount ?? r.itemAmount)
                : (r.replacementValue ?? r.itemAmount);
            return (
              <View key={r.id} style={s.card}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={s.thumb}>
                    {r.productImage ? (
                      <Image
                        source={{ uri: r.productImage }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                      />
                    ) : (
                      <Package size={22} color="#c9bcae" />
                    )}
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={s.idRow}>
                      <Text style={s.returnId}>{r.returnId}</Text>
                      <View style={[s.statusPill, { backgroundColor: st.bg }]}>
                        <View style={[s.statusDot, { backgroundColor: st.dot }]} />
                        <Text style={[s.statusText, { color: st.text }]}>{r.status}</Text>
                      </View>
                    </View>

                    <Text style={s.productName} numberOfLines={1}>
                      {r.productName}
                    </Text>
                    <Text style={s.orderLine}>
                      Order #{r.orderCode} · Qty {r.quantity}
                    </Text>

                    <View style={s.factRow}>
                      <Fact label="Reason" value={reasonLabel(r.reason)} />
                      <Fact
                        label="Resolution"
                        value={r.resolution === 'REFUND' ? 'Refund' : 'Replacement'}
                      />
                      <Fact
                        label={r.resolution === 'REFUND' ? 'Refund' : 'Replacement value'}
                        value={money(value, r.currency)}
                        strong
                      />
                    </View>
                  </View>
                </View>

                <View style={s.cardFoot}>
                  <Text style={s.requestedOn}>Requested on {fmtDate(r.createdAt)}</Text>
                  <Pressable
                    onPress={() => setDetailId(r.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`View details for ${r.returnId}`}
                    android_ripple={{ color: 'rgba(15,23,42,0.06)' }}
                    style={s.detailBtn}
                  >
                    <Text style={s.detailBtnText}>View Details</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <ReturnDetailSheet
        returnId={detailId}
        onClose={() => setDetailId(null)}
        onChanged={load}
      />
    </View>
  );
}

function Fact({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Text style={s.fact}>
      {label}: <Text style={strong ? s.factValueStrong : s.factValue}>{value}</Text>
    </Text>
  );
}

// ─── Detail ──────────────────────────────────────────────────────────────────

function ReturnDetailSheet({
  returnId,
  onClose,
  onChanged,
}: {
  returnId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const insets = useSafeAreaInsets();
  const confirm = useConfirm();
  const [rec, setRec] = useState<ReturnRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!returnId) return;
    let alive = true;
    setLoading(true);
    setRec(null);
    (async () => {
      try {
        const res = await returnService.getMyReturn(returnId);
        if (alive) setRec(res.data);
      } catch {
        if (alive) setRec(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [returnId]);

  if (!returnId) return null;

  /** The web allows a cancel only while the request is still undecided. */
  const canCancel = !!rec && ['Pending Review', 'Under Review'].includes(rec.status);

  const cancel = async () => {
    if (!rec) return;
    const ok = await confirm({
      title: 'Cancel this request?',
      message: 'Your return request will be withdrawn. You can raise a new one later.',
      confirmLabel: 'Cancel Request',
      cancelLabel: 'Keep',
    });
    if (!ok) return;

    setCancelling(true);
    try {
      const res = await returnService.cancelMyReturn(rec.id);
      showSuccessToast('Return cancelled', res.message || 'Your request has been cancelled.');
      onChanged();
      onClose();
    } catch (e: any) {
      showErrorToast('Failed', e?.message || 'Could not cancel.');
    } finally {
      setCancelling(false);
    }
  };

  const st = rec ? returnStatusStyle(rec.status) : null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />

        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={s.sheetHead}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.sheetTitle}>{rec?.returnId || 'Return details'}</Text>
              {rec ? <Text style={s.sheetSub}>Order #{rec.orderCode}</Text> : null}
            </View>
            {st && rec ? (
              <View style={[s.statusPill, { backgroundColor: st.bg, marginRight: 10 }]}>
                <View style={[s.statusDot, { backgroundColor: st.dot }]} />
                <Text style={[s.statusText, { color: st.text }]}>{rec.status}</Text>
              </View>
            ) : null}
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <X size={20} color="#9ca3af" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            {loading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={Palette.primary} />
              </View>
            ) : !rec ? (
              <Text style={s.loadFail}>Could not load this return.</Text>
            ) : (
              <>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <View style={s.thumb}>
                    {rec.productImage ? (
                      <Image
                        source={{ uri: rec.productImage }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                      />
                    ) : (
                      <Package size={22} color="#c9bcae" />
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.productName} numberOfLines={2}>
                      {rec.productName}
                    </Text>
                    <Text style={s.orderLine}>
                      Qty {rec.quantity} · {money(rec.itemAmount, rec.currency)}
                    </Text>
                  </View>
                </View>

                <View style={s.rows}>
                  <Row label="Requested on" value={fmtDateTime(rec.createdAt)} />
                  <Row label="Last updated" value={fmtDateTime(rec.updatedAt)} />
                  <Row label="Order" value={`#${rec.orderCode}`} />
                  <Row label="Reason" value={reasonLabel(rec.reason)} />
                  {rec.reasonNote ? <Row label="Note" value={rec.reasonNote} /> : null}
                  <Row
                    label="Resolution"
                    value={rec.resolution === 'REFUND' ? 'Refund' : 'Replacement'}
                  />
                  {rec.resolution === 'REFUND' ? (
                    <>
                      <Row label="Refund method" value="M2C Wallet (store credit)" />
                      <Row
                        label="Refund amount"
                        value={money(rec.refundAmount ?? rec.itemAmount, rec.currency)}
                        strong
                      />
                    </>
                  ) : (
                    <>
                      <Row
                        label="Replacement"
                        value={
                          rec.replacementMethod === 'CREDIT'
                            ? 'Wallet credit'
                            : 'Ship item with next order'
                        }
                      />
                      <Row
                        label="Replacement value"
                        value={money(rec.replacementValue ?? rec.itemAmount, rec.currency)}
                        strong
                      />
                    </>
                  )}
                  {rec.rejectionReason ? (
                    <Row label="Reason for decision" value={rec.rejectionReason} />
                  ) : null}
                </View>

                {rec.evidenceImages?.length > 0 ? (
                  <View>
                    <Text style={s.blockLabel}>Evidence</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {rec.evidenceImages.map((src, i) => (
                        <Image
                          key={`${src.slice(0, 24)}-${i}`}
                          source={{ uri: src }}
                          style={s.evidence}
                          contentFit="cover"
                        />
                      ))}
                    </View>
                  </View>
                ) : null}

                {rec.resolution === 'REPLACEMENT' && rec.status === 'Replacement Approved' ? (
                  <View style={s.entitlement}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <ShieldCheck size={15} color="#065f46" />
                      <Text style={s.entitlementTitle}>Replacement entitlement active</Text>
                    </View>
                    <Text style={s.entitlementBody}>
                      Worth {money(rec.replacementValue ?? rec.itemAmount, rec.currency)} — usable on
                      a future eligible order per M2C replacement rules.
                    </Text>
                  </View>
                ) : null}

                {(rec.statusHistory || []).length > 0 ? (
                  <View>
                    <Text style={s.blockLabel}>Activity</Text>
                    <View style={{ gap: 12 }}>
                      {(rec.statusHistory || []).map((h, i) => {
                        const hs = returnStatusStyle(h.status);
                        return (
                          <View key={`${h.status}-${h.at}-${i}`} style={s.timelineRow}>
                            <View style={[s.timelineDot, { backgroundColor: hs.dot }]} />
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={s.timelineAt}>{fmtDateTime(h.at)}</Text>
                              <Text style={[s.timelineStatus, { color: hs.text }]}>{h.status}</Text>
                              {h.note ? <Text style={s.timelineNote}>{h.note}</Text> : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>

          {canCancel ? (
            <View style={s.sheetFoot}>
              <Pressable
                onPress={cancel}
                disabled={cancelling}
                accessibilityRole="button"
                accessibilityLabel="Cancel this request"
                accessibilityState={{ busy: cancelling, disabled: cancelling }}
                style={[s.cancelBtn, cancelling && { opacity: 0.75 }]}
              >
                {cancelling ? <ActivityIndicator size="small" color="#dc2626" /> : null}
                <Text style={s.cancelBtnText}>
                  {cancelling ? 'Cancelling…' : 'Cancel this request'}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={strong ? s.rowValueStrong : s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#faf7f3' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#efe4d8',
    padding: 14,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f6efe8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  returnId: {
    fontFamily: Fonts.sansBold,
    fontSize: 12,
    // Outfit is static: the weight must name the loaded file (Outfit_700Bold).
    fontWeight: '700',
    color: '#1a1a1a',
  },
  productName: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 3,
  },
  orderLine: { fontFamily: Fonts.sans, fontSize: 11.5, color: '#8b8079', marginTop: 1 },

  factRow: { marginTop: 7, gap: 2 },
  fact: { fontFamily: Fonts.sans, fontSize: 12, color: '#8b8079' },
  factValue: { fontFamily: Fonts.sansMedium, fontWeight: '500', color: '#3d352f' },
  factValueStrong: { fontFamily: Fonts.sansSemibold, fontWeight: '600', color: '#1a1a1a' },

  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f4ece3',
  },
  requestedOn: { fontFamily: Fonts.sans, fontSize: 11.5, color: '#a89a8d', flex: 1 },
  detailBtn: {
    borderWidth: 1,
    borderColor: '#e6dcd0',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
    overflow: 'hidden',
  },
  detailBtnText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#5f5550',
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: Fonts.sansSemibold, fontSize: 11, fontWeight: '600' },

  // ── Detail sheet ────────────────────────────────────────────────────────
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '92%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sheetTitle: {
    fontFamily: Fonts.heading,
    fontSize: 17,
    // Poppins_600SemiBold is the loaded file.
    fontWeight: '600',
    letterSpacing: -0.35,
    color: '#1a1a1a',
  },
  sheetSub: { fontFamily: Fonts.sans, fontSize: 12, color: '#8b8079', marginTop: 1 },
  loadFail: {
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    color: '#5f5550',
    textAlign: 'center',
    paddingVertical: 40,
  },

  rows: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowLabel: { fontFamily: Fonts.sans, fontSize: 12.5, color: '#8b8079', width: 130 },
  rowValue: { fontFamily: Fonts.sansMedium, fontSize: 12.5, fontWeight: '500', color: '#3d352f', flex: 1 },
  rowValueStrong: {
    fontFamily: Fonts.sansBold,
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },

  blockLabel: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13,
    fontWeight: '600',
    color: '#3d352f',
    marginBottom: 8,
  },
  evidence: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#f6efe8' },

  entitlement: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 12,
  },
  entitlementTitle: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13,
    fontWeight: '600',
    color: '#065f46',
  },
  entitlementBody: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    color: '#047857',
    marginTop: 4,
  },

  timelineRow: { flexDirection: 'row', gap: 10 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  timelineAt: { fontFamily: Fonts.sans, fontSize: 11, color: '#a89a8d' },
  timelineStatus: { fontFamily: Fonts.sansSemibold, fontSize: 13, fontWeight: '600' },
  timelineNote: { fontFamily: Fonts.sans, fontSize: 12.5, color: '#5f5550', marginTop: 1 },

  sheetFoot: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#ffffff',
  },
  cancelBtnText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
});
