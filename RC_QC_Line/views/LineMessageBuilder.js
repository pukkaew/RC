// Builder for LINE messages
const lineConfig = require('../config/line');
const dateFormatter = require('../utils/DateFormatter');

class LineMessageBuilder {
  constructor() {
    this.dateFormatter = dateFormatter;
  }

  // Build a simple text message
  buildTextMessage(text) {
    return {
      type: 'text',
      text: text
    };
  }

  // Build an image message
  buildImageMessage(originalUrl, previewUrl = null) {
    // Ensure URL uses BASE_URL environment variable for external access
    if (originalUrl.startsWith('/')) {
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      originalUrl = baseUrl + originalUrl;
      previewUrl = previewUrl ? baseUrl + previewUrl : originalUrl;
    }
    
    return {
      type: 'image',
      originalContentUrl: originalUrl,
      previewImageUrl: previewUrl || originalUrl
    };
  }

  // Build a quick reply item
  buildQuickReplyItem(label, text, data = null) {
    return {
      type: 'action',
      action: {
        type: data ? 'postback' : 'message',
        label: label,
        ...(data ? { 
          data: data,
          displayText: text
        } : { 
          text: text 
        })
      }
    };
  }

  // Build a message with quick reply options
  buildQuickReplyMessage(text, items) {
    return {
      type: 'text',
      text: text,
      quickReply: {
        items: items
      }
    };
  }

  // Build a message asking for Lot number
  buildLotNumberRequestMessage(action) {
    const text = action === lineConfig.userActions.upload
      ? 'กรุณาระบุเลข Lot สำหรับรูปภาพที่อัปโหลด'
      : 'กรุณาระบุเลข Lot ที่ต้องการดูรูปภาพ';
    
    return this.buildTextMessage(text);
  }

  // Build a message showing image upload success
  buildUploadSuccessMessage(result) {
    const { lot, images } = result;
    const imageCount = images.length;
    const lotNumber = lot.lot_number;
    const date = this.dateFormatter.formatDisplayDate(images[0].imageDate);
    
    let text = `อัปโหลดสำเร็จ ${imageCount} รูปภาพ\n`;
    text += `Lot: ${lotNumber}\n`;
    text += `วันที่: ${date}\n\n`;
    
    if (imageCount > 0) {
      const savedSize = images.reduce((total, img) => {
        return total + (img.originalSize - img.compressedSize);
      }, 0);
      
      const savedMB = (savedSize / (1024 * 1024)).toFixed(2);
      text += `ประหยัดพื้นที่ได้: ${savedMB} MB`;
    }
    
    return this.buildTextMessage(text);
  }

  // Build Image Carousel messages that can be swiped left/right (แบบเลื่อนซ้ายขวาได้)
  buildImageViewMessages(result) {
    const { lotNumber, imageDate, images } = result;
    const formattedDate = this.dateFormatter.formatDisplayDate(imageDate);
    const messages = [];
    
    // If no images found
    if (images.length === 0) {
      return [this.buildNoImagesFoundMessage(lotNumber, imageDate)];
    }
    
    // Add info message first
    let infoText = `📸 Lot: ${lotNumber}\n`;
    infoText += `📅 วันที่: ${formattedDate}\n`;
    infoText += `📊 จำนวนรูปภาพ: ${images.length} รูป\n`;
    infoText += `👈👉 เลื่อนซ้ายขวาเพื่อดูรูปภาพ`;
    
    messages.push(this.buildTextMessage(infoText));
    
    // Use Flex Carousel (ใช้ Flex Carousel เพราะมั่นใจได้ว่าทำงาน)
    const flexCarousel = this.buildFlexImageCarousel(images, lotNumber, formattedDate);
    messages.push(flexCarousel);
    
    // Add note for remaining images if needed
    if (images.length > 10) {
      messages.push(this.buildTextMessage(`⚠️ แสดง 10 รูปแรกจากทั้งหมด ${images.length} รูป\nใช้คำสั่ง #view ${lotNumber} เพื่อดูรูปเพิ่มเติม`));
    }
    
    return messages;
  }

  // Build simple native image messages (fallback option)
  buildNativeImageMessages(result) {
    const { lotNumber, imageDate, images } = result;
    const formattedDate = this.dateFormatter.formatDisplayDate(imageDate);
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const messages = [];
    
    // If no images found
    if (images.length === 0) {
      return [this.buildNoImagesFoundMessage(lotNumber, imageDate)];
    }
    
    // Add info message first
    let infoText = `📸 Lot: ${lotNumber}\n`;
    infoText += `📅 วันที่: ${formattedDate}\n`;
    infoText += `📊 จำนวนรูปภาพ: ${images.length} รูป`;
    
    messages.push(this.buildTextMessage(infoText));
    
    // Send all images as native LINE image messages (can be clicked and viewed)
    images.forEach((image, index) => {
      const imageUrl = image.url.startsWith('http') 
        ? image.url 
        : `${baseUrl}${image.url}`;
      
      messages.push(this.buildImageMessage(imageUrl));
    });
    
    return messages;
  }

