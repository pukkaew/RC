// Main application file - Complete Version with Bot Share
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { errorHandler } = require('./utils/ErrorHandler');
const logger = require('./utils/Logger');
const appConfig = require('./config/app');
const path = require('path');

// Create Express app
const app = express();

// CORS middleware for LIFF
app.use((req, res, next) => {
  // Allow requests from LIFF
  res.header('Access-Control-Allow-Origin', 'https://liff.line.me');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Middleware
app.use(bodyParser.json({ 
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(bodyParser.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/liff', express.static(path.join(__dirname, 'public/liff')));

// Import controllers
const webhookController = require('./controllers/WebhookController');
const uploadController = require('./controllers/UploadController');
const lineService = require('./services/LineService');

// Import API routes - Check if files exist
let apiRoutes, botShareRoutes, shareRoutes;

try {
  apiRoutes = require('./routes/api');
  logger.info('✅ API routes loaded');
} catch (error) {
  logger.error('❌ Failed to load API routes:', error.message);
  apiRoutes = express.Router();
}

try {
  botShareRoutes = require('./routes/botShare');
  logger.info('✅ Bot share routes loaded');
} catch (error) {
  logger.error('❌ Failed to load Bot share routes:', error.message);
  botShareRoutes = express.Router();
}

try {
  shareRoutes = require('./routes/share');
  logger.info('✅ Share routes loaded');
} catch (error) {
  logger.error('❌ Failed to load Share routes:', error.message);
  shareRoutes = express.Router();
}

// Setup routes
app.post('/webhook', webhookController.handleWebhook);

// API routes for LIFF - with logging
app.use('/api', (req, res, next) => {
  logger.info(`API Request: ${req.method} ${req.path}`);
  next();
}, apiRoutes, botShareRoutes, shareRoutes);

// Share page route
app.use('/', shareRoutes);

// Add system monitoring endpoint
app.get('/status', (req, res) => {
  const stats = webhookController.getSystemStatistics();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    statistics: stats,
    features: {
      liff: true,
      botShare: true,
      multiChat: true
    }
  });
});

// Test endpoint for bot share
app.get('/api/bot-share/test', (req, res) => {
  res.json({
    status: 'Bot share API is working',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(errorHandler);

// Enhanced cleanup timer for pending uploads and expired states (every 5 minutes)
setInterval(() => {
  try {
    // Clean up pending uploads
    const cleanedUploads = uploadController.cleanupPendingUploads();
    if (cleanedUploads > 0) {
      logger.info(`Cleaned up ${cleanedUploads} expired upload sessions`);
    }
    
    // Clean up expired user states
    const cleanedStates = lineService.cleanupExpiredStates();
    if (cleanedStates > 0) {
      logger.info(`Cleaned up ${cleanedStates} expired user states`);
    }
    
    // Log system statistics periodically (every hour)
    const currentMinute = new Date().getMinutes();
    if (currentMinute === 0) { // Top of the hour
      const stats = webhookController.getSystemStatistics();
      logger.info('System Statistics:', stats);
    }
    
  } catch (error) {
    logger.error('Error during cleanup:', error);
  }
}, 5 * 60 * 1000); // 5 minutes

// System monitoring (every 30 minutes)
setInterval(() => {
  try {
    logger.info('Running system monitoring...');
    
    // Get upload statistics for monitoring
    const uploadStats = uploadController.getUploadStatistics();
    if (uploadStats.totalPendingUploads > 0) {
      logger.info('Current upload statistics:', uploadStats);
    }
    
    // Get active states for monitoring
    const activeStates = lineService.getActiveStates();
    const stateCount = Object.keys(activeStates).length;
    if (stateCount > 0) {
      logger.info(`Active user states: ${stateCount}`);
    }
    
  } catch (error) {
    logger.error('Error during system monitoring:', error);
  }
}, 30 * 60 * 1000); // 30 minutes

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info('===========================================');
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info('===========================================');
  logger.info('📍 Endpoints:');
  logger.info(`   Webhook: ${process.env.BASE_URL || `http://localhost:${PORT}`}/webhook`);
  logger.info(`   Status: ${process.env.BASE_URL || `http://localhost:${PORT}`}/status`);
  logger.info(`   LIFF: ${process.env.BASE_URL || `http://localhost:${PORT}`}/liff/view.html`);
  logger.info(`   API: ${process.env.BASE_URL || `http://localhost:${PORT}`}/api/`);
  logger.info(`   Bot Share: ${process.env.BASE_URL || `http://localhost:${PORT}`}/api/bot-share`);
  logger.info('===========================================');
  logger.info('✅ Features enabled:');
  logger.info('   - Multi-chat support');
  logger.info('   - LIFF photo viewer');
  logger.info('   - Bot share system');
  logger.info('   - Auto cleanup');
  logger.info('===========================================');
  logger.info('⚠️  Note: For production, use HTTPS for all URLs');
  logger.info('===========================================');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Don't exit in production, but log the error
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
  // Don't exit in production, but log the error
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  
  // Stop accepting new connections
  const server = app.listen();
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Clean up resources
    try {
      const cleanedUploads = uploadController.cleanupPendingUploads();
      const cleanedStates = lineService.cleanupExpiredStates();
      logger.info(`Final cleanup: ${cleanedUploads} uploads, ${cleanedStates} states`);
    } catch (error) {
      logger.error('Error during shutdown cleanup:', error);
    }
    
    // Close database connections if any
    // Add database cleanup here if needed
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Health check for load balancers
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`,
    timestamp: new Date().toISOString()
  });
});

module.exports = app;