const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('./config/passport');
require('dotenv').config();

const { connectDB } = require('./config/database');
const { initializeAdmin } = require('./utils/auth/initializeAdmin');
const sessionManager = require('./utils/auth/sessionManager');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://m2-c-p6ikdsx.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Additional CORS headers for Vercel serverless
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});
// app.use(morgan('combined')); // Commented out to reduce console logs
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Configure express-session for Google OAuth
app.use(session({
  secret: process.env.JWT_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Import routes
// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'M2C API Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      vendors: '/api/vendors',
      categories: '/api/categories',
      products: '/api/products',
      inventory: '/api/inventory',
      cart: '/api/cart',
      wishlist: '/api/wishlist'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Import routes
const authRoutes = require('./routes/auth/authRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const vendorSettingsRoutes = require('./routes/vendorSettingsRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentSettingsRoutes = require('./routes/paymentSettingsRoutes');
const adminProfileRoutes = require('./routes/adminProfileRoutes');
const companyInfoRoutes = require('./routes/companyInfoRoutes');
const gstSettingsRoutes = require('./routes/gstSettingsRoutes');


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/vendor-settings', vendorSettingsRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment-settings', paymentSettingsRoutes);
app.use('/api/admin/profile', adminProfileRoutes);
app.use('/api/company-info', companyInfoRoutes);
app.use('/api/gst-settings', gstSettingsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Initialize database and admin (for serverless, this runs on each cold start)
let isInitialized = false;

const initializeApp = async () => {
  if (isInitialized) return;

  try {
    await connectDB();

    // Initialize admin user
    const adminResult = await initializeAdmin();
    if (adminResult.success) {
      console.log('✅ Admin initialization completed');
    } else {
      console.log('⚠️ Admin initialization skipped:', adminResult.message);
    }

    // Clean expired sessions
    await sessionManager.cleanExpiredSessions();

    isInitialized = true;
  } catch (error) {
    console.error('❌ Initialization error:', error);
  }
};

// Initialize on import
initializeApp();

// Start server only if not in serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const server = app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);

    // Set up periodic session cleanup (every 6 hours) - only for local dev
    setInterval(async () => {
      try {
        console.log('🧹 Running periodic session cleanup...');
        await sessionManager.cleanExpiredSessions();
      } catch (error) {
        console.error('❌ Periodic session cleanup error:', error);
      }
    }, 6 * 60 * 60 * 1000);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
    });
    await prisma.$disconnect();
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
    });
    await prisma.$disconnect();
  });
}

module.exports = app;