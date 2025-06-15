// Main application file - Updated with API Routes
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

// Import API routes
const apiRoutes = require('./routes/api');

// Setup routes
app.post('/webhook', webhookController.handleWebhook);

// API routes for LIFF
app.use('/api', apiRoutes);

// Add system monitoring endpoint
app.get('/status', (req, res) => {
  const stats = webhookController.getSystemStatistics();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    statistics: stats
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
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Webhook URL: http://localhost:${PORT}/webhook`);
  logger.info(`Status endpoint: http://localhost:${PORT}/status`);
  logger.info(`LIFF viewer: http://localhost:${PORT}/liff/view.html`);
  logger.info('Note: For production, use HTTPS for webhook URL');
  logger.info('Multi-chat support enabled');
  logger.info('LIFF photo viewer enabled');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Clean up resources
  try {
    const cleanedUploads = uploadController.cleanupPendingUploads();
    const cleanedStates = lineService.cleanupExpiredStates();
    logger.info(`Final cleanup: ${cleanedUploads} uploads, ${cleanedStates} states`);
  } catch (error) {
    logger.error('Error during shutdown cleanup:', error);
  }
  
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  // Clean up resources
  try {
    const cleanedUploads = uploadController.cleanupPendingUploads();
    const cleanedStates = lineService.cleanupExpiredStates();
    logger.info(`Final cleanup: ${cleanedUploads} uploads, ${cleanedStates} states`);
  } catch (error) {
    logger.error('Error during shutdown cleanup:', error);
  }
  
  process.exit(0);
});

module.exports = app;