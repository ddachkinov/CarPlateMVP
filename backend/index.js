const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const {
  errorHandler,
  notFoundHandler,
  handleUnhandledRejection,
  handleUncaughtException
} = require('./middleware/errorHandler');

// Handle uncaught exceptions
process.on('uncaughtException', handleUncaughtException);

const app = express(); // <--- APP MUST BE CREATED FIRST
app.use(cors());

// Stripe webhook needs raw body, must come BEFORE express.json()
app.use('/api/subscription/webhook', express.raw({ type: 'application/json' }));

// JSON body parser for all other routes
app.use(express.json());

// MongoDB connection with error handling
mongoose.connect(process.env.MONGO_URI, {
  dbName: process.env.MONGO_DB_NAME,
}).then(() => {
  console.log('✅ MongoDB connected');
}).catch((err) => {
  console.error('❌ MongoDB connection failed:', err);
  process.exit(1);
});

// Handle MongoDB connection errors after initial connection
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', handleUnhandledRejection);

// Routes
const plateRoutes = require('./routes/plates');
app.use('/api/plates', plateRoutes);

const messageRoute = require('./routes/message');
app.use('/api/message', messageRoute);

const userRoutes = require('./routes/user');
app.use('/api/user', userRoutes);

const reportRoutes = require('./routes/report');
app.use('/api/report', reportRoutes);

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

const subscriptionRoutes = require('./routes/subscription');
app.use('/api/subscription', subscriptionRoutes);

const verificationRoutes = require('./routes/verification');
app.use('/api/verification', verificationRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('API is working');
});

// Health check endpoint
app.get('/health', (req, res) => {
  const { redisClient } = require('./middleware/rateLimiter');
  const { isConfigured: isEmailConfigured } = require('./services/emailService');

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis: redisClient() ? 'connected' : 'using memory store',
      email: isEmailConfigured() ? 'configured' : 'not configured'
    },
    version: require('./package.json').version
  };

  // Return 503 if critical services are down
  const isHealthy = mongoose.connection.readyState === 1;
  res.status(isHealthy ? 200 : 503).json(health);
});

// 404 handler - must be AFTER all routes
app.use(notFoundHandler);

// Error handling middleware - must be LAST
app.use(errorHandler);

// Export app for testing
module.exports = app;

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 5001;
  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });
}
