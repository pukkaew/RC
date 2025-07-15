// ===== FILE 1: /src/middleware/auth.js =====
const bcrypt = require('bcryptjs');

// In-memory user store (ในระบบจริงควรใช้ database)
const users = {
    admin: {
        id: 1,
        username: 'admin',
        email: 'admin@organization.com',
        // Password: admin123
        password: '$2a$10$YwQ8.0ykpZMoVH7rGvxRZexTKNl0GvfGCHrHvEMDJFP.W9B9o/Jru',
        role: 'admin',
        permissions: ['read', 'write', 'delete', 'manage_users']
    },
    user: {
        id: 2,
        username: 'user',
        email: 'user@organization.com',
        // Password: user123
        password: '$2a$10$4J3CdJKzQy4VbNYXoKrV7.XK4QmhFZbH9ySVkxhSHvDKvGzPnEtTy',
        role: 'user',
        permissions: ['read']
    }
};

// Simple logger if real logger not available
const logger = {
    info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
    warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
    error: (msg, data) => console.error(`[ERROR] ${msg}`, data || '')
};

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required'
                }
            });
        }
        
        req.flash('error', 'Please login to continue');
        req.session.returnTo = req.originalUrl;
        return res.redirect('/login');
    }
    
    const user = getUserById(req.session.userId);
    if (!user) {
        req.session.destroy();
        return res.redirect('/login');
    }
    
    req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions
    };
    
    res.locals.user = req.user;
    res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
    
    next();
};

// Permission middleware
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user || !req.user.permissions.includes(permission)) {
            if (req.path.startsWith('/api/')) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'You do not have permission to access this resource'
                    }
                });
            }
            
            req.flash('error', 'You do not have permission to access this resource');
            return res.redirect('/');
        }
        
        next();
    };
};

const requireAnyPermission = (permissions) => {
    return (req, res, next) => {
        if (!req.user || !permissions.some(p => req.user.permissions.includes(p))) {
            if (req.path.startsWith('/api/')) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'You do not have permission to access this resource'
                    }
                });
            }
            
            req.flash('error', 'You do not have permission to access this resource');
            return res.redirect('/');
        }
        
        next();
    };
};

const requireAllPermissions = (permissions) => {
    return (req, res, next) => {
        if (!req.user || !permissions.every(p => req.user.permissions.includes(p))) {
            if (req.path.startsWith('/api/')) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'You do not have permission to access this resource'
                    }
                });
            }
            
            req.flash('error', 'You do not have permission to access this resource');
            return res.redirect('/');
        }
        
        next();
    };
};

// Login handler
const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            req.flash('error', 'Username and password are required');
            return res.redirect('/login');
        }
        
        const user = users[username.toLowerCase()];
        if (!user) {
            logger.warn(`Failed login attempt for username: ${username}`);
            req.flash('error', 'Invalid username or password');
            return res.redirect('/login');
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            logger.warn(`Failed login attempt for username: ${username}`);
            req.flash('error', 'Invalid username or password');
            return res.redirect('/login');
        }
        
        req.session.userId = user.id;
        req.session.username = user.username;
        
        logger.info(`User logged in: ${username}`);
        req.flash('success', 'Welcome back!');
        
        const redirectUrl = req.session.returnTo || '/';
        delete req.session.returnTo;
        res.redirect(redirectUrl);
        
    } catch (error) {
        logger.error('Login error:', error);
        req.flash('error', 'An error occurred during login');
        res.redirect('/login');
    }
};

// Logout handler
const logout = (req, res) => {
    const username = req.user?.username;
    
    req.session.destroy((err) => {
        if (err) {
            logger.error('Logout error:', err);
        } else if (username) {
            logger.info(`User logged out: ${username}`);
        }
        res.redirect('/login');
    });
};

// Show login page
const showLoginPage = (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/');
    }
    
    res.render('auth/login', {
        title: 'Login',
        csrfToken: req.csrfToken ? req.csrfToken() : '',
        error: req.flash('error'),
        success: req.flash('success')
    });
};

// Helper functions
function getUserById(userId) {
    return Object.values(users).find(user => user.id === userId);
}

const storeReturnTo = (req, res, next) => {
    if (!req.session.userId && req.method === 'GET' && 
        !req.path.includes('/login') && 
        !req.path.includes('/api/') &&
        !req.path.includes('.')) {
        req.session.returnTo = req.originalUrl;
    }
    next();
};

const optionalAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        const user = getUserById(req.session.userId);
        if (user) {
            req.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                permissions: user.permissions
            };
            res.locals.user = req.user;
        }
    }
    
    res.locals.user = req.user || null;
    res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
    next();
};

async function generatePasswordHash(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
}

module.exports = {
    requireAuth,
    requirePermission,
    requireAnyPermission,
    requireAllPermissions,
    login,
    logout,
    showLoginPage,
    storeReturnTo,
    optionalAuth,
    generatePasswordHash
};

// ===== FILE 2: /src/utils/logger.js =====
const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = process.env.LOG_DIR || 'logs';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Logger configuration
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.json()
    ),
    defaultMeta: { service: 'org-structure-api' },
    transports: [
        // Console transport
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                    return `${timestamp} [${level}]: ${message}${metaStr}`;
                })
            )
        }),
        // File transport for errors
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error'
        }),
        // File transport for all logs
        new winston.transports.File({
            filename: path.join(logDir, 'app.log')
        })
    ]
});

module.exports = logger;

// ===== FILE 3: /src/utils/xss.js =====
const cleanRequestBody = (req, res, next) => {
    // Simple XSS prevention - remove script tags
    const cleanObject = (obj) => {
        for (let key in obj) {
            if (typeof obj[key] === 'string') {
                obj[key] = obj[key]
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+\s*=/gi, '');
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                cleanObject(obj[key]);
            }
        }
    };
    
    if (req.body) {
        cleanObject(req.body);
    }
    
    next();
};

module.exports = { cleanRequestBody };

// ===== FILE 4: /src/config/validateEnv.js =====
const logger = require('../utils/logger');

const validateEnv = () => {
    // Only require these if we're actually using the database
    const requiredForDatabase = [
        'DB_SERVER',
        'DB_DATABASE', 
        'DB_USER',
        'DB_PASSWORD'
    ];
    
    // Always required
    const alwaysRequired = [
        'SESSION_SECRET'
    ];
    
    const missing = [];
    
    // Check if we need database
    const needDatabase = process.env.USE_DATABASE !== 'false';
    
    if (needDatabase) {
        requiredForDatabase.forEach(varName => {
            if (!process.env[varName]) {
                missing.push(varName);
            }
        });
    }
    
    alwaysRequired.forEach(varName => {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    });
    
    if (missing.length > 0 && needDatabase) {
        logger.warn(`Missing environment variables: ${missing.join(', ')}`);
        logger.warn('Running without database connection. Add USE_DATABASE=false to .env to suppress this warning.');
    }
    
    // Set defaults
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';
    process.env.PORT = process.env.PORT || '3000';
    process.env.JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || '10';
    
    logger.info('Environment variables validated successfully');
};

module.exports = { validateEnv };

// ===== FILE 5: /src/config/database.js =====
const sql = require('mssql');
const logger = require('../utils/logger');

const config = {
    server: process.env.DB_SERVER || 'localhost',
    port: parseInt(process.env.DB_PORT) || 1433,
    database: process.env.DB_DATABASE || 'OrgStructureDB',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.NODE_ENV === 'development',
        enableArithAbort: true
    }
};

let pool;

async function connectDatabase() {
    try {
        // Skip if no database config
        if (!process.env.DB_SERVER || process.env.USE_DATABASE === 'false') {
            logger.info('Database connection skipped (USE_DATABASE=false or no DB_SERVER)');
            return null;
        }
        
        pool = await sql.connect(config);
        logger.info('Database connection established');
        return pool;
    } catch (error) {
        logger.error('Database connection failed:', error);
        logger.warn('Continuing without database connection');
        return null;
    }
}

function getPool() {
    return pool;
}

async function closeDatabase() {
    try {
        if (pool) {
            await pool.close();
            logger.info('Database connection closed');
        }
    } catch (error) {
        logger.error('Error closing database connection:', error);
    }
}

async function executeQuery(query, inputs = {}) {
    if (!pool) {
        throw new Error('Database not connected');
    }
    
    try {
        const request = pool.request();
        
        Object.keys(inputs).forEach(key => {
            request.input(key, inputs[key]);
        });
        
        const result = await request.query(query);
        return result;
    } catch (error) {
        logger.error('Query execution failed:', error);
        throw error;
    }
}

module.exports = {
    sql,
    connectDatabase,
    getPool,
    closeDatabase,
    executeQuery
};