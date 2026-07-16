import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  X,
  CheckCheck,
  Check,
  Undo2,
  Search,
} from 'lucide-react-native';
import {
  AppNotification,
  fetchNotifications,
  markNotificationRead,
  markNotificationUnread,
  markAllNotificationsRead,
} from '@/services/notificationService';
import { iconFor } from './notificationIcons';
import { AppText } from '@/components/UI/AppText';
import { brand, colors } from '@/constants/design';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called whenever the unread count changes, so the bell badge can update. */
  onUnreadChange?: (count: number) => void;
}

// Read-status filter — mirrors the web NotificationModal read filter.
type ReadFilter = 'all' | 'unread' | 'read';
const READ_FILTERS: { key: ReadFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
];

// Category filter tabs — type mapping mirrors the web QC_CATEGORIES.
const CATEGORY_TABS: { key: string; label: string; types?: string[] }[] = [
  { key: 'all', label: 'All' },
  {
    key: 'assignments',
    label: 'Assignments',
    types: ['VENDOR_ASSIGNED', 'PRODUCT_ASSIGNED', 'QC_ASSIGNED'],
  },
  {
    key: 'inspections',
    label: 'Inspections',
    types: [
      'INSPECTION_SCHEDULED',
      'REINSPECTION_RAISED',
      'INSPECTION_COMPLETED',
      'INSPECTION_SUBMITTED',
      'REINSPECTION_COMPLETED',
      'INSPECTION_FINAL_REJECTED',
      'REINSPECTION_REQUIRED',
      'REINSPECTION_RESULT',
    ],
  },
  { key: 'vendor-status', label: 'Vendor Status', types: ['VENDOR_STATUS_CHANGED'] },
  { key: 'approvals', label: 'Approvals', types: ['PRODUCT_APPROVED', 'PRODUCT_PENDING_APPROVAL'] },
  { key: 'rejections', label: 'Rejections', types: ['PRODUCT_REJECTED', 'INSPECTION_FINAL_REJECTED'] },
  {
    key: 'support',
    label: 'Support',
    types: ['SUPPORT_REPLY', 'NEW_SUPPORT_TICKET', 'NEW_ENQUIRY'],
  },
];

