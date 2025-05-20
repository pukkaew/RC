// Service for image processing and management
const path = require('path');
const fs = require('fs');
const imageCompressor = require('../utils/ImageCompressor');
const imageModel = require('../models/ImageModel');
const lotModel = require('../models/LotModel');
const logger = require('../utils/Logger');
const { AppError } = require('../utils/ErrorHandler');
const appConfig = require('../config/app');

class ImageService {
  constructor() {
    this.imageCompressor = imageCompressor;
    this.maxImagesPerMessage = appConfig.limits.maxImagesPerMessage;
  }

  // Process and save uploaded images
  async processImages(files, lotNumber, imageDate, uploadedBy) {
    try {
      if (!files || files.length === 0) {
        throw new AppError('No files provided', 400);
      }
      
      // Get or create lot record
      const lot = await lotModel.getOrCreate(lotNumber);
      
      // Process each image with better error handling
      const processedImages = [];
      const errors = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          // Ensure we have a buffer
          if (!file.buffer || file.buffer.length === 0) {
            errors.push(`File ${i+1}: Missing or empty buffer`);
            continue;
          }
          
          // Log the file being processed
          logger.info(`Processing file ${i+1}/${files.length}: ${file.originalname}, size: ${file.buffer.length} bytes`);

          // Compress the image
          const compressedImage = await this.imageCompressor.compressImage(
            file.buffer,
            file.originalname,
            { quality: 80 }
          );
          
          // Create image data object
          const imageData = {
            lotId: lot.lot_id,
            imageDate: new Date(imageDate),
            fileName: compressedImage.filename,
            filePath: compressedImage.filePath,
            originalSize: compressedImage.originalSize,
            compressedSize: compressedImage.compressedSize,
            mimeType: file.mimetype,
            uploadedBy: uploadedBy
          };
          
          // Create image record in database
          const imageId = await imageModel.create(imageData);
          
          // Add to processed images
          processedImages.push({
            id: imageId,
            ...imageData,
            ...compressedImage
          });
          
          logger.info(`Successfully processed file ${i+1}/${files.length}: ${compressedImage.filename}`);
        } catch (error) {
          const errorMsg = `Error processing file ${i+1}: ${error.message}`;
          logger.error(errorMsg, error);
          errors.push(errorMsg);
        }
      }
      
      // Log summary
      logger.info(`Processed ${processedImages.length} of ${files.length} images successfully`);
      if (errors.length > 0) {
        logger.warn(`Encountered ${errors.length} errors during processing: ${errors.join('; ')}`);
      }
      
      return {
        lot,
        images: processedImages,
        errors: errors,
        totalFiles: files.length,
        successfulFiles: processedImages.length
      };
    } catch (error) {
      logger.error('Error processing images:', error);
      throw error;
    }
  }

  // Get images by lot number and date
  async getImagesByLotAndDate(lotNumber, imageDate) {
    try {
      // Get images from database
      const images = await imageModel.getByLotNumberAndDate(lotNumber, imageDate);
      
      if (!images || images.length === 0) {
        return {
          lotNumber,
          imageDate,
          images: []
        };
      }
      
      // Convert file paths to URLs
      const imagesWithUrls = images.map(image => {
        const filename = path.basename(image.file_path);
        return {
          ...image,
          url: `/uploads/${filename}`
        };
      });
      
      // Group images for LINE sending (max 5 per message)
      const groupedImages = this.groupImagesForSending(imagesWithUrls);
      
      return {
        lotNumber,
        imageDate,
        images: imagesWithUrls,
        groupedImages
      };
    } catch (error) {
      logger.error('Error getting images by lot and date:', error);
      throw error;
    }
  }

  // Group images for sending in LINE messages (max 5 per message)
  groupImagesForSending(images) {
    const groups = [];
    const totalImages = images.length;
    
    for (let i = 0; i < totalImages; i += this.maxImagesPerMessage) {
      groups.push(images.slice(i, i + this.maxImagesPerMessage));
    }
    
    return groups;
  }

  // Delete an image
  async deleteImage(imageId) {
    try {
      // Get image record
      const query = `
        SELECT * FROM Images
        WHERE image_id = @imageId
      `;
      
      const params = [
        { name: 'imageId', type: require('mssql').Int, value: imageId }
      ];
      
      const result = await require('../services/DatabaseService').executeQuery(query, params);
      
      if (!result.recordset || result.recordset.length === 0) {
        throw new AppError('Image not found', 404);
      }
      
      const image = result.recordset[0];
      
      // Delete file from disk
      await this.imageCompressor.deleteImage(image.file_path);
      
      // Update image status in database
      await imageModel.delete(imageId);
      
      return true;
    } catch (error) {
      logger.error('Error deleting image:', error);
      throw error;
    }
  }
}

module.exports = new ImageService();