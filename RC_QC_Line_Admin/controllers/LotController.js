const Lot = require('../models/Lot');
const Image = require('../models/Image');
const AuditLog = require('../models/AuditLog');
const FileService = require('../services/FileService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class LotController {
    // List all lots
    static async index(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const search = req.query.search || '';
            const hasImages = req.query.hasImages;
            const orderBy = req.query.orderBy || 'created_at';
            const orderDir = req.query.orderDir || 'DESC';
            
            // Get lots
            const lots = await Lot.findAll({
                page,
                limit,
                search,
                hasImages: hasImages === 'true' ? true : hasImages === 'false' ? false : undefined,
                orderBy,
                orderDir
            });
            
            // Get total count
            const totalCount = await Lot.count({ search });
            const totalPages = Math.ceil(totalCount / limit);
            
            res.render('lots/index', {
                title: req.t('lots:title'),
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
                    search,
                    hasImages,
                    orderBy,
                    orderDir
                }
            });
        } catch (error) {
            logger.error('Error listing lots:', error);
            req.flash('error_msg', req.t('common:errors.load_failed'));
            res.redirect('/');
        }
    }
    
    // View lot details
    static async view(req, res) {
        try {
            const lotId = req.params.id;
            const lot = await Lot.findById(lotId);
            
            if (!lot) {
                req.flash('error_msg', req.t('lots:errors.not_found'));
                return res.redirect('/lots');
            }
            
            // Get images in this lot
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            
            const images = await lot.getImages({
                page,
                limit,
                status: 'active'
            });
            
            const imageCount = await Image.count({ lot_id: lotId });
            const totalPages = Math.ceil(imageCount / limit);
            
            res.render('lots/view', {
                title: `Lot: ${lot.lot_number}`,
                lot,
                images,
                pagination: {
                    page,
                    limit,
                    totalCount: imageCount,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            });
        } catch (error) {
            logger.error('Error viewing lot:', error);
            req.flash('error_msg', req.t('common:errors.load_failed'));
            res.redirect('/lots');
        }
    }
    
    // Show edit form
    static async showEdit(req, res) {
        try {
            const lotId = req.params.id;
            const lot = await Lot.findById(lotId);
            
            if (!lot) {
                req.flash('error_msg', req.t('lots:errors.not_found'));
                return res.redirect('/lots');
            }
            
            res.render('lots/edit', {
                title: req.t('lots:edit.title'),
                lot
            });
        } catch (error) {
            logger.error('Error showing edit form:', error);
            req.flash('error_msg', req.t('common:errors.load_failed'));
            res.redirect('/lots');
        }
    }
    
    // Update lot
    static async update(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                req.flash('error_msg', req.t('common:errors.validation_error'));
                return res.redirect(`/lots/${req.params.id}/edit`);
            }
            
            const lotId = req.params.id;
            const { lot_number } = req.body;
            
            const lot = await Lot.findById(lotId);
            if (!lot) {
                req.flash('error_msg', req.t('lots:errors.not_found'));
                return res.redirect('/lots');
            }
            
            // Check if new lot number already exists
            const isDuplicate = await lot.checkDuplicate(lot_number);
            if (isDuplicate) {
                req.flash('error_msg', req.t('lots:errors.duplicate_lot_number'));
                return res.redirect(`/lots/${lotId}/edit`);
            }
            
            const oldLotNumber = lot.lot_number;
            
            // Update lot
            await lot.update({ lot_number });
            
            // Log the action
            await AuditLog.logLotUpdate(
                req.session.user.admin_id,
                lotId,
                oldLotNumber,
                lot_number,
                req.ip,
                req.get('user-agent')
            );
            
            req.flash('success_msg', req.t('lots:messages.update_success'));
            res.redirect(`/lots/${lotId}`);
        } catch (error) {
            logger.error('Error updating lot:', error);
            req.flash('error_msg', req.t('common:errors.save_failed'));
            res.redirect(`/lots/${req.params.id}/edit`);
        }
    }
    
    // Delete lot (Admin only)
    static async delete(req, res) {
        try {
            const lotId = req.params.id;
            const lot = await Lot.findById(lotId);
            
            if (!lot) {
                return res.status(404).json({
                    success: false,
                    message: req.t('lots:errors.not_found')
                });
            }
            
            // Get all images for file deletion
            const images = await lot.getImages({ status: 'active' });
            
            // Delete lot and mark images as deleted
            await lot.delete(req.session.user.admin_id);
            
            // Delete physical files
            const deleteResults = await FileService.deleteMultipleImages(
                images.map(img => img.file_path)
            );
            
            // Log the action
            await AuditLog.logLotDelete(
                req.session.user.admin_id,
                lotId,
                lot.lot_number,
                images.length,
                req.ip,
                req.get('user-agent')
            );
            
            res.json({
                success: true,
                message: req.t('lots:messages.delete_success', { count: images.length })
            });
        } catch (error) {
            logger.error('Error deleting lot:', error);
            res.status(500).json({
                success: false,
                message: req.t('common:errors.delete_failed')
            });
        }
    }
    
    // Download all images in lot as ZIP
    static async downloadAll(req, res) {
        try {
            const lotId = req.params.id;
            const lot = await Lot.findById(lotId);
            
            if (!lot) {
                req.flash('error_msg', req.t('lots:errors.not_found'));
                return res.redirect('/lots');
            }
            
            // Get all active images
            const images = await lot.getImages({ status: 'active' });
            
            if (images.length === 0) {
                req.flash('error_msg', req.t('lots:errors.no_images'));
                return res.redirect(`/lots/${lotId}`);
            }
            
            // Create ZIP file
            const zipPath = await FileService.createZipFromImages(
                images,
                `lot_${lot.lot_number}_${Date.now()}.zip`
            );
            
            // Send file
            res.download(zipPath, `lot_${lot.lot_number}.zip`, (err) => {
                if (err) {
                    logger.error('Error sending ZIP file:', err);
                }
                
                // Clean up temp file
                FileService.deleteTempFile(zipPath);
            });
            
            // Log the action
            await AuditLog.create({
                admin_id: req.session.user.admin_id,
                action_type: 'LOT_DOWNLOAD',
                entity_type: 'lot',
                entity_id: lotId,
                description: `Downloaded ${images.length} images from lot ${lot.lot_number}`,
                ip_address: req.ip,
                user_agent: req.get('user-agent')
            });
        } catch (error) {
            logger.error('Error downloading lot:', error);
            req.flash('error_msg', req.t('common:errors.download_failed'));
            res.redirect(`/lots/${req.params.id}`);
        }
    }
    
    // API: Search lots (for autocomplete)
    static async search(req, res) {
        try {
            const query = req.query.q || '';
            const limit = parseInt(req.query.limit) || 10;
            
            const lots = await Lot.findAll({
                search: query,
                limit,
                orderBy: 'lot_number',
                orderDir: 'ASC'
            });
            
            res.json({
                success: true,
                data: lots.map(lot => ({
                    id: lot.lot_id,
                    text: lot.lot_number,
                    image_count: lot.image_count
                }))
            });
        } catch (error) {
            logger.error('Error searching lots:', error);
            res.status(500).json({
                success: false,
                message: req.t('common:errors.load_failed')
            });
        }
    }
    
    // API: Get lot statistics
    static async stats(req, res) {
        try {
            const lotId = req.params.id;
            const lot = await Lot.findById(lotId);
            
            if (!lot) {
                return res.status(404).json({
                    success: false,
                    message: req.t('lots:errors.not_found')
                });
            }
            
            const stats = {
                lot_number: lot.lot_number,
                total_images: lot.image_count,
                total_size: lot.total_size,
                created_at: lot.created_at,
                last_upload: lot.last_upload
            };
            
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Error getting lot stats:', error);
            res.status(500).json({
                success: false,
                message: req.t('common:errors.load_failed')
            });
        }
    }
}

module.exports = LotController;