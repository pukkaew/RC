const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const sharp = require('sharp');
const logger = require('../utils/logger');

class FileService {
    /**
     * Get upload directory path
     */
    static getUploadPath() {
        return path.join(process.cwd(), process.env.UPLOAD_PATH || './public/uploads');
    }
    
    /**
     * Get temp directory path
     */
    static getTempPath() {
        return path.join(process.cwd(), './temp');
    }
    
    /**
     * Ensure directory exists
     */
    static async ensureDirectory(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
            return true;
        } catch (error) {
            logger.error('Error creating directory:', error);
            return false;
        }
    }
    
    /**
     * Delete a single file
     */
    static async deleteFile(filePath) {
        try {
            const fullPath = path.join(process.cwd(), 'public', filePath);
            await fs.unlink(fullPath);
            logger.info(`Deleted file: ${fullPath}`);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.warn(`File not found: ${filePath}`);
                return true; // Consider it deleted if not found
            }
            logger.error('Error deleting file:', error);
            return false;
        }
    }
    
    /**
     * Delete multiple files
     */
    static async deleteMultipleFiles(filePaths) {
        const results = await Promise.allSettled(
            filePaths.map(filePath => this.deleteFile(filePath))
        );
        
        const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
        const failed = results.filter(r => r.status === 'rejected' || !r.value).length;
        
        return { successful, failed, total: filePaths.length };
    }
    
    /**
     * Delete multiple images (including compressed versions)
     */
    static async deleteMultipleImages(imagePaths) {
        const allPaths = [];
        
        imagePaths.forEach(imagePath => {
            allPaths.push(imagePath);
            
            // Add compressed version path
            const dir = path.dirname(imagePath);
            const filename = path.basename(imagePath);
            const compressedPath = path.join(dir, 'compressed', filename);
            allPaths.push(compressedPath);
        });
        
        return this.deleteMultipleFiles(allPaths);
    }
    
    /**
     * Create a ZIP file from images
     */
    static async createZipFromImages(images, zipFileName) {
        const tempPath = this.getTempPath();
        await this.ensureDirectory(tempPath);
        
        const zipPath = path.join(tempPath, zipFileName);
        
        return new Promise((resolve, reject) => {
            const output = require('fs').createWriteStream(zipPath);
            const archive = archiver('zip', {
                zlib: { level: 9 } // Maximum compression
            });
            
            output.on('close', () => {
                logger.info(`Created ZIP file: ${zipPath} (${archive.pointer()} bytes)`);
                resolve(zipPath);
            });
            
            archive.on('error', (err) => {
                logger.error('Error creating ZIP:', err);
                reject(err);
            });
            
            archive.pipe(output);
            
            // Add each image to the ZIP
            images.forEach(image => {
                const fullPath = path.join(process.cwd(), 'public', image.file_path);
                archive.file(fullPath, { name: image.file_name });
            });
            
            archive.finalize();
        });
    }
    
    /**
     * Create a ZIP file from a directory
     */
    static async createZipFromDirectory(dirPath, zipFileName) {
        const tempPath = this.getTempPath();
        await this.ensureDirectory(tempPath);
        
        const zipPath = path.join(tempPath, zipFileName);
        
        return new Promise((resolve, reject) => {
            const output = require('fs').createWriteStream(zipPath);
            const archive = archiver('zip', {
                zlib: { level: 9 }
            });
            
            output.on('close', () => {
                logger.info(`Created ZIP file: ${zipPath} (${archive.pointer()} bytes)`);
                resolve(zipPath);
            });
            
            archive.on('error', (err) => {
                logger.error('Error creating ZIP:', err);
                reject(err);
            });
            
            archive.pipe(output);
            archive.directory(dirPath, false);
            archive.finalize();
        });
    }
    
    /**
     * Delete temp file
     */
    static async deleteTempFile(filePath) {
        try {
            await fs.unlink(filePath);
            logger.info(`Deleted temp file: ${filePath}`);
            return true;
        } catch (error) {
            logger.error('Error deleting temp file:', error);
            return false;
        }
    }
    
    /**
     * Clean up old temp files
     */
    static async cleanupTempFiles(maxAgeHours = 24) {
        try {
            const tempPath = this.getTempPath();
            const files = await fs.readdir(tempPath);
            const maxAge = maxAgeHours * 60 * 60 * 1000;
            const now = Date.now();
            
            let deletedCount = 0;
            
            for (const file of files) {
                const filePath = path.join(tempPath, file);
                const stats = await fs.stat(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    await fs.unlink(filePath);
                    deletedCount++;
                }
            }
            
            if (deletedCount > 0) {
                logger.info(`Cleaned up ${deletedCount} old temp files`);
            }
            
            return deletedCount;
        } catch (error) {
            logger.error('Error cleaning up temp files:', error);
            return 0;
        }
    }
    
    /**
     * Get file stats
     */
    static async getFileStats(filePath) {
        try {
            const fullPath = path.join(process.cwd(), 'public', filePath);
            const stats = await fs.stat(fullPath);
            
            return {
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                isFile: stats.isFile(),
                exists: true
            };
        } catch (error) {
            return {
                exists: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get directory size
     */
    static async getDirectorySize(dirPath) {
        let totalSize = 0;
        
        try {
            const files = await fs.readdir(dirPath);
            
            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stats = await fs.stat(filePath);
                
                if (stats.isFile()) {
                    totalSize += stats.size;
                } else if (stats.isDirectory()) {
                    totalSize += await this.getDirectorySize(filePath);
                }
            }
            
            return totalSize;
        } catch (error) {
            logger.error('Error calculating directory size:', error);
            return 0;
        }
    }
    
    /**
     * Get storage statistics
     */
    static async getStorageStats() {
        const uploadPath = this.getUploadPath();
        const totalSize = await this.getDirectorySize(uploadPath);
        
        // Count files by type
        const fileStats = {
            total: 0,
            images: 0,
            compressed: 0
        };
        
        const countFiles = async (dirPath) => {
            try {
                const files = await fs.readdir(dirPath);
                
                for (const file of files) {
                    const filePath = path.join(dirPath, file);
                    const stats = await fs.stat(filePath);
                    
                    if (stats.isFile()) {
                        fileStats.total++;
                        
                        const ext = path.extname(file).toLowerCase();
                        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
                            fileStats.images++;
                            
                            if (dirPath.includes('compressed')) {
                                fileStats.compressed++;
                            }
                        }
                    } else if (stats.isDirectory()) {
                        await countFiles(filePath);
                    }
                }
            } catch (error) {
                logger.error('Error counting files:', error);
            }
        };
        
        await countFiles(uploadPath);
        
        return {
            totalSize,
            fileCount: fileStats.total,
            imageCount: fileStats.images,
            compressedCount: fileStats.compressed,
            averageSize: fileStats.total > 0 ? Math.round(totalSize / fileStats.total) : 0
        };
    }
    
    /**
     * Validate file type
     */
    static isValidImageType(mimeType) {
        const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,image/webp').split(',');
        return allowedTypes.includes(mimeType);
    }
    
    /**
     * Validate file size
     */
    static isValidFileSize(size) {
        const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760; // 10MB default
        return size <= maxSize;
    }
    
    /**
     * Generate unique filename
     */
    static generateUniqueFilename(originalName) {
        const ext = path.extname(originalName);
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `${timestamp}-${random}${ext}`;
    }
    
    /**
     * Get image dimensions
     */
    static async getImageDimensions(imagePath) {
        try {
            const fullPath = path.join(process.cwd(), 'public', imagePath);
            const metadata = await sharp(fullPath).metadata();
            
            return {
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
                size: metadata.size
            };
        } catch (error) {
            logger.error('Error getting image dimensions:', error);
            return null;
        }
    }
}

module.exports = FileService;