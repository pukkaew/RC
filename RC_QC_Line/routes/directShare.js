// Direct Share API - Send images directly to chat without authentication
// Path: RC_QC_Line/routes/directShare.js

const express = require('express');
const router = express.Router();
const lineService = require('../services/LineService');
const imageService = require('../services/ImageService');
const logger = require('../utils/Logger');
const { v4: uuidv4 } = require('uuid');

// Store share sessions temporarily
const shareSessions = new Map();

// Create share session for direct sharing
router.post('/direct-share/create', async (req, res) => {
  try {
    const { lotNumber, imageDate, imageIds, shareType = 'all' } = req.body;
    
    logger.info(`Creating direct share session - Lot: ${lotNumber}, Type: ${shareType}`);
    
    // Validate inputs
    if (!lotNumber || !imageDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
    // Get images
    const result = await imageService.getImagesByLotAndDate(lotNumber, imageDate);
    
    if (!result.images || result.images.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No images found'
      });
    }
    
    // Filter selected images if imageIds provided
    let imagesToShare = result.images;
    if (imageIds && imageIds.length > 0) {
      imagesToShare = result.images.filter(img => imageIds.includes(img.image_id));
    }
    
    // Create session
    const sessionId = uuidv4();
    const shareSession = {
      id: sessionId,
      lotNumber: lotNumber,
      imageDate: imageDate,
      images: imagesToShare,
      shareType: shareType,
      createdAt: new Date(),
      status: 'pending'
    };
    
    shareSessions.set(sessionId, shareSession);
    
    // Auto cleanup after 10 minutes
    setTimeout(() => {
      shareSessions.delete(sessionId);
      logger.info(`Cleaned up share session: ${sessionId}`);
    }, 10 * 60 * 1000);
    
    // Generate share URL
    const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
    const shareUrl = `${baseUrl}/direct-share/${sessionId}`;
    
    res.json({
      success: true,
      sessionId: sessionId,
      shareUrl: shareUrl,
      imageCount: imagesToShare.length,
      expiresIn: '10 minutes'
    });
    
  } catch (error) {
    logger.error('Error creating direct share session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create share session',
      error: error.message
    });
  }
});

// Get share session info
router.get('/direct-share/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = shareSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Share session not found or expired'
      });
    }
    
    res.json({
      success: true,
      session: {
        lotNumber: session.lotNumber,
        imageDate: session.imageDate,
        imageCount: session.images.length,
        status: session.status,
        createdAt: session.createdAt
      }
    });
    
  } catch (error) {
    logger.error('Error getting share session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get share session'
    });
  }
});

