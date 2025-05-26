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
    infoText += `🖼️ แตะรูปเพื่อดูขนาดใหญ่`;
    
    messages.push(this.buildTextMessage(infoText));
    
    // Build image grid messages (แบบ Native LINE Images)
    const imageGridMessages = this.buildImageGridMessages(images, lotNumber);
    messages.push(...imageGridMessages);
    
    return messages;
  }

  // Build Image Grid Messages (แบบ Native LINE Images Grid เหมือนการส่งรูปหลายรูปพร้อมกัน)
  buildImageGridMessages(images, lotNumber) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const messages = [];
    const imagesPerMessage = 5; // LINE รองรับส่งได้สูงสุด 5 รูปต่อข้อความ
    
    // แบ่งรูปเป็นกลุ่มๆ กลุ่มละ 5 รูป
    for (let i = 0; i < images.length; i += imagesPerMessage) {
      const imageGroup = images.slice(i, i + imagesPerMessage);
      const imageMessages = [];
      
      // สร้าง Native Image Messages สำหรับแต่ละรูปในกลุ่ม
      imageGroup.forEach((image, index) => {
        const imageUrl = image.url.startsWith('http') 
          ? image.url 
          : `${baseUrl}${image.url}`;
        
        imageMessages.push(this.buildImageMessage(imageUrl));
      });
      
      // เพิ่มข้อความบอกกลุ่มถ้ามีหลายกลุ่ม
      if (images.length > imagesPerMessage) {
        const groupNumber = Math.floor(i / imagesPerMessage) + 1;
        const totalGroups = Math.ceil(images.length / imagesPerMessage);
        const startImageNumber = i + 1;
        const endImageNumber = Math.min(i + imagesPerMessage, images.length);
        
        // เพิ่มข้อความแยกกลุ่ม
        if (groupNumber > 1) {
          messages.push(this.buildTextMessage(
            `📸 รูปที่ ${startImageNumber}-${endImageNumber} (กลุ่ม ${groupNumber}/${totalGroups})`
          ));
        }
      }
      
      // เพิ่มรูปภาพทั้งกลุ่มลงใน messages
      messages.push(...imageMessages);
    }
    
    // เพิ่มข้อความสรุปท้าย
    if (images.length > imagesPerMessage) {
      const totalGroups = Math.ceil(images.length / imagesPerMessage);
      messages.push(this.buildTextMessage(
        `✅ แสดงครบทั้งหมด ${images.length} รูป (${totalGroups} กลุ่ม)\n` +
        `💡 แตะรูปเพื่อดูขนาดใหญ่`
      ));
    }
    
    return messages;
  }
  buildMultipleFlexCarousels(images, lotNumber, formattedDate) {
    const maxCarouselItems = 10; // LINE limit per carousel
    const maxCarousels = 5; // Maximum number of carousels to prevent flooding
    const messages = [];
    
    // Calculate how many carousels we need
    const totalCarousels = Math.min(
      Math.ceil(images.length / maxCarouselItems),
      maxCarousels
    );
    
    // Build multiple carousels
    for (let carouselIndex = 0; carouselIndex < totalCarousels; carouselIndex++) {
      const startIndex = carouselIndex * maxCarouselItems;
      const endIndex = Math.min(startIndex + maxCarouselItems, images.length);
      const carouselImages = images.slice(startIndex, endIndex);
      
      // Create carousel for this batch
      const carousel = this.buildFlexImageCarousel(
        carouselImages, 
        lotNumber, 
        formattedDate, 
        carouselIndex + 1, 
        totalCarousels,
        startIndex
      );
      
      messages.push(carousel);
      
      // Add small delay between carousels for better UX (only affects multiple sends)
      if (carouselIndex < totalCarousels - 1) {
        // Add a small separator message for clarity
        const separator = this.buildTextMessage(`📱 ชุดที่ ${carouselIndex + 2}/${totalCarousels} 👇`);
        messages.push(separator);
      }
    }
    
    // Add summary if there are remaining images
    const displayedImages = Math.min(images.length, maxCarousels * maxCarouselItems);
    if (images.length > displayedImages) {
      const remainingCount = images.length - displayedImages;
      messages.push(this.buildTextMessage(
        `📝 แสดงแล้ว ${displayedImages}/${images.length} รูป\n` +
        `⚠️ เหลืออีก ${remainingCount} รูป\n` +
        `💡 ใช้คำสั่ง #view ${lotNumber} อีกครั้งเพื่อดูรูปเพิ่มเติม`
      ));
    } else if (totalCarousels > 1) {
      messages.push(this.buildTextMessage(
        `✅ แสดงครบทั้งหมด ${images.length} รูปแล้ว`
      ));
    }
    
    return messages;
  }
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
  buildFlexImageCarousel(images, lotNumber, formattedDate, carouselNumber = 1, totalCarousels = 1, startIndex = 0) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const maxCarouselItems = 10; // LINE limit
    
    // Take only the images for this carousel
    const carouselImages = images.slice(0, maxCarouselItems);
    
    // Create image bubbles for flex carousel
    const imageBubbles = carouselImages.map((image, index) => {
      const imageUrl = image.url.startsWith('http') 
        ? image.url 
        : `${baseUrl}${image.url}`;
      
      const uploadTime = new Date(image.uploaded_at).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const globalImageNumber = startIndex + index + 1;
      
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
              text: `รูปที่ ${globalImageNumber}`,
              weight: "bold",
              size: "lg",
              align: "center",
              color: "#1DB446"
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
            },
            // Add carousel info if multiple carousels
            ...(totalCarousels > 1 ? [{
              type: "text",
              text: `ชุด ${carouselNumber}/${totalCarousels}`,
              size: "xxs",
              align: "center",
              color: "#FF6B35",
              margin: "xs",
              weight: "bold"
            }] : [])
          ],
          spacing: "sm",
          paddingAll: "13px"
        }
      };
    });
    
    // Create alt text with carousel info
    const altText = totalCarousels > 1 
      ? `รูปภาพ Lot: ${lotNumber} (ชุด ${carouselNumber}/${totalCarousels}) - เลื่อนซ้ายขวาเพื่อดู`
      : `รูปภาพ Lot: ${lotNumber} (${images.length} รูป) - เลื่อนซ้ายขวาเพื่อดู`;
    
    return {
      type: "flex",
      altText: altText,
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