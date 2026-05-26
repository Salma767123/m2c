import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
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
  Package,
  Building2,
  CalendarClock,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react-native';
import {
  AppNotification,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/services/notificationService';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called whenever the unread count changes, so the bell badge can update. */
  onUnreadChange?: (count: number) => void;
}

const TYPE_ICON: Record<
  string,
  { Icon: typeof Bell; color: string; bg: string }
> = {
  PRODUCT_ASSIGNED: { Icon: Package, color: '#2563eb', bg: '#dbeafe' },
  VENDOR_ASSIGNED: { Icon: Building2, color: '#7c3aed', bg: '#ede9fe' },
  INSPECTION_SCHEDULED: { Icon: CalendarClock, color: '#0891b2', bg: '#cffafe' },
  REINSPECTION_RAISED: { Icon: RefreshCw, color: '#ea580c', bg: '#ffedd5' },
  INSPECTION_COMPLETED: { Icon: CheckCircle2, color: '#16a34a', bg: '#dcfce7' },
  REINSPECTION_COMPLETED: { Icon: CheckCircle2, color: '#16a34a', bg: '#dcfce7' },
};

function iconFor(type: string) {
  return TYPE_ICON[type] || { Icon: Bell, color: '#475569', bg: '#e2e8f0' };
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

  const load = useCallback(async () => {
    const res = await fetchNotifications(1, 50);
    setItems(res.notifications);
    setUnread(res.unreadCount);
    onUnreadChange?.(res.unreadCount);
  }, [onUnreadChange]);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [visible, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleItemPress = async (n: AppNotification) => {
    if (n.isRead) return;
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
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View className="flex-1 bg-gray-50">
        {/* Header — light surface (matches the body); padding-top driven by
            the actual safe-area inset instead of a hardcoded pt-14 so the
            status-bar / notch / Dynamic Island area no longer shows a
            black bar. */}
        <View
          className="bg-white border-b border-gray-200 px-4 pb-4"
          style={{ paddingTop: insets.top + 12 }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="bg-blue-50 rounded-full p-2 mr-3">
                <Bell size={18} color="#2563eb" />
              </View>
              <View>
                <Text className="text-lg font-bold text-gray-900">
                  Notifications
                </Text>
                <Text className="text-xs text-gray-500">
                  {unread > 0 ? `${unread} unread` : 'All caught up'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={10}
              className="bg-gray-100 rounded-full w-9 h-9 items-center justify-center"
            >
              <X size={18} color="#374151" />
            </TouchableOpacity>
          </View>

          {unread > 0 && (
            <TouchableOpacity
              onPress={handleMarkAll}
              className="flex-row items-center self-start mt-3 bg-blue-50 border border-blue-100 rounded-full px-3 py-1.5"
            >
              <CheckCheck size={14} color="#2563eb" />
              <Text className="text-xs font-semibold text-blue-700 ml-1.5">
                Mark all as read
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        {loading && items.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#111827" />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(n) => n.id}
            contentContainerStyle={{ padding: 12, flexGrow: 1 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-24">
                <Bell size={48} color="#d1d5db" />
                <Text className="text-base font-semibold text-gray-400 mt-3">
                  No notifications yet
                </Text>
                <Text className="text-xs text-gray-400 mt-1 text-center px-8">
                  You&apos;ll be notified about product and vendor assignments,
                  inspections, and re-inspections.
                </Text>
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
                    <Text className="text-[10px] text-gray-400 mt-1">
                      {timeAgo(item.createdAt)}
                    </Text>
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
