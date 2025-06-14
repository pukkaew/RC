// Controller for image retrieval and viewing - Updated with LIFF Support
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
      
      // Show date picker with only dates that have images (NO CONFIRMATION MESSAGE)
      // Pass replyToken to sendViewDatePicker so it can reply directly
      await datePickerService.sendViewDatePicker(userId, trimmedLot, chatContext, replyToken);
      
    } catch (error) {
      logger.error('Error processing Lot number for viewing:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการประมวลผลเลข Lot โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Process date selection and automatically open LIFF
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
      
      // Build LIFF URL with parameters
      const liffUrl = `https://liff.line.me/2007575196-NWaXrZVE?lot=${encodeURIComponent(lotNumber)}&date=${encodeURIComponent(date)}`;
      
      // Create message with automatic LIFF opening
      const messages = [
        {
          type: "text",
          text: `📸 พบรูปภาพ ${result.images.length} รูป\n📦 Lot: ${lotNumber}\n📅 วันที่: ${new Date(date).toLocaleDateString('th-TH')}\n\n🔄 กำลังเปิดหน้าดูรูปภาพ...`
        },
        {
          type: "flex",
          altText: "เปิดดูรูปภาพ",
          contents: {
            type: "bubble",
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "button",
                  action: {
                    type: "uri",
                    uri: liffUrl
                  },
                  height: "sm",
                  style: "link",
                  gravity: "center"
                }
              ],
              height: "50px",
              backgroundColor: "#FFFFFF",
              action: {
                type: "uri",
                uri: liffUrl
              }
            }
          }
        }
      ];
      
      // Send messages with auto-opening LIFF
      await lineService.replyMessage(replyToken, messages);
      
    } catch (error) {
      logger.error('Error processing date selection for viewing:', error);
      
      // Reply with error message
      const errorMessage = 'เกิดข้อผิดพลาดในการดึงรูปภาพ โปรดลองใหม่อีกครั้ง';
      await lineService.replyMessage(replyToken, lineService.createTextMessage(errorMessage));
      
      throw error;
    }
  }

  // Build LIFF viewer message (not used anymore but kept for compatibility)
  buildLiffViewerMessage(lotNumber, date, imageCount, liffUrl) {
    const formattedDate = new Date(date).toLocaleDateString('th-TH');
    
    return {
      type: "flex",
      altText: `ดูรูปภาพ ${imageCount} รูป - Lot: ${lotNumber}`,
      contents: {
        type: "bubble",
        hero: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "📸",
                  size: "4xl",
                  flex: 0,
                  align: "center"
                },
                {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "text",
                      text: "Photo Viewer",
                      size: "xl",
                      weight: "bold",
                      color: "#00B900"
                    },
                    {
                      type: "text",
                      text: "ดูและแชร์รูปภาพ QC",
                      size: "sm",
                      color: "#666666"
                    }
                  ],
                  margin: "lg",
                  flex: 1
                }
              ],
              paddingAll: "20px",
              backgroundColor: "#F0FFF0"
            }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: `พบรูปภาพ ${imageCount} รูป`,
              size: "lg",
              weight: "bold",
              color: "#00B900",
              align: "center"
            },
            {
              type: "box",
              layout: "vertical",
              margin: "lg",
              spacing: "sm",
              contents: [
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    {
                      type: "text",
                      text: "📦 Lot:",
                      flex: 0,
                      color: "#666666"
                    },
                    {
                      type: "text",
                      text: lotNumber,
                      flex: 1,
                      weight: "bold",
                      align: "end"
                    }
                  ]
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    {
                      type: "text",
                      text: "📅 วันที่:",
                      flex: 0,
                      color: "#666666"
                    },
                    {
                      type: "text",
                      text: formattedDate,
                      flex: 1,
                      weight: "bold",
                      align: "end"
                    }
                  ]
                }
              ]
            },
            {
              type: "separator",
              margin: "lg"
            },
            {
              type: "box",
              layout: "vertical",
              margin: "lg",
              contents: [
                {
                  type: "text",
                  text: "✨ คุณสมบัติ",
                  weight: "bold",
                  color: "#333333",
                  size: "sm"
                },
                {
                  type: "text",
                  text: "• ดูรูปภาพทั้งหมดในรูปแบบ Grid",
                  size: "xs",
                  color: "#666666",
                  margin: "sm",
                  wrap: true
                },
                {
                  type: "text",
                  text: "• เลือกและแชร์รูปที่ต้องการ",
                  size: "xs",
                  color: "#666666",
                  wrap: true
                },
                {
                  type: "text",
                  text: "• ดูรูปแบบเต็มจอได้",
                  size: "xs",
                  color: "#666666",
                  wrap: true
                }
              ]
            }
          ],
          paddingAll: "20px"
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "button",
              style: "primary",
              height: "md",
              action: {
                type: "uri",
                label: "🖼️ เปิดดูรูปภาพ",
                uri: liffUrl
              },
              color: "#00B900"
            },
            {
              type: "text",
              text: "กดปุ่มด้านบนเพื่อเปิดหน้าดูรูปภาพ",
              size: "xs",
              color: "#999999",
              align: "center",
              margin: "sm"
            }
          ],
          paddingAll: "20px"
        }
      }
    };
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