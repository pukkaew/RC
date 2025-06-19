const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/Logger');

class ShareCardService {
  constructor() {
    this.shareCards = new Map();
    this.cardTempDir = path.join(__dirname, '../public/temp/cards');
    this.ensureDirectories();
  }
  
  async ensureDirectories() {
    try {
      await fs.mkdir(this.cardTempDir, { recursive: true });
      logger.info('Share card temp directory ensured:', this.cardTempDir);
    } catch (error) {
      logger.error('Error creating card temp directory:', error);
    }
  }
  
  // Create a beautiful share card
  async createShareCard(lotNumber, imageDate, images) {
    try {
      const cardId = uuidv4();
      const timestamp = Date.now();
      
      // Create card preview image
      const cardImage = await this.generateCardImage(
        lotNumber, 
        imageDate, 
        images
      );
      
      // Create LINE Flex Message
      const flexMessage = this.createFlexShareCard(
        cardId,
        lotNumber,
        imageDate,
        images,
        cardImage.url
      );
      
      // Store card session
      const shareCard = {
        id: cardId,
        lotNumber: lotNumber,
        imageDate: imageDate,
        images: images,
        cardImage: cardImage,
        flexMessage: flexMessage,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      };
      
      this.shareCards.set(cardId, shareCard);
      
      // Auto cleanup
      setTimeout(() => {
        this.cleanupCard(cardId);
      }, 30 * 60 * 1000);
      
      logger.info(`Created share card: ${cardId}`);
      
      return shareCard;
      
    } catch (error) {
      logger.error('Error creating share card:', error);
      throw error;
    }
  }
  
  // Generate beautiful card preview image
  async generateCardImage(lotNumber, imageDate, images) {
    try {
      const cardWidth = 800;
      const cardHeight = 600;
      const timestamp = Date.now();
      const filename = `card_${lotNumber}_${timestamp}.jpg`;
      const filepath = path.join(this.cardTempDir, filename);
      
      // Create SVG for the card
      const svg = `
        <svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg">
          <!-- Background gradient -->
          <defs>
            <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#00B900;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#008500;stop-opacity:1" />
            </linearGradient>
            <filter id="shadow">
              <feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity="0.2"/>
            </filter>
          </defs>
          
          <!-- Background -->
          <rect width="${cardWidth}" height="${cardHeight}" fill="url(#bgGradient)"/>
          
          <!-- White card container -->
          <rect x="40" y="40" width="${cardWidth - 80}" height="${cardHeight - 80}" 
                rx="20" fill="white" filter="url(#shadow)"/>
          
          <!-- Header -->
          <text x="${cardWidth/2}" y="100" font-family="Arial, sans-serif" 
                font-size="36" font-weight="bold" text-anchor="middle" fill="#00B900">
            อัลบั้มรูปภาพ QC
          </text>
          
          <!-- Lot info -->
          <text x="${cardWidth/2}" y="160" font-family="Arial, sans-serif" 
                font-size="28" text-anchor="middle" fill="#333">
            Lot: ${lotNumber}
          </text>
          
          <!-- Date info -->
          <text x="${cardWidth/2}" y="210" font-family="Arial, sans-serif" 
                font-size="24" text-anchor="middle" fill="#666">
            ${new Date(imageDate).toLocaleDateString('th-TH')}
          </text>
          
          <!-- Image count circle -->
          <circle cx="${cardWidth/2}" cy="320" r="60" fill="#00B900"/>
          <text x="${cardWidth/2}" y="310" font-family="Arial, sans-serif" 
                font-size="48" font-weight="bold" text-anchor="middle" fill="white">
            ${images.length}
          </text>
          <text x="${cardWidth/2}" y="340" font-family="Arial, sans-serif" 
                font-size="20" text-anchor="middle" fill="white">
            รูปภาพ
          </text>
          
          <!-- Footer text -->
          <text x="${cardWidth/2}" y="450" font-family="Arial, sans-serif" 
                font-size="20" text-anchor="middle" fill="#666">
            แตะเพื่อดูรูปภาพทั้งหมด
          </text>
          
          <!-- Logo/Brand -->
          <text x="${cardWidth/2}" y="520" font-family="Arial, sans-serif" 
                font-size="16" text-anchor="middle" fill="#999">
            RC QC System
          </text>
        </svg>
      `;
      
      // Convert SVG to image
      await sharp(Buffer.from(svg))
        .jpeg({ quality: 90 })
        .toFile(filepath);
      
      return {
        filename: filename,
        filepath: filepath,
        url: `/temp/cards/${filename}`
      };
      
    } catch (error) {
      logger.error('Error generating card image:', error);
      throw error;
    }
  }
  
