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
    this.imageSets = new Map(); // Track image sets and their completion status
  }

  // Helper function to check if all images in a set are received
  isImageSetComplete(userId, imageSetId, totalImages) {
    const imageSet = this.imageSets.get(`${userId}-${imageSetId}`);
    if (!imageSet) return false;
    
    if (imageSet.receivedIndices.size >= totalImages) {
      // Check if we have all indices from 0 to totalImages-1
      for (let i = 0; i < totalImages; i++) {
        if (!imageSet.receivedIndices.has(i)) {
          logger.info(`Image set ${imageSetId} is missing index ${i}`);
          return false;
        }
      }
      return true;
    }
    return false;
  }

  // Helper function to update image set status
  updateImageSetStatus(userId, imageSetId, totalImages, index) {
    const key = `${userId}-${imageSetId}`;
    let imageSet = this.imageSets.get(key);
    
    if (!imageSet) {
      imageSet = {
        imageSetId: imageSetId,
        totalImages: totalImages,
        receivedIndices: new Set([index]),
        receivedTime: Date.now(),
        lastUpdateTime: Date.now()
      };
    } else {
      imageSet.receivedIndices.add(index);
      imageSet.lastUpdateTime = Date.now();
    }
    
    this.imageSets.set(key, imageSet);
    
    // Log received indices for debugging
    logger.info(`Updated image set ${imageSetId}, indices received: ${Array.from(imageSet.receivedIndices).join(', ')}, total needed: ${totalImages}`);
    
    return imageSet;
  }

  // Wait for all images in a set to be received before processing
  async waitForAllImagesInSet(userId, imageSetId, totalImages, timeoutMs = 10000) {
    const startTime = Date.now();
    logger.info(`Waiting for all images in set ${imageSetId}, total ${totalImages}...`);
    
    while (Date.now() - startTime < timeoutMs) {
      if (this.isImageSetComplete(userId, imageSetId, totalImages)) {
        logger.info(`All ${totalImages} images received for set ${imageSetId}`);
        return true;
      }
      // Wait a short time before checking again
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Timeout reached
    const imageSet = this.imageSets.get(`${userId}-${imageSetId}`);
    if (imageSet) {
      logger.warn(`Timeout waiting for image set ${imageSetId}, received ${imageSet.receivedIndices.size}/${totalImages} images. Indices: ${Array.from(imageSet.receivedIndices).join(', ')}`);
    }
    return false;
  }

  // Handle image upload from LINE with specified Lot
  async handleImageUploadWithLot(userId, message, replyToken, lotNumber) {
    try {
      const { id: messageId } = message;
      
      // Get image content from LINE
      const lineClient = new line.Client({
        channelAccessToken: lineConfig.channelAccessToken
      });
      
      // Check if message is part of a group of images
      const isImageGroup = message.hasOwnProperty('imageSet') && 
                          message.imageSet?.hasOwnProperty('id') && 
                          message.imageSet?.hasOwnProperty('index') !== undefined && 
                          message.imageSet?.hasOwnProperty('total');
      
      // Get image index (0-based) and total
      let imageIndex = 0;
      let totalImages = 1;
      
      if (isImageGroup) {
        imageIndex = message.imageSet.index;
        totalImages = message.imageSet.total;
      }
      
      // Log for debugging
      logger.info(`Processing image: ${messageId}, isImageGroup: ${isImageGroup ? 'yes' : 'no'}, ` + 
                 `index: ${imageIndex}, total: ${totalImages}`);
      
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
        messageIds: [],
        lastUpdateTime: Date.now(),
        expectedCount: totalImages,
        receivedIndices: new Set()
      };
      
      // If this is a new upload, record the expected total
      if (pendingUpload.images.length === 0 && totalImages > 1) {
        pendingUpload.expectedCount = totalImages;
        pendingUpload.receivedIndices = new Set();
      }
      
      // Add the image to the pending uploads
      pendingUpload.images.push({
        buffer: imageBuffer,
        messageId: messageId,
        isImageGroup: isImageGroup,
        imageSetId: isImageGroup ? message.imageSet.id : null,
        imageSetIndex: imageIndex,
        imageSetTotal: totalImages,
        contentType: 'image/jpeg'
      });
      
      pendingUpload.messageIds.push(messageId);
      pendingUpload.lastUpdateTime = Date.now();
      pendingUpload.receivedIndices.add(imageIndex);
      this.pendingUploads.set(userId, pendingUpload);
      
      // Update image set status if part of a group
      if (isImageGroup) {
        this.updateImageSetStatus(userId, message.imageSet.id, totalImages, imageIndex);
      }
      
      // Acknowledge receipt of image with correct numbering (1-based indices for users)
      const userFacingIndex = imageIndex + 1; // Convert to 1-based index for user messages
      
      // Send confirmation of image receipt
      const confirmMessage = `ได้รับรูปที่ ${userFacingIndex}/${totalImages} สำหรับ Lot: ${lotNumber} แล้ว`;
      
      if (userFacingIndex === 1) {
        // For the first image, use reply
        await lineService.replyMessage(replyToken, lineService.createTextMessage(confirmMessage));
      } else {
        // For subsequent images, use push message
        await lineService.pushMessage(userId, lineService.createTextMessage(confirmMessage));
      }
      
      // Check if we have received all expected images
      const allReceived = pendingUpload.receivedIndices.size >= totalImages;
      
      if (allReceived) {
        // Double check if we have all indices
        let missingIndices = false;
        for (let i = 0; i < totalImages; i++) {
          if (!pendingUpload.receivedIndices.has(i)) {
            missingIndices = true;
            logger.warn(`Missing image at index ${i} for user ${userId}`);
          }
        }
        
        if (!missingIndices) {
          logger.info(`All ${totalImages} images received for user ${userId}, processing...`);
          // Wait a short time for any pending processing
          await new Promise(resolve => setTimeout(resolve, 1000));
          // Process all received images
          await this.processPendingImages(userId, lotNumber);
        } else {
          // Wait a bit longer for missing indices
          logger.info(`Some indices are missing, waiting a bit more for user ${userId}`);
          // After 5 seconds, process anyway with what we have
          setTimeout(async () => {
            const currentUpload = this.pendingUploads.get(userId);
            if (currentUpload && currentUpload.lotNumber === lotNumber && currentUpload.images.length > 0) {
              logger.info(`Processing ${currentUpload.images.length} images after timeout for user ${userId}`);
              await this.processPendingImages(userId, lotNumber);
            }
          }, 5000);
        }
      } else if (imageIndex === totalImages - 1) {
        // This is the last image according to its index, but we may have missed some
        logger.info(`Received last image (index ${imageIndex}) but only have ${pendingUpload.receivedIndices.size}/${totalImages} images for user ${userId}`);
        
        // Wait a bit for any missing images
        setTimeout(async () => {
          const currentUpload = this.pendingUploads.get(userId);
          if (currentUpload && currentUpload.lotNumber === lotNumber && currentUpload.images.length > 0) {
            logger.info(`Processing ${currentUpload.images.length} images after receiving last index for user ${userId}`);
            await this.processPendingImages(userId, lotNumber);
          }
        }, 5000);
      }
    } catch (error) {
      logger.error('Error handling image upload with Lot:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ โปรดลองใหม่อีกครั้ง';
      await lineService.pushMessage(userId, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Process all pending images for a user
  async processPendingImages(userId, lotNumber) {
    try {
      const pendingUpload = this.pendingUploads.get(userId);
      if (!pendingUpload || pendingUpload.images.length === 0) {
        logger.warn(`No pending images found for user ${userId}`);
        return;
      }
      
      // Log how many images we're processing
      logger.info(`Processing ${pendingUpload.images.length} images for Lot ${lotNumber}`);
      
      // Sort images by their index to ensure correct order
      pendingUpload.images.sort((a, b) => (a.imageSetIndex || 0) - (b.imageSetIndex || 0));
      
      // Log the indices of images we're processing
      const indices = pendingUpload.images.map(img => img.imageSetIndex);
      logger.info(`Processing images with indices: ${indices.join(', ')}`);
      
      // Use current date
      const currentDate = new Date();
      const formattedDate = dateFormatter.formatISODate(currentDate);
      
      // Create files array from all pending images
      const files = pendingUpload.images.map((image, index) => {
        return {
          buffer: image.buffer,
          originalname: `image_${Date.now()}_${image.imageSetIndex || index}.jpg`,
          mimetype: image.contentType
        };
      });
      
      // Process and save images
      const result = await imageService.processImages(files, lotNumber, formattedDate, userId);
      
      // Reset upload info
      lineService.setUploadInfo(userId, null);
      
      // Clear pending uploads for this user
      this.pendingUploads.delete(userId);
      
      // If this was part of an image set, clean up that entry too
      if (pendingUpload.images.length > 0 && pendingUpload.images[0].imageSetId) {
        const imageSetId = pendingUpload.images[0].imageSetId;
        this.imageSets.delete(`${userId}-${imageSetId}`);
      }
      
      // Build success message
      const successMessage = lineMessageBuilder.buildUploadSuccessMessage(result);
      
      // Send success message
      await lineService.pushMessage(userId, successMessage);
      
      // Return result
      return result;
    } catch (error) {
      logger.error('Error processing pending images:', error);
      
      // Send error message
      await lineService.pushMessage(
        userId,
        lineService.createTextMessage('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ โปรดลองใหม่อีกครั้ง')
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
      
      // Check if message is part of a group of images
      const isImageGroup = message.hasOwnProperty('imageSet') && 
                          message.imageSet?.hasOwnProperty('id') && 
                          message.imageSet?.hasOwnProperty('index') !== undefined && 
                          message.imageSet?.hasOwnProperty('total');
                          
      // Get image index (0-based) and total
      let imageIndex = 0;
      let totalImages = 1;
      
      if (isImageGroup) {
        imageIndex = message.imageSet.index;
        totalImages = message.imageSet.total;
      }
      
      // Log for debugging
      logger.info(`Processing image upload: ${messageId}, isImageGroup: ${isImageGroup ? 'yes' : 'no'}, ` + 
                 `index: ${imageIndex}, total: ${totalImages}`);
      
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
        messageIds: [],
        lastUpdateTime: Date.now(),
        expectedCount: totalImages,
        receivedIndices: new Set()
      };
      
      // If this is a new upload, record the expected total
      if (pendingUpload.images.length === 0 && totalImages > 1) {
        pendingUpload.expectedCount = totalImages;
        pendingUpload.receivedIndices = new Set();
      }
      
      pendingUpload.images.push({
        buffer: imageBuffer,
        messageId: messageId,
        isImageGroup: isImageGroup,
        imageSetId: isImageGroup ? message.imageSet.id : null,
        imageSetIndex: imageIndex,
        imageSetTotal: totalImages,
        contentType: 'image/jpeg'
      });
      
      pendingUpload.messageIds.push(messageId);
      pendingUpload.lastUpdateTime = Date.now();
      pendingUpload.receivedIndices.add(imageIndex);
      this.pendingUploads.set(userId, pendingUpload);
      
      // Update image set status if part of a group
      if (isImageGroup) {
        this.updateImageSetStatus(userId, message.imageSet.id, totalImages, imageIndex);
      }
      
      // Decide what to do based on image status
      // Acknowledge receipt of image with correct numbering (1-based indices for users)
      const userFacingIndex = imageIndex + 1; // Convert to 0-based index to 1-based for user messages
      
      if (isImageGroup) {
        // Send confirmation of receipt
        const confirmMessage = `ได้รับรูปที่ ${userFacingIndex}/${totalImages} แล้ว`;
        
        if (userFacingIndex === 1) {
          // First image - reply with confirmation
          await lineService.replyMessage(replyToken, lineService.createTextMessage(confirmMessage));
          
          // If this is the first image, don't ask for Lot yet - wait for all images
        } else {
          // Not first image - only confirm receipt
          await lineService.pushMessage(userId, lineService.createTextMessage(confirmMessage));
        }
        
        // Check if we have all images now
        const allReceived = pendingUpload.receivedIndices.size >= totalImages;
        
        // If this is the last image or we have all images, ask for Lot
        if (allReceived || imageIndex === totalImages - 1) {
          // Double check if we have all indices
          let missingIndices = false;
          for (let i = 0; i < totalImages; i++) {
            if (!pendingUpload.receivedIndices.has(i)) {
              missingIndices = true;
              logger.warn(`Missing image at index ${i} for user ${userId}`);
            }
          }
          
          if (!missingIndices) {
            // We have all images, ask for Lot now
            if (!pendingUpload.lotRequested) {
              // Mark that we've requested a Lot number
              pendingUpload.lotRequested = true;
              this.pendingUploads.set(userId, pendingUpload);
              
              // Wait a moment before asking for Lot
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Ask for Lot
              await this.requestLotNumber(userId, null, pendingUpload.images.length, totalImages);
            }
          } else {
            // Wait a bit longer for missing indices
            logger.info(`Some indices are missing, waiting a bit more for user ${userId}`);
            
            // After 5 seconds, ask for Lot anyway with what we have
            setTimeout(async () => {
              const currentUpload = this.pendingUploads.get(userId);
              if (currentUpload && !currentUpload.lotRequested && currentUpload.images.length > 0) {
                // Mark that we've requested a Lot number
                currentUpload.lotRequested = true;
                this.pendingUploads.set(userId, currentUpload);
                
                logger.info(`Asking for Lot after timeout with ${currentUpload.images.length} images for user ${userId}`);
                await this.requestLotNumber(userId, null, currentUpload.images.length, totalImages);
              }
            }, 5000);
          }
        }
      } else {
        // Single image - ask for Lot immediately
        await this.requestLotNumber(userId, replyToken, 1, 1);
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
  async requestLotNumber(userId, replyToken, imageCount = 1, totalImages = 1) {
    try {
      const pendingUpload = this.pendingUploads.get(userId);
      
      if (!pendingUpload || pendingUpload.images.length === 0) {
        if (replyToken) {
          await lineService.replyMessage(
            replyToken,
            lineService.createTextMessage('ไม่มีรูปภาพรอการอัปโหลด กรุณาส่งรูปภาพก่อน')
          );
        } else {
          await lineService.pushMessage(
            userId,
            lineService.createTextMessage('ไม่มีรูปภาพรอการอัปโหลด กรุณาส่งรูปภาพก่อน')
          );
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
      let requestMessage;
      if (totalImages > 1) {
        requestMessage = lineService.createTextMessage(
          `ได้รับรูปภาพทั้งหมด ${pendingUpload.images.length}/${totalImages} รูป กรุณาระบุเลข Lot สำหรับรูปภาพที่อัปโหลด`
        );
      } else {
        requestMessage = lineMessageBuilder.buildLotNumberRequestMessage(lineConfig.userActions.upload);
      }
      
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
      
      // Wait a moment to make sure all images in the set are received
      if (pendingUpload.images.some(img => img.isImageGroup)) {
        // Find image set info from the first image that has the info
        const imageSet = pendingUpload.images.find(img => img.isImageGroup && img.imageSetId && img.imageSetTotal);
        if (imageSet) {
          await this.waitForAllImagesInSet(userId, imageSet.imageSetId, imageSet.imageSetTotal, 3000);
        }
      }
      
      // Sort images by their index to ensure correct order
      pendingUpload.images.sort((a, b) => (a.imageSetIndex || 0) - (b.imageSetIndex || 0));
      
      // Log the indices of images we're processing
      const indices = pendingUpload.images.map(img => img.imageSetIndex);
      logger.info(`Processing images with indices: ${indices.join(', ')}`);
      
      // Use current date automatically
      const currentDate = new Date();
      const formattedDate = dateFormatter.formatISODate(currentDate);
      
      // Prepare files for processing
      const files = pendingUpload.images.map((image, index) => {
        return {
          buffer: image.buffer,
          originalname: `image_${Date.now()}_${image.imageSetIndex || index}.jpg`,
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
      
      // Wait a moment to make sure all images in the set are received
      if (pendingUpload.images.some(img => img.isImageGroup)) {
        // Find image set info
        const imageSet = pendingUpload.images.find(img => img.isImageGroup && img.imageSetId && img.imageSetTotal);
        if (imageSet) {
          await this.waitForAllImagesInSet(userId, imageSet.imageSetId, imageSet.imageSetTotal, 3000);
        }
      }
      
      // Sort images by their index to ensure correct order
      pendingUpload.images.sort((a, b) => (a.imageSetIndex || 0) - (b.imageSetIndex || 0));
      
      // Prepare files for processing
      const files = pendingUpload.images.map((image, index) => {
        return {
          buffer: image.buffer,
          originalname: `image_${image.imageSetIndex || index}.jpg`,
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
        }
      }
      
      // Also clean up image sets
      for (const [key, imageSet] of this.imageSets.entries()) {
        if (now - imageSet.lastUpdateTime > timeout) {
          logger.info(`Cleaning up stale image set ${key}`);
          this.imageSets.delete(key);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up pending uploads:', error);
    }
  }
}

module.exports = new UploadController();