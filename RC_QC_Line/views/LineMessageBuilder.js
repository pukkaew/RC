// Builder for LINE messages - Advanced Hybrid System (Fixed)
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

  // Build messages for showing images (Simplified but Robust System)
  buildImageViewMessages(result) {
    const { lotNumber, imageDate, images } = result;
    const formattedDate = this.dateFormatter.formatDisplayDate(imageDate);
    const messages = [];
    
    // If no images found
    if (images.length === 0) {
      return [this.buildNoImagesFoundMessage(lotNumber, imageDate)];
    }
    
    // Add header message
    const headerText = `📸 Lot: ${lotNumber}\n📅 ${formattedDate}\n🎯 ${images.length} รูปภาพ`;
    messages.push(this.buildTextMessage(headerText));
    
    // Choose display strategy based on image count
    if (images.length <= 5) {
      // Small sets: Show all as native images
      messages.push(...this.buildNativeImages(images));
    } else if (images.length <= 12) {
      // Medium sets: Carousel + selective native
      messages.push(this.buildImageCarousel(images, lotNumber));
      messages.push(...this.buildSelectiveNativeImages(images));
    } else {
      // Large sets: Flex grid + samples
      messages.push(this.buildFlexGrid(images, lotNumber, formattedDate));
      messages.push(...this.buildSampleNativeImages(images, 3));
    }
    
    return messages;
  }

  // Build native images
  buildNativeImages(images) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    return images.map(image => {
      const imageUrl = image.url.startsWith('http') 
        ? image.url 
        : `${baseUrl}${image.url}`;
      
      return this.buildImageMessage(imageUrl);
    });
  }

  // Build image carousel
  buildImageCarousel(images, lotNumber) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    const carouselColumns = images.slice(0, 10).map((image, index) => {
      const imageUrl = image.url.startsWith('http') 
        ? image.url 
        : `${baseUrl}${image.url}`;
      
      return {
        imageUrl: imageUrl,
        action: {
          type: "postback",
          data: `action=carousel_share&image_url=${encodeURIComponent(imageUrl)}&index=${index + 1}&lot=${lotNumber}`,
          displayText: `แชร์รูปที่ ${index + 1}`
        }
      };
    });
    
    return {
      type: "template",
      altText: `🎠 Carousel - ${lotNumber} (${images.length} รูป)`,
      template: {
        type: "image_carousel",
        columns: carouselColumns
      }
    };
  }

  // Build flex grid
  buildFlexGrid(images, lotNumber, formattedDate) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const gridSize = Math.min(images.length, 9); // 3x3 optimal
    const gridImages = images.slice(0, gridSize);
    
    // Create 3x3 grid
    const rows = [];
    for (let r = 0; r < 3; r++) {
      const rowImages = gridImages.slice(r * 3, (r + 1) * 3);
      const rowBoxes = rowImages.map((image, index) => {
        const imageUrl = image.url.startsWith('http') 
          ? image.url 
          : `${baseUrl}${image.url}`;
        
        const globalIndex = r * 3 + index + 1;
        
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
                data: `action=smart_share&image_url=${encodeURIComponent(imageUrl)}&index=${globalIndex}&lot=${lotNumber}`,
                displayText: `แชร์รูปที่ ${globalIndex}`
              }
            },
            {
              type: "text",
              text: `${globalIndex}`,
              size: "xs",
              align: "center",
              color: "#00C851",
              weight: "bold",
              margin: "xs"
            }
          ],
          flex: 1,
          margin: "xs"
        };
      });
      
      // Fill empty slots if needed
      while (rowBoxes.length < 3) {
        rowBoxes.push({
          type: "box",
          layout: "vertical",
          contents: [],
          flex: 1
        });
      }
      
      rows.push({
        type: "box",
        layout: "horizontal",
        contents: rowBoxes,
        spacing: "xs",
        margin: "xs"
      });
    }
    
    return {
      type: "flex",
      altText: `🔳 Grid - ${lotNumber}`,
      contents: {
        type: "bubble",
        size: "mega",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: `🔳 Grid: ${lotNumber}`,
              weight: "bold",
              size: "md",
              color: "#00C851"
            },
            {
              type: "text",
              text: `📅 ${formattedDate} | 🎯 ${gridSize}/${images.length} รูป`,
              size: "sm",
              color: "#666666",
              margin: "xs"
            }
          ],
          paddingAll: "12px",
          backgroundColor: "#F0FFF0"
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: rows,
          paddingAll: "8px",
          spacing: "xs"
        }
      }
    };
  }

  // Build selective native images (key images only)
  buildSelectiveNativeImages(images) {
    const keyIndices = this.selectKeyImageIndices(images.length);
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    return keyIndices.map(index => {
      const image = images[index];
      const imageUrl = image.url.startsWith('http') 
        ? image.url 
        : `${baseUrl}${image.url}`;
      
      return this.buildImageMessage(imageUrl);
    });
  }

  // Build sample native images (first N images)
  buildSampleNativeImages(images, count = 3) {
    const sampleImages = images.slice(0, count);
    return this.buildNativeImages(sampleImages);
  }

  // Select key image indices
  selectKeyImageIndices(totalImages) {
    if (totalImages <= 3) return Array.from({length: totalImages}, (_, i) => i);
    if (totalImages <= 10) return [0, Math.floor(totalImages/2), totalImages-1];
    
    // For large sets, select strategic samples
    const step = Math.floor(totalImages / 5);
    return [0, step, step*2, step*3, totalImages-1];
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

  // Build Flex Message for image deletion selection
  buildImageDeleteFlexMessage(lotNumber, imageDate, images) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const formattedDate = this.dateFormatter.formatDisplayDate(imageDate);
    
    // Create delete buttons for first 6 images (to fit in flex message)
    const deleteImages = images.slice(0, 6);
    
    const imageBoxes = deleteImages.map((image, index) => {
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
            size: "full"
          },
          {
            type: "button",
            style: "primary",
            color: "#FF0000",
            action: {
              type: "postback",
              label: `ลบรูปที่ ${index + 1}`,
              data: `action=delete_image&image_id=${image.image_id}&lot=${lotNumber}&date=${this.dateFormatter.formatISODate(imageDate)}`,
              displayText: `ลบรูปที่ ${index + 1}`
            },
            margin: "sm",
            height: "sm"
          }
        ],
        flex: 1,
        margin: "xs"
      };
    });
    
    // Arrange in rows of 2
    const rows = [];
    for (let i = 0; i < imageBoxes.length; i += 2) {
      const rowImages = imageBoxes.slice(i, i + 2);
      
      // Fill empty slot if needed
      if (rowImages.length === 1) {
        rowImages.push({
          type: "box",
          layout: "vertical",
          contents: [],
          flex: 1
        });
      }
      
      rows.push({
        type: "box",
        layout: "horizontal",
        contents: rowImages,
        spacing: "sm",
        margin: "sm"
      });
    }
    
    return {
      type: "flex",
      altText: `🗑️ เลือกรูปที่จะลบ - ${lotNumber}`,
      contents: {
        type: "bubble",
        size: "mega",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: `🗑️ เลือกรูปที่จะลบ`,
              weight: "bold",
              size: "lg",
              color: "#FF0000"
            },
            {
              type: "text",
              text: `Lot: ${lotNumber} | ${formattedDate}`,
              size: "sm",
              color: "#666666",
              margin: "xs"
            }
          ],
          paddingAll: "12px",
          backgroundColor: "#FFF0F0"
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: rows,
          paddingAll: "8px",
          spacing: "sm"
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: images.length > 6 ? `แสดง 6 จาก ${images.length} รูป` : `${images.length} รูปทั้งหมด`,
              size: "xs",
              color: "#999999",
              align: "center"
            }
          ],
          paddingAll: "8px"
        }
      }
    };
  }
}

module.exports = new LineMessageBuilder();