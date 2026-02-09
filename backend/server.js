const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
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
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// app.use(morgan('combined')); // Commented out to reduce console logs
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize Passport
app.use(passport.initialize());

// Import routes
const authRoutes = require('./routes/auth/authRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const vendorSettingsRoutes = require('./routes/vendorSettingsRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const productRoutes = require('./routes/productRoutes');

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
      inventory: '/api/inventory'
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/vendor-settings', vendorSettingsRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/products', productRoutes);

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