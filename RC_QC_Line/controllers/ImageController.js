// Controller for image retrieval and viewing
const lineConfig = require('../config/line');
const lineService = require('../services/LineService');
const imageService = require('../services/ImageService');
const datePickerService = require('../services/DatePickerService');
const lineMessageBuilder = require('../views/LineMessageBuilder');
const logger = require('../utils/Logger');
const { asyncHandler, AppError } = require('../utils/ErrorHandler');

class ImageController {
  // Request Lot number for viewing images
  async requestLotNumber(userId, replyToken) {
    try {
      // Set user state to waiting for Lot number
      lineService.setUserState(userId, lineConfig.userStates.waitingForLot, {
        action: lineConfig.userActions.view
      });
      
      // Ask for Lot number
      const lotRequestMessage = lineMessageBuilder.buildLotNumberRequestMessage(lineConfig.userActions.view);
      await lineService.replyMessage(replyToken, lotRequestMessage);
    } catch (error) {
      logger.error('Error requesting Lot number for viewing:', error);
      throw error;
    }
  }

  // Process Lot number and show date picker with available dates
  async processLotNumber(userId, lotNumber, replyToken) {
    try {
      // Validate lot number
      if (!lotNumber || lotNumber.trim() === '') {
        await lineService.replyMessage(
          replyToken, 
          lineService.createTextMessage('เลข Lot ไม่ถูกต้อง กรุณาระบุเลข Lot อีกครั้ง')
        );
        return;
      }
      
      // Show date picker with only dates that have images
      await datePickerService.sendViewDatePicker(userId, lotNumber.trim());
      
      // Confirm Lot number
      await lineService.replyMessage(
        replyToken,
        lineService.createTextMessage(`ได้รับเลข Lot: ${lotNumber} กรุณาเลือกวันที่`)
      );
    } catch (error) {
      logger.error('Error processing Lot number for viewing:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการประมวลผลเลข Lot โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Process date selection and show images as Native Batches (Optimized)
  async processDateSelection(userId, lotNumber, date, replyToken) {
    try {
      // Get images for the specified lot and date
      const result = await imageService.getImagesByLotAndDate(lotNumber, date);
      
      // Reset user state
      lineService.setUserState(userId, lineConfig.userStates.idle);
      
      // Check if images were found
      if (!result.images || result.images.length === 0) {
        await lineService.replyMessage(
          replyToken,
          lineMessageBuilder.buildNoImagesFoundMessage(lotNumber, date)
        );
        return;
      }
      
      // Build Native Image Batch messages (Header + All Native Images)
      const messages = lineMessageBuilder.buildImageViewMessages(result);
      
      // Send messages with optimized batch delivery
      if (messages.length === 0) {
        // If no messages (should not happen, but just in case)
        await lineService.replyMessage(
          replyToken,
          lineService.createTextMessage('ไม่พบรูปภาพสำหรับ Lot และวันที่ที่ระบุ')
        );
      } else if (messages.length === 1) {
        // Send single message
        await lineService.replyMessage(replyToken, messages[0]);
      } else {
        // Send header first
        await lineService.replyMessage(replyToken, messages[0]);
        
        // Send native images with optimized batching
        await this.sendNativeImageBatches(userId, messages.slice(1), result.images.length);
      }
      
    } catch (error) {
      logger.error('Error processing date selection for viewing:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการดึงรูปภาพ โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Send Native Images in Optimized Batches (เลือกหลายรูปแชร์พร้อมกันได้)
  async sendNativeImageBatches(userId, imageMessages, totalImages) {
    try {
      const batchSize = 5; // LINE API limit per message batch
      const maxBatches = Math.ceil(Math.min(imageMessages.length, 100) / batchSize); // Limit to 100 images max
      
      logger.info(`Sending ${imageMessages.length} images in ${maxBatches} batches for user ${userId}`);
      
      // Send images in batches of 5 (LINE API recommendation)
      for (let batchIndex = 0; batchIndex < maxBatches; batchIndex++) {
        const startIndex = batchIndex * batchSize;
        const endIndex = Math.min(startIndex + batchSize, imageMessages.length);
        const batch = imageMessages.slice(startIndex, endIndex);
        
        // Send batch with minimal delay between images
        for (let i = 0; i < batch.length; i++) {
          const message = batch[i];
          
          // Very fast delivery for smooth experience
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 150)); // 150ms between images
          }
          
          await lineService.pushMessage(userId, message);
        }
        
        // Slightly longer pause between batches to prevent overwhelming
        if (batchIndex < maxBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 800)); // 800ms between batches
          
          // Progress indicator for large sets
          if (totalImages > 20 && batchIndex % 3 === 2) {
            const sentCount = (batchIndex + 1) * batchSize;
            const progressText = `📤 ส่งแล้ว ${Math.min(sentCount, totalImages)}/${totalImages} รูป...`;
            await lineService.pushMessage(userId, lineMessageBuilder.buildTextMessage(progressText));
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }
      
      // Send completion message for large sets
      if (totalImages > 10) {
        const completionText = `✅ ส่งครบทั้งหมด ${totalImages} รูปแล้ว\n📱 เลือกหลายรูปแชร์พร้อมกันได้`;
        await lineService.pushMessage(userId, lineMessageBuilder.buildTextMessage(completionText));
      }
      
    } catch (error) {
      logger.error('Error sending native image batches:', error);
      throw error;
    }
  }

  // Handle case when no images are found for lot and date
  async handleNoImagesFound(userId, lotNumber, replyToken) {
    try {
      // Send message that no images were found
      const noImageMessage = lineMessageBuilder.buildNoImagesFoundMessage(lotNumber);
      
      await lineService.replyMessage(replyToken, noImageMessage);
      
      // Reset user state
      lineService.setUserState(userId, lineConfig.userStates.idle);
    } catch (error) {
      logger.error('Error handling no images found:', error);
      throw error;
    }
  }
}

module.exports = new ImageController();