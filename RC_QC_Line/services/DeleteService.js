// Service for deleting images
const lineService = require('./LineService');
const imageService = require('./ImageService');
const datePickerService = require('./DatePickerService');
const imageModel = require('../models/ImageModel');
const lotModel = require('../models/LotModel');
const logger = require('../utils/Logger');
const { AppError } = require('../utils/ErrorHandler');

class DeleteService {
  // Get images for a specific lot and date with delete options
  async getImagesWithDeleteOptions(lotNumber, date) {
    try {
      // Get images from database
      const result = await imageService.getImagesByLotAndDate(lotNumber, date);
      
      if (!result.images || result.images.length === 0) {
        return {
          lotNumber,
          date,
          hasImages: false,
          message: `ไม่พบรูปภาพสำหรับ Lot: ${lotNumber} วันที่: ${date}`
        };
      }
      
      // Create delete options for each image
      const images = result.images.map((image, index) => ({
        ...image,
        deleteAction: `delete_image_${image.image_id}`
      }));
      
      return {
        lotNumber,
        date,
        hasImages: true,
        images,
        count: images.length
      };
    } catch (error) {
      logger.error('Error getting images with delete options:', error);
      throw error;
    }
  }

  // Create delete confirmation message
  async createDeleteConfirmationMessage(imageId, lotNumber, date) {
    try {
      // Get image details
      const query = `
        SELECT i.*, l.lot_number 
        FROM Images i
        JOIN Lots l ON i.lot_id = l.lot_id
        WHERE i.image_id = @imageId
      `;
      
      const params = [
        { name: 'imageId', type: require('mssql').Int, value: imageId }
      ];
      
      const result = await require('../services/DatabaseService').executeQuery(query, params);
      
      if (!result.recordset || result.recordset.length === 0) {
        throw new AppError('Image not found', 404);
      }
      
      const image = result.recordset[0];
      
      // Create confirmation flex message
      const confirmMessage = {
        type: "flex",
        altText: "ยืนยันการลบรูปภาพ",
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "ยืนยันการลบรูปภาพ",
                weight: "bold",
                size: "lg"
              },
              {
                type: "text",
                text: `Lot: ${lotNumber}`,
                size: "md",
                margin: "md"
              },
              {
                type: "text",
                text: `วันที่: ${new Date(date).toLocaleDateString('th-TH')}`,
                size: "md",
                margin: "sm"
              },
              {
                type: "text",
                text: "คุณต้องการลบรูปภาพนี้ใช่หรือไม่?",
                size: "md",
                margin: "md",
                color: "#FF0000"
              }
            ]
          },
          footer: {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "button",
                style: "secondary",
                action: {
                  type: "postback",
                  label: "ยกเลิก",
                  data: `action=cancel_delete&lot=${lotNumber}&date=${date}`,
                  displayText: "ยกเลิกการลบรูปภาพ"
                }
              },
              {
                type: "button",
                style: "primary",
                color: "#FF0000",
                action: {
                  type: "postback",
                  label: "ลบรูปภาพ",
                  data: `action=confirm_delete&image_id=${imageId}&lot=${lotNumber}&date=${date}`,
                  displayText: "ยืนยันลบรูปภาพ"
                }
              }
            ],
            spacing: "md"
          }
        }
      };
      
      return confirmMessage;
    } catch (error) {
      logger.error('Error creating delete confirmation message:', error);
      throw error;
    }
  }

  // Create image selection for deletion - FIXED with simpler approach
  async createImageDeleteSelector(lotNumber, date) {
    try {
      // Get images with delete options
      const result = await this.getImagesWithDeleteOptions(lotNumber, date);
      
      if (!result.hasImages) {
        return {
          type: "text",
          text: result.message
        };
      }
      
      const totalImages = result.images.length;
      
      // If more than 6 images, use text list instead
      if (totalImages > 6) {
        return this.createTextDeleteList(lotNumber, date, result.images);
      }
      
      // Create simple flex message for 6 or fewer images
      return this.createSimpleDeleteGrid(lotNumber, date, result.images);
    } catch (error) {
      logger.error('Error creating image delete selector:', error);
      throw error;
    }
  }

  // Create simple grid for 6 or fewer images
  createSimpleDeleteGrid(lotNumber, date, images) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    // Create buttons for each image
    const buttons = images.map((image, index) => ({
      type: "button",
      style: "secondary",
      action: {
        type: "postback",
        label: `ลบรูปที่ ${index + 1}`,
        data: `action=delete_image&image_id=${image.image_id}&lot=${lotNumber}&date=${date}`,
        displayText: `เลือกลบรูปที่ ${index + 1}`
      },
      margin: "sm"
    }));
    
    return {
      type: "flex",
      altText: "เลือกรูปภาพที่ต้องการลบ",
      contents: {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "เลือกรูปที่ต้องการลบ",
              weight: "bold",
              size: "lg"
            },
            {
              type: "text",
              text: `Lot: ${lotNumber}`,
              size: "sm",
              color: "#666666",
              margin: "sm"
            },
            {
              type: "text",
              text: `วันที่: ${new Date(date).toLocaleDateString('th-TH')}`,
              size: "sm",
              color: "#666666"
            },
            {
              type: "text",
              text: `จำนวน: ${images.length} รูป`,
              size: "sm",
              color: "#666666"
            }
          ],
          paddingAll: "15px",
          backgroundColor: "#FFF0F0"
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: buttons,
          paddingAll: "10px"
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "กดปุ่มเพื่อเลือกรูปที่ต้องการลบ",
              size: "xs",
              color: "#999999",
              align: "center"
            }
          ],
          paddingAll: "10px"
        }
      }
    };
  }

  // Create text list for many images
  createTextDeleteList(lotNumber, date, images) {
    let message = `🗑️ เลือกรูปที่ต้องการลบ\n`;
    message += `📦 Lot: ${lotNumber}\n`;
    message += `📅 วันที่: ${new Date(date).toLocaleDateString('th-TH')}\n`;
    message += `🖼️ จำนวน: ${images.length} รูป\n\n`;
    
    // List first 9 images
    const displayImages = images.slice(0, 9);
    displayImages.forEach((image, index) => {
      const uploadTime = new Date(image.uploaded_at).toLocaleTimeString('th-TH', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      message += `${index + 1}. รูปที่ ${index + 1} (${uploadTime})\n`;
    });
    
    if (images.length > 9) {
      message += `\n... และอีก ${images.length - 9} รูป\n`;
    }
    
    message += `\n💡 พิมพ์หมายเลขรูปที่ต้องการลบ (1-${images.length})`;
    
    // Store delete context for number input
    const chatId = 'direct'; // You'll need to pass chatContext here
    lineService.setUserState('waitingForDeleteNumber', {
      images: images,
      lotNumber: lotNumber,
      date: date
    }, chatId);
    
    return {
      type: "text",
      text: message,
      quickReply: {
        items: displayImages.slice(0, 13).map((image, index) => ({
          type: "action",
          action: {
            type: "postback",
            label: `${index + 1}`,
            data: `action=delete_image&image_id=${image.image_id}&lot=${lotNumber}&date=${date}`,
            displayText: `ลบรูปที่ ${index + 1}`
          }
        }))
      }
    };
  }

  // Delete an image
  async deleteImage(imageId) {
    try {
      // Get image record
      const query = `
        SELECT * FROM Images
        WHERE image_id = @imageId
      `;
      
      const params = [
        { name: 'imageId', type: require('mssql').Int, value: imageId }
      ];
      
      const result = await require('./DatabaseService').executeQuery(query, params);
      
      if (!result.recordset || result.recordset.length === 0) {
        throw new AppError('Image not found', 404);
      }
      
      const image = result.recordset[0];
      
      // Delete file from disk
      const fs = require('fs');
      const path = require('path');
      
      try {
        if (fs.existsSync(image.file_path)) {
          fs.unlinkSync(image.file_path);
          logger.info(`Deleted file: ${image.file_path}`);
        }
      } catch (fileError) {
        logger.error('Error deleting file:', fileError);
        // Continue even if file deletion fails
      }
      
      // Update image status in database
      await imageModel.delete(imageId);
      
      return true;
    } catch (error) {
      logger.error('Error deleting image:', error);
      throw error;
    }
  }
}

module.exports = new DeleteService();