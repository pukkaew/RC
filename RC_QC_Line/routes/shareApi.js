// Enhanced Share API routes for image sharing with bot sending
// File: RC_QC_Line/routes/shareApi.js

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const lineService = require('../services/LineService');
const imageService = require('../services/ImageService');
const logger = require('../utils/Logger');

// Temp directory for share preparation
const TEMP_DIR = path.join(__dirname, '../public/temp/share');

// Ensure temp directory exists
async function ensureTempDirectory() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    logger.info('Share temp directory ensured:', TEMP_DIR);
  } catch (error) {
    logger.error('Error creating share temp directory:', error);
  }
}

// Initialize temp directory
ensureTempDirectory();

// Prepare single image for sharing
router.post('/share/prepare-image', async (req, res) => {
  try {
    const { imageId, lotNumber, imageDate, index } = req.body;
    
    logger.info(`Preparing image for share - ID: ${imageId}, Lot: ${lotNumber}, Index: ${index}`);
    
    // Get image info from database
    const imageModel = require('../models/ImageModel');
    const images = await imageModel.getById(imageId);
    
    if (!images || images.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
    const image = images[0];
    
    // Create unique temp filename
    const timestamp = Date.now();
    const tempFilename = `share_${lotNumber}_${timestamp}_${index}.jpg`;
    const tempPath = path.join(TEMP_DIR, tempFilename);
    
    // Source file path
    const sourcePath = path.join(__dirname, '..', image.file_path);
    
    // Copy file to temp directory
    await fs.copyFile(sourcePath, tempPath);
    
    logger.info(`Image copied to temp: ${tempFilename}`);
    
    // Return paths
    res.json({
      success: true,
      imageId: imageId,
      tempPath: tempPath,
      tempUrl: `/temp/share/${tempFilename}`,
      fullPath: path.resolve(tempPath),
      filename: tempFilename,
      originalPath: sourcePath
    });
    
  } catch (error) {
    logger.error('Error preparing image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to prepare image',
      error: error.message
    });
  }
});

// Send images via bot to user's chat
router.post('/share/send-via-bot', async (req, res) => {
  try {
    const { userId, images, lotNumber, imageDate } = req.body;
    
    logger.info(`Bot share request - Images: ${images.length}, Lot: ${lotNumber}`);
    
    // Validate inputs
    if (!images || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images to share'
      });
    }
    
    // For no-auth mode, we'll create a share link that triggers bot to send images
    const shareToken = uuidv4();
    const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
    
    // Store share session temporarily
    global.pendingShares = global.pendingShares || {};
    global.pendingShares[shareToken] = {
      images: images,
      lotNumber: lotNumber,
      imageDate: imageDate,
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes
    };
    
    // Create LINE deep link to trigger bot
    const botCommand = `#getshare ${shareToken}`;
    const lineDeepLink = `https://line.me/R/oaMessage/@YOUR_BOT_ID/?${encodeURIComponent(botCommand)}`;
    
    // Return share info
    res.json({
      success: true,
      message: 'พร้อมรับรูปภาพแล้ว',
      shareToken: shareToken,
      botCommand: botCommand,
      lineDeepLink: lineDeepLink,
      instruction: `คัดลอกคำสั่งนี้ไปส่งให้บอท: ${botCommand}`,
      expiresIn: '30 นาที'
    });
    
  } catch (error) {
    logger.error('Error creating bot share:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create share session',
      error: error.message
    });
  }
});

// Get share session by token (called by bot)
router.get('/share/session/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Check if share exists
    const shareSession = global.pendingShares && global.pendingShares[token];
    
    if (!shareSession) {
      return res.status(404).json({
        success: false,
        message: 'Share session not found or expired'
      });
    }
    
    // Check if expired
    if (Date.now() > shareSession.expiresAt) {
      delete global.pendingShares[token];
      return res.status(404).json({
        success: false,
        message: 'Share session expired'
      });
    }
    
    res.json({
      success: true,
      ...shareSession
    });
    
  } catch (error) {
    logger.error('Error getting share session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get share session'
    });
  }
});

