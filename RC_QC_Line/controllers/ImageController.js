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

  // Process date selection and show images as Native Batches (Multi-message)
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
      
      // Build Native Image messages (Header + All Native Images)
      const messages = lineMessageBuilder.buildImageViewMessages(result);
      
      // Send messages using LINE's multi-message capability
      if (messages.length === 0) {
        // If no messages (should not happen, but just in case)
        await lineService.replyMessage(
          replyToken,
          lineService.createTextMessage('ไม่พบรูปภาพสำหรับ Lot และวันที่ที่ระบุ')
        );
      } else {
        // Send all messages at once using LINE's multi-message API
        await this.sendMultipleMessages(userId, messages, replyToken);
      }
      
    } catch (error) {
      logger.error('Error processing date selection for viewing:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการดึงรูปภาพ โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Send Multiple Messages at once (ส่งหลายรูปพร้อมกันในคำสั่งเดียว)
  async sendMultipleMessages(userId, messages, replyToken) {
    try {
      const maxMessagesPerCall = 5; // LINE API limit per call
      
      // Send first batch as reply (up to 5 messages)
      const firstBatch = messages.slice(0, maxMessagesPerCall);
      await lineService.replyMessage(replyToken, firstBatch);
      
      // Send remaining messages in batches via push message
      if (messages.length > maxMessagesPerCall) {
        const remainingMessages = messages.slice(maxMessagesPerCall);
        
        // Split remaining messages into batches of 5
        for (let i = 0; i < remainingMessages.length; i += maxMessagesPerCall) {
          const batch = remainingMessages.slice(i, i + maxMessagesPerCall);
          
          // Small delay between batches to ensure delivery order
          await new Promise(resolve => setTimeout(resolve, 100));
          await lineService.pushMessage(userId, batch);
        }
      }
      
    } catch (error) {
      logger.error('Error sending multiple messages:', error);
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