// Routes for sharing images to selected chats
// Path: RC_QC_Line/routes/chatShare.js

const express = require('express');
const router = express.Router();
const lineService = require('../services/LineService');
const imageService = require('../services/ImageService');
const logger = require('../utils/Logger');

// Get user's available chats/groups (Mock for now)
router.get('/chats/available/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    logger.info(`Getting available chats for user: ${userId}`);
    
    // In reality, LINE doesn't provide an API to get user's groups
    // This is a mock response for demonstration
    const mockChats = [
      {
        id: 'personal',
        name: 'ส่งให้ตัวเอง',
        type: 'personal',
        icon: '👤',
        description: 'Bot จะส่งรูปภาพมาให้คุณ'
      }
    ];
    
    // If we have stored group IDs from previous interactions
    // we could return them here
    
    res.json({
      success: true,
      chats: mockChats,
      count: mockChats.length,
      note: 'สำหรับกลุ่ม ให้ใช้วิธี Forward รูปภาพแทน'
    });
    
  } catch (error) {
    logger.error('Error getting available chats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available chats'
    });
  }
});

// Send images to selected chat using share target picker
router.post('/chats/share-via-picker', async (req, res) => {
  try {
    const { userId, lotNumber, imageDate, imageIds } = req.body;
    
    logger.info(`Creating shareable message for picker - User: ${userId}, Lot: ${lotNumber}`);
    
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
    
    // Create flex message for sharing
    const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
    const shareMessage = createShareableFlexMessage(lotNumber, imageDate, imagesToShare, baseUrl);
    
    res.json({
      success: true,
      message: shareMessage,
      imageCount: imagesToShare.length,
      instruction: 'ใช้ LIFF shareTargetPicker เพื่อเลือกห้องแชท'
    });
    
  } catch (error) {
    logger.error('Error creating shareable message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create shareable message'
    });
  }
});

// Create interactive share message with action buttons
router.post('/chats/create-interactive-share', async (req, res) => {
  try {
    const { userId, lotNumber, imageDate, imageIds, targetChatId, targetChatType } = req.body;
    
    logger.info(`Creating interactive share - User: ${userId}, Target: ${targetChatId} (${targetChatType})`);
    
    // Get images
    const result = await imageService.getImagesByLotAndDate(lotNumber, imageDate);
    
    if (!result.images || result.images.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No images found'
      });
    }
    
    // Filter selected images
    let imagesToShare = result.images;
    if (imageIds && imageIds.length > 0) {
      imagesToShare = result.images.filter(img => imageIds.includes(img.image_id));
    }
    
    // Create session ID for tracking
    const sessionId = require('uuid').v4();
    
    // Store session temporarily (in production, use Redis or database)
    global.shareSessions = global.shareSessions || new Map();
    global.shareSessions.set(sessionId, {
      userId,
      lotNumber,
      imageDate,
      images: imagesToShare,
      targetChatId,
      targetChatType,
      createdAt: new Date()
    });
    
    // Auto cleanup after 10 minutes
    setTimeout(() => {
      global.shareSessions.delete(sessionId);
    }, 10 * 60 * 1000);
    
    // Create interactive message
    const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
    const interactiveMessage = createInteractiveShareMessage(
      sessionId,
      lotNumber,
      imageDate,
      imagesToShare,
      baseUrl
    );
    
    res.json({
      success: true,
      sessionId: sessionId,
      message: interactiveMessage,
      imageCount: imagesToShare.length
    });
    
  } catch (error) {
    logger.error('Error creating interactive share:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create interactive share'
    });
  }
});

