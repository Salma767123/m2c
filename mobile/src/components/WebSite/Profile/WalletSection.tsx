/**
 * My Wallet — port of frontend/src/components/WebSite/Profile/WalletSection.tsx.
 *
 * Store credit from refunds and replacements: a balance card, the withdrawal
 * requests raised against it, and the ledger behind both. The web reaches this
 * as a tab inside Profile; on a phone it is its own screen, opened from the
 * Profile menu.
 *
 * Amounts are INR throughout, as on the web — this is store credit held in a
 * single currency, not a regional price.
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
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowDownLeft,
  ArrowUpFromLine,
  ArrowUpRight,
  Info,
  Landmark,
  Smartphone,
  Wallet,
  X,
  Check,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import ScreenHeader from '@/components/WebSite/Shared/ScreenHeader';
import EmptyState from '@/components/WebSite/Shared/EmptyState';
import { showErrorToast, showSuccessToast } from '@/lib/toast-utils';
import { formatPrice } from '@/lib/currency';
import {
  walletService,
  WALLET_SOURCE_LABEL,
  WITHDRAWAL_STATUS_STYLE,
  type WalletSummary,
  type WalletWithdrawal,
} from '@/services/walletService';
import { userAuthService } from '@/services/userAuthService';
import { Fonts, Palette } from '@/constants/theme';

const inr = (n: number) => formatPrice(n || 0, 'INR');

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

const UPI_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export default function WalletSection() {
  const [data, setData] = useState<WalletSummary | null>(null);
  const [withdrawals, setWithdrawals] = useState<WalletWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAuth, setIsAuth] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const load = useCallback(async () => {
    const auth = await userAuthService.isAuthenticated();
    setIsAuth(auth);
    if (!auth) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const [w, wd] = await Promise.all([
        walletService.getMyWallet(),
        walletService.getMyWithdrawals(),
      ]);
      setData(w.data);
      setWithdrawals(wd.data || []);
    } catch {
      // Fail open, as the web does: an empty wallet is a better answer than an
      // error screen for a feature the customer may simply never have used.
      setData({ balance: 0, currency: 'INR', transactions: [] });
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
        <ScreenHeader onBack={() => router.back()} title="My Wallet" />
        <EmptyState
          icon={Wallet}
          title="Login Required"
          subtitle="Sign in to see your store credit."
          ctaLabel="Login to Continue"
          onPress={() => router.push('/(auth)/Login' as any)}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={s.root}>
        <ScreenHeader onBack={() => router.back()} title="My Wallet" />
        <View style={s.centered}>
          <ActivityIndicator size="large" color={Palette.primary} />
        </View>
      </View>
    );
  }

  const balance = data?.balance || 0;
  const txns = data?.transactions || [];

  return (
    <View style={s.root}>
      <ScreenHeader
        onBack={() => router.back()}
        title="My Wallet"
        subtitle="Store credit from refunds & replacements — spend it at checkout or withdraw it."
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.primary} />
        }
      >
        {/* Balance card */}
        <LinearGradient
          colors={['#e01a1b', '#c41617']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.balanceCard}
        >
          <Text style={s.balanceLabel}>Available balance</Text>
          <Text style={s.balanceValue}>{inr(balance)}</Text>
          <View style={s.balanceFoot}>
            <View style={s.balanceNote}>
              <Info size={13} color="rgba(255,255,255,0.75)" />
              <Text style={s.balanceNoteText}>Applied at checkout — or withdraw to your bank/UPI.</Text>
            </View>
            <Pressable
              onPress={() => setShowWithdraw(true)}
              disabled={balance <= 0}
              accessibilityRole="button"
              accessibilityLabel="Withdraw"
              accessibilityState={{ disabled: balance <= 0 }}
              style={[s.withdrawBtn, balance <= 0 && { opacity: 0.6 }]}
            >
              <ArrowUpFromLine size={14} color="#c41617" strokeWidth={2.4} />
              <Text style={s.withdrawBtnText}>Withdraw</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* Withdrawals */}
        {withdrawals.length > 0 ? (
          <View style={{ marginTop: 22 }}>
            <Text style={s.sectionLabel}>Withdrawals</Text>
            <View style={{ gap: 8 }}>
              {withdrawals.map((w) => {
                const st = WITHDRAWAL_STATUS_STYLE[w.status] || WITHDRAWAL_STATUS_STYLE.Processing;
                return (
                  <View key={w.id} style={s.row}>
                    <View style={s.rowIconNeutral}>
                      {w.method === 'UPI' ? (
                        <Smartphone size={16} color="#64748b" />
                      ) : (
                        <Landmark size={16} color="#64748b" />
                      )}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.rowTitle} numberOfLines={1}>
                        {w.method === 'UPI' ? `UPI · ${w.upiId}` : `Bank · ${w.accountNumber}`}
                      </Text>
                      <Text style={s.rowMeta} numberOfLines={1}>
                        {w.withdrawalId} · {fmtDateTime(w.createdAt)}
                      </Text>
                      {w.status === 'Failed' && w.failureReason ? (
                        <Text style={s.rowError}>{w.failureReason}</Text>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.rowAmountDebit}>−{inr(w.amount)}</Text>
                      <View style={[s.statusPill, { backgroundColor: st.bg }]}>
                        <View style={[s.statusDot, { backgroundColor: st.dot }]} />
                        <Text style={[s.statusText, { color: st.text }]}>{w.status}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Ledger */}
        <View style={{ marginTop: 22 }}>
          <Text style={s.sectionLabel}>Transaction history</Text>
          {txns.length === 0 ? (
            <EmptyState
              fill={false}
              icon={Wallet}
              title="No transactions yet"
              subtitle="Refunds or replacement credits will show up here."
            />
          ) : (
            <View style={{ gap: 8 }}>
              {txns.map((t) => {
                const credit = t.type === 'CREDIT';
                return (
                  <View key={t.id} style={s.row}>
                    <View style={credit ? s.rowIconCredit : s.rowIconNeutral}>
                      {credit ? (
                        <ArrowDownLeft size={16} color="#059669" />
                      ) : (
                        <ArrowUpRight size={16} color="#64748b" />
                      )}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.rowTitle} numberOfLines={1}>
                        {WALLET_SOURCE_LABEL[t.source] || t.source}
                      </Text>
                      <Text style={s.rowSub} numberOfLines={1}>
                        {t.description ||
                          (t.orderCode ? `Order #${t.orderCode}` : t.returnCode ? t.returnCode : '')}
                      </Text>
                      <Text style={s.rowMeta}>{fmtDateTime(t.createdAt)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={credit ? s.rowAmountCredit : s.rowAmountDebit}>
                        {credit ? '+' : '−'}
                        {inr(t.amount)}
                      </Text>
                      <Text style={s.rowMeta}>Bal {inr(t.balanceAfter)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <WithdrawModal
        visible={showWithdraw}
        balance={balance}
        onClose={() => setShowWithdraw(false)}
        onDone={() => {
          setShowWithdraw(false);
          load();
        }}
      />
    </View>
  );
}

// ─── Withdraw ────────────────────────────────────────────────────────────────

function WithdrawModal({
  visible,
  balance,
  onClose,
  onDone,
}: {
  visible: boolean;
  balance: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'UPI' | 'BANK'>('UPI');
  const [upiId, setUpiId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    // Reset whenever it opens, so a half-filled attempt never reappears.
    setAmount('');
    setMethod('UPI');
    setUpiId('');
    setAccountName('');
    setAccountNumber('');
    setIfsc('');
    setBankName('');
    setError('');
  }, [visible]);

  if (!visible) return null;

  /** Rules copied from the web's validate(), verbatim. */
  const validate = (): string | null => {
    const amt = Number(amount);
    if (!(amt >= 1)) return 'Enter an amount of at least ₹1.';
    if (amt > balance) return `You can withdraw up to ${inr(balance)}.`;
    if (method === 'UPI') {
      if (!UPI_RE.test(upiId.trim())) return 'Enter a valid UPI ID (e.g. name@bank).';
    } else {
      if (!accountName.trim()) return 'Enter the account holder name.';
      if (!/^\d{6,18}$/.test(accountNumber.trim())) return 'Enter a valid account number.';
      if (!IFSC_RE.test(ifsc.trim().toUpperCase())) return 'Enter a valid IFSC code.';
    }
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await walletService.requestWithdrawal({
        amount: Number(amount),
        method,
        ...(method === 'UPI'
          ? { upiId: upiId.trim() }
          : {
              accountName: accountName.trim(),
              accountNumber: accountNumber.trim(),
              ifsc: ifsc.trim().toUpperCase(),
              bankName: bankName.trim() || undefined,
            }),
      });
      showSuccessToast('Withdrawal requested', res.message || 'Your withdrawal is being processed.');
      onDone();
    } catch (e: any) {
      showErrorToast('Failed', e?.message || 'Could not request the withdrawal.');
    } finally {
      setSubmitting(false);
    }
  };

  const clearError = () => {
    if (error) setError('');
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />

        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={s.sheetHead}>
            <Text style={s.sheetTitle}>Withdraw from wallet</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <X size={20} color="#9ca3af" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
            <View>
              <Text style={s.fieldLabel}>Amount</Text>
              <View style={s.amountWrap}>
                <Text style={s.amountPrefix}>₹</Text>
                <TextInput
                  value={amount}
                  onChangeText={(v) => {
                    setAmount(v);
                    clearError();
                  }}
                  placeholder="0"
                  placeholderTextColor="#a89a8d"
                  keyboardType="numeric"
                  style={[s.input, { paddingLeft: 26 }]}
                  accessibilityLabel="Amount"
                />
              </View>
              {/* The web offers this as a one-tap fill, not a static hint. */}
              <Pressable
                onPress={() => {
                  setAmount(String(balance));
                  clearError();
                }}
                accessibilityRole="button"
                accessibilityLabel={`Withdraw all, ${inr(balance)}`}
                hitSlop={6}
                style={{ alignSelf: 'flex-start' }}
              >
                <Text style={s.withdrawAll}>Withdraw all ({inr(balance)})</Text>
              </Pressable>
            </View>

            <View>
              <Text style={s.fieldLabel}>Send to</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {(['UPI', 'BANK'] as const).map((m) => {
                  const active = method === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => {
                        setMethod(m);
                        clearError();
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={m === 'UPI' ? 'UPI' : 'Bank transfer'}
                      style={[s.methodBtn, active && s.methodBtnActive]}
                    >
                      {m === 'UPI' ? (
                        <Smartphone size={15} color={active ? '#c41617' : '#64748b'} />
                      ) : (
                        <Landmark size={15} color={active ? '#c41617' : '#64748b'} />
                      )}
                      <Text style={[s.methodText, active && s.methodTextActive]}>
                        {m === 'UPI' ? 'UPI' : 'Bank'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {method === 'UPI' ? (
              <View>
                <Text style={s.fieldLabel}>UPI ID</Text>
                <TextInput
                  value={upiId}
                  onChangeText={(v) => {
                    setUpiId(v);
                    clearError();
                  }}
                  placeholder="name@bank"
                  placeholderTextColor="#a89a8d"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={s.input}
                  accessibilityLabel="UPI ID"
                />
              </View>
            ) : (
              <>
                <View>
                  <Text style={s.fieldLabel}>Account holder name</Text>
                  <TextInput
                    value={accountName}
                    onChangeText={(v) => {
                      setAccountName(v);
                      clearError();
                    }}
                    placeholder="As per bank records"
                    placeholderTextColor="#a89a8d"
                    style={s.input}
                    accessibilityLabel="Account holder name"
                  />
                </View>
                <View>
                  <Text style={s.fieldLabel}>Account number</Text>
                  <TextInput
                    value={accountNumber}
                    onChangeText={(v) => {
                      setAccountNumber(v);
                      clearError();
                    }}
                    placeholder="Account number"
                    placeholderTextColor="#a89a8d"
                    keyboardType="number-pad"
                    style={s.input}
                    accessibilityLabel="Account number"
                  />
                </View>
                <View>
                  <Text style={s.fieldLabel}>IFSC</Text>
                  <TextInput
                    value={ifsc}
                    onChangeText={(v) => {
                      setIfsc(v.toUpperCase());
                      clearError();
                    }}
                    placeholder="HDFC0001234"
                    placeholderTextColor="#a89a8d"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    style={s.input}
                    accessibilityLabel="IFSC code"
                  />
                </View>
                <View>
                  <Text style={s.fieldLabel}>
                    Bank <Text style={s.fieldLabelSoft}>(optional)</Text>
                  </Text>
                  <TextInput
                    value={bankName}
                    onChangeText={setBankName}
                    placeholder="Bank name"
                    placeholderTextColor="#a89a8d"
                    style={s.input}
                    accessibilityLabel="Bank name"
                  />
                </View>
              </>
            )}

            {error ? <Text style={s.error}>{error}</Text> : null}
          </ScrollView>

          <View style={s.sheetFoot}>
            <Pressable
              onPress={onClose}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={[s.footBtn, s.footGhost]}
            >
              <Text style={s.footGhostText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Withdraw"
              accessibilityState={{ busy: submitting, disabled: submitting }}
              style={[s.footBtn, s.footPrimary, submitting && { opacity: 0.75 }]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Check size={16} color="#ffffff" strokeWidth={2.6} />
              )}
              <Text style={s.footPrimaryText}>
                {submitting ? 'Requesting…' : `Withdraw ${amount ? inr(Number(amount)) : ''}`.trim()}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#faf7f3' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  balanceCard: { borderRadius: 18, padding: 18, overflow: 'hidden' },
  balanceLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  balanceValue: {
    fontFamily: Fonts.sansBold,
    fontSize: 30,
    // Outfit is static: the weight must name the loaded file (Outfit_700Bold).
    fontWeight: '700',
    letterSpacing: -0.6,
    color: '#ffffff',
    marginTop: 3,
  },
  balanceFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 14,
  },
  balanceNote: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 },
  balanceNoteText: {
    fontFamily: Fonts.sans,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.75)',
    flex: 1,
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  withdrawBtnText: {
    fontFamily: Fonts.sansBold,
    fontSize: 13,
    fontWeight: '700',
    color: '#c41617',
  },

  sectionLabel: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 10,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#efe4d8',
    padding: 12,
  },
  rowIconNeutral: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconCredit: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  rowSub: { fontFamily: Fonts.sans, fontSize: 12, color: '#5f5550', marginTop: 1 },
  rowMeta: { fontFamily: Fonts.sans, fontSize: 11, color: '#8b8079', marginTop: 1 },
  rowError: { fontFamily: Fonts.sans, fontSize: 11, color: '#dc2626', marginTop: 1 },
  rowAmountCredit: {
    fontFamily: Fonts.sansBold,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#059669',
  },
  rowAmountDebit: {
    fontFamily: Fonts.sansBold,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 3,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: Fonts.sansSemibold, fontSize: 10.5, fontWeight: '600' },

  // ── Withdraw sheet ──────────────────────────────────────────────────────
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sheetTitle: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    // Poppins_600SemiBold is the loaded file.
    fontWeight: '600',
    letterSpacing: -0.4,
    color: '#1a1a1a',
  },

  fieldLabel: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13,
    fontWeight: '600',
    color: '#3d352f',
    marginBottom: 6,
  },
  withdrawAll: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 12,
    fontWeight: '600',
    color: Palette.primary,
    marginTop: 6,
  },
  fieldLabelSoft: { fontFamily: Fonts.sans, fontWeight: '400', color: '#a89a8d' },
  amountWrap: { position: 'relative', justifyContent: 'center' },
  amountPrefix: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
    fontFamily: Fonts.sansSemibold,
    fontSize: 14,
    color: '#5f5550',
  },
  input: {
    fontFamily: Fonts.sans,
    borderWidth: 1,
    borderColor: '#e6dcd0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },

  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: '#e6dcd0',
    borderRadius: 10,
    paddingVertical: 11,
  },
  methodBtnActive: { borderColor: Palette.primary, backgroundColor: '#fff6f6' },
  methodText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#5f5550',
  },
  methodTextActive: { color: '#c41617' },

  error: { fontFamily: Fonts.sans, fontSize: 12.5, color: '#dc2626' },

  sheetFoot: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  footBtn: {
    flex: 1,
    minHeight: 48,
    // `rounded-full` on the web, not a 12px radius.
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
  footPrimary: { backgroundColor: Palette.primary },
  footPrimaryText: {
    fontFamily: Fonts.sansBold,
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
