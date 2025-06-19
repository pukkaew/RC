// SimpleCardShareService.js
// Service for simple card sharing with chat selection
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
    
    // Mock chat list (ในระบบจริงต้องดึงจาก LINE API)
    this.mockChats = [
      {
        id: 'personal',
        name: 'ส่งให้ตัวเอง',
        type: 'user',
        icon: '👤'
      },
      {
        id: 'Cxxxxxxxxxxxxxx1',
        name: 'ทีม QC',
        type: 'group',
        icon: '👥'
      },
      {
        id: 'Cxxxxxxxxxxxxxx2',
        name: 'Production Team',
        type: 'group',
        icon: '👥'
      },
      {
        id: 'Cxxxxxxxxxxxxxx3',
        name: 'หัวหน้างาน',
        type: 'group',
        icon: '👥'
      },
      {
        id: 'Rxxxxxxxxxxxxxx1',
        name: 'ห้องประชุม QC',
        type: 'room',
        icon: '🏠'
      }
    ];
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
        imageCount: imagesToShare.length,
        session: session
      };
      
    } catch (error) {
      logger.error('Error creating simple share session:', error);
      throw error;
    }
  }

  // Create shareable flex card (same format for both original and shared)
  createShareableFlexCard(session, isForwarded = false) {
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
            } : null,
            isForwarded ? {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "separator",
                  margin: "md"
                },
                {
                  type: "text",
                  text: "📤 แชร์มาจากเพื่อน",
                  size: "xs",
                  color: "#00B900",
                  align: "center",
                  margin: "sm"
                }
              ]
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
                    label: "📤 แชร์ต่อ",
                    data: `action=forward_share&session=${session.id}`,
                    displayText: "แชร์ต่อ"
                  },
                  flex: 1
                }
              ],
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

  // Create chat selector
  createChatSelector(sessionId, userId) {
    // Get available chats (mock data)
    const availableChats = this.getAvailableChats(userId);
    
    // Create buttons for each chat
    const chatButtons = availableChats.map(chat => ({
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "text",
          text: chat.icon,
          size: "lg",
          flex: 0,
          margin: "none"
        },
        {
          type: "text",
          text: chat.name,
          size: "md",
          color: "#333333",
          margin: "md",
          flex: 1
        }
      ],
      action: {
        type: "postback",
        label: chat.name,
        data: `action=share_to_selected_chat&session=${sessionId}&chatId=${chat.id}&chatType=${chat.type}`,
        displayText: `แชร์ไปที่ ${chat.name}`
      },
      backgroundColor: "#F8F8F8",
      cornerRadius: "8px",
      paddingAll: "12px",
      margin: "sm"
    }));
    
    return {
      type: "flex",
      altText: "เลือกห้องแชทที่จะแชร์",
      contents: {
        type: "bubble",
        size: "mega",
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
          paddingAll: "15px",
          backgroundColor: "#F8FFF8"
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "เลือกห้องแชทที่ต้องการส่งการ์ดรูปภาพ:",
              size: "sm",
              color: "#666666",
              margin: "md"
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
              spacing: "xs"
            }
          ],
          paddingAll: "15px"
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              style: "secondary",
              height: "sm",
              action: {
                type: "postback",
                label: "ยกเลิก",
                data: `action=cancel_share`,
                displayText: "ยกเลิกการแชร์"
              }
            }
          ],
          paddingAll: "15px"
        }
      }
    };
  }

  // Get available chats for user
  getAvailableChats(userId) {
    // ในระบบจริง ควรดึงข้อมูลจาก database หรือ cache
    // ที่เก็บข้อมูลห้องแชทที่ bot อยู่
    return this.mockChats;
  }

  // Handle forward share request
  async handleForwardShare(sessionId, userId, replyToken) {
    try {
      const session = this.shareSessions.get(sessionId);
      
      if (!session) {
        await this.client.replyMessage(replyToken, {
          type: 'text',
          text: '❌ ลิงก์หมดอายุหรือไม่ถูกต้อง'
        });
        return;
      }
      
      // Create and send chat selector
      const chatSelector = this.createChatSelector(sessionId, userId);
      await this.client.replyMessage(replyToken, chatSelector);
      
    } catch (error) {
      logger.error('Error handling forward share:', error);
      
      if (replyToken) {
        await this.client.replyMessage(replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาดในการแชร์'
        });
      }
    }
  }

  // Send card to selected chat
  async sendCardToSelectedChat(sessionId, chatId, chatType, userId, replyToken) {
    try {
      const session = this.shareSessions.get(sessionId);
      
      if (!session) {
        await this.client.replyMessage(replyToken, {
          type: 'text',
          text: '❌ ลิงก์หมดอายุหรือไม่ถูกต้อง'
        });
        return;
      }
      
      // Create forwarded card (with indicator)
      const forwardedCard = this.createShareableFlexCard(session, true);
      
      // Send to selected chat
      let targetId = chatId;
      if (chatId === 'personal') {
        targetId = userId;
      }
      
      try {
        await this.client.pushMessage(targetId, [
          {
            type: 'text',
            text: '📸 มีคนแชร์รูปภาพ QC มาให้'
          },
          forwardedCard
        ]);
        
        // Confirm to user
        await this.client.replyMessage(replyToken, {
          type: 'text',
          text: '✅ แชร์การ์ดเรียบร้อยแล้ว!'
        });
        
        logger.info(`Card shared to ${chatType}: ${targetId}`);
        
      } catch (sendError) {
        logger.error('Error sending to chat:', sendError);
        
        await this.client.replyMessage(replyToken, {
          type: 'text',
          text: '❌ ไม่สามารถส่งไปยังห้องแชทที่เลือกได้\nอาจเป็นเพราะบอทไม่ได้อยู่ในห้องนั้น'
        });
      }
      
    } catch (error) {
      logger.error('Error sending card to chat:', error);
      
      if (replyToken) {
        await this.client.replyMessage(replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาด'
        });
      }
    }
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