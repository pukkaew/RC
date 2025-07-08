const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');
const LotController = require('../controllers/LotController');
const ImageController = require('../controllers/ImageController');
const AuditController = require('../controllers/AuditController');
const { apiLimiter } = require('../middleware/rateLimiter');

// Apply rate limiting to all API routes
router.use(apiLimiter);

// Dashboard APIs
router.get('/dashboard/stats', DashboardController.getStats);
router.get('/dashboard/recent-activity', DashboardController.getRecentActivity);
router.get('/dashboard/upload-chart', DashboardController.getUploadChart);
router.get('/dashboard/storage-breakdown', DashboardController.getStorageBreakdown);

// Lot APIs
router.get('/lots/search', LotController.search);
router.get('/lots/:id/stats', LotController.stats);

// Image APIs
router.get('/images/grid', ImageController.getGrid);
router.get('/images/stats', ImageController.getStats);

// Audit APIs
router.get('/audit/stats', AuditController.getStats);

// System health check
router.get('/health', DashboardController.healthCheck);

module.exports = router;