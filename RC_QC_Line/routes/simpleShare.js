// simpleShare.js - Routes for simple card sharing
const express = require('express');
const router = express.Router();
const simpleShareService = require('../services/SimpleCardShareService');
const logger = require('../utils/Logger');

// Create simple share session
router.post('/simple-share/create', async (req, res) => {
  try {
    const { userId, lotNumber, imageDate, imageIds } = req.body;
    
    logger.info(`Creating simple share - User: ${userId}, Lot: ${lotNumber}`);
    
    // Validate parameters
    if (!userId || !lotNumber || !imageDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
    // Create session
    const result = await simpleShareService.createSimpleShareSession(
      userId,
      lotNumber,
      imageDate,
      imageIds
    );
    
    // Get session for card creation
    const session = simpleShareService.getSession(result.sessionId);
    
    // Create shareable card
    const flexCard = simpleShareService.createShareableFlexCard(session);
    
    // Send card to user
    const lineService = require('../services/LineService');
    await lineService.pushMessage(userId, [
      {
        type: 'text',
        text: '✨ การ์ดแชร์พร้อมแล้ว! สามารถส่งต่อให้เพื่อนได้เลย'
      },
      flexCard
    ]);
    
    res.json({
      success: true,
      sessionId: result.sessionId,
      imageCount: result.imageCount,
      message: 'การ์ดแชร์ถูกส่งแล้ว'
    });
    
  } catch (error) {
    logger.error('Error creating simple share:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Handle receive images postback
router.post('/simple-share/receive', async (req, res) => {
  try {
    const { sessionId, userId, replyToken } = req.body;
    
    await simpleShareService.handleReceiveImages(sessionId, userId, replyToken);
    
    res.json({
      success: true,
      message: 'Processing image delivery'
    });
    
  } catch (error) {
    logger.error('Error receiving images:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Handle forward share postback
router.post('/simple-share/forward', async (req, res) => {
  try {
    const { sessionId, userId, replyToken } = req.body;
    
    await simpleShareService.handleForwardShare(sessionId, userId, replyToken);
    
    res.json({
      success: true,
      message: 'Showing chat selector'
    });
    
  } catch (error) {
    logger.error('Error handling forward share:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Handle share to selected chat
router.post('/simple-share/send-to-chat', async (req, res) => {
  try {
    const { sessionId, chatId, chatType, userId, replyToken } = req.body;
    
    await simpleShareService.sendCardToSelectedChat(sessionId, chatId, chatType, userId, replyToken);
    
    res.json({
      success: true,
      message: 'Card sent to selected chat'
    });
    
  } catch (error) {
    logger.error('Error sending to chat:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get available chats
router.get('/simple-share/chats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const chats = simpleShareService.getAvailableChats(userId);
    
    res.json({
      success: true,
      chats: chats
    });
    
  } catch (error) {
    logger.error('Error getting chats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get session info
router.get('/simple-share/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = simpleShareService.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or expired'
      });
    }
    
    res.json({
      success: true,
      session: {
        id: session.id,
        lotNumber: session.lotNumber,
        imageDate: session.imageDate,
        imageCount: session.images.length,
        createdAt: session.createdAt
      }
    });
    
  } catch (error) {
    logger.error('Error getting session:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Manual cleanup endpoint
router.post('/simple-share/cleanup', async (req, res) => {
  try {
    const cleaned = simpleShareService.cleanExpiredSessions();
    
    res.json({
      success: true,
      message: `Cleaned ${cleaned} expired sessions`
    });
    
  } catch (error) {
    logger.error('Error during cleanup:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;