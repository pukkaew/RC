// Share Card API routes for beautiful image sharing
const express = require('express');
const router = express.Router();
const shareCardService = require('../services/ShareCardService');
const imageService = require('../services/ImageService');
const logger = require('../utils/Logger');

// Create share card session
router.post('/share/create-card', async (req, res) => {
  try {
    const { lotNumber, imageDate, selectedImageIds } = req.body;
    
    logger.info(`Creating share card - Lot: ${lotNumber}, Date: ${imageDate}, Images: ${selectedImageIds?.length || 'all'}`);
    
    // Get images
    const result = await imageService.getImagesByLotAndDate(lotNumber, imageDate);
    
    if (!result.images || result.images.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No images found'
      });
    }
    
    // Filter selected images if provided
    let imagesToShare = result.images;
    if (selectedImageIds && selectedImageIds.length > 0) {
      imagesToShare = result.images.filter(img => 
        selectedImageIds.includes(img.image_id)
      );
    }
    
    // Create share card
    const shareCard = await shareCardService.createShareCard(
      lotNumber,
      imageDate,
      imagesToShare
    );
    
    res.json({
      success: true,
      shareCard: shareCard,
      imageCount: imagesToShare.length
    });
    
  } catch (error) {
    logger.error('Error creating share card:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get share card preview
router.get('/share/card/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    const card = shareCardService.getShareCard(cardId);
    
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Share card not found or expired'
      });
    }
    
    res.json({
      success: true,
      card: card
    });
    
  } catch (error) {
    logger.error('Error getting share card:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Download share card images as ZIP
router.get('/share/:cardId/download', async (req, res) => {
  try {
    const { cardId } = req.params;
    const card = shareCardService.getShareCard(cardId);
    
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Share card not found or expired'
      });
    }
    
    // Import required modules
    const archiver = require('archiver');
    const fs = require('fs');
    const path = require('path');
    
    // Set headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 
      `attachment; filename="QC_${card.lotNumber}_${card.imageDate}.zip"`);
    
    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    // Handle archive errors
    archive.on('error', (err) => {
      logger.error('Archive error:', err);
      res.status(500).end();
    });
    
    // Pipe archive to response
    archive.pipe(res);
    
    // Add images to ZIP
    card.images.forEach((image, index) => {
      const imagePath = path.join(__dirname, '..', image.file_path);
      const filename = `QC_${card.lotNumber}_${index + 1}.jpg`;
      
      if (fs.existsSync(imagePath)) {
        archive.file(imagePath, { name: filename });
      }
    });
    
    // Add info text file
    const infoText = `RC QC System - Image Export\n` +
                     `========================\n\n` +
                     `Lot Number: ${card.lotNumber}\n` +
                     `Date: ${new Date(card.imageDate).toLocaleDateString('th-TH')}\n` +
                     `Total Images: ${card.images.length}\n` +
                     `Exported: ${new Date().toLocaleString('th-TH')}\n`;
    
    archive.append(infoText, { name: 'info.txt' });
    
    // Finalize archive
    archive.finalize();
    
  } catch (error) {
    logger.error('Error creating download:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create download'
    });
  }
});

module.exports = router;