// Process share command from bot
router.post('/share/process-command', async (req, res) => {
  try {
    const { userId, token, chatId, chatType } = req.body;
    
    logger.info(`Processing share command - User: ${userId}, Token: ${token}`);
    
    // Get share session
    const shareSession = global.pendingShares && global.pendingShares[token];
    
    if (!shareSession) {
      return res.json({
        success: false,
        message: 'ไม่พบรูปภาพที่ต้องการแชร์ หรือลิงก์หมดอายุแล้ว'
      });
    }
    
    // Check expiry
    if (Date.now() > shareSession.expiresAt) {
      delete global.pendingShares[token];
      return res.json({
        success: false,
        message: 'ลิงก์แชร์หมดอายุแล้ว กรุณาสร้างใหม่'
      });
    }
    
    const { images, lotNumber, imageDate } = shareSession;
    
    // Prepare messages
    const messages = [];
    
    // Header message
    messages.push({
      type: 'text',
      text: `📸 รูปภาพ QC\n📦 Lot: ${lotNumber}\n📅 ${new Date(imageDate).toLocaleDateString('th-TH')}\n🖼️ จำนวน ${images.length} รูป`
    });
    
    // Send images
    const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
    let sentCount = 0;
    
    for (let i = 0; i < images.length; i += 4) {
      const batch = images.slice(i, i + 4);
      const batchMessages = [];
      
      for (const image of batch) {
        const imageUrl = image.url.startsWith('http') ? image.url : `${baseUrl}${image.url}`;
        
        batchMessages.push({
          type: 'image',
          originalContentUrl: imageUrl,
          previewImageUrl: imageUrl
        });
        
        sentCount++;
      }
      
      // Send batch
      try {
        await lineService.pushMessage(userId, batchMessages);
        
        // Delay between batches
        if (i + 4 < images.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        logger.error('Error sending batch:', error);
      }
    }
    
    // Completion message
    if (sentCount > 0) {
      await lineService.pushMessage(userId, {
        type: 'text',
        text: `✅ ส่งรูปภาพทั้งหมด ${sentCount} รูป เรียบร้อยแล้ว`
      });
    }
    
    // Delete used token
    delete global.pendingShares[token];
    
    res.json({
      success: true,
      message: `ส่งรูปภาพ ${sentCount} รูป เรียบร้อยแล้ว`,
      count: sentCount
    });
    
  } catch (error) {
    logger.error('Error processing share command:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send images',
      error: error.message
    });
  }
});

// Cleanup expired sessions
router.post('/share/cleanup', async (req, res) => {
  try {
    // Clean temp files
    const files = await fs.readdir(TEMP_DIR);
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    let cleaned = 0;
    
    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtimeMs > maxAge) {
        await fs.unlink(filePath);
        cleaned++;
        logger.info(`Cleaned old temp file: ${file}`);
      }
    }
    
    // Clean expired share sessions
    let sessionsCleared = 0;
    if (global.pendingShares) {
      for (const [token, session] of Object.entries(global.pendingShares)) {
        if (now > session.expiresAt) {
          delete global.pendingShares[token];
          sessionsCleared++;
        }
      }
    }
    
    res.json({
      success: true,
      message: `Cleaned ${cleaned} files and ${sessionsCleared} sessions`
    });
    
  } catch (error) {
    logger.error('Error cleaning temp files:', error);
    res.status(500).json({
      success: false,
      message: 'Cleanup failed'
    });
  }
});

// Cleanup temp files helper
async function cleanupTempFiles(images) {
  for (const image of images) {
    if (image.tempPath) {
      try {
        await fs.unlink(image.tempPath);
        logger.info(`Cleaned up temp file: ${image.filename}`);
      } catch (error) {
        logger.warn(`Could not clean up temp file: ${image.filename}`, error);
      }
    }
  }
}

module.exports = router;