// Process share - send images to LINE chat
router.post('/direct-share/:sessionId/send', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { targetUserId, targetChatId, chatType = 'user' } = req.body;
    
    logger.info(`Processing direct share - Session: ${sessionId}, Target: ${targetUserId || targetChatId}`);
    
    const session = shareSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Share session not found or expired'
      });
    }
    
    // Mark session as processing
    session.status = 'processing';
    
    // Prepare messages
    const messages = [];
    const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
    
    // Header message
    messages.push({
      type: 'text',
      text: `📸 รูปภาพ QC\n📦 Lot: ${session.lotNumber}\n📅 ${new Date(session.imageDate).toLocaleDateString('th-TH')}\n🖼️ จำนวน ${session.images.length} รูป\n\n💡 Forward รูปเหล่านี้ไปยังห้องแชทอื่นได้`
    });
    
    // Send images in batches (max 5 per message)
    let sentCount = 0;
    const targetId = targetUserId || targetChatId;
    
    try {
      for (let i = 0; i < session.images.length; i += 5) {
        const batch = session.images.slice(i, i + 5);
        const batchMessages = batch.map(image => ({
          type: 'image',
          originalContentUrl: image.url.startsWith('http') ? image.url : `${baseUrl}${image.url}`,
          previewImageUrl: image.url.startsWith('http') ? image.url : `${baseUrl}${image.url}`
        }));
        
        // Send batch based on chat type
        if (chatType === 'group' && targetChatId) {
          await lineService.pushMessageToChat(targetChatId, batchMessages, 'group');
        } else if (chatType === 'room' && targetChatId) {
          await lineService.pushMessageToChat(targetChatId, batchMessages, 'room');
        } else if (targetUserId) {
          await lineService.pushMessage(targetUserId, batchMessages);
        }
        
        sentCount += batch.length;
        
        // Small delay between batches
        if (i + 5 < session.images.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Send completion message if more than 5 images
      if (session.images.length > 5) {
        const completionMsg = {
          type: 'text',
          text: `✅ ส่งรูปภาพทั้งหมด ${session.images.length} รูป เรียบร้อยแล้ว\n\n📌 คุณสามารถ:\n• กดค้างที่รูป → Forward ไปห้องอื่น\n• กดที่รูปเพื่อดูขนาดเต็ม\n• บันทึกรูปลงเครื่อง`
        };
        
        if (chatType === 'group' && targetChatId) {
          await lineService.pushMessageToChat(targetChatId, completionMsg, 'group');
        } else if (chatType === 'room' && targetChatId) {
          await lineService.pushMessageToChat(targetChatId, completionMsg, 'room');
        } else if (targetUserId) {
          await lineService.pushMessage(targetUserId, completionMsg);
        }
      }
      
      // Update session status
      session.status = 'completed';
      session.completedAt = new Date();
      session.sentTo = targetId;
      session.sentCount = sentCount;
      
      logger.info(`Direct share completed - Sent ${sentCount} images to ${targetId}`);
      
      res.json({
        success: true,
        message: `ส่งรูปภาพ ${sentCount} รูป เรียบร้อยแล้ว`,
        count: sentCount,
        targetId: targetId,
        chatType: chatType
      });
      
    } catch (sendError) {
      logger.error('Error sending images:', sendError);
      session.status = 'failed';
      session.error = sendError.message;
      
      res.status(500).json({
        success: false,
        message: 'Failed to send images',
        error: sendError.message,
        sentCount: sentCount
      });
    }
    
  } catch (error) {
    logger.error('Error processing direct share:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process share',
      error: error.message
    });
  }
});

// Create shareable Flex Message
router.post('/direct-share/create-message', async (req, res) => {
  try {
    const { lotNumber, imageDate, imageIds, previewImages = [] } = req.body;
    
    logger.info(`Creating share message - Lot: ${lotNumber}`);
    
    // Build share URL
    const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
    const params = new URLSearchParams({
      lot: lotNumber,
      date: imageDate
    });
    
    if (imageIds && imageIds.length > 0) {
      params.append('imageIds', imageIds.join(','));
    }
    
    const shareUrl = `${baseUrl}/liff/view.html?${params.toString()}`;
    
    // Create Flex Message
    const flexMessage = {
      type: 'flex',
      altText: `📸 แชร์รูปภาพ QC - Lot: ${lotNumber}`,
      contents: {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📸 แชร์รูปภาพ QC',
              size: 'xl',
              weight: 'bold',
              color: '#00B900'
            }
          ],
          paddingAll: '15px',
          backgroundColor: '#F0FFF0'
        },
        hero: previewImages.length > 0 ? {
          type: 'image',
          url: previewImages[0],
          size: 'full',
          aspectRatio: '16:9',
          aspectMode: 'cover'
        } : undefined,
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '📦 Lot:',
                  size: 'md',
                  color: '#666666',
                  flex: 0
                },
                {
                  type: 'text',
                  text: lotNumber,
                  size: 'md',
                  weight: 'bold',
                  color: '#333333',
                  margin: 'sm'
                }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '📅 วันที่:',
                  size: 'md',
                  color: '#666666',
                  flex: 0
                },
                {
                  type: 'text',
                  text: new Date(imageDate).toLocaleDateString('th-TH'),
                  size: 'md',
                  weight: 'bold',
                  color: '#333333',
                  margin: 'sm'
                }
              ],
              margin: 'sm'
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '🖼️ จำนวน:',
                  size: 'md',
                  color: '#666666',
                  flex: 0
                },
                {
                  type: 'text',
                  text: `${imageIds ? imageIds.length : 'ทั้งหมด'} รูป`,
                  size: 'md',
                  weight: 'bold',
                  color: '#00B900',
                  margin: 'sm'
                }
              ],
              margin: 'sm'
            },
            {
              type: 'separator',
              margin: 'lg'
            },
            {
              type: 'text',
              text: '💡 กดปุ่มด้านล่างเพื่อดูและรับรูปภาพ',
              size: 'sm',
              color: '#999999',
              margin: 'lg',
              wrap: true
            }
          ],
          paddingAll: '20px'
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'md',
              action: {
                type: 'uri',
                label: '📥 ดูและรับรูปภาพ',
                uri: shareUrl
              },
              color: '#00B900'
            },
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: {
                type: 'message',
                label: '📋 คัดลอกลิงก์',
                text: shareUrl
              }
            }
          ],
          paddingAll: '15px'
        }
      }
    };
    
    res.json({
      success: true,
      message: flexMessage,
      shareUrl: shareUrl
    });
    
  } catch (error) {
    logger.error('Error creating share message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create share message',
      error: error.message
    });
  }
});

