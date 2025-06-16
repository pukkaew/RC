// Routes for image sharing
const express = require('express');
const router = express.Router();
const imageShareService = require('../services/ImageShareService');
const lineService = require('../services/LineService');
const imageService = require('../services/ImageService');
const logger = require('../utils/Logger');
const archiver = require('archiver');
const path = require('path');

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    status: 'Share routes working',
    endpoints: [
      'POST /api/share/create',
      'GET /api/share/:sessionId',
      'POST /api/share/deliver',
      'GET /api/share/:sessionId/download'
    ]
  });
});

// Create share session
router.post('/create', async (req, res) => {
  try {
    const { userId, lotNumber, imageDate, imageIds } = req.body;
    
    logger.info(`Creating share session for user: ${userId}, lot: ${lotNumber}, images: ${imageIds?.length}`);
    
    // Validate parameters
    if (!lotNumber || !imageDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: lotNumber and imageDate'
      });
    }
    
    // Get images
    const result = await imageService.getImagesByLotAndDate(lotNumber, imageDate);
    
    if (!result.images || result.images.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No images found for the specified lot and date'
      });
    }
    
    // Filter selected images if provided
    let imagesToShare = result.images;
    if (imageIds && imageIds.length > 0) {
      imagesToShare = result.images.filter(img => imageIds.includes(img.image_id));
      
      if (imagesToShare.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Selected images not found'
        });
      }
    }
    
    // Create share session
    const shareSession = await imageShareService.createShareSession(
      userId || 'anonymous',
      imagesToShare,
      lotNumber,
      imageDate
    );
    
    // Build full share URL
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const fullShareUrl = `${baseUrl}/share/${shareSession.sessionId}`;
    
    res.json({
      success: true,
      sessionId: shareSession.sessionId,
      shareUrl: fullShareUrl,
      imageCount: imagesToShare.length
    });
    
  } catch (error) {
    logger.error('Error creating share session:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create share session'
    });
  }
});

// Get share session info
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = imageShareService.getShareSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Share session not found or expired'
      });
    }
    
    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        lotNumber: session.lotNumber,
        imageDate: session.imageDate,
        imageCount: session.images.length,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt
      }
    });
    
  } catch (error) {
    logger.error('Error getting share session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get share session'
    });
  }
});

// Deliver images to user
router.post('/deliver', async (req, res) => {
  try {
    const { sessionId, userId } = req.body;
    
    if (!sessionId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
    const session = imageShareService.getShareSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session expired or not found'
      });
    }
    
    // Send images to the user who clicked the link
    const result = await imageShareService.sendImagesToChat(sessionId, userId, 'user');
    
    res.json({
      success: true,
      message: `ส่งรูปภาพ ${result.count} รูป แล้ว`,
      count: result.count
    });
    
  } catch (error) {
    logger.error('Error delivering images:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to deliver images'
    });
  }
});

// Download all images as ZIP
router.get('/:sessionId/download', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = imageShareService.getShareSession(sessionId);
    
    if (!session) {
      return res.status(404).send('Session not found or expired');
    }
    
    // Set response headers
    res.attachment(`QC_${session.lotNumber}_${session.imageDate}.zip`);
    
    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });
    
    // Handle archive errors
    archive.on('error', (err) => {
      logger.error('Archive error:', err);
      res.status(500).send('Error creating archive');
    });
    
    // Pipe archive to response
    archive.pipe(res);
    
    // Add images to ZIP
    for (let i = 0; i < session.images.length; i++) {
      const image = session.images[i];
      const filename = `QC_${session.lotNumber}_${i + 1}.jpg`;
      
      if (image.tempPath) {
        archive.file(image.tempPath, { name: filename });
      } else {
        // Fallback to original path
        const originalPath = path.join(__dirname, '..', image.file_path || image.filePath);
        archive.file(originalPath, { name: filename });
      }
    }
    
    // Finalize archive
    await archive.finalize();
    
  } catch (error) {
    logger.error('Error creating download:', error);
    res.status(500).send('Download failed');
  }
});

module.exports = router;