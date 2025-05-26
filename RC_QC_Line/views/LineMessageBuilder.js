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

  // Build messages for showing images (Album Style - All Native Images)
  buildImageViewMessages(result) {
    const { lotNumber, imageDate, images } = result;
    const formattedDate = this.dateFormatter.formatDisplayDate(imageDate);
    const messages = [];
    
    // If no images found
    if (images.length === 0) {
      return [this.buildNoImagesFoundMessage(lotNumber, imageDate)];
    }
    
    // Add album header with info
    let headerText = `📸 อัลบัม Lot: ${lotNumber}\n`;
    headerText += `📅 วันที่: ${formattedDate}\n`;
    headerText += `📊 จำนวนรูปภาพ: ${images.length} รูป\n`;
    headerText += `📱 แชร์เป็นอัลบัมได้เลย`;
    
    messages.push(this.buildTextMessage(headerText));
    
    // Build all native images (Album style)
    const albumImages = this.buildAlbumStyleImages(images, lotNumber);
    messages.push(...albumImages);
    
    // Add album footer
    const footerText = `✅ อัลบัม Lot: ${lotNumber} ครบ ${images.length} รูป\n📤 แชร์ได้เลย | 💾 บันทึกได้ทั้งชุด`;
    messages.push(this.buildTextMessage(footerText));
    
    return messages;
  }

  // Build Album Style Images (ส่งรูปทั้งหมดเป็น Native Images - แชร์เป็นอัลบัมได้)
  buildAlbumStyleImages(images, lotNumber) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const messages = [];
    
    // Send all images as native messages (Album style)
    images.forEach((image, index) => {
      const imageUrl = image.url.startsWith('http') 
        ? image.url 
        : `${baseUrl}${image.url}`;
      
      // Create native LINE image message (สามารถแชร์เป็นอัลบัมได้)
      const imageMessage = this.buildImageMessage(imageUrl);
      messages.push(imageMessage);
    });
    
    return messages;
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