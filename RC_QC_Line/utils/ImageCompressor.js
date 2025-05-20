// Image compression utility using Sharp
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('./Logger');
const appConfig = require('../config/app');

class ImageCompressor {
  constructor() {
    this.uploadPath = appConfig.upload.path;
    this.ensureUploadDirectory();
  }

  // Ensure the upload directory exists
  ensureUploadDirectory() {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
      logger.info(`Created upload directory: ${this.uploadPath}`);
    }
  }

  // Generate a unique filename
  generateFilename(originalFilename) {
    const extension = path.extname(originalFilename);
    const timestamp = Date.now();
    const uuid = uuidv4().slice(0, 8);
    return `${timestamp}-${uuid}${extension}`;
  }

  // Compress an image and save it to disk
  async compressImage(imageBuffer, originalFilename, options = {}) {
    try {
      const filename = this.generateFilename(originalFilename);
      const outputPath = path.join(this.uploadPath, filename);
      
      // Get original image info
      const imageInfo = await sharp(imageBuffer).metadata();
      const originalSize = imageBuffer.length;
      
      // Determine compression options
      const compressionOptions = {
        quality: options.quality || 80,
        width: options.width || null,
        height: options.height || null,
        fit: options.fit || 'inside'
      };
      
      // Create sharp instance
      let sharpInstance = sharp(imageBuffer);
      
      // Resize if width or height is provided
      if (compressionOptions.width || compressionOptions.height) {
        sharpInstance = sharpInstance.resize(
          compressionOptions.width,
          compressionOptions.height,
          { fit: compressionOptions.fit }
        );
      }
      
      // Apply compression based on image format
      let outputBuffer;
      const format = path.extname(originalFilename).toLowerCase();
      
      if (format === '.png') {
        outputBuffer = await sharpInstance
          .png({ quality: compressionOptions.quality })
          .toBuffer();
      } else {
        // Default to JPEG for other formats
        outputBuffer = await sharpInstance
          .jpeg({ quality: compressionOptions.quality })
          .toBuffer();
      }
      
      // Save the compressed image
      await fs.promises.writeFile(outputPath, outputBuffer);
      
      // Get compressed size
      const compressedSize = outputBuffer.length;
      
      // Prepare result
      const result = {
        originalFilename: originalFilename,
        filename: filename,
        filePath: outputPath,
        originalSize: originalSize,
        compressedSize: compressedSize,
        compressionRatio: (originalSize / compressedSize).toFixed(2),
        width: imageInfo.width,
        height: imageInfo.height,
        format: imageInfo.format,
        url: `/uploads/${filename}`
      };
      
      logger.info(`Image compressed: ${originalFilename} -> ${filename}`, {
        originalSize,
        compressedSize,
        compressionRatio: result.compressionRatio
      });
      
      return result;
    } catch (error) {
      logger.error('Error compressing image:', error);
      throw error;
    }
  }

  // Delete an image file
  async deleteImage(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        logger.info(`Image deleted: ${filePath}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error deleting image ${filePath}:`, error);
      throw error;
    }
  }
}

module.exports = new ImageCompressor();