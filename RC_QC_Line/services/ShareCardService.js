const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/Logger');

class ShareCardService {
  constructor() {
    this.shareCards = new Map();
  }
  
  // Create share card exactly like screenshot
  async createShareCard(lotNumber, imageDate, images) {
    try {
      const cardId = uuidv4();
      
      // Create flex message exactly like screenshot
      const flexMessage = this.createExactFlexCard(
        lotNumber,
        imageDate,
        images
      );
      
      const shareCard = {
        id: cardId,
        lotNumber: lotNumber,
        imageDate: imageDate,
        images: images,
        flexMessage: flexMessage,
        createdAt: new Date()
      };
      
      this.shareCards.set(cardId, shareCard);
      
      logger.info(`Created exact share card: ${cardId}`);
      
      return shareCard;
      
    } catch (error) {
      logger.error('Error creating share card:', error);
      throw error;
    }
  }
  
  // Create Exact Flex Message Like Screenshot
  createExactFlexCard(lotNumber, imageDate, images) {
    const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
    const formattedDate = new Date(imageDate).toLocaleDateString('th-TH');
    
    // Get first 2 images for preview
    const previewImages = images.slice(0, 2).map(img => ({
      type: "image",
      url: img.url.startsWith('http') ? img.url : `${baseUrl}${img.url}`,
      size: "full",
      aspectMode: "cover",
      aspectRatio: "4:3"
    }));
    
    // Fill empty slots if less than 2 images
    while (previewImages.length < 2) {
      previewImages.push({
        type: "filler"
      });
    }
    
    return {
      type: "flex",
      altText: `อัลบั้มรูปภาพ QC - Lot: ${lotNumber}`,
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "📸 อัลบั้มรูปภาพ QC",
              weight: "bold",
              size: "lg",
              color: "#1DB446"
            },
            {
              type: "text",
              text: `📦 Lot: ${lotNumber} 📅 ${formattedDate}`,
              size: "sm",
              color: "#666666",
              margin: "sm"
            },
            {
              type: "text",
              text: `🖼️ ทั้งหมด ${images.length} รูป`,
              size: "sm",
              color: "#666666",
              margin: "sm"
            },
            {
              type: "box",
              layout: "horizontal",
              margin: "lg",
              spacing: "sm",
              contents: previewImages
            }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "button",
              style: "primary",
              height: "sm",
              action: {
                type: "message",
                label: "ดูรูปภาพทั้งหมด",
                text: `#view ${lotNumber}`
              },
              color: "#00B900"
            },
            {
              type: "text",
              text: "กดปุ่มด้านบนเพื่อดูรูปภาพทั้งหมด\nและสามารถแชร์ต่อได้ง่ายๆ",
              size: "xxs",
              color: "#aaaaaa",
              align: "center",
              margin: "sm",
              wrap: true
            }
          ]
        }
      }
    };
  }
  
  // Get share card
  getShareCard(cardId) {
    return this.shareCards.get(cardId);
  }
  
  // Clean expired cards
  async cleanExpiredCards() {
    const now = new Date();
    const expireTime = 30 * 60 * 1000; // 30 minutes
    const cardsToClean = [];
    
    for (const [cardId, card] of this.shareCards.entries()) {
      if (now - card.createdAt > expireTime) {
        cardsToClean.push(cardId);
        this.shareCards.delete(cardId);
      }
    }
    
    return cardsToClean.length;
  }
}

module.exports = new ShareCardService();