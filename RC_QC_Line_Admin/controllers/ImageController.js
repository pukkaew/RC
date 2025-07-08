const Image = require('../models/Image');
const Lot = require('../models/Lot');
const AuditLog = require('../models/AuditLog');
const FileService = require('../services/FileService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class ImageController {
    // List images with filters
    static async index(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const lot_number = req.query.lot_number || '';
            const startDate = req.query.start_date || '';
            const endDate = req.query.end_date || '';
            const view = req.query.view || 'grid';
            
            // Get images
            const images = await Image.findAll({
                page,
                limit,
                lot_number,
                startDate,
                endDate,
                status: 'active'
            });
            
            // Get total count
            const totalCount = await Image.count({
                lot_number,
                startDate,
                endDate,
                status: 'active'
            });
            
            const totalPages = Math.ceil(totalCount / limit);
            
            // Get lots for filter dropdown
            const lots = await Lot.findAll({ limit: 100 });
            
            res.render('images/index', {
                title: req.t('images:title'),
                images,
                lots,
                pagination: {
                    page,
                    limit,
                    totalCount,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                },
                filters: {
                    lot_number,
                    startDate,
                    endDate,
                    view
                }
            });
        } catch (error) {
            logger.error('Error listing images:', error);
            req.flash('error_msg', req.t('common:errors.load_failed'));
            res.redirect('/');
        }
    }
    
    // Get images for grid view (AJAX)
    static async getGrid(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const lot_id = req.query.lot_id;
            const lot_number = req.query.lot_number;
            const startDate = req.query.start_date;
            const endDate = req.query.end_date;
            
            const images = await Image.findAll({
                page,
                limit,
                lot_id,
                lot_number,
                startDate,
                endDate,
                status: 'active'
            });
            
            const totalCount = await Image.count({
                lot_id,
                lot_number,
                startDate,
                endDate,
                status: 'active'
            });
            
            res.json({
                success: true,
                data: images.map(img => img.toJSON()),
                pagination: {
                    page,
                    limit,
                    totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                }
            });
        } catch (error) {
            logger.error('Error getting image grid:', error);
            res.status(500).json({
                success: false,
                message: req.t('common:errors.load_failed')
            });
        }
    }
    
    // View single image
    static async view(req, res) {
        try {
            const imageId = req.params.id;
            const image = await Image.findById(imageId);
            
            if (!image) {
                return res.status(404).json({
                    success: false,
                    message: req.t('images:errors.not_found')
                });
            }
            
            res.json({
                success: true,
                data: image.toJSON()
            });
        } catch (error) {
            logger.error('Error viewing image:', error);
            res.status(500).json({
                success: false,
                message: req.t('common:errors.load_failed')
            });
        }
    }
    
    // Delete single image
    static async delete(req, res) {
        try {
            const imageId = req.params.id;
            const image = await Image.findById(imageId);
            
            if (!image) {
                return res.status(404).json({
                    success: false,
                    message: req.t('images:errors.not_found')
                });
            }
            
            // Mark as deleted in database
            await image.delete();
            
            // Delete physical file
            await FileService.deleteMultipleImages([image.file_path]);
            
            // Log the action
            await AuditLog.logImageDelete(
                req.session.user.admin_id,
                imageId,
                image.file_name,
                req.ip,
                req.get('user-agent')
            );
            
            res.json({
                success: true,
                message: req.t('images:messages.delete_success')
            });
        } catch (error) {
            logger.error('Error deleting image:', error);
            res.status(500).json({
                success: false,
                message: req.t('common:errors.delete_failed')
            });
        }
    }
    
    // Bulk delete images
    static async bulkDelete(req, res) {
        try {
            const { imageIds } = req.body;
            
            if (!Array.isArray(imageIds) || imageIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: req.t('images:errors.no_selection')
                });
            }
            
            // Limit bulk operations
            if (imageIds.length > 50) {
                return res.status(400).json({
                    success: false,
                    message: req.t('images:errors.too_many_selected')
                });
            }
            
            // Delete images
            const deletedFiles = await Image.deleteMultiple(imageIds, req.session.user.admin_id);
            
            // Delete physical files
            const filePaths = deletedFiles.map(f => f.file_path);
            await FileService.deleteMultipleImages(filePaths);
            
            // Log the action
            await AuditLog.logBulkImageDelete(
                req.session.user.admin_id,
                imageIds.length,
                req.ip,
                req.get('user-agent')
            );
            
            res.json({
                success: true,
                message: req.t('images:messages.bulk_delete_success', { count: imageIds.length })
            });
        } catch (error) {
            logger.error('Error bulk deleting images:', error);
            res.status(500).json({
                success: false,
                message: req.t('common:errors.delete_failed')
            });
        }
    }
    
    // Download single image
    static async download(req, res) {
        try {
            const imageId = req.params.id;
            const image = await Image.findById(imageId);
            
            if (!image) {
                req.flash('error_msg', req.t('images:errors.not_found'));
                return res.redirect('/images');
            }
            
            const fullPath = image.getFullPath();
            
            // Check if file exists
            const fileStats = await FileService.getFileStats(image.file_path);
            if (!fileStats.exists) {
                req.flash('error_msg', req.t('images:errors.file_not_found'));
                return res.redirect('/images');
            }
            
            res.download(fullPath, image.file_name);
            
            // Log download action
            await AuditLog.create({
                admin_id: req.session.user.admin_id,
                action_type: 'IMAGE_DOWNLOAD',
                entity_type: 'image',
                entity_id: imageId,
                description: `Downloaded image ${image.file_name}`,
                ip_address: req.ip,
                user_agent: req.get('user-agent')
            });
        } catch (error) {
            logger.error('Error downloading image:', error);
            req.flash('error_msg', req.t('common:errors.download_failed'));
            res.redirect('/images');
        }
    }
    
    // Download multiple images as ZIP
    static async downloadMultiple(req, res) {
        try {
            const { imageIds } = req.body;
            
            if (!Array.isArray(imageIds) || imageIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: req.t('images:errors.no_selection')
                });
            }
            
            // Get images
            const images = await Promise.all(
                imageIds.map(id => Image.findById(id))
            );
            
            const validImages = images.filter(img => img !== null);
            
            if (validImages.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: req.t('images:errors.not_found')
                });
            }
            
            // Create ZIP file
            const zipFileName = `images_${Date.now()}.zip`;
            const zipPath = await FileService.createZipFromImages(validImages, zipFileName);
            
            // Send response with download URL
            res.json({
                success: true,
                downloadUrl: `/images/download-zip/${path.basename(zipPath)}`
            });
            
            // Log the action
            await AuditLog.create({
                admin_id: req.session.user.admin_id,
                action_type: 'BULK_IMAGE_DOWNLOAD',
                entity_type: 'image',
                description: `Downloaded ${validImages.length} images as ZIP`,
                ip_address: req.ip,
                user_agent: req.get('user-agent')
            });
        } catch (error) {
            logger.error('Error downloading multiple images:', error);
            res.status(500).json({
                success: false,
                message: req.t('common:errors.download_failed')
            });
        }
    }
    
    // Download prepared ZIP file
    static async downloadZip(req, res) {
        try {
            const fileName = req.params.filename;
            const zipPath = path.join(FileService.getTempPath(), fileName);
            
            // Security check - ensure filename is safe
            if (!fileName.match(/^images_\d+\.zip$/)) {
                return res.status(400).send('Invalid file');
            }
            
            res.download(zipPath, fileName, (err) => {
                if (err) {
                    logger.error('Error sending ZIP file:', err);
                }
                
                // Clean up temp file
                FileService.deleteTempFile(zipPath);
            });
        } catch (error) {
            logger.error('Error downloading ZIP:', error);
            res.status(500).send('Download failed');
        }
    }
    
    // Get image statistics
    static async getStats(req, res) {
        try {
            const stats = await Image.getUploadStatistics(30);
            const breakdown = await Image.getStorageBreakdown();
            
            res.json({
                success: true,
                data: {
                    uploadStats: stats,
                    storageBreakdown: breakdown
                }
            });
        } catch (error) {
            logger.error('Error getting image stats:', error);
            res.status(500).json({
                success: false,
                message: req.t('common:errors.load_failed')
            });
        }
    }
}

module.exports = ImageController;