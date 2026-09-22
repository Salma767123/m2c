/**
 * The notification feed behind the header bell — mobile's answer to
 * frontend/src/components/Shared/NotificationDropdown.tsx.
 *
 * The web anchors a dropdown under the bell. A phone has nowhere to anchor one,
 * so this is a sheet, but the contents are the web's: the same three category
 * tabs (Orders / Cancellations & Returns / Support), the same per-type glyphs,
 * unread rows marked and tappable to mark read, and "Mark all read".
 *
 * Tapping a row also follows its `data` to the thing it is about, which is what
 * a notification is for.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  AlertCircle,
  Bell,
  CheckCheck,
  CreditCard,
  Package,
  ShoppingCart,
  Star,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  appNotificationService,
  USER_CATEGORIES,
  type AppNotification,
} from '@/services/appNotificationService';
import { Fonts, Palette } from '@/constants/theme';

type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

/** Per-type glyph and tint, mirroring the web's ICON_MAP. */
const TYPE_ICON: Record<string, { Icon: IconComponent; color: string; bg: string }> = {
  ORDER_CONFIRMED: { Icon: ShoppingCart, color: '#047857', bg: '#ecfdf5' },
  ORDER_SHIPPED_TO_CUSTOMER: { Icon: Package, color: '#1d4ed8', bg: '#eff6ff' },
  ORDER_DELIVERED: { Icon: Package, color: '#047857', bg: '#ecfdf5' },
  ORDER_CANCELLED: { Icon: AlertCircle, color: '#dc2626', bg: '#fef2f2' },
  ORDER_RETURNED: { Icon: AlertCircle, color: '#b45309', bg: '#fffbeb' },
  SUPPORT_REPLY: { Icon: Bell, color: '#4338ca', bg: '#eef2ff' },
  PAYMENT: { Icon: CreditCard, color: '#4338ca', bg: '#eef2ff' },
  REVIEW: { Icon: Star, color: '#b45309', bg: '#fffbeb' },
};

const fallbackIcon = { Icon: Bell, color: '#5f5550', bg: '#f4f1ec' };

