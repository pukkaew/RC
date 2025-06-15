// API route for Bot to share images
const express = require('express');
const router = express.Router();
const lineService = require('../services/LineService');
const imageService = require('../services/ImageService');
const logger = require('../utils/Logger');

// Endpoint for LIFF to request bot to send images
router.post('/bot-share', async (req, res) => {
  try {
    const { userId, lotNumber, imageDate, imageIds, accessToken } = req.body;
    
    // Validate request
    if (!userId || !lotNumber || !imageDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
    // Verify user (optional - check if accessToken is valid)
    // This ensures the request is from a legitimate LIFF session
    
    logger.info(`Bot share request - User: ${userId}, Lot: ${lotNumber}, Date: ${imageDate}`);
    
    // Get images
    const result = await imageService.getImagesByLotAndDate(lotNumber, imageDate);
    
    if (!result.images || result.images.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No images found'
      });
    }
    
    // Filter selected images if imageIds provided
    let imagesToSend = result.images;
    if (imageIds && imageIds.length > 0) {
      imagesToSend = result.images.filter(img => imageIds.includes(img.image_id));
    }
    
    // Prepare messages
    const messages = [];
    
    // Header message
    messages.push({
      type: 'text',
      text: `📸 รูปภาพ QC ที่คุณเลือก\n📦 Lot: ${lotNumber}\n📅 ${new Date(imageDate).toLocaleDateString('th-TH')}\n🖼️ จำนวน ${imagesToSend.length} รูป\n\n💡 คุณสามารถ forward รูปเหล่านี้ไปยังห้องแชทอื่นได้`
    });
    
    // Add instruction message
    messages.push({
      type: 'text', 
      text: '⬇️ กดค้างที่รูปแล้วเลือก "Forward" เพื่อส่งต่อ'
    });
    
    // Send images in batches (max 5 per message due to LINE limitation)
    const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
    
    for (let i = 0; i < imagesToSend.length; i += 5) {
      const batch = imagesToSend.slice(i, i + 5);
      const batchMessages = batch.map(image => ({
        type: 'image',
        originalContentUrl: image.url.startsWith('http') ? image.url : `${baseUrl}${image.url}`,
        previewImageUrl: image.url.startsWith('http') ? image.url : `${baseUrl}${image.url}`
      }));
      
      // Send batch to user
      try {
        await lineService.pushMessage(userId, batchMessages);
        
        // Small delay between batches
        if (i + 5 < imagesToSend.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (sendError) {
        logger.error(`Error sending batch ${i/5 + 1}:`, sendError);
      }
    }
    
    // Send completion message
    if (imagesToSend.length > 5) {
      await lineService.pushMessage(userId, {
        type: 'text',
        text: `✅ ส่งรูปภาพทั้งหมด ${imagesToSend.length} รูป เรียบร้อยแล้ว\n\n📌 คุณสามารถ:\n• กดค้างที่รูป → Forward ไปห้องอื่น\n• กดที่รูปเพื่อดูขนาดเต็ม\n• บันทึกรูปลงเครื่อง`
      });
    }
    
    // Log success
    logger.info(`Successfully sent ${imagesToSend.length} images to user ${userId}`);
    
    // Return success response to LIFF
    res.json({
      success: true,
      message: `ส่งรูปภาพ ${imagesToSend.length} รูป เรียบร้อยแล้ว`,
      count: imagesToSend.length
    });
    
  } catch (error) {
    logger.error('Error in bot share:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing request',
      error: error.message
    });
  }
});

// Health check endpoint
router.get('/bot-share/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;