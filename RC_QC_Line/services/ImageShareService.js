// Service for sharing actual images to selected chats - Enhanced Version
const line = require('@line/bot-sdk');
const logger = require('../utils/Logger');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const schedule = require('node-schedule');

class ImageShareService {
  constructor() {
    this.client = new line.Client({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
    });
    
    // Store share sessions temporarily
    this.shareSessions = new Map();
    
    // Temp directory for share images
    this.tempDir = path.join(__dirname, '../public/temp');
    this.ensureTempDirectory();
    
    // Schedule cleanup every hour
    schedule.scheduleJob('0 * * * *', () => {
      this.cleanupExpiredSessions();
    });
  }

  // Ensure temp directory exists
  async ensureTempDirectory() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      logger.info('Temp directory ensured');
    } catch (error) {
      logger.error('Error creating temp directory:', error);
    }
  }

  // Create a share session (Enhanced for direct sharing)
  async createShareSession(userId, images, lotNumber, imageDate) {
    try {
      const sessionId = uuidv4();
      const timestamp = Date.now();
      
      // Create session directory
      const sessionDir = path.join(this.tempDir, sessionId);
      await fs.mkdir(sessionDir, { recursive: true });
      
      // Process images for sharing
      const processedImages = [];
      
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const sourceFile = path.join(__dirname, '..', image.file_path || image.filePath);
        const tempFilename = `share_${timestamp}_${i + 1}.jpg`;
        const tempPath = path.join(sessionDir, tempFilename);
        
        try {
          // Copy image to temp directory
          await fs.copyFile(sourceFile, tempPath);
          
          processedImages.push({
            ...image,
            tempPath: tempPath,
            tempUrl: `/temp/${sessionId}/${tempFilename}`,
            fullUrl: `${process.env.BASE_URL}/temp/${sessionId}/${tempFilename}`
          });
          
        } catch (copyError) {
          logger.error(`Error copying image ${i}:`, copyError);
        }
      }
      
      const session = {
        id: sessionId,
        userId: userId,
        images: processedImages,
        lotNumber: lotNumber,
        imageDate: imageDate,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        status: 'pending',
        sessionDir: sessionDir
      };
      
      this.shareSessions.set(sessionId, session);
      
      // Auto cleanup after 24 hours
      setTimeout(() => {
        this.deleteShareSession(sessionId);
      }, 24 * 60 * 60 * 1000);
      
      logger.info(`Created share session: ${sessionId} for user: ${userId} with ${processedImages.length} images`);
      
      return {
        sessionId: sessionId,
        shareUrl: this.generateShareUrl(sessionId),
        images: processedImages
      };
    } catch (error) {
      logger.error('Error creating share session:', error);
      throw error;
    }
  }

  // Generate share URL
  generateShareUrl(sessionId) {
    const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
    return `${baseUrl}/share/${sessionId}`;
  }

  // Get share session
  getShareSession(sessionId) {
    const session = this.shareSessions.get(sessionId);
    
    // Check if expired
    if (session && new Date() > session.expiresAt) {
      this.deleteShareSession(sessionId);
      return null;
    }
    
    return session;
  }

  // Delete share session and cleanup files
  async deleteShareSession(sessionId) {
    try {
      const session = this.shareSessions.get(sessionId);
      
      if (session && session.sessionDir) {
        // Delete temp files
        await fs.rm(session.sessionDir, { recursive: true, force: true });
        logger.info(`Deleted temp files for session: ${sessionId}`);
      }
      
      this.shareSessions.delete(sessionId);
      
    } catch (error) {
      logger.error(`Error deleting share session ${sessionId}:`, error);
    }
  }

  // Send images to a specific chat (existing method)
  async sendImagesToChat(sessionId, targetId, targetType = 'user') {
    try {
      const session = this.shareSessions.get(sessionId);
      
      if (!session) {
        throw new Error('Share session not found or expired');
      }
      
      // Prepare messages
      const messages = [];
      
      // Header message
      messages.push({
        type: 'text',
        text: `📸 รูปภาพ QC\n📦 Lot: ${session.lotNumber}\n📅 ${new Date(session.imageDate).toLocaleDateString('th-TH')}\n🖼️ จำนวน ${session.images.length} รูป`
      });
      
      // Add images (max 5 per send due to LINE limitation)
      const maxImages = Math.min(session.images.length, 5);
      for (let i = 0; i < maxImages; i++) {
        messages.push({
          type: 'image',
          originalContentUrl: session.images[i].fullUrl || session.images[i].url,
          previewImageUrl: session.images[i].fullUrl || session.images[i].url
        });
      }
      
      // Send messages based on target type
      if (targetType === 'group') {
        await this.client.pushMessage(targetId, messages);
      } else if (targetType === 'user') {
        await this.client.pushMessage(targetId, messages);
      } else if (targetType === 'room') {
        await this.client.pushMessage(targetId, messages);
      }
      
      // Send remaining images if more than 5
      if (session.images.length > 5) {
        for (let i = 5; i < session.images.length; i += 5) {
          const batch = session.images.slice(i, i + 5).map(img => ({
            type: 'image',
            originalContentUrl: img.fullUrl || img.url,
            previewImageUrl: img.fullUrl || img.url
          }));
          
          await new Promise(resolve => setTimeout(resolve, 500)); // Delay between batches
          await this.client.pushMessage(targetId, batch);
        }
        
        // Send completion message
        await this.client.pushMessage(targetId, {
          type: 'text',
          text: `✅ ส่งรูปภาพทั้งหมด ${session.images.length} รูป เรียบร้อยแล้ว`
        });
      }
      
      // Update session status
      session.status = 'sent';
      session.sentTo = targetId;
      session.sentAt = new Date();
      
      logger.info(`Sent ${session.images.length} images to ${targetType}: ${targetId}`);
      
      return {
        success: true,
        count: session.images.length,
        targetId: targetId,
        targetType: targetType
      };
      
    } catch (error) {
      logger.error('Error sending images to chat:', error);
      throw error;
    }
  }

  // Create shareable link message (existing method enhanced)
  createShareableMessage(sessionId) {
    const shareUrl = this.generateShareUrl(sessionId);
    const session = this.shareSessions.get(sessionId);
    
    if (!session) {
      throw new Error('Share session not found');
    }
    
    return {
      type: 'flex',
      altText: 'แชร์รูปภาพ QC',
      contents: {
        type: 'bubble',
        hero: {
          type: 'image',
          url: session.images[0].fullUrl || session.images[0].url,
          size: 'full',
          aspectRatio: '1:1',
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
              size: 'lg',
              color: '#00B900'
            },
            {
              type: 'text',
              text: `Lot: ${session.lotNumber}`,
              size: 'md',
              margin: 'md'
            },
            {
              type: 'text',
              text: `จำนวน: ${session.images.length} รูป`,
              size: 'sm',
              color: '#666666'
            },
            {
              type: 'separator',
              margin: 'xl'
            },
            {
              type: 'text',
              text: 'กดปุ่มด้านล่างเพื่อรับรูปภาพ',
              size: 'sm',
              color: '#999999',
              margin: 'md',
              wrap: true
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'uri',
                label: '📥 รับรูปภาพ',
                uri: shareUrl
              },
              color: '#00B900'
            }
          ]
        }
      }
    };
  }

  // Clean expired sessions
  async cleanExpiredSessions() {
    const now = new Date();
    const sessionsToDelete = [];
    
    for (const [sessionId, session] of this.shareSessions.entries()) {
      if (now > session.expiresAt) {
        sessionsToDelete.push(sessionId);
      }
    }
    
    for (const sessionId of sessionsToDelete) {
      await this.deleteShareSession(sessionId);
    }
    
    if (sessionsToDelete.length > 0) {
      logger.info(`Cleaned ${sessionsToDelete.length} expired share sessions`);
    }
    
    // Clean orphaned directories
    await this.cleanOrphanedDirectories();
  }

  // Clean orphaned directories
  async cleanOrphanedDirectories() {
    try {
      const dirs = await fs.readdir(this.tempDir);
      
      for (const dir of dirs) {
        if (!this.shareSessions.has(dir)) {
          const dirPath = path.join(this.tempDir, dir);
          await fs.rm(dirPath, { recursive: true, force: true });
          logger.info(`Cleaned orphaned directory: ${dir}`);
        }
      }
    } catch (error) {
      logger.error('Error cleaning orphaned directories:', error);
    }
  }
}

module.exports = new ImageShareService();