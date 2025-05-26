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

  // Process date selection and show images using new Flex Message format
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
      
      // Build LINE native image messages
      const messages = lineMessageBuilder.buildImageViewMessages(result);
      
      // Send messages with proper spacing to avoid flood protection
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
        // Send first message as reply
        await lineService.replyMessage(replyToken, messages[0]);
        
        // Send remaining messages as push messages with appropriate delays
        for (let i = 1; i < messages.length; i++) {
          // Add delay between messages to prevent LINE flood protection
          // Longer delay for image messages, shorter for text
          const isImageMessage = messages[i].type === 'image';
          const delay = isImageMessage ? 800 : 300; // 800ms for images, 300ms for text
          
          await new Promise(resolve => setTimeout(resolve, delay));
          await lineService.pushMessage(userId, messages[i]);
        }
      }
    } catch (error) {
      logger.error('Error processing date selection for viewing:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการดึงรูปภาพ โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
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