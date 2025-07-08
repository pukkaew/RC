const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');

// Dashboard page
router.get('/', DashboardController.index);

// API endpoints for AJAX updates
router.get('/api/stats', DashboardController.getStats);
router.get('/api/recent-activity', DashboardController.getRecentActivity);
router.get('/api/upload-chart', DashboardController.getUploadChart);
router.get('/api/storage-breakdown', DashboardController.getStorageBreakdown);
router.get('/api/health', DashboardController.healthCheck);

module.exports = router;