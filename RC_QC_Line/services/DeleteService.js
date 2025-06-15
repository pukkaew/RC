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

  // Create image selection for deletion - FIXED: Limit carousel to 10 items
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
      
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const totalImages = result.images.length;
      
      // If more than 10 images, use grid view instead of carousel
      if (totalImages > 10) {
        return this.createDeleteGridMessage(lotNumber, date, result.images);
      }
      
      // Create carousel for 10 or fewer images
      const carouselItems = result.images.map((image, index) => {
        const imageUrl = image.url.startsWith('http') 
          ? image.url 
          : `${baseUrl}${image.url}`;
        
        return {
          type: "bubble",
          hero: {
            type: "image",
            url: imageUrl,
            size: "full",
            aspectRatio: "1:1",
            aspectMode: "cover"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: `รูปที่ ${index + 1}/${totalImages}`,
                weight: "bold",
                size: "md"
              },
              {
                type: "text",
                text: `Lot: ${lotNumber}`,
                size: "sm",
                margin: "md"
              },
              {
                type: "text",
                text: `อัปโหลดเมื่อ: ${new Date(image.uploaded_at).toLocaleString('th-TH')}`,
                size: "sm",
                margin: "sm"
              }
            ]
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                color: "#FF0000",
                action: {
                  type: "postback",
                  label: "ลบรูปภาพนี้",
                  data: `action=delete_image&image_id=${image.image_id}&lot=${lotNumber}&date=${date}`,
                  displayText: `เลือกลบรูปภาพที่ ${index + 1}`
                }
              }
            ]
          }
        };
      });
      
      // Create the carousel message
      const carouselMessage = {
        type: "flex",
        altText: "เลือกรูปภาพที่ต้องการลบ",
        contents: {
          type: "carousel",
          contents: carouselItems
        }
      };
      
      return carouselMessage;
    } catch (error) {
      logger.error('Error creating image delete selector:', error);
      throw error;
    }
  }

  // Create grid view for more than 10 images
  createDeleteGridMessage(lotNumber, date, images) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const formattedDate = new Date(date).toLocaleDateString('th-TH');
    
    // Show first 9 images in a 3x3 grid
    const displayImages = images.slice(0, 9);
    const remainingCount = Math.max(0, images.length - 9);
    
    // Create image boxes
    const imageBoxes = displayImages.map((image, index) => {
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
            aspectRatio: "1:1",
            aspectMode: "cover",
            size: "full",
            action: {
              type: "postback",
              data: `action=delete_image&image_id=${image.image_id}&lot=${lotNumber}&date=${date}`,
              displayText: `เลือกลบรูปที่ ${index + 1}`
            }
          },
          {
            type: "text",
            text: `${index + 1}`,
            size: "xs",
            color: "#FFFFFF",
            backgroundColor: "#FF0000",
            position: "absolute",
            offsetTop: "5px",
            offsetStart: "5px",
            paddingAll: "3px"
          }
        ],
        flex: 1,
        margin: "xs",
        cornerRadius: "5px"
      };
    });
    
    // Fill empty slots
    while (imageBoxes.length < 9) {
      imageBoxes.push({
        type: "box",
        layout: "vertical",
        contents: [],
        backgroundColor: "#F0F0F0",
        flex: 1,
        margin: "xs",
        cornerRadius: "5px"
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
      altText: "เลือกรูปภาพที่ต้องการลบ",
      contents: {
        type: "bubble",
        size: "mega",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "🗑️ เลือกรูปที่จะลบ",
              weight: "bold",
              size: "lg",
              color: "#FF0000"
            },
            {
              type: "text",
              text: `📦 Lot: ${lotNumber} | 📅 ${formattedDate}`,
              size: "sm",
              color: "#666666",
              margin: "xs"
            },
            {
              type: "text",
              text: `🖼️ ทั้งหมด ${images.length} รูป (แสดง 9 รูปแรก)`,
              size: "sm",
              color: "#999999",
              margin: "xs"
            }
          ],
          paddingAll: "15px",
          backgroundColor: "#FFF0F0"
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            ...rows,
            remainingCount > 0 ? {
              type: "text",
              text: `และอีก ${remainingCount} รูป - กดที่รูปเพื่อเลือกลบ`,
              size: "sm",
              color: "#666666",
              align: "center",
              margin: "lg"
            } : {
              type: "box",
              layout: "vertical",
              contents: []
            }
          ],
          paddingAll: "10px"
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "💡 แตะที่รูปภาพเพื่อเลือกลบ",
              size: "xs",
              color: "#999999",
              align: "center"
            },
            {
              type: "text",
              text: "หรือพิมพ์หมายเลขรูปที่ต้องการลบ",
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
      await this.imageCompressor.deleteImage(image.file_path);
      
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