const timeAgo = (iso: string) => {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

/** Follow a notification to whatever it is about. */
function routeFor(n: AppNotification) {
  const orderId = n.data?.orderId;
  if (orderId) return { pathname: '/(tabs)/orders/[id]', params: { id: orderId } } as const;
  if (n.type === 'SUPPORT_REPLY') return '/(any)/support' as const;
  if (n.type === 'ORDER_RETURNED') return '/(any)/returns-replacements' as const;
  return '/(tabs)/orders' as const;
}

export default function NotificationSheet({
  visible,
  onClose,
  onUnreadChange,
}: {
  visible: boolean;
  onClose: () => void;
  /** Lets the header badge follow what happens in here. */
  onUnreadChange?: (count: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<string>('all');

  const load = useCallback(async () => {
    try {
      const res = await appNotificationService.getNotifications(1, 50);
      setItems(res.data || []);
      onUnreadChange?.(res.unreadCount ?? 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    load();
  }, [visible, load]);

  const shown = useMemo(() => {
    if (tab === 'all') return items;
    const cat = USER_CATEGORIES.find((c) => c.key === tab);
    if (!cat) return items;
    return items.filter((n) => cat.types.includes(n.type));
  }, [items, tab]);

  const unread = items.filter((n) => !n.isRead).length;

  const open = async (n: AppNotification) => {
    if (!n.isRead) {
      // Optimistic: the row should settle the moment it is tapped, not after
      // a round trip the customer is already navigating away from.
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      onUnreadChange?.(Math.max(0, unread - 1));
      appNotificationService.markAsRead(n.id).catch(() => {});
    }
    onClose();
    router.push(routeFor(n) as never);
  };

  const markAll = async () => {
    setItems((list) => list.map((x) => ({ ...x, isRead: true })));
    onUnreadChange?.(0);
    appNotificationService.markAllAsRead().catch(() => {});
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />

        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={s.head}>
            <View style={s.headIcon}>
              <Bell size={17} color={Palette.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.title}>Notifications</Text>
              <Text style={s.subtitle}>
                {unread > 0 ? `${unread} unread` : 'You are all caught up'}
              </Text>
            </View>
            {unread > 0 ? (
              <Pressable
                onPress={markAll}
                accessibilityRole="button"
                accessibilityLabel="Mark all read"
                hitSlop={6}
                style={s.markAll}
              >
                <CheckCheck size={13} color={Palette.primary} />
                <Text style={s.markAllText}>Mark all read</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <X size={20} color="#9ca3af" />
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.tabRow}
            style={{ flexGrow: 0 }}
          >
            {[{ key: 'all', label: 'All' }, ...USER_CATEGORIES].map((c) => {
              const active = tab === c.key;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => setTab(c.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={c.label}
                  style={[s.tab, active && s.tabActive]}
                >
                  <Text style={[s.tabText, active && s.tabTextActive]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {loading ? (
            <View style={s.centered}>
              <ActivityIndicator size="large" color={Palette.primary} />
            </View>
          ) : shown.length === 0 ? (
            <View style={s.centered}>
              <Bell size={34} color="#d6cec8" />
              <Text style={s.emptyTitle}>Nothing here yet</Text>
              <Text style={s.emptyBody}>
                Order updates and replies will show up here.
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ padding: 14, gap: 8 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    load();
                  }}
                  tintColor={Palette.primary}
                />
              }
            >
              {shown.map((n) => {
                const meta = TYPE_ICON[n.type] || fallbackIcon;
                const { Icon } = meta;
                return (
                  <Pressable
                    key={n.id}
                    onPress={() => open(n)}
                    accessibilityRole="button"
                    accessibilityLabel={`${n.title}. ${n.message}`}
                    android_ripple={{ color: 'rgba(15,23,42,0.05)' }}
                    style={[s.row, !n.isRead && s.rowUnread]}
                  >
                    <View style={[s.rowIcon, { backgroundColor: meta.bg }]}>
                      <Icon size={16} color={meta.color} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[s.rowTitle, !n.isRead && s.rowTitleUnread]} numberOfLines={1}>
                        {n.title}
                      </Text>
                      <Text style={s.rowBody} numberOfLines={2}>
                        {n.message}
                      </Text>
                      <Text style={s.rowTime}>{timeAgo(n.createdAt)}</Text>
                    </View>
                    {!n.isRead ? <View style={s.unreadDot} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '86%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },

  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(224,26,27,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 17,
    // Poppins_600SemiBold is the loaded file.
    fontWeight: '600',
    letterSpacing: -0.35,
    color: '#1a1a1a',
  },
  subtitle: { fontFamily: Fonts.sans, fontSize: 12, color: '#8b8079', marginTop: 1 },
  markAll: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8 },
  markAllText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 12,
    fontWeight: '600',
    color: Palette.primary,
  },

  tabRow: { paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
  tab: {
    borderWidth: 1,
    borderColor: '#efe4d8',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
  tabActive: { borderColor: Palette.primary, backgroundColor: '#fff6f6' },
  tabText: { fontFamily: Fonts.sans, fontSize: 12.5, color: '#5f5550' },
  tabTextActive: { fontFamily: Fonts.sansSemibold, fontWeight: '600', color: Palette.primary },

  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, gap: 8 },
  emptyTitle: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#3d352f',
    marginTop: 4,
  },
  emptyBody: {
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    color: '#8b8079',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderColor: '#f1ece6',
    borderRadius: 14,
    padding: 11,
    backgroundColor: '#ffffff',
  },
  rowUnread: { backgroundColor: '#fffaf9', borderColor: '#f6e2de' },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13.5,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  rowTitleUnread: { fontFamily: Fonts.sansBold, fontWeight: '700' },
  rowBody: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 17, color: '#5f5550', marginTop: 1 },
  rowTime: { fontFamily: Fonts.sans, fontSize: 11, color: '#a89a8d', marginTop: 3 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Palette.primary },
});