// Get available chats/groups for user
router.get('/direct-share/chats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // In a real implementation, this would fetch actual user's groups/rooms
    // For now, return a message explaining how to share
    const instructions = {
      success: true,
      message: 'วิธีแชร์รูปภาพไปยังห้องแชทอื่น',
      instructions: [
        '1. Bot จะส่งรูปภาพมาให้คุณในแชทนี้',
        '2. กดค้างที่รูปภาพที่ต้องการแชร์',
        '3. เลือก "Forward" หรือ "ส่งต่อ"',
        '4. เลือกห้องแชทที่ต้องการส่ง',
        '5. กด "ส่ง" เพื่อแชร์รูปภาพ'
      ],
      tips: [
        '💡 สามารถเลือกส่งหลายรูปพร้อมกันได้',
        '💡 รูปภาพจะถูกส่งในคุณภาพเต็ม',
        '💡 ผู้รับสามารถบันทึกรูปได้'
      ]
    };
    
    res.json(instructions);
    
  } catch (error) {
    logger.error('Error getting user chats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat information'
    });
  }
});

// Generate shareable link for images
router.post('/direct-share/generate-link', async (req, res) => {
  try {
    const { lotNumber, imageDate, imageIds } = req.body;
    
    logger.info(`Generating shareable link - Lot: ${lotNumber}`);
    
    // Get images to generate preview
    const result = await imageService.getImagesByLotAndDate(lotNumber, imageDate);
    
    if (!result.images || result.images.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No images found'
      });
    }
    
    // Filter selected images
    let selectedImages = result.images;
    if (imageIds && imageIds.length > 0) {
      selectedImages = result.images.filter(img => imageIds.includes(img.image_id));
    }
    
    // Generate links
    const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
    const imageLinks = selectedImages.map((img, index) => ({
      index: index + 1,
      url: img.url.startsWith('http') ? img.url : `${baseUrl}${img.url}`,
      filename: `QC_${lotNumber}_${index + 1}.jpg`
    }));
    
    // Create shareable text
    const shareText = `📸 รูปภาพ QC
📦 Lot: ${lotNumber}
📅 ${new Date(imageDate).toLocaleDateString('th-TH')}
🖼️ จำนวน ${selectedImages.length} รูป

🔗 ลิงก์รูปภาพ:
${imageLinks.map(link => `${link.index}. ${link.url}`).join('\n')}

💡 คัดลอกลิงก์ด้านบนไปแชร์ได้เลย`;
    
    res.json({
      success: true,
      shareText: shareText,
      links: imageLinks,
      count: selectedImages.length
    });
    
  } catch (error) {
    logger.error('Error generating shareable link:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate link',
      error: error.message
    });
  }
});

// Cleanup expired sessions
router.post('/direct-share/cleanup', async (req, res) => {
  try {
    const now = new Date();
    let cleaned = 0;
    
    for (const [sessionId, session] of shareSessions.entries()) {
      const age = now - session.createdAt;
      if (age > 10 * 60 * 1000) { // 10 minutes
        shareSessions.delete(sessionId);
        cleaned++;
        logger.info(`Cleaned up expired session: ${sessionId}`);
      }
    }
    
    res.json({
      success: true,
      message: `Cleaned ${cleaned} expired sessions`,
      activeSessions: shareSessions.size
    });
    
  } catch (error) {
    logger.error('Error cleaning up sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Cleanup failed'
    });
  }
});

module.exports = router;