const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const ImageController = require('../controllers/ImageController');
const { canManageLots } = require('../middleware/auth');
const { downloadLimiter } = require('../middleware/rateLimiter');

// List images
router.get('/', ImageController.index);

// Get images grid (AJAX)
router.get('/api/grid', ImageController.getGrid);

// View single image (AJAX)
router.get('/api/:id',
    param('id').isInt().withMessage('Invalid image ID'),
    ImageController.view
);

// Delete single image (Manager+)
router.delete('/:id',
    canManageLots,
    param('id').isInt().withMessage('Invalid image ID'),
    ImageController.delete
);

// Bulk delete images (Manager+)
router.post('/bulk-delete',
    canManageLots,
    body('imageIds').isArray().withMessage('Image IDs must be an array'),
    body('imageIds.*').isInt().withMessage('Invalid image ID'),
    ImageController.bulkDelete
);

// Download single image
router.get('/:id/download',
    downloadLimiter,
    param('id').isInt().withMessage('Invalid image ID'),
    ImageController.download
);

// Download multiple images as ZIP
router.post('/download-multiple',
    downloadLimiter,
    body('imageIds').isArray().withMessage('Image IDs must be an array'),
    body('imageIds.*').isInt().withMessage('Invalid image ID'),
    ImageController.downloadMultiple
);

// Download prepared ZIP file
router.get('/download-zip/:filename',
    downloadLimiter,
    param('filename').matches(/^images_\d+\.zip$/).withMessage('Invalid filename'),
    ImageController.downloadZip
);

// Get image statistics (AJAX)
router.get('/api/stats', ImageController.getStats);

module.exports = router;