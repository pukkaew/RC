const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const ReportController = require('../controllers/ReportController');
const { canManageLots, isAdmin } = require('../middleware/auth');
const { reportLimiter } = require('../middleware/rateLimiter');

// Report dashboard
router.get('/', ReportController.index);

// Daily report
router.get('/daily', ReportController.daily);

// Storage report
router.get('/storage', ReportController.storageReport);

// User activity report (Admin only)
router.get('/user-activity', isAdmin, ReportController.userActivity);

// Export lot summary (Manager+)
router.post('/export/lot-summary',
    canManageLots,
    reportLimiter,
    [
        body('start_date').optional().isISO8601().toDate(),
        body('end_date').optional().isISO8601().toDate()
    ],
    ReportController.exportLotSummary
);

// Export image details (Manager+)
router.post('/export/image-details',
    canManageLots,
    reportLimiter,
    [
        body('lot_id').optional().isInt(),
        body('start_date').optional().isISO8601().toDate(),
        body('end_date').optional().isISO8601().toDate()
    ],
    ReportController.exportImageDetails
);

// Export daily uploads (Manager+)
router.post('/export/daily-uploads',
    canManageLots,
    reportLimiter,
    [
        body('start_date').optional().isISO8601().toDate(),
        body('end_date').optional().isISO8601().toDate()
    ],
    ReportController.exportDailyUploads
);

// Generate custom report (Manager+)
router.post('/custom',
    canManageLots,
    reportLimiter,
    [
        body('report_type').isIn(['lot_analysis', 'upload_trends', 'user_statistics']),
        body('filters').isObject()
    ],
    ReportController.customReport
);

module.exports = router;