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

export const notificationService = {
  getNotifications: async (page = 1, limit = 20): Promise<{
    success: boolean;
    data: AppNotification[];
    unreadCount: number;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> => {
    const res = await axios.get('/notifications', { params: { page, limit } });
    return res.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await axios.get('/notifications/unread-count');
    return res.data.count || 0;
  },

  markAsRead: async (id: string): Promise<void> => {
    await axios.put(`/notifications/${id}/read`);
  },

  markAsUnread: async (id: string): Promise<void> => {
    await axios.put(`/notifications/${id}/unread`);
  },

  markAllAsRead: async (): Promise<void> => {
    await axios.put('/notifications/read-all');
  },
};
