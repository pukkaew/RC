// SimpleCardShareService.js
// Service for simple card sharing without downloads
const line = require('@line/bot-sdk');
const logger = require('../utils/Logger');
const { v4: uuidv4 } = require('uuid');
const imageService = require('./ImageService');

class SimpleCardShareService {
  constructor() {
    this.client = new line.Client({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
    });
    
    // Store share sessions
    this.shareSessions = new Map();
  }

  // Create simple share session
  async createSimpleShareSession(userId, lotNumber, imageDate, selectedImageIds = null) {
    try {
      const sessionId = uuidv4();
      
      // Get images
      const result = await imageService.getImagesByLotAndDate(lotNumber, imageDate);
      
      if (!result.images || result.images.length === 0) {
        throw new Error('No images found');
      }
      
      // Filter selected images if provided
      let imagesToShare = result.images;
      if (selectedImageIds && selectedImageIds.length > 0) {
        imagesToShare = result.images.filter(img => 
          selectedImageIds.includes(img.image_id)
        );
      }
      
      const session = {
        id: sessionId,
        userId: userId,
        lotNumber: lotNumber,
        imageDate: imageDate,
        images: imagesToShare,
        createdAt: new Date(),
        type: 'simple_share'
      };
      
      this.shareSessions.set(sessionId, session);
      
      // Auto cleanup after 24 hours
      setTimeout(() => {
        this.shareSessions.delete(sessionId);
      }, 24 * 60 * 60 * 1000);
      
      logger.info(`Created simple share session: ${sessionId}`);
      
      return {
        sessionId: sessionId,
        imageCount: imagesToShare.length
      };
      
    } catch (error) {
      logger.error('Error creating simple share session:', error);
      throw error;
    }
  }

