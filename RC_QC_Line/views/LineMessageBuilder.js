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

  // Build Flex Message for displaying images in a grid layout (supports unlimited images)
  buildImageGalleryFlexMessage(lotNumber, imageDate, images) {
    const formattedDate = this.dateFormatter.formatDisplayDate(imageDate);
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    // Create image items for carousel
    const imageItems = [];
    const itemsPerPage = 12; // 12 images per bubble (6 rows x 2 columns)
    const maxCarouselItems = 10; // LINE limit for carousel
    
    // Calculate how many carousel items we need
    const totalPages = Math.ceil(images.length / itemsPerPage);
    const actualPages = Math.min(totalPages, maxCarouselItems);
    
    // Group images into chunks
    for (let page = 0; page < actualPages; page++) {
      const startIndex = page * itemsPerPage;
      let endIndex = startIndex + itemsPerPage;
      
      // For the last page, adjust to include remaining images
      if (page === actualPages - 1 && actualPages < totalPages) {
        endIndex = images.length;
      }
      
      const imageGroup = images.slice(startIndex, endIndex);
      
      // Create grid layout for this group
      const imageContents = [];
      
      // Create rows of images (2 images per row)
      for (let j = 0; j < imageGroup.length; j += 2) {
        const rowImages = imageGroup.slice(j, j + 2);
        
        const imageRow = {
          type: "box",
          layout: "horizontal",
          contents: rowImages.map((image, index) => {
            const imageUrl = image.url.startsWith('http') 
              ? image.url 
              : `${baseUrl}${image.url}`;
            
            const imageNumber = startIndex + j + index + 1;
            
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
                  // No action - image will display in LINE directly
                },
                {
                  type: "text",
                  text: `รูปที่ ${imageNumber}`,
                  size: "xxs",
                  align: "center",
                  margin: "xs",
                  color: "#999999"
                }
              ],
              flex: 1,
              margin: index > 0 ? "sm" : "none"
            };
          }),
          margin: j > 0 ? "sm" : "none"
        };
        
        // If only one image in the row, add spacer
        if (rowImages.length === 1) {
          imageRow.contents.push({
            type: "spacer",
            size: "full"
          });
        }
        
        imageContents.push(imageRow);
      }
      
      // Calculate display range for this page
      const displayStart = startIndex + 1;
      const displayEnd = Math.min(endIndex, images.length);
      
      // Create bubble for this group
      const bubble = {
        type: "bubble",
        size: "mega",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: `Lot: ${lotNumber}`,
              weight: "bold",
              size: "lg",
              color: "#1DB446"
            },
            {
              type: "text",
              text: `วันที่: ${formattedDate}`,
              size: "sm",
              color: "#999999",
              margin: "xs"
            },
            {
              type: "text",
              text: totalPages > maxCarouselItems 
                ? `รูปที่ ${displayStart}-${displayEnd} จาก ${images.length} รูป (${totalPages} หน้า, แสดง ${actualPages} หน้าแรก)`
                : `รูปที่ ${displayStart}-${displayEnd} จาก ${images.length} รูป (หน้า ${page + 1}/${actualPages})`,
              size: "xs",
              color: "#666666",
              margin: "xs",
              wrap: true
            }
          ],
          paddingBottom: "sm"
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: imageContents,
          spacing: "sm"
        }
      };
      
      // Add footer - remove the "ดูรูปภาพ Lot อื่น" button completely
      const footerContents = [];
      
      // Navigation info for large image sets only
      if (totalPages > maxCarouselItems && page === actualPages - 1) {
        const remainingImages = images.length - (actualPages * itemsPerPage);
        if (remainingImages > 0) {
          footerContents.push({
            type: "text",
            text: `มีรูปภาพอีก ${remainingImages} รูป ใช้คำสั่ง #view เพื่อดูต่อ`,
            size: "xs",
            color: "#FF6B35",
            wrap: true,
            margin: "sm"
          });
        }
      }
      
      // Only add footer if there are navigation messages (no buttons)
      if (footerContents.length > 0) {
        bubble.footer = {
          type: "box",
          layout: "vertical",
          contents: footerContents
        };
      }
      
      imageItems.push(bubble);
    }
    
    // Return appropriate message structure
    if (imageItems.length === 1) {
      return {
        type: "flex",
        altText: `รูปภาพ Lot: ${lotNumber} (${images.length} รูป)`,
        contents: imageItems[0]
      };
    } else {
      return {
        type: "flex",
        altText: `รูปภาพ Lot: ${lotNumber} (${images.length} รูป)`,
        contents: {
          type: "carousel",
          contents: imageItems
        }
      };
    }
  }

  // Build messages for showing images (Flex Message + Native Images)
  buildImageViewMessages(result) {
    const { lotNumber, imageDate, images } = result;
    const formattedDate = this.dateFormatter.formatDisplayDate(imageDate);
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const messages = [];
    
    // If no images found
    if (images.length === 0) {
      return [this.buildNoImagesFoundMessage(lotNumber, imageDate)];
    }
    
    // 1. First send a summary Flex Message (preview only, no clickable images)
    const summaryMessage = this.buildImageSummaryFlexMessage(lotNumber, imageDate, images);
    messages.push(summaryMessage);
    
    // 2. Then send native LINE image messages that can be viewed properly
    const maxImagesPerGroup = 5;
    
    for (let i = 0; i < images.length; i += maxImagesPerGroup) {
      const imageGroup = images.slice(i, i + maxImagesPerGroup);
      
      // Add group header for large sets
      if (images.length > 10) {
        const groupStart = i + 1;
        const groupEnd = Math.min(i + maxImagesPerGroup, images.length);
        messages.push(this.buildTextMessage(`📷 รูปที่ ${groupStart}-${groupEnd}:`));
      }
      
      // Add native image messages for this group
      const groupMessages = imageGroup.map(image => {
        const imageUrl = image.url.startsWith('http') 
          ? image.url 
          : `${baseUrl}${image.url}`;
        
        return this.buildImageMessage(imageUrl);
      });
      
      messages.push(...groupMessages);
    }
    
    return messages;
  }

  // Build summary Flex Message (for overview, not clickable)
  buildImageSummaryFlexMessage(lotNumber, imageDate, images) {
    const formattedDate = this.dateFormatter.formatDisplayDate(imageDate);
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    // Create thumbnail grid (show first 12 images as preview)
    const previewImages = images.slice(0, 12);
    const imageContents = [];
    
    // Create rows of images (3 images per row for better thumbnail view)
    for (let j = 0; j < previewImages.length; j += 3) {
      const rowImages = previewImages.slice(j, j + 3);
      
      const imageRow = {
        type: "box",
        layout: "horizontal",
        contents: rowImages.map((image, index) => {
          const imageUrl = image.url.startsWith('http') 
            ? image.url 
            : `${baseUrl}${image.url}`;
          
          const imageNumber = j + index + 1;
          
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
                type: "text",
                text: `${imageNumber}`,
                size: "xxs",
                align: "center",
                margin: "xs",
                color: "#999999"
              }
            ],
            flex: 1,
            margin: index > 0 ? "xs" : "none"
          };
        }),
        margin: j > 0 ? "sm" : "none"
      };
      
      // Fill empty slots if needed
      while (rowImages.length < 3) {
        imageRow.contents.push({
          type: "spacer",
          size: "full"
        });
      }
      
      imageContents.push(imageRow);
    }
    
    // Add "more images" indicator if there are more than 12
    if (images.length > 12) {
      imageContents.push({
        type: "text",
        text: `... และอีก ${images.length - 12} รูป`,
        size: "xs",
        align: "center",
        margin: "md",
        color: "#666666"
      });
    }
    
    return {
      type: "flex",
      altText: `📸 Lot: ${lotNumber} (${images.length} รูป)`,
      contents: {
        type: "bubble",
        size: "mega",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: `📸 Lot: ${lotNumber}`,
              weight: "bold",
              size: "lg",
              color: "#1DB446"
            },
            {
              type: "text",
              text: `📅 วันที่: ${formattedDate}`,
              size: "md",
              color: "#333333",
              margin: "xs"
            },
            {
              type: "text",
              text: `📊 จำนวน: ${images.length} รูป`,
              size: "sm",
              color: "#666666",
              margin: "xs"
            },
            {
              type: "text",
              text: "👆 ตัวอย่างรูปภาพ (รูปจริงด้านล่าง)",
              size: "xs",
              color: "#999999",
              margin: "sm"
            }
          ],
          paddingBottom: "sm"
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: imageContents,
          spacing: "sm"
        }
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

  // Build Flex Message for image deletion selection
  buildImageDeleteFlexMessage(lotNumber, imageDate, images) {
    const formattedDate = this.dateFormatter.formatDisplayDate(imageDate);
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    // Create image items for selection
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
              size: "md"
            },
            {
              type: "text",
              text: `Lot: ${lotNumber}`,
              size: "sm",
              margin: "md",
              color: "#999999"
            },
            {
              type: "text",
              text: `วันที่: ${formattedDate}`,
              size: "sm",
              margin: "xs",
              color: "#999999"
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
      altText: "เลือกรูปภาพที่ต้องการลบ",
      contents: {
        type: "carousel",
        contents: imageItems
      }
    };
  }
}

module.exports = new LineMessageBuilder();