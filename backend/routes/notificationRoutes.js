const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { sendToDevice, notifications } = require('../utils/notificationService');

// Register / update a device token (called on app login)
router.post('/register-token', authenticateToken, async (req, res) => {
  try {
    const { token, platform } = req.body;
    const userId = req.user.id || req.user.checkerId;
    const role = req.user.role;

    if (!token || !platform) {
      return res.status(400).json({ success: false, error: 'Token and platform are required' });
    }

    // Upsert — same token always maps to latest user/role
    await prisma.deviceToken.upsert({
      where: { token },
      update: { userId, role, platform, updatedAt: new Date() },
      create: { userId, role, token, platform },
    });

    res.json({ success: true, message: 'Device token registered' });
  } catch (error) {
    console.error('Register token error:', error);
    res.status(500).json({ success: false, error: 'Failed to register token' });
  }
});

// Remove a device token (called on app logout)
router.delete('/remove-token', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    await prisma.deviceToken.deleteMany({ where: { token } });
    res.json({ success: true, message: 'Device token removed' });
  } catch (error) {
    console.error('Remove token error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove token' });
  }
});

module.exports = router;
