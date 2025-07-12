const express = require('express');
const router = express.Router();

// Import middleware
const { requireAuth, optionalAuth, login, logout, showLoginPage, storeReturnTo } = require('../middleware/auth');

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

// Store return URL before checking auth
router.use(storeReturnTo);

// Public routes (no auth required)
router.get('/login', showLoginPage);
router.post('/login', login);
router.get('/logout', logout);

// Health check route (public)
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Apply auth middleware to all routes below this line
router.use(requireAuth);

// Middleware to set common variables for views
router.use((req, res, next) => {
    res.locals.currentPath = req.path;
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

module.exports = router;