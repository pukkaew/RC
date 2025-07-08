const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const AuditController = require('../controllers/AuditController');
const { canViewAuditLogs } = require('../middleware/auth');

// All audit routes require admin role
router.use(canViewAuditLogs);

// List audit logs
router.get('/', AuditController.index);

// View audit log details (AJAX)
router.get('/api/:id',
    param('id').isInt().withMessage('Invalid log ID'),
    AuditController.view
);

// Export audit logs
router.post('/export',
    [
        body('admin_id').optional().isInt(),
        body('action_type').optional().isString(),
        body('entity_type').optional().isString(),
        body('start_date').optional().isISO8601().toDate(),
        body('end_date').optional().isISO8601().toDate()
    ],
    AuditController.export
);

// Get statistics (AJAX)
router.get('/api/stats', AuditController.getStats);

// Cleanup old logs
router.post('/cleanup', AuditController.cleanup);

module.exports = router;