// Service for sharing Flex Message cards to different chats
const line = require('@line/bot-sdk');
const logger = require('../utils/Logger');
const { v4: uuidv4 } = require('uuid');
const imageService = require('./ImageService');

class FlexShareService {
  constructor() {
    this.client = new line.Client({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
    });
    
    // Store share sessions
    this.shareSessions = new Map();
  }

  // Create share session with card data
  async createCardShareSession(userId, lotNumber, imageDate, selectedImageIds = null) {
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
        type: 'flex_card'
      };
      
      this.shareSessions.set(sessionId, session);
      
      // Auto cleanup after 10 minutes
      setTimeout(() => {
        this.shareSessions.delete(sessionId);
      }, 10 * 60 * 1000);
      
      logger.info(`Created flex card share session: ${sessionId}`);
      
      return {
        sessionId: sessionId,
        imageCount: imagesToShare.length
      };
      
    } catch (error) {
      logger.error('Error creating card share session:', error);
      throw error;
    }
  }

  // Get available chats for user
  async getUserChats(userId) {
    try {
      // In real implementation, you would fetch user's groups/rooms from LINE
      // For now, return a structured list
      
      return [
        {
          id: userId,
          name: 'ส่งให้ตัวเอง',
          type: 'user',
          icon: '👤'
        }
        // Groups and rooms would be added here if LINE API supported listing them
      ];
      
    } catch (error) {
      logger.error('Error getting user chats:', error);
      throw error;
    }
  }

  // Create flex message card
  createFlexCard(session) {
    const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
    const formattedDate = new Date(session.imageDate).toLocaleDateString('th-TH');
    
    // Limit preview images to 2 for the card
    const previewImages = session.images.slice(0, 2);
    const remainingCount = Math.max(0, session.images.length - 2);
    
    return {
      type: "flex",
      altText: `อัลบั้มรูปภาพ QC - Lot: ${session.lotNumber}`,
      contents: {
        type: "bubble",
        size: "mega",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "📸 อัลบั้มรูปภาพ QC",
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
                  flex: 0
                },
                {
                  type: "text",
                  text: `📅 ${formattedDate}`,
                  size: "sm",
                  color: "#666666",
                  align: "end",
                  flex: 0
                }
              ],
              margin: "sm"
            }
          ],
          paddingAll: "15px",
          backgroundColor: "#F8FFF8"
        },
        hero: {
          type: "image",
          url: previewImages[0].url.startsWith('http') 
            ? previewImages[0].url 
            : `${baseUrl}${previewImages[0].url}`,
          size: "full",
          aspectRatio: "2:1",
          aspectMode: "cover"
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: `🖼️ ทั้งหมด ${session.images.length} รูป`,
              size: "lg",
              weight: "bold",
              color: "#333333"
            },
            previewImages.length > 1 ? {
              type: "box",
              layout: "horizontal",
              contents: previewImages.slice(1).map(img => ({
                type: "image",
                url: img.url.startsWith('http') 
                  ? img.url 
                  : `${baseUrl}${img.url}`,
                aspectMode: "cover",
                aspectRatio: "1:1",
                size: "60px",
                flex: 0
              })),
              margin: "md",
              spacing: "sm"
            } : null,
            remainingCount > 0 ? {
              type: "text",
              text: `...และอีก ${remainingCount} รูป`,
              size: "sm",
              color: "#999999",
              margin: "md"
            } : null
          ].filter(Boolean),
          paddingAll: "20px"
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
                type: "uri",
                label: "🔍 ดูรูปภาพทั้งหมด",
                uri: `https://liff.line.me/2007575196-NWaXrZVE?lot=${encodeURIComponent(session.lotNumber)}&date=${encodeURIComponent(session.imageDate)}`
              },
              color: "#00B900"
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "button",
                  style: "link",
                  height: "sm",
                  action: {
                    type: "uri",
                    label: "💾 ดาวน์โหลด",
                    uri: `${baseUrl}/api/share/${session.id}/download`
                  },
                  flex: 1
                },
                {
                  type: "separator",
                  margin: "sm"
                },
                {
                  type: "button",
                  style: "link",
                  height: "sm",
                  action: {
                    type: "uri",
                    label: "📤 แชร์ต่อ",
                    uri: `https://liff.line.me/2007575196-NWaXrZVE?page=reshare&session=${session.id}`
                  },
                  flex: 1
                }
              ],
              margin: "sm",
              spacing: "sm"
            }
          ],
          paddingAll: "15px"
        }
      }
    };
  }

  // Send card to specific chat
  async sendCardToChat(sessionId, targetChatId, targetType = 'user') {
    try {
      const session = this.shareSessions.get(sessionId);
      
      if (!session) {
        throw new Error('Session not found or expired');
      }
      
      // Create flex card
      const flexCard = this.createFlexCard(session);
      
      // Send to target
      await this.client.pushMessage(targetChatId, flexCard);
      
      logger.info(`Sent flex card to ${targetType}: ${targetChatId}`);
      
      return {
        success: true,
        targetId: targetChatId,
        targetType: targetType
      };
      
    } catch (error) {
      logger.error('Error sending card to chat:', error);
      throw error;
    }
  }

  // Create chat selector flex message
  createChatSelectorMessage(sessionId, availableChats) {
    const session = this.shareSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const chatButtons = availableChats.map(chat => ({
      type: "button",
      style: chat.type === 'user' ? "primary" : "secondary",
      action: {
        type: "postback",
        label: `${chat.icon} ${chat.name}`,
        data: `action=share_to_chat&session=${sessionId}&chat=${chat.id}&type=${chat.type}`,
        displayText: `แชร์ไปที่ ${chat.name}`
      },
      margin: "sm"
    }));
    
    return {
      type: "flex",
      altText: "เลือกห้องแชทที่จะแชร์",
      contents: {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "📤 เลือกห้องแชทที่จะแชร์",
              size: "lg",
              weight: "bold",
              color: "#00B900"
            }
          ],
          paddingAll: "15px"
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: `📦 Lot: ${session.lotNumber}`,
              size: "sm",
              color: "#666666"
            },
            {
              type: "text",
              text: `🖼️ จำนวน: ${session.images.length} รูป`,
              size: "sm",
              color: "#666666",
              margin: "xs"
            },
            {
              type: "separator",
              margin: "lg"
            },
            {
              type: "box",
              layout: "vertical",
              contents: chatButtons,
              margin: "lg",
              spacing: "sm"
            }
          ],
          paddingAll: "20px"
        }
      }
    };
  }

  // Get session
  getSession(sessionId) {
    return this.shareSessions.get(sessionId);
  }

  // Clean expired sessions
  cleanExpiredSessions() {
    const now = Date.now();
    const expireTime = 10 * 60 * 1000; // 10 minutes
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

module.exports = new FlexShareService();