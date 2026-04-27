const express = require('express');
const passport = require('passport');
const {
  register,
  login,
  superAdminLogin,
  googleCallback,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  logout,
  updateProfile,
  googleAuthSuccess,
  googleAuthFailure,
  completeOnboarding,
  getAdminSettings,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getUserStats
} = require('../../controllers/auth/authController');

const { authenticateToken } = require('../../middleware/auth');

const router = express.Router();

// ============================================
// USER & ADMIN ROUTES
// ============================================

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/admin/login', superAdminLogin); // Dedicated super admin login
router.post('/google-callback', googleCallback); // Keep for backward compatibility
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Google OAuth routes
router.get('/google',
  (req, res, next) => {
    // Pass login source via OAuth state parameter
    const state = req.query.source === 'admin' ? 'admin' : 'user';
    passport.authenticate('google', { scope: ['profile', 'email'], state })(req, res, next);
  }
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/api/auth/google/failure' }),
  googleAuthSuccess
);

router.get('/google/failure', googleAuthFailure);

// Protected routes
router.get('/me', authenticateToken, getCurrentUser);
router.get('/stats', authenticateToken, getUserStats);
router.post('/logout', authenticateToken, logout);
router.put('/profile', authenticateToken, updateProfile);

// Address management routes
router.get('/addresses', authenticateToken, getAddresses);
router.post('/addresses', authenticateToken, addAddress);
router.put('/addresses/:id', authenticateToken, updateAddress);
router.patch('/addresses/:id/default', authenticateToken, setDefaultAddress);
router.delete('/addresses/:id', authenticateToken, deleteAddress);

// Admin specific routes (same controllers, different endpoints)
router.get('/admin/me', authenticateToken, getCurrentUser);
router.put('/admin/profile', authenticateToken, updateProfile);
router.put('/admin/onboarding', authenticateToken, completeOnboarding);

// System routes for microservice communication
router.get('/admin/settings', getAdminSettings); // Admin settings for all services

// Debug route for session information (development only)
if (process.env.NODE_ENV !== 'production') {
  router.get('/debug/sessions/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const sessions = await require('../../config/database').prisma.session.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      
      const activeSessions = sessions.filter(s => s.expiresAt > new Date());
      const expiredSessions = sessions.filter(s => s.expiresAt <= new Date());
      
      res.json({
        success: true,
        data: {
          userId,
          totalSessions: sessions.length,
          activeSessions: activeSessions.length,
          expiredSessions: expiredSessions.length,
          sessions: sessions.map(s => ({
            id: s.id,
            token: s.token.substring(0, 20) + '...',
            expiresAt: s.expiresAt,
            createdAt: s.createdAt,
            isExpired: s.expiresAt <= new Date(),
            hoursUntilExpiry: Math.round((s.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60))
          }))
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

// Public routes - no authentication required
router.get('/currency', async (req, res) => {
  try {
    const admin = await require('../../config/database').prisma.admin.findFirst({
      where: {
        isActive: true,
        isVerified: true,
      },
      select: {
        currency: true,
        country: true,
      },
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin settings not found',
      });
    }

    res.json({
      success: true,
      data: {
        currency: admin.currency,
        country: admin.country,
      },
    });
  } catch (error) {
    console.error('Get currency error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch currency settings',
    });
  }
});

// Public admin state endpoint for GST calculation
router.get('/admin-state', async (req, res) => {
  try {
    const admin = await require('../../config/database').prisma.admin.findFirst({
      where: {
        isActive: true,
        isVerified: true,
      },
      select: {
        state: true,
        country: true,
      },
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin settings not found',
      });
    }

    res.json({
      success: true,
      data: {
        state: admin.state,
        country: admin.country,
      },
    });
  } catch (error) {
    console.error('Get admin state error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin state',
    });
  }
});

module.exports = router;