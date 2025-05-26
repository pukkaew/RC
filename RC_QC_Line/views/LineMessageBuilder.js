// Builder for LINE messages - Advanced Hybrid System
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

  // Build messages for showing images (Advanced Hybrid Multi-Format System)
  buildImageViewMessages(result) {
    const { lotNumber, imageDate, images } = result;
    const formattedDate = this.dateFormatter.formatDisplayDate(imageDate);
    const messages = [];
    
    // If no images found
    if (images.length === 0) {
      return [this.buildNoImagesFoundMessage(lotNumber, imageDate)];
    }
    
    // Smart format selection based on image count and content analysis
    const displayStrategy = this.analyzeOptimalDisplayStrategy(images);
    
    // Add smart header with adaptive content
    const headerMessage = this.buildSmartHeader(lotNumber, formattedDate, images, displayStrategy);
    messages.push(headerMessage);
    
    // Apply multi-format hybrid display strategy
    switch (displayStrategy.primary) {
      case 'carousel_plus_grid':
        messages.push(...this.buildCarouselPlusGridHybrid(images, lotNumber, formattedDate));
        break;
        
      case 'smart_flex_native':
        messages.push(...this.buildSmartFlexNativeHybrid(images, lotNumber, formattedDate));
        break;
        
      case 'adaptive_batch':
        messages.push(...this.buildAdaptiveBatchHybrid(images, lotNumber, formattedDate));
        break;
        
      case 'ultra_premium':
        messages.push(...this.buildUltraPremiumHybrid(images, lotNumber, formattedDate));
        break;
        
      default:
        messages.push(...this.buildIntelligentFallbackHybrid(images, lotNumber, formattedDate));
    }
    
    return messages;
  }

  // Analyze optimal display strategy based on content
  analyzeOptimalDisplayStrategy(images) {
    const count = images.length;
    const aspectRatios = this.analyzeImageAspectRatios(images);
    const complexity = this.calculateDisplayComplexity(images);
    
    let strategy = {
      primary: 'adaptive_batch',
      secondary: 'native_fallback',
      reasoning: 'Standard adaptive display',
      features: []
    };
    
    if (count <= 3) {
      strategy = {
        primary: 'ultra_premium',
        secondary: 'carousel_plus_grid',
        reasoning: 'Premium display for small sets',
        features: ['large_preview', 'detailed_info', 'premium_layout']
      };
    } else if (count <= 10) {
      strategy = {
        primary: 'carousel_plus_grid',
        secondary: 'smart_flex_native',
        reasoning: 'Balanced carousel and grid approach',
        features: ['carousel_preview', 'grid_overview', 'native_sharing']
      };
    } else if (count <= 25) {
      strategy = {
        primary: 'smart_flex_native',
        secondary: 'adaptive_batch',
        reasoning: 'Flex grid with native image backup',
        features: ['flex_grid', 'batch_native', 'smart_pagination']
      };
    } else {
      strategy = {
        primary: 'adaptive_batch',
        secondary: 'intelligent_sampling',
        reasoning: 'High-volume adaptive batch processing',
        features: ['intelligent_batching', 'progressive_loading', 'sample_preview']
      };
    }
    
    return strategy;
  }

  // Build smart adaptive header
  buildSmartHeader(lotNumber, formattedDate, images, strategy) {
    let headerText = `🎯 Advanced Gallery: ${lotNumber}\n`;
    headerText += `📅 ${formattedDate} | 📊 ${images.length} รูป\n`;
    headerText += `🧠 Strategy: ${strategy.reasoning}\n`;
    headerText += `✨ Features: ${strategy.features.join(', ')}`;
    
    return this.buildTextMessage(headerText);
  }

  // Carousel + Grid Hybrid (แอดวานซ์ระดับ 1)
  buildCarouselPlusGridHybrid(images, lotNumber, formattedDate) {
    const messages = [];
    
    // 1. Image Carousel for preview (first 10 images)
    const previewImages = images.slice(0, Math.min(10, images.length));
    const carousel = this.buildAdvancedImageCarousel(previewImages, lotNumber);
    messages.push(carousel);
    
    // 2. Smart Flex Grid for overview
    const gridMessage = this.buildSmartFlexGrid(images, lotNumber, formattedDate);
    messages.push(gridMessage);
    
    // 3. Native images for sharing (selective)
    const nativeImages = this.buildSelectiveNativeImages(images);
    messages.push(...nativeImages);
    
    return messages;
  }

  // Smart Flex + Native Hybrid (แอดวานซ์ระดับ 2)
  buildSmartFlexNativeHybrid(images, lotNumber, formattedDate) {
    const messages = [];
    
    // 1. Interactive Flex Grid with smart actions
    const interactiveGrid = this.buildInteractiveFlexGrid(images, lotNumber, formattedDate);
    messages.push(interactiveGrid);
    
    // 2. Intelligent native image batches
    const intelligentBatches = this.buildIntelligentNativeBatches(images);
    messages.push(...intelligentBatches);
    
    return messages;
  }

  // Adaptive Batch Hybrid (แอดวานซ์ระดับ 3)
  buildAdaptiveBatchHybrid(images, lotNumber, formattedDate) {
    const messages = [];
    
    // 1. Summary overview
    const summaryFlex = this.buildAdaptiveSummaryFlex(images, lotNumber, formattedDate);
    messages.push(summaryFlex);
    
    // 2. Progressive native image delivery
    const progressiveBatches = this.buildProgressiveNativeBatches(images);
    messages.push(...progressiveBatches);
    
    return messages;
  }

  // Ultra Premium Hybrid (แอดวานซ์สุดยอด)
  buildUltraPremiumHybrid(images, lotNumber, formattedDate) {
    const messages = [];
    
    // 1. Premium showcase flex
    const premiumShowcase = this.buildPremiumShowcaseFlex(images, lotNumber, formattedDate);
    messages.push(premiumShowcase);
    
    // 2. Each image as premium native with metadata
    images.forEach((image, index) => {
      const premiumNative = this.buildPremiumNativeImage(image, index + 1, lotNumber);
      messages.push(premiumNative);
    });
    
    return messages;
  }

  // Advanced Image Carousel
  buildAdvancedImageCarousel(images, lotNumber) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    const carouselColumns = images.map((image, index) => {
      const imageUrl = image.url.startsWith('http') 
        ? image.url 
        : `${baseUrl}${image.url}`;
      
      return {
        imageUrl: imageUrl,
        action: {
          type: "postback",
          data: `action=carousel_share&image_url=${encodeURIComponent(imageUrl)}&index=${index + 1}&lot=${lotNumber}`,
          displayText: `แชร์รูปที่ ${index + 1} จาก carousel`
        }
      };
    });
    
    return {
      type: "template",
      altText: `🎠 Advanced Carousel - ${lotNumber} (${images.length} รูป)`,
      template: {
        type: "image_carousel",
        columns: carouselColumns
      }
    };
  }

  // Smart Flex Grid with intelligent layout
  buildSmartFlexGrid(images, lotNumber, formattedDate) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const gridSize = Math.min(images.length, 9); // 3x3 optimal
    const gridImages = images.slice(0, gridSize);
    
    // Dynamic grid layout based on image count
    const { rows, cols } = this.calculateOptimalGridLayout(gridSize);
    const flexRows = [];
    
    for (let r = 0; r < rows; r++) {
      const rowImages = gridImages.slice(r * cols, (r + 1) * cols);
      const rowBoxes = rowImages.map((image, index) => {
        const imageUrl = image.url.startsWith('http') 
          ? image.url 
          : `${baseUrl}${image.url}`;
        
        const globalIndex = r * cols + index + 1;
        
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
                displayText: `🧠 Smart share รูปที่ ${globalIndex}`
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
      
      // Fill empty slots
      while (rowBoxes.length < cols) {
        rowBoxes.push({
          type: "box",
          layout: "vertical",
          contents: [],
          flex: 1
        });
      }
      
      flexRows.push({
        type: "box",
        layout: "horizontal",
        contents: rowBoxes,
        spacing: "xs",
        margin: "xs"
      });
    }
    
    return {
      type: "flex",
      altText: `🧠 Smart Grid - ${lotNumber}`,
      contents: {
        type: "bubble",
        size: "mega",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: `🧠 Smart Grid: ${lotNumber}`,
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
          contents: flexRows,
          paddingAll: "8px",
          spacing: "xs"
        }
      }
    };
  }

  // Calculate optimal grid layout
  calculateOptimalGridLayout(imageCount) {
    if (imageCount <= 3) return { rows: 1, cols: imageCount };
    if (imageCount <= 6) return { rows: 2, cols: 3 };
    return { rows: 3, cols: 3 };
  }

  // Selective Native Images (เลือกรูปสำคัญ)
  buildSelectiveNativeImages(images) {
    // Select key images: first, last, and middle
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

  // Select key image indices
  selectKeyImageIndices(totalImages) {
    if (totalImages <= 3) return Array.from({length: totalImages}, (_, i) => i);
    if (totalImages <= 10) return [0, Math.floor(totalImages/2), totalImages-1];
    
    // For large sets, select strategic samples
    const step = Math.floor(totalImages / 5);
    return [0, step, step*2, step*3, totalImages-1];
  }

  // Analyze image aspect ratios (advanced feature)
  analyzeImageAspectRatios(images) {
    // Placeholder for advanced image analysis
    return {
      average: 1.0,
      variance: 0.1,
      dominant: 'square'
    };
  }

  // Calculate display complexity
  calculateDisplayComplexity(images) {
    const baseComplexity = images.length * 0.1;
    const sizeVariance = 0.2; // Placeholder
    const aspectVariance = 0.1; // Placeholder
    
    return Math.min(baseComplexity + sizeVariance + aspectVariance, 1.0);
  }

  // Additional hybrid methods would go here...
  buildIntelligentFallbackHybrid(images, lotNumber, formattedDate) {
    // Fallback to native images with smart header
    const messages = [];
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    images.forEach(image => {
      const imageUrl = image.url.startsWith('http') 
        ? image.url 
        : `${baseUrl}${image.url}`;
      
      messages.push(this.buildImageMessage(imageUrl));
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

  // Build Flex Message for image deletion selection
  buildImageDeleteFlexMessage(lotNumber, imageDate, images) {
    // Use the smart grid approach for deletion too
    return this.buildSmartFlexGrid(images, lotNumber, this.dateFormatter.formatDisplayDate(imageDate));
  }
}

module.exports = new LineMessageBuilder();