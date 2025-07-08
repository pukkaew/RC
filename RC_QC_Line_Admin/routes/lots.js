const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const LotController = require('../controllers/LotController');
const { canManageLots, canDeleteLots } = require('../middleware/auth');

// List all lots
router.get('/', LotController.index);

// View lot details
router.get('/:id', 
    param('id').isInt().withMessage('Invalid lot ID'),
    LotController.view
);

// Edit lot form (Manager+)
router.get('/:id/edit',
    canManageLots,
    param('id').isInt().withMessage('Invalid lot ID'),
    LotController.showEdit
);

// Update lot (Manager+)
router.put('/:id',
    canManageLots,
    [
        param('id').isInt().withMessage('Invalid lot ID'),
        body('lot_number').trim().notEmpty().withMessage('Lot number is required')
            .isLength({ max: 100 }).withMessage('Lot number too long')
    ],
    LotController.update
);

// Delete lot (Admin only)
router.delete('/:id',
    canDeleteLots,
    param('id').isInt().withMessage('Invalid lot ID'),
    LotController.delete
);

// Download all images in lot as ZIP
router.get('/:id/download',
    param('id').isInt().withMessage('Invalid lot ID'),
    LotController.downloadAll
);

// API: Search lots
router.get('/api/search', LotController.search);

// API: Get lot statistics
router.get('/api/:id/stats',
    param('id').isInt().withMessage('Invalid lot ID'),
    LotController.stats
);

module.exports = router;