// API routes for Flex Card sharing
const express = require('express');
const router = express.Router();
const flexShareService = require('../services/FlexShareService');
const logger = require('../utils/Logger');

// Create flex card share session
router.post('/flex-share/create', async (req, res) => {
  try {
    const { userId, lotNumber, imageDate, imageIds } = req.body;
    
    logger.info(`Creating flex share session - User: ${userId}, Lot: ${lotNumber}`);
    
    // Validate parameters
    if (!userId || !lotNumber || !imageDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
    // Create session
    const result = await flexShareService.createCardShareSession(
      userId,
      lotNumber,
      imageDate,
      imageIds
    );
    
    res.json({
      success: true,
      sessionId: result.sessionId,
      imageCount: result.imageCount
    });
    
  } catch (error) {
    logger.error('Error creating flex share session:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get available chats for sharing
router.get('/flex-share/chats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const chats = await flexShareService.getUserChats(userId);
    
    res.json({
      success: true,
      chats: chats
    });
    
  } catch (error) {
    logger.error('Error getting user chats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Send card to selected chat
router.post('/flex-share/send', async (req, res) => {
  try {
    const { sessionId, targetChatId, targetType } = req.body;
    
    logger.info(`Sending flex card - Session: ${sessionId}, Target: ${targetChatId}`);
    
    const result = await flexShareService.sendCardToChat(
      sessionId,
      targetChatId,
      targetType
    );
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    logger.error('Error sending flex card:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get share options (returns a flex message for chat selection)
router.post('/flex-share/options', async (req, res) => {
  try {
    const { userId, sessionId } = req.body;
    
    // Get available chats
    const chats = await flexShareService.getUserChats(userId);
    
    // Create chat selector message
    const selectorMessage = flexShareService.createChatSelectorMessage(sessionId, chats);
    
    // Send to user
    const lineService = require('../services/LineService');
    await lineService.pushMessage(userId, selectorMessage);
    
    res.json({
      success: true,
      message: 'Chat selector sent'
    });
    
  } catch (error) {
    logger.error('Error sending share options:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Handle postback from chat selection
router.post('/flex-share/postback', async (req, res) => {
  try {
    const { sessionId, chatId, chatType, userId } = req.body;
    
    logger.info(`Processing share postback - Session: ${sessionId}, Chat: ${chatId}`);
    
    // Send the card to selected chat
    const result = await flexShareService.sendCardToChat(
      sessionId,
      chatId,
      chatType
    );
    
    // Send confirmation to user
    const lineService = require('../services/LineService');
    await lineService.pushMessage(userId, {
      type: 'text',
      text: `✅ แชร์การ์ดรูปภาพเรียบร้อยแล้ว!`
    });
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    logger.error('Error processing share postback:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Download all images as ZIP
router.get('/flex-share/:sessionId/download', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = flexShareService.getSession(sessionId);
    
    if (!session) {
      return res.status(404).send('Session not found or expired');
    }
    
    // Create ZIP file
    const archiver = require('archiver');
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });
    
    const fs = require('fs');
    const path = require('path');
    const https = require('https');
    const http = require('http');
    
    res.attachment(`QC_${session.lotNumber}_${session.imageDate}.zip`);
    archive.pipe(res);
    
    // Process each image
    for (let i = 0; i < session.images.length; i++) {
      const image = session.images[i];
      const filename = `QC_${session.lotNumber}_${i + 1}.jpg`;
      
      // Determine image path
      let imagePath = image.file_path || image.url;
      
      if (imagePath.startsWith('http')) {
        // Download from URL
        const protocol = imagePath.startsWith('https') ? https : http;
        
        await new Promise((resolve, reject) => {
          protocol.get(imagePath, (response) => {
            archive.append(response, { name: filename });
            response.on('end', resolve);
            response.on('error', reject);
          });
        });
      } else {
        // Add from file system
        const fullPath = imagePath.startsWith('/') 
          ? path.join(__dirname, '..', 'public', imagePath)
          : path.join(__dirname, '..', imagePath);
          
        if (fs.existsSync(fullPath)) {
          archive.append(fs.createReadStream(fullPath), { name: filename });
        } else {
          logger.warn(`File not found: ${fullPath}`);
        }
      }
    }
    
    await archive.finalize();
    
  } catch (error) {
    logger.error('Error downloading images:', error);
    res.status(500).send('Error creating download');
  }
});

module.exports = router;