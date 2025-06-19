const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/Logger');

class ShareCardService {
  constructor() {
    this.shareCards = new Map();
  }
  
  // Create a simple share card with direct image preview
  async createShareCard(lotNumber, imageDate, images) {
    try {
      const cardId = uuidv4();
      
      // Create simple LINE Flex Message with actual images
      const flexMessage = this.createSimpleFlexShareCard(
        lotNumber,
        imageDate,
        images
      );
      
      // Store card session (simplified)
      const shareCard = {
        id: cardId,
        lotNumber: lotNumber,
        imageDate: imageDate,
        images: images,
        flexMessage: flexMessage,
        createdAt: new Date()
      };
      
      this.shareCards.set(cardId, shareCard);
      
      logger.info(`Created simple share card: ${cardId}`);
      
      return shareCard;
      
    } catch (error) {
      logger.error('Error creating share card:', error);
      throw error;
    }
  }
  
  // Create Simple Flex Message with Direct Images (like your last image)
  createSimpleFlexShareCard(lotNumber, imageDate, images) {
    const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
    const formattedDate = new Date(imageDate).toLocaleDateString('th-TH');
    
    // Limit to first 2 images for preview
    const previewImages = images.slice(0, 2);
    const imageBoxes = previewImages.map((image) => {
      const imageUrl = image.url.startsWith('http') 
        ? image.url 
        : `${baseUrl}${image.url}`;
      
      return {
        type: "image",
        url: imageUrl,
        size: "full",
        aspectMode: "cover",
        aspectRatio: "1:1",
        margin: "md"
      };
    });
    
    // Build simple flex message
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
              color: "#00B900"
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "📦",
                  flex: 0
                },
                {
                  type: "text",
                  text: `Lot: ${lotNumber}`,
                  margin: "sm",
                  flex: 0
                },
                {
                  type: "text",
                  text: "📅",
                  margin: "lg",
                  flex: 0
                },
                {
                  type: "text",
                  text: formattedDate,
                  margin: "sm"
                }
              ],
              margin: "md"
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: "🖼️",
                  flex: 0
                },
                {
                  type: "text",
                  text: `ทั้งหมด ${images.length} รูป`,
                  margin: "sm",
                  weight: "bold"
                }
              ],
              margin: "sm"
            },
            {
              type: "separator",
              margin: "lg"
            },
            // Direct image preview
            {
              type: "box",
              layout: "horizontal",
              contents: imageBoxes,
              margin: "lg",
              spacing: "md"
            },
            {
              type: "text",
              text: images.length > 2 ? `และอีก ${images.length - 2} รูป...` : "",
              size: "sm",
              color: "#999999",
              align: "center",
              margin: "md"
            }
          ],
          paddingAll: "20px"
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              style: "primary",
              height: "md",
              action: {
                type: "message",
                label: "ดูรูปภาพทั้งหมด",
                text: `#view ${lotNumber}`
              },
              color: "#00B900"
            }
          ],
          paddingAll: "15px"
        }
      }
    };
  }
  
  // Alternative: Create even simpler carousel of images
  createImageCarousel(lotNumber, imageDate, images) {
    const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
    
    // Create carousel columns (max 10)
    const carouselColumns = images.slice(0, 10).map((image, index) => {
      const imageUrl = image.url.startsWith('http') 
        ? image.url 
        : `${baseUrl}${image.url}`;
      
      return {
        imageUrl: imageUrl,
        action: {
          type: "postback",
          label: "view",
          data: `action=view_image&index=${index}&lot=${lotNumber}`
        }
      };
    });
    
    return {
      type: "template",
      altText: `รูปภาพ QC - Lot: ${lotNumber} (${images.length} รูป)`,
      template: {
        type: "image_carousel",
        columns: carouselColumns
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