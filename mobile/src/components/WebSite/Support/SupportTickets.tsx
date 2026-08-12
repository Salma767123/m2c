import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Plus,
  LifeBuoy,
  ChevronRight,
  Send,
  MessageSquare,
  CircleAlert,
} from 'lucide-react-native';
import { supportService, type SupportTicket } from '@/services/supportService';
import { userAuthService } from '@/services/userAuthService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { Palette, Radius, Shadow } from '@/constants/theme';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  statusMeta,
  priorityMeta,
  categoryLabel,
  CATEGORY_OPTIONS,
  PRIORITY_OPTIONS,
  DESCRIPTION_MIN,
  DESCRIPTION_MAX,
  fmtDate,
  fmtDateTime,
} from './supportMeta';

/**
 * Customer support tickets — the mobile counterpart of the web's Support tab
 * (frontend/src/components/WebSite/Profile/SupportTickets.tsx).
 *
 * One screen, three views (list → create → detail) rather than three routes: a
 * ticket thread is short-lived and the back affordance reads better as "return
 * to my tickets" than as a navigation stack the user can get lost in.
 */
type SupportView = 'list' | 'create' | 'detail';

export default function SupportTickets() {
  const insets = useSafeAreaInsets();
  // `?new=1` (from the header's support icon) jumps straight to the raise form.
  const { new: createParam } = useLocalSearchParams<{ new?: string }>();
  const [view, setView] = useState<SupportView>(createParam === '1' ? 'create' : 'list');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await supportService.getMyTickets();
      if (res.success) setTickets(res.data || []);
    } catch {
      // Leave the existing list in place; the empty state covers a cold failure.
    }
  }, []);

  useEffect(() => {
    (async () => {
      const isAuthed = await userAuthService.isAuthenticated();
      setAuthed(isAuthed);
      if (isAuthed) await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const header = (
    <View style={[s.header, { paddingTop: insets.top + 10 }]}>
      <Pressable
        onPress={() => (view === 'list' ? router.back() : setView('list'))}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={view === 'list' ? 'Go back' : 'Back to my tickets'}
      >
        <ArrowLeft size={22} color="#ffffff" />
      </Pressable>
      <Text style={s.headerTitle}>
        {view === 'create' ? 'New Ticket' : view === 'detail' ? 'Ticket' : 'Support'}
      </Text>
      <View style={{ width: 22 }} />
    </View>
  );

  if (authed === false) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor={Palette.surfaceInverse} />
        {header}
        <View style={s.empty}>
          <LifeBuoy size={44} color={Palette.outlineVariant} />
          <Text style={s.emptyTitle}>Sign in to get help</Text>
          <Text style={s.emptySub}>
            Raise a ticket and track replies from our support team.
          </Text>
          <Pressable
            onPress={() => router.push('/(auth)/Login')}
            style={s.primaryCta}
            accessibilityRole="button"
          >
            <Text style={s.primaryCtaText}>Login to Continue</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={Palette.surfaceInverse} />
      {header}

      {view === 'create' ? (
        <CreateTicket
          onCancel={() => setView('list')}
          onCreated={async () => {
            await load();
            setView('list');
          }}
        />
      ) : view === 'detail' && activeId ? (
        <TicketDetail id={activeId} onUpdated={load} />
      ) : (
        <TicketList
          tickets={tickets}
          loading={loading}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onOpen={(id) => {
            setActiveId(id);
            setView('detail');
          }}
          onCreate={() => setView('create')}
        />
      )}
    </View>
  );
}

/* ── List ─────────────────────────────────────────────────────────────────── */

function TicketList({
  tickets,
  loading,
  refreshing,
  onRefresh,
  onOpen,
  onCreate,
}: {
  tickets: SupportTicket[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 96, gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Palette.primary}
            colors={[Palette.primary]}
          />
        }
      >
        {loading ? (
          <>
            {[0, 1, 2].map((i) => (
              <View key={i} style={s.card}>
                <Skeleton width="40%" height={11} />
                <Skeleton width="80%" height={15} style={{ marginTop: 10 }} />
                <Skeleton width="55%" height={11} style={{ marginTop: 12 }} />
              </View>
            ))}
          </>
        ) : tickets.length === 0 ? (
          <View style={s.empty}>
            <MessageSquare size={44} color={Palette.outlineVariant} />
            <Text style={s.emptyTitle}>No tickets yet</Text>
            <Text style={s.emptySub}>
              Raise a ticket and we&apos;ll get back to you as soon as we can.
            </Text>
          </View>
        ) : (
          tickets.map((t) => {
            const sm = statusMeta(t.status);
            const pm = priorityMeta(t.priority);
            return (
              <Pressable
                key={t.id}
                onPress={() => onOpen(t.id)}
                style={({ pressed }) => [s.card, pressed && s.cardPressed]}
                accessibilityRole="button"
                accessibilityLabel={`Ticket ${t.ticketId}: ${t.subject}. Status ${sm.label}`}
              >
                <View style={s.cardTopRow}>
                  <Text style={s.ticketId}>{t.ticketId}</Text>
                  <View style={[s.pill, { backgroundColor: sm.bg }]}>
                    <Text style={[s.pillText, { color: sm.fg }]}>{sm.label}</Text>
                  </View>
                </View>

                <Text style={s.subject} numberOfLines={2}>
                  {t.subject}
                </Text>

                <View style={s.cardMetaRow}>
                  <View style={[s.pill, { backgroundColor: pm.bg }]}>
                    <Text style={[s.pillText, { color: pm.fg }]}>{pm.label}</Text>
                  </View>
                  <Text style={s.metaText}>{categoryLabel(t.category)}</Text>
                  <Text style={s.metaDot}>·</Text>
                  <Text style={s.metaText}>{fmtDate(t.createdAt)}</Text>
                  <View style={{ flex: 1 }} />
                  <ChevronRight size={16} color={Palette.textSubtle} />
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* New ticket FAB */}
      <Pressable
        onPress={onCreate}
        style={[s.fab, { bottom: insets.bottom + 20 }]}
        accessibilityRole="button"
        accessibilityLabel="Raise a new support ticket"
      >
        <Plus size={19} color="#ffffff" strokeWidth={2.5} />
        <Text style={s.fabText}>New Ticket</Text>
      </Pressable>
    </>
  );
}

/* ── Create ───────────────────────────────────────────────────────────────── */

function CreateTicket({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('order');
  const [otherCategory, setOtherCategory] = useState('');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const clearErr = (k: string) => setErrors((p) => (p[k] ? { ...p, [k]: '' } : p));

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!subject.trim()) e.subject = 'Subject is required';
    if (category === 'other' && !otherCategory.trim()) {
      e.otherCategory = 'Please specify the category';
    }
    if (description.trim().length < DESCRIPTION_MIN) {
      e.description = `Please add at least ${DESCRIPTION_MIN} characters`;
    }
    setErrors(e);
    if (Object.keys(e).length) return;

    try {
      setSubmitting(true);
      const res = await supportService.createTicket({
        subject: subject.trim(),
        category: category === 'other' ? otherCategory.trim() : category,
        priority,
        description: description.trim(),
      });
      if (res.success) {
        showSuccessToast('Ticket Raised', `We'll get back to you on ${res.data.ticketId}.`);
        onCreated();
      } else {
        showErrorToast('Could Not Submit', res.message || 'Please try again.');
      }
    } catch (error: any) {
      showErrorToast('Could Not Submit', error?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 16 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Field label="Subject" error={errors.subject}>
        <TextInput
          value={subject}
          onChangeText={(v) => {
            setSubject(v);
            clearErr('subject');
          }}
          placeholder="Briefly, what's wrong?"
          placeholderTextColor={Palette.textSubtle}
          style={[s.input, !!errors.subject && s.inputError]}
        />
      </Field>

      <Field label="Category">
        <ChipRow
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={(v) => {
            setCategory(v);
            if (v !== 'other') {
              setOtherCategory('');
              clearErr('otherCategory');
            }
          }}
        />
      </Field>

      {category === 'other' ? (
        <Field label="Specify Category" error={errors.otherCategory}>
          <TextInput
            value={otherCategory}
            onChangeText={(v) => {
              setOtherCategory(v);
              clearErr('otherCategory');
            }}
            placeholder="Enter the category"
            placeholderTextColor={Palette.textSubtle}
            style={[s.input, !!errors.otherCategory && s.inputError]}
          />
        </Field>
      ) : null}

      <Field label="Priority">
        <ChipRow options={PRIORITY_OPTIONS} value={priority} onChange={setPriority} />
      </Field>

      <Field label="Description" error={errors.description}>
        <TextInput
          value={description}
          onChangeText={(v) => {
            if (v.length <= DESCRIPTION_MAX) setDescription(v);
            clearErr('description');
          }}
          placeholder="Tell us what happened, including order numbers if relevant."
          placeholderTextColor={Palette.textSubtle}
          multiline
          textAlignVertical="top"
          style={[s.input, s.textarea, !!errors.description && s.inputError]}
        />
        <Text style={s.counter}>
          {description.length}/{DESCRIPTION_MAX}
        </Text>
      </Field>

      <View style={s.formActions}>
        <Pressable onPress={onCancel} style={s.secondaryBtn} accessibilityRole="button">
          <Text style={s.secondaryBtnText}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={submitting}
          style={[s.primaryBtn, submitting && s.btnDisabled]}
          accessibilityRole="button"
          accessibilityState={{ busy: submitting, disabled: submitting }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Send size={16} color="#ffffff" />
          )}
          <Text style={s.primaryBtnText}>{submitting ? 'Submitting...' : 'Submit Ticket'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

/* ── Detail ───────────────────────────────────────────────────────────────── */

function TicketDetail({ id, onUpdated }: { id: string; onUpdated: () => void }) {
  const insets = useSafeAreaInsets();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await supportService.getTicketById(id);
      if (res.success) setTicket(res.data);
    } catch (error: any) {
      showErrorToast('Could Not Load', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const send = async () => {
    const body = reply.trim();
    if (!body || sending) return;
    try {
      setSending(true);
      await supportService.replyToTicket(id, { message: body });
      setReply('');
      await load();
      onUpdated();
    } catch (error: any) {
      showErrorToast('Reply Failed', error?.message || 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={{ padding: 16, gap: 12 }}>
        <Skeleton width="50%" height={13} />
        <Skeleton width="85%" height={18} />
        <Skeleton width="100%" height={80} style={{ marginTop: 8 }} />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={s.empty}>
        <CircleAlert size={44} color={Palette.outlineVariant} />
        <Text style={s.emptyTitle}>Ticket not found</Text>
        <Text style={s.emptySub}>It may have been closed or removed.</Text>
      </View>
    );
  }

  const sm = statusMeta(ticket.status);
  const pm = priorityMeta(ticket.priority);
  // The backend does not echo the opening description as a message, so render it
  // as the first entry in the thread to keep the conversation readable.
  const closed = ['resolved', 'closed'].includes((ticket.status || '').toLowerCase());

  return (
    <>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <View style={s.card}>
          <View style={s.cardTopRow}>
            <Text style={s.ticketId}>{ticket.ticketId}</Text>
            <View style={[s.pill, { backgroundColor: sm.bg }]}>
              <Text style={[s.pillText, { color: sm.fg }]}>{sm.label}</Text>
            </View>
          </View>
          <Text style={s.subject}>{ticket.subject}</Text>
          <View style={s.cardMetaRow}>
            <View style={[s.pill, { backgroundColor: pm.bg }]}>
              <Text style={[s.pillText, { color: pm.fg }]}>{pm.label}</Text>
            </View>
            <Text style={s.metaText}>{categoryLabel(ticket.category)}</Text>
            <Text style={s.metaDot}>·</Text>
            <Text style={s.metaText}>{fmtDate(ticket.createdAt)}</Text>
          </View>
        </View>

        {/* Thread */}
        <Bubble
          mine
          name="You"
          at={ticket.createdAt}
          body={ticket.description}
        />
        {(ticket.messages || []).map((m) => (
          <Bubble
            key={m.id}
            mine={m.senderType?.toLowerCase() === 'user'}
            name={m.senderName}
            at={m.createdAt}
            body={m.message}
          />
        ))}
      </ScrollView>

      {/* Reply box */}
      {closed ? (
        <View style={[s.closedNote, { paddingBottom: insets.bottom + 14 }]}>
          <Text style={s.closedNoteText}>
            This ticket is {sm.label.toLowerCase()}. Raise a new one if you still need help.
          </Text>
        </View>
      ) : (
        <View style={[s.replyBar, { paddingBottom: insets.bottom + 10 }]}>
          <TextInput
            value={reply}
            onChangeText={setReply}
            placeholder="Write a reply..."
            placeholderTextColor={Palette.textSubtle}
            multiline
            style={s.replyInput}
          />
          <Pressable
            onPress={send}
            disabled={!reply.trim() || sending}
            style={[s.sendBtn, (!reply.trim() || sending) && s.btnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Send reply"
          >
            {sending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Send size={17} color="#ffffff" />
            )}
          </Pressable>
        </View>
      )}
    </>
  );
}

function Bubble({
  mine,
  name,
  at,
  body,
}: {
  mine: boolean;
  name: string;
  at: string;
  body: string;
}) {
  return (
    <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs]}>
      <View style={s.bubbleHead}>
        <Text style={[s.bubbleName, mine && { color: Palette.primary }]}>{name}</Text>
        <Text style={s.bubbleTime}>{fmtDateTime(at)}</Text>
      </View>
      <Text style={s.bubbleBody}>{body}</Text>
    </View>
  );
}

/* ── Small form pieces ────────────────────────────────────────────────────── */

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      {children}
      {!!error && <Text style={s.errorText}>{error}</Text>}
    </View>
  );
}

/** Horizontal option chips — replaces the web's <select> on touch. */
function ChipRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[s.chip, active && s.chipActive]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
          >
            <Text style={[s.chipText, active && s.chipTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surfaceInverse,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerTitle: { color: '#ffffff', fontSize: 17, fontWeight: '700' },

  card: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.outline,
    padding: 14,
    ...Shadow.cardRest,
  },
  cardPressed: { opacity: 0.92 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ticketId: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.textMuted,
    letterSpacing: 0.4,
  },
  subject: { fontSize: 15, fontWeight: '700', color: Palette.ink, marginTop: 8 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  metaText: { fontSize: 11.5, color: Palette.textMuted },
  metaDot: { fontSize: 11.5, color: Palette.textSubtle },

  pill: { borderRadius: Radius.full, paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { fontSize: 10.5, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 72, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Palette.ink, marginTop: 14 },
  emptySub: {
    fontSize: 13,
    color: Palette.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },

  fab: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Palette.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 18,
    height: 48,
    ...Shadow.dropdown,
  },
  fabText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },

  label: { fontSize: 12, fontWeight: '700', color: Palette.text, marginBottom: 7 },
  input: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.outline,
    borderRadius: Radius.md,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    color: Palette.ink,
  },
  inputError: { borderColor: Palette.error },
  textarea: { height: 132 },
  counter: { fontSize: 11, color: Palette.textSubtle, textAlign: 'right', marginTop: 5 },
  errorText: { fontSize: 11.5, color: Palette.error, marginTop: 5 },

  chip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Palette.outline,
    backgroundColor: Palette.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: Palette.primary, borderColor: Palette.primary },
  chipText: { fontSize: 12.5, fontWeight: '600', color: Palette.text },
  chipTextActive: { color: '#ffffff' },

  formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.primary,
    borderRadius: Radius.md,
    height: 48,
  },
  primaryBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  secondaryBtn: {
    paddingHorizontal: 22,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.outline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
  },
  secondaryBtnText: { color: Palette.text, fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.55 },

  primaryCta: {
    backgroundColor: Palette.primary,
    borderRadius: Radius.md,
    paddingHorizontal: 24,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  primaryCtaText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },

  bubble: {
    borderRadius: Radius.lg,
    padding: 13,
    borderWidth: 1,
  },
  bubbleMine: {
    backgroundColor: Palette.primaryContainer,
    borderColor: '#E01A1B',
    marginLeft: 24,
  },
  bubbleTheirs: {
    backgroundColor: Palette.surface,
    borderColor: Palette.outline,
    marginRight: 24,
  },
  bubbleHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  bubbleName: { fontSize: 12, fontWeight: '700', color: Palette.ink },
  bubbleTime: { fontSize: 10.5, color: Palette.textSubtle },
  bubbleBody: { fontSize: 13.5, color: Palette.text, lineHeight: 20 },

  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 9,
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: Palette.surface,
    borderTopWidth: 1,
    borderTopColor: Palette.outline,
  },
  replyInput: {
    flex: 1,
    maxHeight: 110,
    minHeight: 44,
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.outline,
    borderRadius: Radius.md,
    paddingHorizontal: 13,
    paddingTop: 12,
    paddingBottom: 10,
    fontSize: 14,
    color: Palette.ink,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  closedNote: {
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: Palette.surface,
    borderTopWidth: 1,
    borderTopColor: Palette.outline,
  },
  closedNoteText: { fontSize: 12.5, color: Palette.textMuted, textAlign: 'center' },
});
