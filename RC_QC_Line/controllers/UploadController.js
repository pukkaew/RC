// Controller for handling image uploads
const line = require('@line/bot-sdk');
const fs = require('fs');
const path = require('path');
const lineConfig = require('../config/line');
const lineService = require('../services/LineService');
const imageService = require('../services/ImageService');
const dateFormatter = require('../utils/DateFormatter');
const lineMessageBuilder = require('../views/LineMessageBuilder');
const logger = require('../utils/Logger');
const { asyncHandler, AppError } = require('../utils/ErrorHandler');

class UploadController {
  constructor() {
    this.pendingUploads = new Map(); // Store pending uploads by user ID
    this.uploadTimers = new Map(); // Store timers for processing uploads
  }

  // Process all pending images after a delay (supports unlimited images)
  scheduleImageProcessing(userId, lotNumber, delayMs = 5000) {
    // Clear existing timer if any
    if (this.uploadTimers.has(userId)) {
      clearTimeout(this.uploadTimers.get(userId));
    }

    // Set new timer with longer delay for large image sets
    const pendingUpload = this.pendingUploads.get(userId);
    let actualDelay = delayMs;
    
    // Increase delay for large image sets
    if (pendingUpload && pendingUpload.images.length > 10) {
      actualDelay = Math.min(10000, delayMs + (pendingUpload.images.length * 200)); // Max 10 seconds
    }

    const timer = setTimeout(async () => {
      await this.processPendingImages(userId, lotNumber);
      this.uploadTimers.delete(userId);
    }, actualDelay);

    this.uploadTimers.set(userId, timer);
    
    // Log the schedule for debugging
    logger.info(`Scheduled image processing for user ${userId} in ${actualDelay}ms (${pendingUpload ? pendingUpload.images.length : 0} images)`);
  }

