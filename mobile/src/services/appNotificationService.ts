/**
 * In-app notification feed — port of frontend/src/services/notificationService.ts.
 *
 * Named `appNotificationService` because mobile already has a
 * `notificationService`, and that one is a different thing entirely: it
 * registers FCM tokens and wires push listeners. It has no concept of the feed
 * the bell in the header opens, which is why the bell had nothing to read.
 */
import axios from '@/lib/axios';

export interface AppNotification {
  id: string;
  userId: string;
  role: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, string>;
  isRead: boolean;
  createdAt: string;
}

/** The three groups the web's bell tabs between (NotificationModal USER_CATEGORIES). */
export const USER_CATEGORIES: { key: string; label: string; types: string[] }[] = [
  {
    key: 'orders',
    label: 'Orders',
    types: ['ORDER_CONFIRMED', 'ORDER_SHIPPED_TO_CUSTOMER', 'ORDER_DELIVERED'],
  },
  {
    key: 'returns',
    label: 'Cancellations & Returns',
    types: ['ORDER_CANCELLED', 'ORDER_RETURNED'],
  },
  { key: 'support', label: 'Support', types: ['SUPPORT_REPLY'] },
];

export const appNotificationService = {
  async getNotifications(
    page = 1,
    limit = 20,
  ): Promise<{
    success: boolean;
    data: AppNotification[];
    unreadCount: number;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const res = await axios.get('/notifications', { params: { page, limit } });
    return res.data;
  },

  async getUnreadCount(): Promise<number> {
    try {
      const res = await axios.get('/notifications/unread-count');
      return res.data.count || 0;
    } catch {
      // The badge is decoration — a failed count must never break the header.
      return 0;
    }
  },

  async markAsRead(id: string): Promise<void> {
    await axios.put(`/notifications/${id}/read`);
  },

  async markAsUnread(id: string): Promise<void> {
    await axios.put(`/notifications/${id}/unread`);
  },

  async markAllAsRead(): Promise<void> {
    await axios.put('/notifications/read-all');
  },
};

export default appNotificationService;
