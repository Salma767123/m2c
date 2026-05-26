const { prisma } = require('../config/database');

/**
 * Create an in-app notification (called internally, not via API).
 * Also fires FCM push if the user has registered devices.
 */
const createNotification = async ({ userId, role, type, title, message, data }) => {
  try {
    const notification = await prisma.notification.create({
      data: { userId, role, type, title, message, data: data || null }
    });

    // Fire-and-forget push notification via FCM
    try {
      const { sendToUser } = require('../utils/notificationService');
      sendToUser(userId, role, { title, body: message, data: { type, ...(data || {}) } }).catch(() => {});
    } catch {
      // FCM not configured — skip silently
    }

    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
};

/**
 * Create notifications for all users with a given role.
 */
const createNotificationForRole = async ({ role, type, title, message, data }) => {
  try {
    // Get all unique userIds for this role from DeviceToken or other user tables
    let userIds = [];
    if (role === 'ADMIN') {
      const admins = await prisma.admin.findMany({ select: { id: true } });
      userIds = admins.map(a => a.id);
    } else if (role === 'VENDOR') {
      const vendors = await prisma.vendor.findMany({ select: { id: true } });
      userIds = vendors.map(v => v.id);
    } else if (role === 'QC_CHECKER') {
      const checkers = await prisma.qCChecker.findMany({ select: { id: true } });
      userIds = checkers.map(c => c.id);
    }

    if (userIds.length === 0) return;

    // Bulk create notifications
    await prisma.notification.createMany({
      data: userIds.map(uid => ({
        userId: uid, role, type, title, message, data: data || null
      }))
    });

    // Fire-and-forget FCM push
    try {
      const { sendToRole } = require('../utils/notificationService');
      sendToRole(role, { title, body: message, data: { type, ...(data || {}) } }).catch(() => {});
    } catch {
      // FCM not configured
    }
  } catch (error) {
    console.error('Create role notification error:', error);
  }
};

// GET /api/notifications — list notifications for current user
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id || req.user.checkerId;
    const { page = 1, limit = 20, unreadOnly } = req.query;

    const where = { userId };
    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
};

// PUT /api/notifications/:id/read — mark one notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.checkerId;
    // Scope to the requesting user so a notification can't be read on someone else's behalf
    await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
};

// PUT /api/notifications/read-all — mark all notifications as read for current user
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id || req.user.checkerId;
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark all as read' });
  }
};

// GET /api/notifications/unread-count — quick count for badge
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id || req.user.checkerId;
    const count = await prisma.notification.count({ where: { userId, isRead: false } });
    res.json({ success: true, count });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
};

module.exports = {
  createNotification,
  createNotificationForRole,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
