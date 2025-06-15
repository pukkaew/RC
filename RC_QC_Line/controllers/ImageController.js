// Controller for image retrieval and viewing - Direct LIFF Opening
const lineConfig = require('../config/line');
const lineService = require('../services/LineService');
const imageService = require('../services/ImageService');
const datePickerService = require('../services/DatePickerService');
const lineMessageBuilder = require('../views/LineMessageBuilder');
const logger = require('../utils/Logger');
const { asyncHandler, AppError } = require('../utils/ErrorHandler');

class ImageController {
  // Request Lot number for viewing images
  async requestLotNumber(userId, replyToken, chatContext = null) {
    try {
      const chatId = chatContext?.chatId || 'direct';
      
      // Set user state to waiting for Lot number with chat context
      lineService.setUserState(userId, lineConfig.userStates.waitingForLot, {
        action: lineConfig.userActions.view
      }, chatId);
      
      // Ask for Lot number
      const lotRequestMessage = lineMessageBuilder.buildLotNumberRequestMessage(lineConfig.userActions.view);
      await lineService.replyMessage(replyToken, lotRequestMessage);
    } catch (error) {
      logger.error('Error requesting Lot number for viewing:', error);
      throw error;
    }
  }

  // Process Lot number and show date picker with available dates
  async processLotNumber(userId, lotNumber, replyToken, chatContext = null) {
    try {
      const chatId = chatContext?.chatId || 'direct';
      
      // Enhanced validation with debug logging
      logger.info(`ImageController: Processing Lot number: "${lotNumber}"`);
      
      if (!lotNumber) {
        logger.warn(`ImageController: Lot number is null or undefined`);
        await lineService.replyMessage(
          replyToken, 
          lineService.createTextMessage('เลข Lot ไม่ถูกต้อง กรุณาระบุเลข Lot อีกครั้ง')
        );
        return;
      }
      
      const trimmedLot = lotNumber.trim();
      logger.info(`ImageController: Trimmed Lot number: "${trimmedLot}"`);
      
      if (trimmedLot === '') {
        logger.warn(`ImageController: Lot number is empty after trim`);
        await lineService.replyMessage(
          replyToken, 
          lineService.createTextMessage('เลข Lot ไม่ถูกต้อง กรุณาระบุเลข Lot อีกครั้ง')
        );
        return;
      }
      
      logger.info(`ImageController: Lot validation passed, proceeding to DatePicker`);
      
      // Show date picker with direct LIFF opening (no PC support message)
      await datePickerService.sendViewDatePickerWithDirectLiff(userId, trimmedLot, chatContext, replyToken);
      
    } catch (error) {
      logger.error('Error processing Lot number for viewing:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการประมวลผลเลข Lot โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Process date selection - NOT USED anymore (direct LIFF opening)
  async processDateSelection(userId, lotNumber, date, replyToken, chatContext = null) {
    try {
      const chatId = chatContext?.chatId || 'direct';
      
      // This should not be called anymore as we open LIFF directly
      logger.warn('processDateSelection called but should use direct LIFF opening');
      
      // Reset user state
      lineService.setUserState(userId, lineConfig.userStates.idle, {}, chatId);
      
      // Build LIFF URL and open directly
      const liffUrl = `https://liff.line.me/2007575196-NWaXrZVE?lot=${encodeURIComponent(lotNumber)}&date=${encodeURIComponent(date)}`;
      
      const message = {
        type: "flex",
        altText: `📸 ดูรูปภาพ - Lot: ${lotNumber}`,
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "📸 กำลังเปิดหน้าดูรูปภาพ...",
                weight: "bold",
                size: "md",
                color: "#00B900"
              },
              {
                type: "text",
                text: `📦 Lot: ${lotNumber}`,
                size: "sm",
                color: "#666666",
                margin: "sm"
              },
              {
                type: "text",
                text: `📅 ${new Date(date).toLocaleDateString('th-TH')}`,
                size: "sm",
                color: "#666666",
                margin: "sm"
              }
            ],
            paddingAll: "20px"
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                action: {
                  type: "uri",
                  label: "🔍 ดูรูปภาพ",
                  uri: liffUrl
                },
                color: "#00B900"
              }
            ],
            paddingAll: "10px"
          }
        }
      };
      
      // Send message
      await lineService.replyMessage(replyToken, message);
      
    } catch (error) {
      logger.error('Error processing date selection for viewing:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการดึงรูปภาพ โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Handle sending images to chat for PC users - REMOVED PC SUPPORT MESSAGE
  async handleSendToChat(userId, lotNumber, date, replyToken, chatContext = null) {
    try {
      // Get images
      const result = await imageService.getImagesByLotAndDate(lotNumber, date);
      
      if (!result.images || result.images.length === 0) {
        await lineService.replyMessage(
          replyToken,
          lineMessageBuilder.buildNoImagesFoundMessage(lotNumber, date)
        );
        return;
      }
      
      // Build messages for sending images
      const messages = lineMessageBuilder.buildImageViewMessages(result);
      
      // Send images (max 5 per reply)
      const firstBatch = messages.slice(0, 5);
      await lineService.replyMessage(replyToken, firstBatch);
      
      // Send remaining messages if any
      if (messages.length > 5) {
        for (let i = 5; i < messages.length; i += 5) {
          const batch = messages.slice(i, i + 5);
          await lineService.pushMessage(userId, batch);
          
          // Small delay between batches
          if (i + 5 < messages.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
    } catch (error) {
      logger.error('Error sending images to chat:', error);
      
      const errorMessage = 'เกิดข้อผิดพลาดในการส่งรูปภาพ โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Handle case when no images are found for lot and date
  async handleNoImagesFound(userId, lotNumber, replyToken, chatContext = null) {
    try {
      const chatId = chatContext?.chatId || 'direct';
      
      // Send message that no images were found
      const noImageMessage = lineMessageBuilder.buildNoImagesFoundMessage(lotNumber);
      
      await lineService.replyMessage(replyToken, noImageMessage);
      
      // Reset user state
      lineService.setUserState(userId, lineConfig.userStates.idle, {}, chatId);
    } catch (error) {
      logger.error('Error handling no images found:', error);
      throw error;
    }
  }
}

module.exports = new ImageController();