  // Create shareable flex card
  createShareableFlexCard(session) {
    const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
    const formattedDate = new Date(session.imageDate).toLocaleDateString('th-TH');
    
    // Get preview images (max 4)
    const previewImages = session.images.slice(0, 4);
    const remainingCount = Math.max(0, session.images.length - 4);
    
    // Create grid layout for preview
    const imageGrid = this.createImageGrid(previewImages, baseUrl);
    
    return {
      type: "flex",
      altText: `📸 รูปภาพ QC - Lot: ${session.lotNumber}`,
      contents: {
        type: "bubble",
        size: "mega",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "📸 รูปภาพ QC",
              size: "xl",
              weight: "bold",
              color: "#00B900"
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: `📦 Lot: ${session.lotNumber}`,
                  size: "sm",
                  color: "#666666",
                  flex: 1
                },
                {
                  type: "text",
                  text: `📅 ${formattedDate}`,
                  size: "sm",
                  color: "#666666",
                  align: "end"
                }
              ],
              margin: "sm"
            },
            {
              type: "text",
              text: `🖼️ ${session.images.length} รูป`,
              size: "lg",
              weight: "bold",
              color: "#333333",
              margin: "xs"
            }
          ],
          paddingAll: "15px",
          backgroundColor: "#F8FFF8"
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            imageGrid,
            remainingCount > 0 ? {
              type: "text",
              text: `+ อีก ${remainingCount} รูป`,
              size: "sm",
              color: "#999999",
              align: "center",
              margin: "md"
            } : null
          ].filter(Boolean),
          paddingAll: "10px",
          backgroundColor: "#FFFFFF"
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "button",
              style: "primary",
              height: "md",
              action: {
                type: "postback",
                label: "📥 รับรูปภาพทั้งหมด",
                data: `action=receive_images&session=${session.id}`,
                displayText: "ขอรับรูปภาพ"
              },
              color: "#00B900"
            },
            {
              type: "box",
              layout: "horizontal",
              spacing: "sm",
              contents: [
                {
                  type: "button",
                  style: "secondary",
                  height: "sm",
                  action: {
                    type: "uri",
                    label: "🔍 ดูออนไลน์",
                    uri: `https://liff.line.me/2007575196-NWaXrZVE?lot=${encodeURIComponent(session.lotNumber)}&date=${encodeURIComponent(session.imageDate)}`
                  },
                  flex: 1
                },
                {
                  type: "button",
                  style: "secondary",
                  height: "sm",
                  action: {
                    type: "postback",
                    label: "📋 คัดลอกข้อมูล",
                    data: `action=copy_info&session=${session.id}`,
                    displayText: "คัดลอกข้อมูล"
                  },
                  flex: 1
                }
              ],
              margin: "sm"
            },
            {
              type: "separator",
              margin: "md"
            },
            {
              type: "text",
              text: "💡 ส่งต่อการ์ดนี้ให้เพื่อนได้",
              size: "xs",
              color: "#999999",
              align: "center",
              margin: "sm"
            }
          ],
          paddingAll: "15px"
        }
      }
    };
  }

  // Create image grid for preview
  createImageGrid(images, baseUrl) {
    if (images.length === 0) {
      return {
        type: "box",
        layout: "vertical",
        contents: []
      };
    }
    
    // Create 2x2 grid
    const gridImages = images.map(img => ({
      type: "image",
      url: img.url.startsWith('http') ? img.url : `${baseUrl}${img.url}`,
      aspectMode: "cover",
      aspectRatio: "1:1",
      size: "full"
    }));
    
    // Fill empty slots
    while (gridImages.length < 4) {
      gridImages.push({
        type: "box",
        layout: "vertical",
        contents: [],
        backgroundColor: "#F5F5F5"
      });
    }
    
    return {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: gridImages.slice(0, 2),
          spacing: "sm"
        },
        {
          type: "box",
          layout: "horizontal",
          contents: gridImages.slice(2, 4),
          spacing: "sm",
          margin: "sm"
        }
      ],
      backgroundColor: "#FFFFFF",
      cornerRadius: "8px",
      paddingAll: "5px"
    };
  }

  // Handle receive images request
  async handleReceiveImages(sessionId, userId, replyToken) {
    try {
      const session = this.shareSessions.get(sessionId);
      
      if (!session) {
        await this.client.replyMessage(replyToken, {
          type: 'text',
          text: '❌ ลิงก์หมดอายุหรือไม่ถูกต้อง'
        });
        return;
      }
      
      // Prepare messages
      const messages = [];
      
      // Header
      messages.push({
        type: 'text',
        text: `📸 รูปภาพ QC\n📦 Lot: ${session.lotNumber}\n📅 ${new Date(session.imageDate).toLocaleDateString('th-TH')}\n🖼️ จำนวน ${session.images.length} รูป`
      });
      
      // Send images (max 5 per reply due to LINE limitation)
      const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
      const firstBatch = session.images.slice(0, 4).map(img => ({
        type: 'image',
        originalContentUrl: img.url.startsWith('http') ? img.url : `${baseUrl}${img.url}`,
        previewImageUrl: img.url.startsWith('http') ? img.url : `${baseUrl}${img.url}`
      }));
      
      messages.push(...firstBatch);
      
      // Reply first batch
      await this.client.replyMessage(replyToken, messages);
      
      // Send remaining images via push
      if (session.images.length > 4) {
        for (let i = 4; i < session.images.length; i += 5) {
          const batch = session.images.slice(i, i + 5).map(img => ({
            type: 'image',
            originalContentUrl: img.url.startsWith('http') ? img.url : `${baseUrl}${img.url}`,
            previewImageUrl: img.url.startsWith('http') ? img.url : `${baseUrl}${img.url}`
          }));
          
          await this.client.pushMessage(userId, batch);
          
          // Small delay between batches
          if (i + 5 < session.images.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        // Send completion message
        await this.client.pushMessage(userId, {
          type: 'text',
          text: `✅ ส่งรูปภาพทั้งหมด ${session.images.length} รูป เรียบร้อยแล้ว`
        });
      }
      
    } catch (error) {
      logger.error('Error handling receive images:', error);
      
      if (replyToken) {
        await this.client.replyMessage(replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาดในการส่งรูปภาพ'
        });
      }
    }
  }

  // Handle copy info request
  async handleCopyInfo(sessionId, userId, replyToken) {
    try {
      const session = this.shareSessions.get(sessionId);
      
      if (!session) {
        await this.client.replyMessage(replyToken, {
          type: 'text',
          text: '❌ ไม่พบข้อมูล'
        });
        return;
      }
      
      const infoText = `📸 รูปภาพ QC
📦 Lot: ${session.lotNumber}
📅 วันที่: ${new Date(session.imageDate).toLocaleDateString('th-TH')}
🖼️ จำนวน: ${session.images.length} รูป

🔗 ดูออนไลน์:
https://liff.line.me/2007575196-NWaXrZVE?lot=${encodeURIComponent(session.lotNumber)}&date=${encodeURIComponent(session.imageDate)}`;
      
      await this.client.replyMessage(replyToken, [
        {
          type: 'text',
          text: '✅ คัดลอกข้อความด้านล่างได้เลย'
        },
        {
          type: 'text',
          text: infoText
        }
      ]);
      
    } catch (error) {
      logger.error('Error handling copy info:', error);
      
      if (replyToken) {
        await this.client.replyMessage(replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาด'
        });
      }
    }
  }

  // Get session
  getSession(sessionId) {
    return this.shareSessions.get(sessionId);
  }

  // Clean expired sessions
  cleanExpiredSessions() {
    const now = Date.now();
    const expireTime = 24 * 60 * 60 * 1000; // 24 hours
    let cleaned = 0;
    
    for (const [sessionId, session] of this.shareSessions.entries()) {
      if (now - session.createdAt.getTime() > expireTime) {
        this.shareSessions.delete(sessionId);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

module.exports = new SimpleCardShareService();