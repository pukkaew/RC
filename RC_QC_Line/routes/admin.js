// Admin routes for system management
// Path: RC_QC_Line/routes/admin.js

const express = require('express');
const router = express.Router();
const lineService = require('../services/LineService');
const uploadController = require('../controllers/UploadController');
const logger = require('../utils/Logger');

// Clear all states for a specific user
router.post('/admin/clear-user-state/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    logger.info(`Admin: Clearing all states for user ${userId}`);
    
    // Clear all user states across all chats
    const clearedStates = lineService.clearAllUserStates(userId);
    
    // Clear upload info for all chats
    const allUploads = lineService.getAllUploadInfoForUser(userId);
    allUploads.forEach(upload => {
      lineService.setUploadInfo(userId, null, upload.chatId);
    });
    
    // Clear pending uploads
    if (uploadController.pendingUploads) {
      uploadController.pendingUploads.delete(userId);
    }
    
    // Clear upload timers
    if (uploadController.uploadTimers) {
      if (uploadController.uploadTimers.has(userId)) {
        clearTimeout(uploadController.uploadTimers.get(userId));
        uploadController.uploadTimers.delete(userId);
      }
    }
    
    // Clear any chat share sessions
    if (global.shareSessions) {
      for (const [sessionId, session] of global.shareSessions.entries()) {
        if (session.userId === userId) {
          global.shareSessions.delete(sessionId);
        }
      }
    }
    
    logger.info(`Admin: Cleared all data for user ${userId}`);
    
    res.json({
      success: true,
      message: `Cleared all states and data for user ${userId}`,
      details: {
        clearedStates: clearedStates,
        clearedUploads: allUploads.length
      }
    });
    
  } catch (error) {
    logger.error('Admin: Error clearing user state:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear user state',
      error: error.message
    });
  }
});

// Get user state information
router.get('/admin/user-state/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get all states for user
    const allStates = lineService.getActiveStates();
    const userStates = {};
    
    for (const [key, state] of Object.entries(allStates)) {
      if (key.startsWith(userId)) {
        userStates[key] = state;
      }
    }
    
    // Get upload info
    const uploadInfo = lineService.getAllUploadInfoForUser(userId);
    
    // Get pending uploads
    let pendingUploads = null;
    if (uploadController.pendingUploads && uploadController.pendingUploads.has(userId)) {
      const pending = uploadController.pendingUploads.get(userId);
      pendingUploads = {
        imageCount: pending.images ? pending.images.length : 0,
        lotNumber: pending.lotNumber,
        lotRequested: pending.lotRequested,
        lastUpdateTime: new Date(pending.lastUpdateTime).toISOString()
      };
    }
    
    res.json({
      success: true,
      userId: userId,
      states: userStates,
      uploadInfo: uploadInfo,
      pendingUploads: pendingUploads,
      hasActiveTimer: uploadController.uploadTimers ? uploadController.uploadTimers.has(userId) : false
    });
    
  } catch (error) {
    logger.error('Admin: Error getting user state:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user state',
      error: error.message
    });
  }
});

// Clear all system states
router.post('/admin/clear-all-states', async (req, res) => {
  try {
    logger.info('Admin: Clearing all system states');
    
    // Clear all user states
    const activeStates = lineService.getActiveStates();
    const totalStates = Object.keys(activeStates).length;
    
    for (const userId of Object.keys(activeStates)) {
      lineService.clearUserState(userId);
    }
    
    // Clear all pending uploads
    let clearedUploads = 0;
    if (uploadController.pendingUploads) {
      clearedUploads = uploadController.pendingUploads.size;
      uploadController.pendingUploads.clear();
    }
    
    // Clear all timers
    let clearedTimers = 0;
    if (uploadController.uploadTimers) {
      for (const [userId, timer] of uploadController.uploadTimers.entries()) {
        clearTimeout(timer);
      }
      clearedTimers = uploadController.uploadTimers.size;
      uploadController.uploadTimers.clear();
    }
    
    // Clear all share sessions
    let clearedSessions = 0;
    if (global.shareSessions) {
      clearedSessions = global.shareSessions.size;
      global.shareSessions.clear();
    }
    
    logger.info('Admin: System cleanup completed');
    
    res.json({
      success: true,
      message: 'Cleared all system states',
      details: {
        clearedStates: totalStates,
        clearedUploads: clearedUploads,
        clearedTimers: clearedTimers,
        clearedSessions: clearedSessions
      }
    });
    
  } catch (error) {
    logger.error('Admin: Error clearing all states:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear all states',
      error: error.message
    });
  }
});

// Get system statistics
router.get('/admin/system-stats', async (req, res) => {
  try {
    // Get all active states
    const activeStates = lineService.getActiveStates();
    
    // Get upload statistics
    const uploadStats = uploadController.getUploadStatistics();
    
    // Count share sessions
    let shareSessions = 0;
    if (global.shareSessions) {
      shareSessions = global.shareSessions.size;
    }
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      statistics: {
        activeStates: Object.keys(activeStates).length,
        stateDetails: activeStates,
        uploads: uploadStats,
        shareSessions: shareSessions
      }
    });
    
  } catch (error) {
    logger.error('Admin: Error getting system stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system stats',
      error: error.message
    });
  }
});

// Force cleanup expired sessions
router.post('/admin/force-cleanup', async (req, res) => {
  try {
    logger.info('Admin: Force cleanup initiated');
    
    // Cleanup expired states
    const cleanedStates = lineService.cleanupExpiredStates();
    
    // Cleanup pending uploads
    const cleanedUploads = uploadController.cleanupPendingUploads();
    
    // Cleanup share sessions
    let cleanedSessions = 0;
    if (global.shareSessions) {
      const now = new Date();
      for (const [sessionId, session] of global.shareSessions.entries()) {
        const age = now - session.createdAt;
        if (age > 5 * 60 * 1000) { // 5 minutes
          global.shareSessions.delete(sessionId);
          cleanedSessions++;
        }
      }
    }
    
    logger.info('Admin: Force cleanup completed');
    
    res.json({
      success: true,
      message: 'Force cleanup completed',
      details: {
        cleanedStates: cleanedStates,
        cleanedUploads: cleanedUploads,
        cleanedSessions: cleanedSessions
      }
    });
    
  } catch (error) {
    logger.error('Admin: Error during force cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform cleanup',
      error: error.message
    });
  }
});

module.exports = router;