function matchesCategory(n: AppNotification, categoryKey: string): boolean {
  if (categoryKey === 'all') return true;
  const tab = CATEGORY_TABS.find((t) => t.key === categoryKey);
  return tab?.types?.includes(n.type) ?? true;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export default function NotificationsModal({
  visible,
  onClose,
  onUnreadChange,
}: NotificationsModalProps) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('all');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [search, setSearch] = useState('');

  // Client-side filters (category + read-status + search) over the fetched list.
  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((n) => {
      if (!matchesCategory(n, category)) return false;
      if (readFilter === 'unread' && n.isRead) return false;
      if (readFilter === 'read' && !n.isRead) return false;
      if (q) {
        return (
          n.title?.toLowerCase().includes(q) ||
          n.message?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, category, readFilter, search]);

  const load = useCallback(async () => {
    const res = await fetchNotifications(1, 50);
    setItems(res.notifications);
    setUnread(res.unreadCount);
    onUnreadChange?.(res.unreadCount);
  }, [onUnreadChange]);

  useEffect(() => {
    if (!visible) return;
    setCategory('all');
    setReadFilter('all');
    setSearch('');
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [visible, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleMarkRead = async (n: AppNotification) => {
    if (n.isRead) return;
    // Optimistic update, then persist (mirrors web read/unread toggle).
    setItems((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x))
    );
    setUnread((prev) => {
      const next = Math.max(0, prev - 1);
      onUnreadChange?.(next);
      return next;
    });
    await markNotificationRead(n.id);
  };

  const handleMarkUnread = async (n: AppNotification) => {
    if (!n.isRead) return;
    setItems((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, isRead: false } : x))
    );
    setUnread((prev) => {
      const next = prev + 1;
      onUnreadChange?.(next);
      return next;
    });
    await markNotificationUnread(n.id);
  };

  // Tapping the item body marks it read (only if currently unread) — same as web.
  const handleItemPress = (n: AppNotification) => {
    if (!n.isRead) handleMarkRead(n);
  };

  const handleMarkAll = async () => {
    if (unread === 0) return;
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnread(0);
    onUnreadChange?.(0);
    await markAllNotificationsRead();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Match the status-bar icon colour to the white header so the
          gesture-area text stays readable on both Android and iOS. */}
      <StatusBar barStyle="light-content" backgroundColor={brand[500]} />
      <View className="flex-1 bg-gray-50">
        {/* Brand-red header strip — white icon circle + white title; padding-top
            driven by the actual safe-area inset instead of a hardcoded pt-14 so
            the status-bar / notch / Dynamic Island area no longer shows a
            black bar. */}
        <View
          className="px-4 pb-4"
          style={{ backgroundColor: brand[500], paddingTop: insets.top + 12 }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="bg-white rounded-full w-10 h-10 items-center justify-center mr-3">
                <Bell size={18} color={brand[500]} />
              </View>
              <View className="flex-1">
                <AppText variant="titleLg" color={colors.white}>
                  Notifications
                </AppText>
                <AppText variant="bodySm" color="rgba(255,255,255,0.85)">
                  {unread > 0 ? `${unread} unread` : 'All caught up'}
                </AppText>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={10}
              className="rounded-full w-9 h-9 items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
            >
              <X size={18} color={colors.white} />
            </TouchableOpacity>
          </View>

          {unread > 0 && (
            <TouchableOpacity
              onPress={handleMarkAll}
              className="flex-row items-center self-start mt-3 rounded-full px-3 py-1.5"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
            >
              <CheckCheck size={14} color={colors.white} />
              <AppText variant="labelMd" color={colors.white} style={{ marginLeft: 6 }}>
                Mark all as read
              </AppText>
            </TouchableOpacity>
          )}
        </View>

        {/* White filter block — search + read pills + category tabs */}
        <View className="bg-white border-b border-slate-200 px-4 pt-3 pb-4">
          {/* Search box — filters title + message client-side (mirrors web) */}
          <View className="flex-row items-center bg-slate-100 border border-slate-200 rounded-xl px-3">
            <Search size={16} color="#94a3b8" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search notifications..."
              placeholderTextColor="#94a3b8"
              className="flex-1 text-sm text-slate-900 py-2.5 px-2"
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Read-status filter pills — All / Unread / Read (client-side) */}
          <View className="flex-row items-center mt-3">
            {READ_FILTERS.map((f) => {
              const isActive = readFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setReadFilter(f.key)}
                  activeOpacity={0.7}
                  className={`mr-2 px-4 py-1.5 rounded-full ${
                    isActive ? 'bg-brand-500' : 'bg-white border border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      isActive ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Category tabs — mirrors the web notification modal categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-3 -mx-4"
            contentContainerStyle={{ paddingHorizontal: 12 }}
          >
            {CATEGORY_TABS.map((tab) => {
              const isActive = category === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setCategory(tab.key)}
                  activeOpacity={0.7}
                  className={`mx-1 px-4 py-2 rounded-full ${
                    isActive ? 'bg-brand-500' : 'bg-white border border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      isActive ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* List */}
        {loading && items.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={brand[500]} />
          </View>
        ) : (
          <FlatList
            data={visibleItems}
            keyExtractor={(n) => n.id}
            contentContainerStyle={{ padding: 12, flexGrow: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={brand[500]}
                colors={[brand[500]]}
              />
            }
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-24">
                <View className="bg-slate-100 rounded-full w-20 h-20 items-center justify-center">
                  <Bell size={36} color="#94a3b8" />
                </View>
                <AppText variant="titleMd" color={colors.text} style={{ marginTop: 12 }}>
                  {search.trim()
                    ? 'No notifications match your search'
                    : readFilter !== 'all'
                    ? `No ${readFilter} notifications`
                    : category === 'all'
                    ? 'No notifications yet'
                    : 'No notifications in this category'}
                </AppText>
                <AppText
                  variant="bodySm"
                  color={colors.textMuted}
                  style={{ marginTop: 4, textAlign: 'center', paddingHorizontal: 32 }}
                >
                  {search.trim() || readFilter !== 'all'
                    ? 'Try adjusting your filters or pull to refresh.'
                    : category === 'all'
                    ? "You'll be notified about product and vendor assignments, inspections, and re-inspections."
                    : 'Try another category or pull to refresh.'}
                </AppText>
              </View>
            }
            renderItem={({ item }) => {
              const { Icon, color, bg } = iconFor(item.type);
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleItemPress(item)}
                  className={`flex-row rounded-2xl p-3 mb-2 border ${
                    item.isRead
                      ? 'bg-white border-gray-100'
                      : 'bg-blue-50 border-blue-100'
                  }`}
                >
                  <View
                    style={{ backgroundColor: bg }}
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  >
                    <Icon size={18} color={color} />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text
                        className={`text-sm flex-1 mr-2 ${
                          item.isRead
                            ? 'text-gray-700 font-medium'
                            : 'text-gray-900 font-bold'
                        }`}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {!item.isRead && (
                        <View className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </View>
                    <Text
                      className="text-xs text-gray-500 mt-0.5"
                      numberOfLines={2}
                    >
                      {item.message}
                    </Text>
                    <View className="flex-row items-center justify-between mt-1">
                      <Text className="text-[10px] text-gray-400">
                        {timeAgo(item.createdAt)}
                      </Text>
                      {/* Per-item read/unread toggle — mirrors web NotificationDropdown */}
                      {item.isRead ? (
                        <TouchableOpacity
                          onPress={() => handleMarkUnread(item)}
                          hitSlop={8}
                          className="flex-row items-center px-2 py-1 rounded-full border border-gray-200"
                        >
                          <Undo2 size={11} color="#6b7280" />
                          <Text className="text-[10px] font-semibold text-gray-500 ml-1">
                            Mark as unread
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={() => handleMarkRead(item)}
                          hitSlop={8}
                          className="flex-row items-center px-2 py-1 rounded-full border border-blue-200 bg-blue-50"
                        >
                          <Check size={11} color="#2563eb" />
                          <Text className="text-[10px] font-semibold text-blue-700 ml-1">
                            Mark as read
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}
