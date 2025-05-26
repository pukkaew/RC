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

  // Build messages for showing images (using Image Carousel Template - แชร์ได้)
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
    infoText += `👆 เลื่อนซ้าย-ขวาดูรูป | กดค้างเพื่อแชร์รูป`;
    
    messages.push(this.buildTextMessage(infoText));
    
    // Build Image Carousel Template messages (แชร์ได้)
    const carouselMessages = this.buildShareableImageCarousels(images, lotNumber, formattedDate);
    messages.push(...carouselMessages);
    
    return messages;
  }

  // Build Shareable Image Carousel messages (รูปแชร์ได้ - ไม่จำกัดจำนวน)
  buildShareableImageCarousels(images, lotNumber, formattedDate) {
    const messages = [];
    const maxCarouselItems = 10; // LINE limit per Image Carousel (ไม่เปลี่ยนได้)
    // ไม่จำกัด carousel - แสดงรูปทั้งหมด
    const totalCarousels = Math.ceil(images.length / maxCarouselItems);
    
    // Build Image Carousel messages สำหรับรูปทั้งหมด
    for (let carouselIndex = 0; carouselIndex < totalCarousels; carouselIndex++) {
      const startIndex = carouselIndex * maxCarouselItems;
      const endIndex = Math.min(startIndex + maxCarouselItems, images.length);
      const carouselImages = images.slice(startIndex, endIndex);
      
      // Create Image Carousel Template (แชร์ได้)
      const imageCarousel = this.buildShareableImageCarouselTemplate(
        carouselImages, 
        lotNumber, 
        formattedDate, 
        carouselIndex + 1, 
        totalCarousels,
        startIndex
      );
      
      messages.push(imageCarousel);
      
      // Add separator for multiple carousels (except last one)
      if (carouselIndex < totalCarousels - 1) {
        const nextBatchStart = endIndex + 1;
        const nextBatchEnd = Math.min(endIndex + maxCarouselItems, images.length);
        messages.push(this.buildTextMessage(`📸 รูปที่ ${nextBatchStart}-${nextBatchEnd} 👇`));
      }
    }
    
    // Add summary message
    if (totalCarousels > 1) {
      messages.push(this.buildTextMessage(`✅ แสดงครบทั้งหมด ${images.length} รูปแล้ว - แชร์ได้เลย!`));
    } else {
      messages.push(this.buildTextMessage(`✅ รูปทั้งหมด ${images.length} รูป - กดค้างเพื่อแชร์!`));
    }
    
    return messages;
  }

  // Build single Image Carousel Template (แชร์ได้ + เลื่อนซ้าย-ขวาได้)
  buildShareableImageCarouselTemplate(images, lotNumber, formattedDate, carouselNumber = 1, totalCarousels = 1, startIndex = 0) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    // Create image columns for the carousel
    const imageColumns = images.map((image, index) => {
      const imageUrl = image.url.startsWith('http') 
        ? image.url 
        : `${baseUrl}${image.url}`;
      
      const globalImageNumber = startIndex + index + 1;
      const uploadTime = new Date(image.uploaded_at).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      return {
        imageUrl: imageUrl,
        action: {
          type: "uri",
          uri: imageUrl  // คลิกเพื่อดูรูปขนาดใหญ่
        }
      };
    });
    
    // Create alt text with carousel info
    let altText = `รูปภาพ Lot: ${lotNumber} (${images.length} รูป)`;
    
    if (totalCarousels > 1) {
      altText = `รูปภาพ Lot: ${lotNumber} (ชุด ${carouselNumber}/${totalCarousels}) - ${images.length} รูป`;
    }
    
    altText += ` | เลื่อนซ้าย-ขวา | กดค้างแชร์รูป`;
    
    // Return Image Carousel Template (รูปแชร์ได้)
    return {
      type: "template",
      altText: altText,
      template: {
        type: "image_carousel",
        columns: imageColumns
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

  // Build Flex Message for image deletion selection (using carousel for better UX)
  buildImageDeleteFlexMessage(lotNumber, imageDate, images) {
    const formattedDate = this.dateFormatter.formatDisplayDate(imageDate);
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    // Limit to prevent too many options (LINE carousel limit is 10)
    const maxItems = Math.min(images.length, 10);
    const displayImages = images.slice(0, maxItems);
    
    // Create image items for deletion selection
    const imageItems = displayImages.map((image, index) => {
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
              align: "center",
              color: "#1DB446"
            },
            {
              type: "text",
              text: `เวลา: ${uploadTime}`,
              size: "sm",
              margin: "sm",
              color: "#666666",
              align: "center"
            }
          ],
          spacing: "sm",
          paddingAll: "12px"
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              style: "primary",
              color: "#FF5551",
              action: {
                type: "postback",
                label: "🗑️ ลบรูปนี้",
                data: `action=delete_image&image_id=${image.image_id}&lot=${lotNumber}&date=${this.dateFormatter.formatISODate(imageDate)}`,
                displayText: `เลือกลบรูปภาพที่ ${index + 1}`
              }
            }
          ],
          paddingAll: "12px"
        }
      };
    });
    
    // If there are more images than we can show, add a note
    if (images.length > maxItems) {
      // Add a bubble with information about remaining images
      imageItems.push({
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "มีรูปเพิ่มเติม",
              weight: "bold",
              size: "lg",
              align: "center",
              color: "#FF6B35"
            },
            {
              type: "text",
              text: `เหลืออีก ${images.length - maxItems} รูป`,
              size: "md",
              margin: "md",
              color: "#666666",
              align: "center"
            },
            {
              type: "text",
              text: "ใช้คำสั่ง #del อีกครั้ง\nเพื่อดูรูปเพิ่มเติม",
              size: "sm",
              margin: "md",
              color: "#999999",
              align: "center",
              wrap: true
            }
          ],
          spacing: "sm",
          paddingAll: "20px",
          justifyContent: "center"
        }
      });
    }
    
    return {
      type: "flex",
      altText: `เลือกรูปที่ต้องการลบ - Lot: ${lotNumber} (${images.length} รูป)`,
      contents: {
        type: "carousel",
        contents: imageItems
      }
    };
  }
}

module.exports = new LineMessageBuilder();