// Process share action from interactive message
router.post('/chats/process-share/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { action, recipientId } = req.body;
    
    logger.info(`Processing share action - Session: ${sessionId}, Action: ${action}`);
    
    // Get session
    const session = global.shareSessions?.get(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Share session expired or not found'
      });
    }
    
    if (action === 'receive') {
      // Send images to the user who clicked receive
      const messages = [];
      const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
      
      // Header message
      messages.push({
        type: 'text',
        text: `📸 รูปภาพ QC\n📦 Lot: ${session.lotNumber}\n📅 ${new Date(session.imageDate).toLocaleDateString('th-TH')}\n🖼️ จำนวน ${session.images.length} รูป`
      });
      
      // Send images in batches
      for (let i = 0; i < session.images.length; i += 5) {
        const batch = session.images.slice(i, i + 5);
        const batchMessages = batch.map(image => ({
          type: 'image',
          originalContentUrl: image.url.startsWith('http') ? image.url : `${baseUrl}${image.url}`,
          previewImageUrl: image.url.startsWith('http') ? image.url : `${baseUrl}${image.url}`
        }));
        
        await lineService.pushMessage(recipientId, batchMessages);
        
        if (i + 5 < session.images.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Success message
      if (session.images.length > 5) {
        await lineService.pushMessage(recipientId, {
          type: 'text',
          text: `✅ ส่งรูปภาพทั้งหมด ${session.images.length} รูป เรียบร้อยแล้ว`
        });
      }
      
      res.json({
        success: true,
        message: `ส่งรูปภาพ ${session.images.length} รูป เรียบร้อยแล้ว`,
        count: session.images.length
      });
      
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid action'
      });
    }
    
  } catch (error) {
    logger.error('Error processing share action:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process share action'
    });
  }
});

// Helper function to create shareable flex message
function createShareableFlexMessage(lotNumber, imageDate, images, baseUrl) {
  const formattedDate = new Date(imageDate).toLocaleDateString('th-TH');
  
  // Get preview image
  const previewImage = images[0];
  const previewUrl = previewImage.url.startsWith('http') 
    ? previewImage.url 
    : `${baseUrl}${previewImage.url}`;
  
  return {
    type: 'flex',
    altText: `📸 แชร์รูปภาพ QC - Lot: ${lotNumber}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      hero: {
        type: 'image',
        url: previewUrl,
        size: 'full',
        aspectRatio: '16:9',
        aspectMode: 'cover'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📸 แชร์รูปภาพ QC',
            weight: 'bold',
            size: 'xl',
            color: '#00B900'
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
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
                    margin: 'sm',
                    flex: 0
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
                    text: formattedDate,
                    size: 'md',
                    weight: 'bold',
                    margin: 'sm',
                    flex: 0
                  }
                ]
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
                    text: `${images.length} รูป`,
                    size: 'md',
                    weight: 'bold',
                    color: '#00B900',
                    margin: 'sm',
                    flex: 0
                  }
                ]
              }
            ]
          },
          {
            type: 'separator',
            margin: 'xl'
          },
          {
            type: 'text',
            text: '💡 กดปุ่มด้านล่างเพื่อรับรูปภาพ',
            size: 'sm',
            color: '#999999',
            margin: 'lg',
            wrap: true
          }
        ]
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
              label: '📥 รับรูปภาพ',
              uri: `${baseUrl}/liff/view.html?lot=${encodeURIComponent(lotNumber)}&date=${encodeURIComponent(imageDate)}`
            },
            color: '#00B900'
          }
        ]
      }
    }
  };
}

// Helper function to create interactive share message
function createInteractiveShareMessage(sessionId, lotNumber, imageDate, images, baseUrl) {
  const formattedDate = new Date(imageDate).toLocaleDateString('th-TH');
  const shareUrl = `${baseUrl}/share-action/${sessionId}`;
  
  return {
    type: 'flex',
    altText: `📸 คุณได้รับการแชร์รูปภาพ QC - Lot: ${lotNumber}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📸 คุณได้รับการแชร์รูปภาพ',
            weight: 'bold',
            size: 'lg',
            color: '#00B900'
          }
        ],
        paddingAll: '15px',
        backgroundColor: '#F0FFF0'
      },
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
                text: formattedDate,
                size: 'md',
                weight: 'bold',
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
                text: `${images.length} รูป`,
                size: 'md',
                weight: 'bold',
                color: '#00B900',
                margin: 'sm'
              }
            ],
            margin: 'sm'
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
              type: 'postback',
              label: '📥 รับรูปภาพ',
              data: `action=receive_share&session=${sessionId}`,
              displayText: 'รับรูปภาพ'
            },
            color: '#00B900'
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'uri',
              label: '👁️ ดูก่อนรับ',
              uri: shareUrl
            }
          }
        ],
        paddingAll: '15px'
      }
    }
  };
}

module.exports = router;