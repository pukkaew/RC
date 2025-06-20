// Enhanced Share API routes for better image sharing
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

// Create share session with images
router.post('/share/create-session', async (req, res) => {
  try {
    const { userId, lotNumber, imageDate, imageIds } = req.body;
    
    logger.info(`Creating share session - User: ${userId}, Lot: ${lotNumber}, Images: ${imageIds?.length || 'all'}`);
    
    // Get images
    const result = await imageService.getImagesByLotAndDate(lotNumber, imageDate);
    
    if (!result.images || result.images.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No images found'
      });
    }
    
    // Filter selected images if provided
    let imagesToShare = result.images;
    if (imageIds && imageIds.length > 0) {
      imagesToShare = result.images.filter(img => imageIds.includes(img.image_id));
    }
    
    // Create session ID
    const sessionId = uuidv4();
    
    // Create shareable view page URL
    const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
    const viewPageUrl = `${baseUrl}/view?lot=${encodeURIComponent(lotNumber)}&date=${encodeURIComponent(imageDate)}`;
    
    // Create share message with view page link
    const shareMessage = `📸 รูปภาพ QC
📦 Lot: ${lotNumber}
📅 ${new Date(imageDate).toLocaleDateString('th-TH')}
🖼️ จำนวน ${imagesToShare.length} รูป

🔗 คลิกเพื่อดูและดาวน์โหลด:
${viewPageUrl}`;
    
    res.json({
      success: true,
      sessionId: sessionId,
      viewPageUrl: viewPageUrl,
      shareMessage: shareMessage,
      imageCount: imagesToShare.length,
      images: imagesToShare.map(img => ({
        id: img.image_id,
        url: img.url.startsWith('http') ? img.url : `${baseUrl}${img.url}`,
        filename: `QC_${lotNumber}_${img.image_id}.jpg`
      }))
    });
    
  } catch (error) {
    logger.error('Error creating share session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create share session',
      error: error.message
    });
  }
});

// Bot share - send actual images to LINE chat
router.post('/share/send-images', async (req, res) => {
  try {
    const { userId, lotNumber, imageDate, imageIds, targetChatId } = req.body;
    
    logger.info(`Sending images to chat - User: ${userId}, Lot: ${lotNumber}`);
    
    // Get images
    const result = await imageService.getImagesByLotAndDate(lotNumber, imageDate);
    
    if (!result.images || result.images.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No images found'
      });
    }
    
    // Filter selected images if provided
    let imagesToSend = result.images;
    if (imageIds && imageIds.length > 0) {
      imagesToSend = result.images.filter(img => imageIds.includes(img.image_id));
    }
    
    // Prepare messages
    const messages = [];
    const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
    
    // Header message
    messages.push({
      type: 'text',
      text: `📸 รูปภาพ QC
📦 Lot: ${lotNumber}
📅 ${new Date(imageDate).toLocaleDateString('th-TH')}
🖼️ จำนวน ${imagesToSend.length} รูป

💡 กดค้างที่รูปเพื่อ Forward ไปยังห้องแชทอื่น`
    });
    
    // Send images in batches (max 5 per message)
    let sentCount = 0;
    const targetId = targetChatId || userId;
    
    for (let i = 0; i < imagesToSend.length; i += 5) {
      const batch = imagesToSend.slice(i, i + 5);
      const batchMessages = batch.map(image => ({
        type: 'image',
        originalContentUrl: image.url.startsWith('http') ? image.url : `${baseUrl}${image.url}`,
        previewImageUrl: image.url.startsWith('http') ? image.url : `${baseUrl}${image.url}`
      }));
      
      try {
        await lineService.pushMessage(targetId, batchMessages);
        sentCount += batch.length;
        
        // Small delay between batches
        if (i + 5 < imagesToSend.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (sendError) {
        logger.error(`Error sending batch:`, sendError);
      }
    }
    
    // Send completion message
    if (imagesToSend.length > 5) {
      await lineService.pushMessage(targetId, {
        type: 'text',
        text: `✅ ส่งรูปภาพทั้งหมด ${sentCount} รูป เรียบร้อยแล้ว

📌 คุณสามารถ:
• กดค้างที่รูป → Forward ไปห้องอื่น
• กดที่รูปเพื่อดูขนาดเต็ม
• บันทึกรูปลงเครื่อง`
      });
    }
    
    res.json({
      success: true,
      message: `ส่งรูปภาพ ${sentCount} รูป เรียบร้อยแล้ว`,
      count: sentCount
    });
    
  } catch (error) {
    logger.error('Error sending images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send images',
      error: error.message
    });
  }
});

// Create image collage for preview
router.post('/share/create-collage', async (req, res) => {
  try {
    const { images, lotNumber } = req.body;
    
    if (!images || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided'
      });
    }
    
    // For now, return the first image as preview
    // In a real implementation, you could use Sharp to create a collage
    const previewUrl = images[0].url;
    
    res.json({
      success: true,
      previewUrl: previewUrl,
      message: `Preview for ${images.length} images`
    });
    
  } catch (error) {
    logger.error('Error creating collage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create collage'
    });
  }
});

// Cleanup old temp files
router.post('/share/cleanup', async (req, res) => {
  try {
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
    
    res.json({
      success: true,
      message: `Cleaned ${cleaned} old temp files`
    });
    
  } catch (error) {
    logger.error('Error cleaning temp files:', error);
    res.status(500).json({
      success: false,
      message: 'Cleanup failed'
    });
  }
});

module.exports = router;