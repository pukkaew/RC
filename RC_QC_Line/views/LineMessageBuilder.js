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

  // Build messages for showing images (Grid Layout + All Native Images)
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
    infoText += `🖼️ แตะรูปเพื่อดูขนาดใหญ่ | แชร์ได้เลย`;
    
    messages.push(this.buildTextMessage(infoText));
    
    // Build Grid Layout first (for overview)
    const gridMessages = this.buildImageGridMessages(images, lotNumber, formattedDate);
    messages.push(...gridMessages);
    
    // Add separator
    messages.push(this.buildTextMessage('📱 รูปภาพทั้งหมด (แชร์ได้) 👇'));
    
    // Build All Native Images (for sharing)
    const nativeMessages = this.buildAllNativeImageMessages(images);
    messages.push(...nativeMessages);
    
    return messages;
  }

  // Build All Native Image Messages (แชร์ได้ทั้งหมด)
  buildAllNativeImageMessages(images) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const messages = [];
    
    // Send all images as native messages (no limit for sharing)
    images.forEach((image, index) => {
      const imageUrl = image.url.startsWith('http') 
        ? image.url 
        : `${baseUrl}${image.url}`;
      
      // Create native LINE image message (สามารถแชร์ได้)
      const imageMessage = this.buildImageMessage(imageUrl);
      messages.push(imageMessage);
    });
    
    // Add summary
    if (images.length > 1) {
      messages.push(this.buildTextMessage(`✅ ส่งครบทั้งหมด ${images.length} รูปแล้ว - แชร์ได้เลย!`));
    }
    
    return messages;
  }

  // Build Grid Layout Flex Messages (แสดงรูปเป็นตาราง - สำหรับดูภาพรวม)
  buildImageGridMessages(images, lotNumber, formattedDate) {
    const messages = [];
    const imagesPerGrid = 12; // 12 รูปต่อ grid (3x4)
    const maxGrids = 3; // จำกัด grid เพื่อไม่ให้ยาวเกินไป
    
    // แบ่งรูปออกเป็น grids
    const totalGrids = Math.min(
      Math.ceil(images.length / imagesPerGrid),
      maxGrids
    );
    
    for (let gridIndex = 0; gridIndex < totalGrids; gridIndex++) {
      const startIndex = gridIndex * imagesPerGrid;
      const endIndex = Math.min(startIndex + imagesPerGrid, images.length);
      const gridImages = images.slice(startIndex, endIndex);
      
      // สร้าง Grid Layout Flex Message
      const gridMessage = this.buildImageGridFlexMessage(
        gridImages, 
        lotNumber, 
        formattedDate, 
        gridIndex + 1, 
        totalGrids,
        startIndex
      );
      
      messages.push(gridMessage);
    }
    
    // เพิ่มข้อความสรุปหากมีรูปเหลือ
    const displayedImages = Math.min(images.length, maxGrids * imagesPerGrid);
    if (images.length > displayedImages) {
      const remainingCount = images.length - displayedImages;
      messages.push(this.buildTextMessage(
        `📋 แสดง Grid แล้ว ${displayedImages}/${images.length} รูป\n` +
        `⬇️ รูปครบทั้งหมดจะแสดงด้านล่าง (แชร์ได้)`
      ));
    }
    
    return messages;
  }

  // Build single Grid Layout Flex Message (เรียงรูปเป็นตาราง)
  buildImageGridFlexMessage(images, lotNumber, formattedDate, gridNumber = 1, totalGrids = 1, startIndex = 0) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    // จัดเรียงรูปเป็น rows (3 รูปต่อแถว)
    const imagesPerRow = 3;
    const rows = [];
    
    for (let i = 0; i < images.length; i += imagesPerRow) {
      const rowImages = images.slice(i, i + imagesPerRow);
      const imageBoxes = rowImages.map((image, index) => {
        const imageUrl = image.url.startsWith('http') 
          ? image.url 
          : `${baseUrl}${image.url}`;
        
        const globalImageNumber = startIndex + i + index + 1;
        
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
                type: "uri",
                uri: imageUrl  // คลิกเพื่อดูรูปขนาดใหญ่
              }
            },
            {
              type: "text",
              text: `${globalImageNumber}`,
              size: "xs",
              align: "center",
              color: "#1DB446",
              margin: "xs",
              weight: "bold"
            }
          ],
          flex: 1,
          spacing: "xs",
          margin: "xs"
        };
      });
      
      // เติมช่องว่างหากแถวไม่ครบ 3 รูป
      while (imageBoxes.length < imagesPerRow) {
        imageBoxes.push({
          type: "box",
          layout: "vertical",
          contents: [],
          flex: 1
        });
      }
      
      // สร้างแถว
      rows.push({
        type: "box",
        layout: "horizontal",
        contents: imageBoxes,
        spacing: "xs",
        margin: "xs"
      });
    }
    
    // สร้าง header ของ grid
    const headerContents = [
      {
        type: "text",
        text: `📋 ภาพรวม Lot: ${lotNumber}`,
        weight: "bold",
        size: "md",
        color: "#1DB446"
      },
      {
        type: "text",
        text: `📅 ${formattedDate}`,
        size: "sm",
        color: "#666666",
        margin: "xs"
      }
    ];
    
    // เพิ่มข้อมูล grid หากมีหลาย grid
    if (totalGrids > 1) {
      headerContents.push({
        type: "text",
        text: `ชุดที่ ${gridNumber}/${totalGrids} (รูปที่ ${startIndex + 1}-${startIndex + images.length})`,
        size: "xs",
        color: "#999999",
        margin: "xs"
      });
    } else {
      headerContents.push({
        type: "text",
        text: `${images.length} รูป - แตะเพื่อดูขนาดใหญ่`,
        size: "xs",
        color: "#999999",
        margin: "xs"
      });
    }
    
    // สร้าง Flex Message
    const flexMessage = {
      type: "flex",
      altText: `Grid Overview - Lot: ${lotNumber} (${images.length} รูป)`,
      contents: {
        type: "bubble",
        size: "mega",
        header: {
          type: "box",
          layout: "vertical",
          contents: headerContents,
          paddingAll: "12px",
          backgroundColor: "#F0FFF4"
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: rows,
          paddingAll: "8px",
          spacing: "xs"
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "📱 รูปทั้งหมดแชร์ได้ที่ด้านล่าง",
              size: "xs",
              color: "#1DB446",
              align: "center"
            }
          ],
          paddingAll: "8px"
        }
      }
    };
    
    return flexMessage;
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

  // Build Flex Message for image deletion selection (using grid layout)
  buildImageDeleteFlexMessage(lotNumber, imageDate, images) {
    const formattedDate = this.dateFormatter.formatDisplayDate(imageDate);
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    // จำกัดจำนวนรูปที่แสดง (เพื่อความสะดวกในการเลือก)
    const maxItems = Math.min(images.length, 9); // 3x3 grid
    const displayImages = images.slice(0, maxItems);
    
    // จัดเรียงรูปเป็น grid 3x3 สำหรับการลบ
    const imagesPerRow = 3;
    const rows = [];
    
    for (let i = 0; i < displayImages.length; i += imagesPerRow) {
      const rowImages = displayImages.slice(i, i + imagesPerRow);
      const imageBoxes = rowImages.map((image, index) => {
        const imageUrl = image.url.startsWith('http') 
          ? image.url 
          : `${baseUrl}${image.url}`;
        
        const globalImageNumber = i + index + 1;
        const uploadTime = new Date(image.uploaded_at).toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit'
        });
        
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
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "text",
                  text: `${globalImageNumber}`,
                  weight: "bold",
                  size: "sm",
                  align: "center",
                  color: "#FFFFFF"
                },
                {
                  type: "text",
                  text: uploadTime,
                  size: "xxs",
                  align: "center",
                  color: "#FFFFFF",
                  margin: "xs"
                }
              ],
              position: "absolute",
              offsetTop: "0px",
              offsetStart: "0px",
              offsetEnd: "0px",
              paddingAll: "8px",
              backgroundColor: "#00000080"
            },
            {
              type: "button",
              style: "primary",
              color: "#FF5551",
              height: "sm",
              action: {
                type: "postback",
                label: "🗑️ ลบ",
                data: `action=delete_image&image_id=${image.image_id}&lot=${lotNumber}&date=${this.dateFormatter.formatISODate(imageDate)}`,
                displayText: `เลือกลบรูปภาพที่ ${globalImageNumber}`
              },
              margin: "xs"
            }
          ],
          flex: 1,
          spacing: "xs",
          margin: "xs"
        };
      });
      
      // เติมช่องว่างหากแถวไม่ครบ 3 รูป
      while (imageBoxes.length < imagesPerRow) {
        imageBoxes.push({
          type: "box",
          layout: "vertical",
          contents: [],
          flex: 1
        });
      }
      
      // สร้างแถว
      rows.push({
        type: "box",
        layout: "horizontal",
        contents: imageBoxes,
        spacing: "xs",
        margin: "xs"
      });
    }
    
    // สร้าง Flex Message สำหรับการลบ
    const flexMessage = {
      type: "flex",
      altText: `เลือกรูปที่ต้องการลบ - Lot: ${lotNumber} (${images.length} รูป)`,
      contents: {
        type: "bubble",
        size: "mega",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: `🗑️ เลือกรูปที่ต้องการลบ`,
              weight: "bold",
              size: "lg",
              color: "#FF5551"
            },
            {
              type: "text",
              text: `Lot: ${lotNumber} | ${formattedDate}`,
              size: "sm",
              color: "#666666",
              margin: "xs"
            },
            ...(images.length > maxItems ? [{
              type: "text",
              text: `แสดง ${maxItems}/${images.length} รูป`,
              size: "xs",
              color: "#999999",
              margin: "xs"
            }] : [])
          ],
          paddingAll: "15px",
          backgroundColor: "#FFF5F5"
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: rows,
          paddingAll: "10px",
          spacing: "xs"
        }
      }
    };
    
    return flexMessage;
  }
}

module.exports = new LineMessageBuilder();