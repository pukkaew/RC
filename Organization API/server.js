// Path: /server.js
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MSSQLStore = require('connect-mssql')(session);
const flash = require('connect-flash');
const csrf = require('csurf');
const mongoSanitize = require('express-mongo-sanitize');

// Import configurations
const { connectDatabase, getPool } = require('./src/config/database');
const logger = require('./src/utils/logger');
const { validateEnv } = require('./src/config/validateEnv');

// Import routes
const webRoutes = require('./src/routes/web');
const apiRoutes = require('./src/routes/api');

// Import middleware - Fixed destructuring
const { errorHandler } = require('./src/middleware/errorHandler');
const { cleanRequestBody } = require('./src/utils/xss');

// Validate environment variables
validateEnv();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        },
    },
}));

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize user input
app.use(mongoSanitize());
app.use(cleanRequestBody);

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', {
        stream: { write: message => logger.info(message.trim()) }
    }));
}

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
};

// Add SQL session store in production if database is available
if (process.env.NODE_ENV === 'production' && process.env.DB_SERVER && process.env.USE_DATABASE !== 'false') {
    sessionConfig.store = new MSSQLStore({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: process.env.DB_SERVER,
        database: process.env.DB_DATABASE,
        options: {
            encrypt: true,
            trustServerCertificate: process.env.NODE_ENV === 'development'
        }
    });
}

app.use(session(sessionConfig));

// Flash messages
app.use(flash());

// CSRF protection (skip for API routes)
const csrfProtection = csrf({ cookie: false });
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return next();
    }
    csrfProtection(req, res, next);
});

// Make CSRF token available to all views
app.use((req, res, next) => {
    if (!req.path.startsWith('/api/')) {
        res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
    }
    res.locals.user = req.session?.user || null;
    next();
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // more generous limit for API
    message: 'Too many API requests from this IP, please try again later.'
});

app.use('/api/', apiLimiter);
app.use(limiter);

// Routes
app.use('/', webRoutes);
app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404);
    
    if (req.path.startsWith('/api/')) {
        return res.json({
            success: false,
            message: 'API endpoint not found'
        });
    }
    
    res.render('error', {
        title: 'Page Not Found',
        statusCode: 404,
        message: 'The page you are looking for does not exist.',
        error: null
    });
});

// Error handling middleware (should be last)
app.use(errorHandler);

// Database connection and server startup
const startServer = async () => {
    try {
        // Connect to database (optional)
        await connectDatabase();
        
        // Start server
        app.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            
            if (process.env.NODE_ENV === 'development') {
                console.log(`
                    🚀 Server ready at:
                    - Web: http://localhost:${PORT}
                    - API: http://localhost:${PORT}/api
                    - Docs: http://localhost:${PORT}/docs
                    
                    📝 Default credentials:
                    - Username: admin
                    - Password: admin123
                `);
            }
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    logger.error('Unhandled Rejection:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    
    // Close database connections
    const pool = getPool();
    if (pool) {
        await pool.close();
    }
    
    process.exit(0);
});

// Start the server
startServer();