require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const moment = require('moment-timezone');

// Import configurations
const sessionConfig = require('./config/session');
const i18nConfig = require('./config/i18n');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { isAuthenticated } = require('./middleware/auth');
const i18nMiddleware = require('./middleware/i18n');

// Import routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const lotRoutes = require('./routes/lots');
const imageRoutes = require('./routes/images');
const userRoutes = require('./routes/users');
const reportRoutes = require('./routes/reports');
const auditRoutes = require('./routes/audit');
const apiRoutes = require('./routes/api');

// Import services
const DatabaseService = require('./services/DatabaseService');

// Import utils
const logger = require('./utils/logger');

// Create Express app
const app = express();

// Set timezone
moment.tz.setDefault(process.env.TIMEZONE || 'Asia/Bangkok');

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Trust proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://code.jquery.com", "https://cdn.datatables.net"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
        },
    },
}));

// Compression
app.use(compression());

// Logger
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined', {
        stream: {
            write: (message) => logger.info(message.trim())
        }
    }));
}

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride('_method'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session(sessionConfig));

// Flash messages
app.use(flash());

// i18n middleware
app.use(i18nMiddleware);

// Global variables middleware
app.use((req, res, next) => {
    // Flash messages
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    
    // Current user
    res.locals.currentUser = req.session.user || null;
    
    // Current path
    res.locals.currentPath = req.path;
    
    // Moment for views
    res.locals.moment = moment;
    
    // App info
    res.locals.appName = process.env.APP_NAME || 'RC QC Admin';
    
    // Language
    res.locals.currentLang = req.language || 'th-TH';
    res.locals.supportedLangs = process.env.SUPPORTED_LANGUAGES?.split(',') || ['th-TH', 'en-US'];
    
    next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/', isAuthenticated, dashboardRoutes);
app.use('/lots', isAuthenticated, lotRoutes);
app.use('/images', isAuthenticated, imageRoutes);
app.use('/users', isAuthenticated, userRoutes);
app.use('/reports', isAuthenticated, reportRoutes);
app.use('/audit', isAuthenticated, auditRoutes);
app.use('/api', isAuthenticated, apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});

// 404 handler
app.use((req, res, next) => {
    res.status(404).render('errors/404', {
        title: '404 - Page Not Found'
    });
});

// Error handler
app.use(errorHandler);

// Initialize database and start server
const PORT = process.env.PORT || 3001;

async function startServer() {
    try {
        // Test database connection
        await DatabaseService.testConnection();
        logger.info('Database connection established');
        
        // Initialize i18n
        await i18nConfig.init();
        logger.info('i18n initialized');
        
        // Start server
        app.listen(PORT, () => {
            logger.info(`🚀 ${process.env.APP_NAME} running on port ${PORT}`);
            logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
            logger.info(`🔗 URL: ${process.env.APP_URL || `http://localhost:${PORT}`}`);
            
            if (process.env.NODE_ENV === 'development') {
                logger.info(`📝 Logs: ${process.env.LOG_FILE_PATH || './logs'}`);
                logger.info(`📁 Uploads: ${process.env.UPLOAD_PATH || './public/uploads'}`);
            }
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    await DatabaseService.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT signal received: closing HTTP server');
    await DatabaseService.close();
    process.exit(0);
});

// Start the server
startServer();