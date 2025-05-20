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
      
      // Get or create pending uploads for this user with the specified Lot
      const userUploadInfo = lineService.getUploadInfo(userId);
      
      // Create or update pendingUploads
      const pendingUpload = this.pendingUploads.get(userId) || {
        lotNumber: lotNumber,
        images: [],
        messageIds: [],
        timestamp: Date.now()
      };
      
      // Add the new image
      pendingUpload.images.push({
        buffer: imageBuffer,
        messageId: messageId,
        contentType: message.contentProvider?.type === 'external' 
          ? 'image/jpeg' : 'image/jpeg', // Default MIME type
        timestamp: Date.now()
      });
      
      pendingUpload.messageIds.push(messageId);
      this.pendingUploads.set(userId, pendingUpload);
      
      // Log the number of images
      logger.info(`User ${userId} uploaded image ${pendingUpload.images.length} for Lot ${lotNumber}`);
      
      // If this is the first image, confirm receipt and inform about upload mode
      if (pendingUpload.images.length === 1) {
        await lineService.replyMessage(
          replyToken,
          lineService.createTextMessage(`ได้รับรูปภาพแล้ว 1 รูป สำหรับ Lot: ${lotNumber}\nคุณสามารถส่งรูปเพิ่มเติมได้ หรือพิมพ์ #done เพื่อเสร็จสิ้นการอัปโหลด`)
        );
      } else {
        // For subsequent images, just confirm receipt with count
        const confirmMessage = `ได้รับรูปภาพแล้ว ${pendingUpload.images.length} รูป สำหรับ Lot: ${lotNumber}`;
        await lineService.replyMessage(replyToken, lineService.createTextMessage(confirmMessage));
      }
      
      // If user sends #done command or after a timeout, process the uploads
      // For now we'll rely on the #done command from the user (handled in WebhookController)
    } catch (error) {
      logger.error('Error handling image upload with Lot:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Finalize upload for a user (after they send #done or timeout occurs)
  async finalizeUpload(userId, replyToken) {
    try {
      const pendingUpload = this.pendingUploads.get(userId);
      
      if (!pendingUpload || pendingUpload.images.length === 0) {
        await lineService.replyMessage(
          replyToken,
          lineService.createTextMessage('ไม่มีรูปภาพรอการอัปโหลด')
        );
        return;
      }
      
      const lotNumber = pendingUpload.lotNumber;
      
      // Use current date automatically
      const currentDate = new Date();
      const formattedDate = dateFormatter.formatISODate(currentDate);
      
      // Prepare files for processing
      const files = pendingUpload.images.map((image, index) => {
        return {
          buffer: image.buffer,
          originalname: `image_${Date.now()}_${index}.jpg`, // Ensure unique names
          mimetype: image.contentType
        };
      });
      
      logger.info(`Processing ${files.length} images for Lot ${lotNumber}`);
      
      // Process and save images
      const result = await imageService.processImages(files, lotNumber, formattedDate, userId);
      
      // Clear pending uploads
      this.pendingUploads.delete(userId);
      
      // Reset upload info
      lineService.setUploadInfo(userId, null);
      
      // Build success message
      const successMessage = lineMessageBuilder.buildUploadSuccessMessage(result);
      
      // Send success message
      await lineService.replyMessage(replyToken, successMessage);
      
      logger.info(`Successfully uploaded ${result.images.length} images for Lot ${lotNumber}`);
    } catch (error) {
      logger.error('Error finalizing upload:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
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
        messageIds: []
      };
      
      pendingUpload.images.push({
        buffer: imageBuffer,
        messageId: messageId,
        contentType: message.contentProvider?.type === 'external' 
          ? 'image/jpeg' // Default for external images
          : 'image/jpeg',  // Default, actual MIME type isn't provided by LINE
        timestamp: Date.now()
      });
      
      pendingUpload.messageIds.push(messageId);
      this.pendingUploads.set(userId, pendingUpload);
      
      logger.info(`User ${userId} uploaded image ${pendingUpload.images.length} (without Lot)`);
      
      // Reply with confirmation and ask for Lot number if first image
      if (pendingUpload.images.length === 1) {
        // Ask for Lot number
        await this.requestLotNumber(userId, replyToken);
      } else {
        // Just confirm receipt with count
        const confirmMessage = `ได้รับรูปภาพแล้ว ${pendingUpload.images.length} รูป`;
        await lineService.replyMessage(replyToken, lineService.createTextMessage(confirmMessage));
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
  async requestLotNumber(userId, replyToken) {
    try {
      const pendingUpload = this.pendingUploads.get(userId);
      
      if (!pendingUpload || pendingUpload.images.length === 0) {
        await lineService.replyMessage(
          replyToken,
          lineService.createTextMessage('ไม่มีรูปภาพรอการอัปโหลด กรุณาส่งรูปภาพก่อน')
        );
        return;
      }
      
      // Set user state to waiting for Lot
      lineService.setUserState(userId, lineConfig.userStates.waitingForLot, {
        action: lineConfig.userActions.upload
      });
      
      // Ask for Lot number
      const lotRequestMessage = lineMessageBuilder.buildLotNumberRequestMessage(lineConfig.userActions.upload);
      await lineService.replyMessage(replyToken, lotRequestMessage);
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
      
      // Initialize or clear any existing pending uploads for this user
      this.pendingUploads.set(userId, {
        lotNumber: lotNumber.trim(),
        images: [],
        messageIds: [],
        timestamp: Date.now()
      });
      
      logger.info(`User ${userId} set up upload for Lot ${lotNumber.trim()}`);
      
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
      
      // Update the Lot number in pendingUpload
      pendingUpload.lotNumber = lotNumber.trim();
      this.pendingUploads.set(userId, pendingUpload);
      
      logger.info(`User ${userId} provided Lot ${lotNumber.trim()} for ${pendingUpload.images.length} pending images`);
      
      // Set upload info to active with this Lot
      lineService.setUploadInfo(userId, {
        isActive: true,
        lotNumber: lotNumber.trim(),
        startTime: Date.now()
      });
      
      // Inform user they can continue sending images or complete
      await lineService.replyMessage(
        replyToken,
        lineService.createTextMessage(`ได้รับเลข Lot: ${lotNumber.trim()}\nคุณสามารถส่งรูปเพิ่มเติมได้ หรือพิมพ์ #done เพื่อเสร็จสิ้นการอัปโหลด`)
      );
    } catch (error) {
      logger.error('Error processing Lot number for upload:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการประมวลผลเลข Lot โปรดลองใหม่อีกครั้ง';
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
          originalname: `image_${Date.now()}_${index}.jpg`, // Ensure unique names
          mimetype: image.contentType
        };
      });
      
      logger.info(`Processing ${files.length} images for Lot ${lotNumber} with date ${date}`);
      
      // Process and save images
      const result = await imageService.processImages(files, lotNumber, date, userId);
      
      // Clear pending uploads
      this.pendingUploads.delete(userId);
      
      // Reset user state
      lineService.clearUserState(userId);
      lineService.setUploadInfo(userId, null);
      
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
}

module.exports = new UploadController();