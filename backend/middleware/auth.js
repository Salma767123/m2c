const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const sessionManager = require('../utils/auth/sessionManager');

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
  try {
    // Try to get token from Authorization header first
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // If not in header, try to get from httpOnly cookie
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token is required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Handle vendor tokens differently
    if (decoded.type === 'vendor' && decoded.vendorId) {
      // Check vendor exists and is active
      const vendor = await prisma.vendor.findUnique({
        where: { id: decoded.vendorId },
        select: {
          id: true,
          email: true,
          companyName: true,
          ownerName: true,
          status: true
        }
      });

      if (!vendor) {
        return res.status(401).json({
          success: false,
          error: 'Vendor not found'
        });
      }

      if (vendor.status === 'SUSPENDED') {
        return res.status(403).json({
          success: false,
          error: 'Vendor account is suspended'
        });
      }

      // Add vendor info to request
      req.userId = vendor.id;
      req.user = {
        ...vendor,
        role: 'VENDOR',
        vendorId: vendor.id
      };

      next();
      return;
    }

    // Handle QC Checker tokens
    if (decoded.type === 'qc_checker' && decoded.checkerId) {
      const checker = await prisma.qCChecker.findUnique({
        where: { id: decoded.checkerId },
        select: {
          id: true,
          checkerId: true,
          email: true,
          name: true,
          status: true,
          isActive: true,
        }
      });

      if (!checker) {
        return res.status(401).json({
          success: false,
          error: 'QC Checker not found'
        });
      }

      if (!checker.isActive || checker.status === 'SUSPENDED') {
        return res.status(403).json({
          success: false,
          error: 'QC Checker account is not active'
        });
      }

      req.userId = checker.id;
      req.user = {
        ...checker,
        role: 'QC_CHECKER',
        checkerId: checker.id
      };

      next();
      return;
    }

    // Check if session is valid in MongoDB for regular users
    const isValidSession = await sessionManager.isSessionValid(decoded.userId, token);
    if (!isValidSession) {
      console.log('❌ Session validation failed for user:', decoded.userId);
      return res.status(401).json({
        success: false,
        error: 'Session expired or invalid. Please login again.'
      });
    }

    // Check if user exists and is active in all collections
    let user = await prisma.user.findUnique({
      where: { id: decoded.userId || decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        isVerified: true
      }
    });
    let userType = 'USER';

    if (!user) {
      user = await prisma.admin.findUnique({
        where: { id: decoded.userId || decoded.id },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          isVerified: true
        }
      });
      userType = 'ADMIN';
    }

    // Check for delivery partner
    if (!user) {
      // No delivery partner model available
      console.log('❌ User not found in any collection');
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Add user info to request
    req.userId = user.id;
    req.user = {
      ...user,
      role: userType
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Check if user has required role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    // Normalize role names for comparison
    const normalizedUserRole = userRole.toLowerCase();
    const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase());

    if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Require vendor role specifically
const requireVendorRole = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (req.user.role !== 'VENDOR') {
    return res.status(403).json({
      success: false,
      error: 'Vendor access required'
    });
  }

  next();
};

// Require admin role specifically
const requireAdminRole = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }

  next();
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Handle vendor tokens
      if (decoded.type === 'vendor' && decoded.vendorId) {
        const vendor = await prisma.vendor.findUnique({
          where: { id: decoded.vendorId },
          select: {
            id: true,
            email: true,
            companyName: true,
            ownerName: true,
            status: true
          }
        });

        if (vendor && vendor.status !== 'SUSPENDED') {
          req.userId = vendor.id;
          req.user = {
            ...vendor,
            role: 'VENDOR',
            vendorId: vendor.id
          };
        }
      } else {
        // Handle regular user tokens
        let user = await prisma.user.findUnique({
          where: { id: decoded.userId || decoded.id },
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            isVerified: true
          }
        });
        let userType = 'USER';

        if (!user) {
          user = await prisma.admin.findUnique({
            where: { id: decoded.userId || decoded.id },
            select: {
              id: true,
              email: true,
              name: true,
              isActive: true,
              isVerified: true
            }
          });
          userType = 'ADMIN';
        }

        if (user && user.isActive) {
          req.userId = user.id;
          req.user = {
            ...user,
            role: userType
          };
        }
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireVendorRole,
  requireAdminRole,
  optionalAuth
};