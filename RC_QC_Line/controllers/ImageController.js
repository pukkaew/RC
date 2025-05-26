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

  // Process date selection and show view options
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
      
      // Store result in memory for later use
      lineService.setUserState(userId, 'viewing_images', { result });
      
      // Build view options with quick reply
      const messages = lineMessageBuilder.buildImageViewMessages(result);
      
      // Send the options message
      await lineService.replyMessage(replyToken, messages[0]);
      
    } catch (error) {
      logger.error('Error processing date selection for viewing:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการดึงรูปภาพ โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Handle view mode selection (Grid, Shareable, or Both)
  async handleViewModeSelection(userId, viewMode, lotNumber, date, replyToken) {
    try {
      // Get stored result or fetch again
      const userState = lineService.getUserState(userId);
      let result;
      
      if (userState.state === 'viewing_images' && userState.data.result) {
        result = userState.data.result;
      } else {
        // Fetch images again if not in memory
        result = await imageService.getImagesByLotAndDate(lotNumber, date);
      }
      
      // Clear user state
      lineService.setUserState(userId, lineConfig.userStates.idle);
      
      // Check if images were found
      if (!result.images || result.images.length === 0) {
        await lineService.replyMessage(
          replyToken,
          lineMessageBuilder.buildNoImagesFoundMessage(lotNumber, date)
        );
        return;
      }
      
      let messages = [];
      
      // Build messages based on view mode
      switch (viewMode) {
        case 'view_grid':
          messages = lineMessageBuilder.buildGridLayoutMessages(result);
          break;
          
        case 'view_shareable':
          messages = lineMessageBuilder.buildShareableMessages(result);
          break;
          
        case 'view_both':
          messages = lineMessageBuilder.buildBothViewMessages(result);
          break;
          
        default:
          await lineService.replyMessage(
            replyToken,
            lineService.createTextMessage('โหมดการดูที่เลือกไม่ถูกต้อง')
          );
          return;
      }
      
      // Send messages with appropriate delays
      if (messages.length === 0) {
        await lineService.replyMessage(
          replyToken,
          lineService.createTextMessage('ไม่สามารถแสดงรูปภาพได้')
        );
      } else if (messages.length === 1) {
        // Send single message
        await lineService.replyMessage(replyToken, messages[0]);
      } else {
        // Send first message as reply
        await lineService.replyMessage(replyToken, messages[0]);
        
        // Send remaining messages with appropriate delays
        for (let i = 1; i < messages.length; i++) {
          // Different delays based on message type
          let delay = 800; // Default delay
          
          if (viewMode === 'view_shareable') {
            delay = 400; // Faster for native images
          } else if (viewMode === 'view_grid') {
            delay = 1200; // Slower for grid layouts
          } else if (viewMode === 'view_both') {
            delay = i < messages.length / 2 ? 1200 : 400; // Grid first, then images
          }
          
          await new Promise(resolve => setTimeout(resolve, delay));
          await lineService.pushMessage(userId, messages[i]);
          
          // Add longer pause every few messages
          if (i % 5 === 0 && i < messages.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
      }
      
    } catch (error) {
      logger.error('Error handling view mode selection:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการแสดงรูปภาพ โปรดลองใหม่อีกครั้ง';
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