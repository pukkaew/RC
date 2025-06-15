// Controller for image retrieval and viewing - Direct Send Implementation
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

  // Process date selection and send images directly to chat
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
      
      // Send images directly to chat
      await this.sendImagesToChat(userId, result, replyToken);
      
    } catch (error) {
      logger.error('Error processing date selection for viewing:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการดึงรูปภาพ โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Send images directly to chat
  async sendImagesToChat(userId, result, replyToken) {
    try {
      const { lotNumber, imageDate, images } = result;
      const formattedDate = new Date(imageDate).toLocaleDateString('th-TH');
      const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
      
      // Create messages array
      const messages = [];
      
      // Header message
      messages.push({
        type: 'text',
        text: `📸 รูปภาพ QC\n📦 Lot: ${lotNumber}\n📅 ${formattedDate}\n🖼️ จำนวน ${images.length} รูป`
      });
      
      // Convert images to LINE image messages (max 4 images per reply due to LINE limit of 5 messages)
      const imageMessages = images.slice(0, 4).map(image => {
        const imageUrl = image.url.startsWith('http') 
          ? image.url 
          : `${baseUrl}${image.url}`;
        
        return {
          type: 'image',
          originalContentUrl: imageUrl,
          previewImageUrl: imageUrl
        };
      });
      
      messages.push(...imageMessages);
      
      // Send first batch with reply token
      await lineService.replyMessage(replyToken, messages);
      
      // Send remaining images if any (using push messages)
      if (images.length > 4) {
        // Wait a bit before sending more
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        for (let i = 4; i < images.length; i += 5) {
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
          
          await lineService.pushMessage(userId, batch);
          
          // Small delay between batches
          if (i + 5 < images.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        // Send completion message
        await lineService.pushMessage(userId, {
          type: 'text',
          text: `✅ แสดงรูปภาพทั้งหมด ${images.length} รูป เรียบร้อยแล้ว\n\n💡 Tip: คุณสามารถ:\n• กดที่รูปเพื่อดูขนาดเต็ม\n• กดค้างแล้วเลือก "บันทึก" เพื่อเก็บรูป\n• กดค้างแล้วเลือก "ส่งต่อ" เพื่อแชร์ต่อ`
        });
      }
      
      logger.info(`Sent ${images.length} images for Lot: ${lotNumber}, Date: ${imageDate}`);
      
    } catch (error) {
      logger.error('Error sending images to chat:', error);
      throw error;
    }
  }

  // Build album preview message (kept for compatibility)
  buildAlbumPreviewMessage(lotNumber, date, images) {
    const formattedDate = new Date(date).toLocaleDateString('th-TH');
    const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
    
    // Limit preview images to 9 for 3x3 grid
    const previewImages = images.slice(0, 9);
    const remainingCount = Math.max(0, images.length - 9);
    
    // Create image boxes for preview
    const imageBoxes = previewImages.map((image, index) => {
      const imageUrl = image.url.startsWith('http') 
        ? image.url 
        : `${baseUrl}${image.url}`;
      
      return {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "image",
            url: imageUrl,
            size: "full",
            aspectMode: "cover",
            aspectRatio: "1:1"
          }
        ],
        cornerRadius: "5px",
        margin: "2px"
      };
    });
    
    // Fill empty slots if less than 9 images
    while (imageBoxes.length < 9) {
      imageBoxes.push({
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "vertical",
            contents: [],
            backgroundColor: "#F0F0F0"
          }
        ],
        cornerRadius: "5px",
        margin: "2px"
      });
    }
    
    // Create 3x3 grid
    const rows = [];
    for (let i = 0; i < 9; i += 3) {
      rows.push({
        type: "box",
        layout: "horizontal",
        contents: imageBoxes.slice(i, i + 3),
        spacing: "xs"
      });
    }
    
    return {
      type: "flex",
      altText: `อัลบั้มรูปภาพ - Lot: ${lotNumber}`,
      contents: {
        type: "bubble",
        size: "mega",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "📸 อัลบั้มรูปภาพ QC",
              size: "xl",
              weight: "bold",
              color: "#00B900"
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: `📦 Lot: ${lotNumber}`,
                  size: "sm",
                  color: "#666666",
                  flex: 0
                },
                {
                  type: "text",
                  text: `📅 ${formattedDate}`,
                  size: "sm",
                  color: "#666666",
                  align: "end",
                  flex: 0
                }
              ],
              margin: "sm"
            },
            {
              type: "text",
              text: `🖼️ ทั้งหมด ${images.length} รูป`,
              size: "md",
              weight: "bold",
              color: "#333333",
              margin: "xs"
            }
          ],
          paddingAll: "15px",
          backgroundColor: "#F8FFF8"
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "box",
              layout: "vertical",
              contents: rows,
              backgroundColor: "#FFFFFF",
              cornerRadius: "8px",
              paddingAll: "5px"
            },
            remainingCount > 0 ? {
              type: "text",
              text: `...และอีก ${remainingCount} รูป`,
              size: "sm",
              color: "#999999",
              align: "center",
              margin: "md"
            } : {
              type: "box",
              layout: "vertical",
              contents: []
            }
          ],
          paddingAll: "10px",
          backgroundColor: "#FAFAFA"
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "text",
              text: "รูปภาพถูกส่งมาในแชทแล้ว",
              size: "sm",
              color: "#666666",
              align: "center"
            }
          ],
          paddingAll: "15px"
        }
      }
    };
  }

  // Handle sending images to chat for PC users
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
      
      // Send images directly
      await this.sendImagesToChat(userId, result, replyToken);
      
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