  // Handle image upload from LINE with specified Lot
  async handleImageUploadWithLot(userId, message, replyToken, lotNumber) {
    try {
      const { id: messageId } = message;
      
      // Get image content from LINE
      const lineClient = new line.Client({
        channelAccessToken: lineConfig.channelAccessToken
      });
      
      // Get image content as a buffer
      const imageStream = await lineClient.getMessageContent(messageId);
      const chunks = [];
      
      imageStream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      // When image is fully received
      await new Promise((resolve, reject) => {
        imageStream.on('end', resolve);
        imageStream.on('error', reject);
      });
      
      const imageBuffer = Buffer.concat(chunks);
      
      // Get or create pending upload for the Lot
      let pendingUpload = this.pendingUploads.get(userId) || { 
        images: [], 
        lotNumber: lotNumber,
        lastUpdateTime: Date.now()
      };
      
      // Add the image to the pending uploads
      pendingUpload.images.push({
        buffer: imageBuffer,
        messageId: messageId,
        contentType: 'image/jpeg',
        receivedAt: Date.now()
      });
      
      pendingUpload.lastUpdateTime = Date.now();
      this.pendingUploads.set(userId, pendingUpload);
      
      // Send confirmation with progress indicator for large uploads
      const confirmMessage = pendingUpload.images.length > 10 
        ? `ได้รับรูปที่ ${pendingUpload.images.length} สำหรับ Lot: ${lotNumber} แล้ว (ระบบจะประมวลผลใน ${Math.ceil((pendingUpload.images.length * 200 + 5000) / 1000)} วินาที)`
        : `ได้รับรูปที่ ${pendingUpload.images.length} สำหรับ Lot: ${lotNumber} แล้ว`;
      
      if (pendingUpload.images.length === 1) {
        // For the first image, use reply
        await lineService.replyMessage(replyToken, lineService.createTextMessage(confirmMessage));
      } else {
        // For subsequent images, use push message
        await lineService.pushMessage(userId, lineService.createTextMessage(confirmMessage));
      }
      
      // Schedule processing with appropriate delay for image count
      this.scheduleImageProcessing(userId, lotNumber);
      
      // Send progress update for large uploads
      if (pendingUpload.images.length === 15 || pendingUpload.images.length === 25 || pendingUpload.images.length % 50 === 0) {
        await lineService.pushMessage(userId, lineService.createTextMessage(
          `📸 ได้รับรูปภาพแล้ว ${pendingUpload.images.length} รูป กำลังรอรูปเพิ่มเติม...`
        ));
      }
      
    } catch (error) {
      logger.error('Error handling image upload with Lot:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ โปรดลองใหม่อีกครั้ง';
      await lineService.pushMessage(userId, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Process all pending images for a user (supports unlimited images)
  async processPendingImages(userId, lotNumber) {
    try {
      const pendingUpload = this.pendingUploads.get(userId);
      if (!pendingUpload || pendingUpload.images.length === 0) {
        logger.warn(`No pending images found for user ${userId}`);
        return;
      }
      
      const imageCount = pendingUpload.images.length;
      
      // Send processing notification for large uploads
      if (imageCount > 10) {
        await lineService.pushMessage(userId, lineService.createTextMessage(
          `🔄 กำลังประมวลผล ${imageCount} รูปภาพ สำหรับ Lot: ${lotNumber} กรุณารอสักครู่...`
        ));
      }
      
      // Log how many images we're processing
      logger.info(`Processing ${imageCount} images for Lot ${lotNumber} (User: ${userId})`);
      
      // Use current date
      const currentDate = new Date();
      const formattedDate = dateFormatter.formatISODate(currentDate);
      
      // Create files array from all pending images
      const files = pendingUpload.images.map((image, index) => {
        return {
          buffer: image.buffer,
          originalname: `image_${Date.now()}_${index + 1}.jpg`,
          mimetype: image.contentType
        };
      });
      
      // Process and save images with progress updates for large uploads
      let result;
      try {
        if (imageCount > 20) {
          // Send progress update for very large uploads
          await lineService.pushMessage(userId, lineService.createTextMessage(
            `⏳ กำลังบีบอัดและบันทึกรูปภาพ ${imageCount} รูป...`
          ));
        }
        
        result = await imageService.processImages(files, lotNumber, formattedDate, userId);
        
      } catch (imageProcessError) {
        logger.error('Error during image processing:', imageProcessError);
        await lineService.pushMessage(userId, lineService.createTextMessage(
          `❌ เกิดข้อผิดพลาดในการประมวลผลรูปภาพ: ${imageProcessError.message}\nกรุณาลองใหม่อีกครั้ง`
        ));
        return;
      }
      
      // Reset upload info
      lineService.setUploadInfo(userId, null);
      
      // Clear pending uploads for this user
      this.pendingUploads.delete(userId);
      
      // Build success message
      const successMessage = lineMessageBuilder.buildUploadSuccessMessage(result);
      
      // Send success message with additional info for large uploads
      if (result.successfulFiles !== result.totalFiles) {
        const errorMessage = `\n\n⚠️ ประมวลผลสำเร็จ ${result.successfulFiles}/${result.totalFiles} รูป`;
        successMessage.text += errorMessage;
      }
      
      if (imageCount > 10) {
        successMessage.text += `\n\n✅ ประมวลผลรูปภาพจำนวนมากเสร็จสิ้น!`;
      }
      
      // Send success message
      await lineService.pushMessage(userId, successMessage);
      
      // Return result
      return result;
    } catch (error) {
      logger.error('Error processing pending images:', error);
      
      // Send error message
      await lineService.pushMessage(
        userId,
        lineService.createTextMessage(`❌ เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ: ${error.message}\nโปรดลองใหม่อีกครั้ง`)
      );
      
      throw error;
    }
  }

  // Handle regular image upload from LINE
  async handleImageUpload(userId, message, replyToken) {
    try {
      const { id: messageId } = message;
      
      // Get image content from LINE
      const lineClient = new line.Client({
        channelAccessToken: lineConfig.channelAccessToken
      });
      
      // Get image content as a buffer
      const imageStream = await lineClient.getMessageContent(messageId);
      const chunks = [];
      
      imageStream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      // When image is fully received
      await new Promise((resolve, reject) => {
        imageStream.on('end', resolve);
        imageStream.on('error', reject);
      });
      
      const imageBuffer = Buffer.concat(chunks);
      
      // Store pending upload in memory
      const pendingUpload = this.pendingUploads.get(userId) || {
        images: [],
        lastUpdateTime: Date.now()
      };
      
      pendingUpload.images.push({
        buffer: imageBuffer,
        messageId: messageId,
        contentType: 'image/jpeg',
        receivedAt: Date.now()
      });
      
      pendingUpload.lastUpdateTime = Date.now();
      this.pendingUploads.set(userId, pendingUpload);
      
      // Send confirmation and ask for Lot
      const confirmMessage = `ได้รับรูปที่ ${pendingUpload.images.length} แล้ว`;
      await lineService.replyMessage(replyToken, lineService.createTextMessage(confirmMessage));
      
      // Ask for Lot number if this is the first image
      if (pendingUpload.images.length === 1) {
        // Wait a moment to see if more images are coming
        setTimeout(async () => {
          const currentUpload = this.pendingUploads.get(userId);
          if (currentUpload && !currentUpload.lotRequested) {
            await this.requestLotNumber(userId, null, currentUpload.images.length);
          }
        }, 2000); // 2 seconds delay
      }
      
    } catch (error) {
      logger.error('Error handling image upload:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Request Lot number for uploaded images
  async requestLotNumber(userId, replyToken, imageCount = 1) {
    try {
      const pendingUpload = this.pendingUploads.get(userId);
      
      if (!pendingUpload || pendingUpload.images.length === 0) {
        const message = 'ไม่มีรูปภาพรอการอัปโหลด กรุณาส่งรูปภาพก่อน';
        if (replyToken) {
          await lineService.replyMessage(replyToken, lineService.createTextMessage(message));
        } else {
          await lineService.pushMessage(userId, lineService.createTextMessage(message));
        }
        return;
      }
      
      // Set user state to waiting for Lot
      lineService.setUserState(userId, lineConfig.userStates.waitingForLot, {
        action: lineConfig.userActions.upload
      });
      
      // Mark that we've requested a Lot number
      pendingUpload.lotRequested = true;
      this.pendingUploads.set(userId, pendingUpload);
      
      // Ask for Lot number with image count info
      const requestMessage = lineService.createTextMessage(
        `ได้รับรูปภาพทั้งหมด ${pendingUpload.images.length} รูป กรุณาระบุเลข Lot สำหรับรูปภาพที่อัปโหลด`
      );
      
      if (replyToken) {
        await lineService.replyMessage(replyToken, requestMessage);
      } else {
        await lineService.pushMessage(userId, requestMessage);
      }
    } catch (error) {
      logger.error('Error requesting Lot number:', error);
      throw error;
    }
  }

  // Setup upload with Lot already specified
  async setupUploadWithLot(userId, lotNumber, replyToken) {
    try {
      // Validate lot number
      if (!lotNumber || lotNumber.trim() === '') {
        await lineService.replyMessage(
          replyToken, 
          lineService.createTextMessage('เลข Lot ไม่ถูกต้อง กรุณาระบุเลข Lot อีกครั้ง')
        );
        return;
      }
      
      // Set upload info with specified Lot
      lineService.setUploadInfo(userId, {
        isActive: true,
        lotNumber: lotNumber.trim(),
        startTime: Date.now()
      });
      
      // Clear any pending uploads for this user
      this.pendingUploads.delete(userId);
      
      // Confirm Lot number and ask for images
      await lineService.replyMessage(
        replyToken,
        lineService.createTextMessage(`ได้รับเลข Lot: ${lotNumber.trim()} กรุณาส่งรูปภาพที่ต้องการอัปโหลด`)
      );
    } catch (error) {
      logger.error('Error setting up upload with Lot:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการตั้งค่าการอัปโหลด โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Process Lot number and complete upload (using today's date)
  async processLotNumber(userId, lotNumber, replyToken) {
    try {
      const pendingUpload = this.pendingUploads.get(userId);
      
      if (!pendingUpload || pendingUpload.images.length === 0) {
        await lineService.replyMessage(
          replyToken,
          lineService.createTextMessage('ไม่มีรูปภาพรอการอัปโหลด กรุณาส่งรูปภาพก่อน')
        );
        return;
      }
      
      // Validate lot number
      if (!lotNumber || lotNumber.trim() === '') {
        await lineService.replyMessage(
          replyToken, 
          lineService.createTextMessage('เลข Lot ไม่ถูกต้อง กรุณาระบุเลข Lot อีกครั้ง')
        );
        return;
      }
      
      // Cancel any pending processing timer
      if (this.uploadTimers.has(userId)) {
        clearTimeout(this.uploadTimers.get(userId));
        this.uploadTimers.delete(userId);
      }
      
      // Use current date automatically
      const currentDate = new Date();
      const formattedDate = dateFormatter.formatISODate(currentDate);
      
      // Prepare files for processing
      const files = pendingUpload.images.map((image, index) => {
        return {
          buffer: image.buffer,
          originalname: `image_${Date.now()}_${index + 1}.jpg`,
          mimetype: image.contentType
        };
      });
      
      // Process and save images
      const result = await imageService.processImages(files, lotNumber.trim(), formattedDate, userId);
      
      // Clear pending uploads
      this.pendingUploads.delete(userId);
      
      // Reset user state
      lineService.clearUserState(userId);
      
      // Build success message
      const successMessage = lineMessageBuilder.buildUploadSuccessMessage(result);
      
      // Send success message
      await lineService.replyMessage(replyToken, successMessage);
    } catch (error) {
      logger.error('Error processing Lot number for direct upload:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Process date selection and complete upload (backward compatibility)
  async processDateSelection(userId, lotNumber, date, replyToken) {
    try {
      const pendingUpload = this.pendingUploads.get(userId);
      
      if (!pendingUpload || pendingUpload.images.length === 0) {
        await lineService.replyMessage(
          replyToken,
          lineService.createTextMessage('ไม่มีรูปภาพรอการอัปโหลด กรุณาส่งรูปภาพก่อน')
        );
        return;
      }
      
      // Prepare files for processing
      const files = pendingUpload.images.map((image, index) => {
        return {
          buffer: image.buffer,
          originalname: `image_${Date.now()}_${index + 1}.jpg`,
          mimetype: image.contentType
        };
      });
      
      // Process and save images
      const result = await imageService.processImages(files, lotNumber, date, userId);
      
      // Clear pending uploads
      this.pendingUploads.delete(userId);
      
      // Reset user state
      lineService.clearUserState(userId);
      
      // Build success message
      const successMessage = lineMessageBuilder.buildUploadSuccessMessage(result);
      
      // Send success message
      await lineService.replyMessage(replyToken, successMessage);
    } catch (error) {
      logger.error('Error processing date selection for upload:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }
  
  // Clean up old pending uploads (can be called periodically)
  cleanupPendingUploads() {
    try {
      const now = Date.now();
      const timeout = 30 * 60 * 1000; // 30 minutes
      
      for (const [userId, upload] of this.pendingUploads.entries()) {
        if (now - upload.lastUpdateTime > timeout) {
          logger.info(`Cleaning up stale upload for user ${userId}`);
          this.pendingUploads.delete(userId);
          
          // Clear timer if exists
          if (this.uploadTimers.has(userId)) {
            clearTimeout(this.uploadTimers.get(userId));
            this.uploadTimers.delete(userId);
          }
        }
      }
    } catch (error) {
      logger.error('Error cleaning up pending uploads:', error);
    }
  }
}

module.exports = new UploadController();