  // Create Flex Message Share Card - FIXED VERSION WITH SMALLER SIZE
  createFlexShareCard(cardId, lotNumber, imageDate, images, cardImageUrl) {
    const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
    const fullCardImageUrl = `${baseUrl}${cardImageUrl}`;
    const formattedDate = new Date(imageDate).toLocaleDateString('th-TH');
    
    // Create simplified preview (max 6 images to reduce size)
    const previewImages = images.slice(0, 6);
    
    // Build simplified Flex Message to avoid 400 error
    return {
      type: "flex",
      altText: `แชร์รูปภาพ QC - Lot: ${lotNumber}`,
      contents: {
        type: "bubble",
        size: "mega", // Changed from "giga" to "mega"
        hero: {
          type: "image",
          url: fullCardImageUrl,
          size: "full",
          aspectRatio: "4:3", // Changed from "20:15" to standard ratio
          aspectMode: "cover",
          action: {
            type: "uri",
            uri: `${baseUrl}/share/view/${cardId}`
          }
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "📸 อัลบั้มรูปภาพ QC",
              size: "xl",
              weight: "bold",
              color: "#00B900"
            },
            {
              type: "text",
              text: `Lot: ${lotNumber} | ${formattedDate}`,
              size: "sm",
              color: "#666666",
              margin: "md"
            },
            {
              type: "text",
              text: `จำนวน ${images.length} รูป`,
              size: "md",
              weight: "bold",
              color: "#333333",
              margin: "sm"
            }
          ],
          paddingAll: "20px"
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "button",
              style: "primary",
              height: "md",
              action: {
                type: "uri",
                label: "ดูรูปภาพทั้งหมด",
                uri: `${baseUrl}/share/view/${cardId}`
              },
              color: "#00B900"
            },
            {
              type: "button",
              style: "secondary",
              height: "sm",
              action: {
                type: "uri",
                label: "ดาวน์โหลด ZIP",
                uri: `${baseUrl}/api/share/${cardId}/download`
              }
            }
          ],
          paddingAll: "20px"
        }
      }
    };
  }
  
  // Alternative: Create simpler text-based share message if Flex fails
  createSimpleShareMessage(cardId, lotNumber, imageDate, images) {
    const baseUrl = process.env.BASE_URL || 'https://line.ruxchai.co.th';
    const shareUrl = `${baseUrl}/share/view/${cardId}`;
    const formattedDate = new Date(imageDate).toLocaleDateString('th-TH');
    
    return {
      type: 'text',
      text: `📸 แชร์รูปภาพ QC\n\n📦 Lot: ${lotNumber}\n📅 วันที่: ${formattedDate}\n🖼️ จำนวน: ${images.length} รูป\n\n🔗 ดูรูปภาพ:\n${shareUrl}\n\n💾 ดาวน์โหลด:\n${baseUrl}/api/share/${cardId}/download`
    };
  }
  
  // Get share card
  getShareCard(cardId) {
    return this.shareCards.get(cardId);
  }
  
  // Cleanup card
  async cleanupCard(cardId) {
    try {
      const card = this.shareCards.get(cardId);
      
      if (card) {
        // Delete card image
        if (card.cardImage && card.cardImage.filepath) {
          try {
            await fs.unlink(card.cardImage.filepath);
            logger.info(`Cleaned up card image: ${card.cardImage.filename}`);
          } catch (error) {
            logger.warn(`Could not delete card image: ${error.message}`);
          }
        }
        
        // Remove from memory
        this.shareCards.delete(cardId);
        logger.info(`Cleaned up share card: ${cardId}`);
      }
    } catch (error) {
      logger.error('Error cleaning up card:', error);
    }
  }
  
  // Clean expired cards
  async cleanExpiredCards() {
    const now = new Date();
    const cardsToClean = [];
    
    for (const [cardId, card] of this.shareCards.entries()) {
      if (card.expiresAt < now) {
        cardsToClean.push(cardId);
      }
    }
    
    for (const cardId of cardsToClean) {
      await this.cleanupCard(cardId);
    }
    
    return cardsToClean.length;
  }
}

module.exports = new ShareCardService();