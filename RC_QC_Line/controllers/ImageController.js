// RC_QC_Line/controllers/ImageController.js - SIMPLE VERSION
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
      
      // Show date picker with postback action (not direct LIFF)
      await datePickerService.sendViewDatePickerWithAlbum(userId, trimmedLot, chatContext, replyToken);
      
    } catch (error) {
      logger.error('Error processing Lot number for viewing:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการประมวลผลเลข Lot โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Process date selection and show simple preview
  async processDateSelection(userId, lotNumber, date, replyToken, chatContext = null) {
    try {
      const chatId = chatContext?.chatId || 'direct';
      
      // Get images to check if they exist
      const result = await imageService.getImagesByLotAndDate(lotNumber, date);
      
      // Reset user state
      lineService.setUserState(userId, lineConfig.userStates.idle, {}, chatId);
      
      // Check if images were found
      if (!result.images || result.images.length === 0) {
        await lineService.replyMessage(
          replyToken,
          lineMessageBuilder.buildNoImagesFoundMessage(lotNumber, date)
        );
        return;
      }
      
      // Option 1: Send simple flex card with direct image preview
      const shareCardService = require('../services/ShareCardService');
      const shareCard = await shareCardService.createShareCard(
        lotNumber,
        date,
        result.images
      );
      
      await lineService.replyMessage(replyToken, shareCard.flexMessage);
      
      // Option 2: If you want to send actual images right away (like carousel)
      // Uncomment below to send images as carousel instead
      /*
      const carouselMessage = shareCardService.createImageCarousel(
        lotNumber,
        date,
        result.images
      );
      await lineService.replyMessage(replyToken, carouselMessage);
      */
      
      // Option 3: Send all images directly (most simple)
      // Uncomment below to send all images directly
      /*
      await this.sendAllImagesDirectly(userId, lotNumber, date, result.images, replyToken, chatContext);
      */
      
      // Log success
      logger.info(`Sent simple preview for Lot: ${lotNumber}, Date: ${date}, Images: ${result.images.length}`);
      
    } catch (error) {
      logger.error('Error processing date selection for viewing:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการดึงรูปภาพ โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Send all images directly (simplest approach)
  async sendAllImagesDirectly(userId, lotNumber, date, images, replyToken, chatContext) {
    try {
      const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
      const formattedDate = new Date(date).toLocaleDateString('th-TH');
      
      // Header message
      const headerMessage = {
        type: 'text',
        text: `📸 รูปภาพ QC\n📦 Lot: ${lotNumber}\n📅 ${formattedDate}\n🖼️ ทั้งหมด ${images.length} รูป`
      };
      
      // Prepare image messages (max 5 per reply)
      const imageMessages = images.slice(0, 5).map(image => {
        const imageUrl = image.url.startsWith('http') 
          ? image.url 
          : `${baseUrl}${image.url}`;
        
        return {
          type: 'image',
          originalContentUrl: imageUrl,
          previewImageUrl: imageUrl
        };
      });
      
      // Send first batch with header
      const firstBatch = [headerMessage, ...imageMessages];
      await lineService.replyMessage(replyToken, firstBatch);
      
      // Send remaining images via push message
      if (images.length > 5) {
        for (let i = 5; i < images.length; i += 5) {
          const batch = images.slice(i, i + 5).map(image => {
            const imageUrl = image.url.startsWith('http') 
              ? image.url 
              : `${baseUrl}${image.url}`;
            
            return {
              type: 'image',
              originalContentUrl: imageUrl,
              previewImageUrl: imageUrl
            };
          });
          
          if (chatContext?.isGroupChat) {
            await lineService.pushMessageToChat(chatContext.chatId, batch, chatContext.chatType);
          } else {
            await lineService.pushMessage(userId, batch);
          }
          
          // Small delay between batches
          if (i + 5 < images.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        // Send completion message
        const completionMessage = {
          type: 'text',
          text: `✅ แสดงครบทั้ง ${images.length} รูปแล้ว`
        };
        
        if (chatContext?.isGroupChat) {
          await lineService.pushMessageToChat(chatContext.chatId, completionMessage, chatContext.chatType);
        } else {
          await lineService.pushMessage(userId, completionMessage);
        }
      }
      
    } catch (error) {
      logger.error('Error sending images directly:', error);
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