  // Build Image Carousel (รูปภาพแบบเลื่อนซ้ายขวา) - LINE Template
  buildImageCarousel(images, lotNumber, formattedDate) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const maxCarouselItems = 10; // LINE limit for image carousel
    
    // Prepare image columns for carousel - ต้องใช้โครงสร้างที่ถูกต้องตาม LINE API
    const imageColumns = images.slice(0, maxCarouselItems).map((image, index) => {
      const imageUrl = image.url.startsWith('http') 
        ? image.url 
        : `${baseUrl}${image.url}`;
      
      return {
        imageUrl: imageUrl,  // ใช้ imageUrl แทน originalContentUrl
        action: {
          type: "uri",
          uri: imageUrl  // เมื่อแตะรูปจะเปิดรูปขนาดใหญ่
        }
      };
    });
    
    // Create image carousel message
    const imageCarousel = {
      type: "template",
      altText: `รูปภาพ Lot: ${lotNumber} (${images.length} รูป) - เลื่อนซ้ายขวาเพื่อดู`,
      template: {
        type: "image_carousel",
        columns: imageColumns
      }
    };
    
    // If there are more than 10 images, add a note
    if (images.length > maxCarouselItems) {
      return [
        imageCarousel,
        this.buildTextMessage(`⚠️ แสดง ${maxCarouselItems} รูปแรกจากทั้งหมด ${images.length} รูป\nใช้คำสั่ง #view ${lotNumber} เพื่อดูรูปเพิ่มเติม`)
      ];
    }
    
    return imageCarousel;
  }

  // Build Flex Image Carousel (สำหรับกรณีต้องการข้อมูลเพิ่มเติม)
  buildFlexImageCarousel(images, lotNumber, formattedDate) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const maxCarouselItems = 10; // LINE limit
    
    // Create image bubbles for flex carousel
    const imageBubbles = images.slice(0, maxCarouselItems).map((image, index) => {
      const imageUrl = image.url.startsWith('http') 
        ? image.url 
        : `${baseUrl}${image.url}`;
      
      const uploadTime = new Date(image.uploaded_at).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      return {
        type: "bubble",
        hero: {
          type: "image",
          url: imageUrl,
          size: "full",
          aspectRatio: "1:1",
          aspectMode: "cover",
          action: {
            type: "uri",
            uri: imageUrl
          }
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: `รูปที่ ${index + 1}`,
              weight: "bold",
              size: "lg",
              align: "center"
            },
            {
              type: "text",
              text: `Lot: ${lotNumber}`,
              size: "sm",
              align: "center",
              color: "#666666",
              margin: "sm"
            },
            {
              type: "text",
              text: `เวลา: ${uploadTime}`,
              size: "xs",
              align: "center",
              color: "#999999",
              margin: "xs"
            }
          ],
          spacing: "sm",
          paddingAll: "13px"
        }
      };
    });
    
    return {
      type: "flex",
      altText: `รูปภาพ Lot: ${lotNumber} (${images.length} รูป) - เลื่อนซ้ายขวาเพื่อดู`,
      contents: {
        type: "carousel",
        contents: imageBubbles
      }
    };
  }

  // Build a message for no images found
  buildNoImagesFoundMessage(lotNumber, date = null) {
    let message = `ไม่พบรูปภาพสำหรับ Lot: ${lotNumber}`;
    
    if (date) {
      const formattedDate = this.dateFormatter.formatDisplayDate(date);
      message += ` วันที่: ${formattedDate}`;
    }
    
    message += '\nกรุณาตรวจสอบเลข Lot หรืออัปโหลดรูปภาพก่อน';
    
    return this.buildTextMessage(message);
  }

  // Build an error message
  buildErrorMessage(message) {
    return this.buildTextMessage(`เกิดข้อผิดพลาด: ${message}`);
  }

  // Build Flex Message for image deletion selection (ใช้ Image Carousel แบบเลื่อนได้)
  buildImageDeleteFlexMessage(lotNumber, imageDate, images) {
    const formattedDate = this.dateFormatter.formatDisplayDate(imageDate);
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    // Create image items for deletion selection
    const imageItems = images.map((image, index) => {
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
              text: `รูปที่ ${index + 1}`,
              weight: "bold",
              size: "md",
              align: "center"
            },
            {
              type: "text",
              text: `Lot: ${lotNumber}`,
              size: "sm",
              margin: "md",
              color: "#666666",
              align: "center"
            },
            {
              type: "text",
              text: `วันที่: ${formattedDate}`,
              size: "sm",
              margin: "xs",
              color: "#666666",
              align: "center"
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
                label: "🗑️ ลบรูปภาพนี้",
                data: `action=delete_image&image_id=${image.image_id}&lot=${lotNumber}&date=${this.dateFormatter.formatISODate(imageDate)}`,
                displayText: `เลือกลบรูปภาพที่ ${index + 1}`
              }
            }
          ]
        }
      };
    });
    
    return {
      type: "flex",
      altText: "เลือกรูปภาพที่ต้องการลบ - เลื่อนซ้ายขวาเพื่อดู",
      contents: {
        type: "carousel",
        contents: imageItems
      }
    };
  }
}

module.exports = new LineMessageBuilder();