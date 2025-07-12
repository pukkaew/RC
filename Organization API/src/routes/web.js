const express = require('express');
const router = express.Router();

// Import controllers
const companyController = require('../controllers/companyController');
const dashboardController = require('../controllers/dashboardController');
const apiKeyController = require('../controllers/apiKeyController');

// Import route files
const companyRoutes = require('./companyRoutes');
const branchRoutes = require('./branchRoutes');
const divisionRoutes = require('./divisionRoutes');
const departmentRoutes = require('./departmentRoutes');
const apiKeyRoutes = require('./apiKeyRoutes');

// Middleware to set common variables for views
router.use((req, res, next) => {
    res.locals.currentPath = req.path;
    res.locals.user = req.user || { username: 'Admin' };
    res.locals.query = req.query;
    next();
});

// Dashboard route
router.get('/', dashboardController.showDashboard);

// Company routes
router.use('/companies', companyRoutes);

// Branch routes
router.use('/branches', branchRoutes);

// Division routes
router.use('/divisions', divisionRoutes);

// Department routes
router.use('/departments', departmentRoutes);

// API Key management routes
router.use('/api-keys', apiKeyRoutes);

// Documentation route
router.get('/docs', (req, res) => {
    res.render('docs/index', {
        title: 'API Documentation'
    });
});

// Health check route
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

module.exports = router;