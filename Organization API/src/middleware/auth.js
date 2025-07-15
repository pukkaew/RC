// Path: /src/middleware/auth.js
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// In-memory user store (ในระบบจริงควรใช้ database)
const users = {
    admin: {
        id: 1,
        username: 'admin',
        email: 'admin@organization.com',
        // Password: admin123 (hash ใหม่ที่สร้างเมื่อสักครู่)
        password: '$2a$10$5dK3hFwGpuBzKp8jQ7yQKuG1h0E5HqkBvNbXzX9mI8XoW3BvZ7uW.',
        role: 'admin',
        permissions: ['read', 'write', 'delete', 'manage_users']
    },
    user: {
        id: 2,
        username: 'user',
        email: 'user@organization.com',
        // Password: user123 (hash ใหม่ที่สร้างเมื่อสักครู่)
        password: '$2a$10$8VxGpH2mKXO0XBgYO8RqB.6RqZKiCvM5vQGnXfVZ4iL5aTpI3Kfnq',
        role: 'user',
        permissions: ['read']
    }
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

// Login handler - เพิ่ม debug logging
const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('Login attempt:', { username, password: '***' }); // Debug log
        
        if (!username || !password) {
            req.flash('error', 'Username and password are required');
            return res.redirect('/login');
        }
        
        const user = users[username.toLowerCase()];
        console.log('User found:', user ? 'Yes' : 'No'); // Debug log
        
        if (!user) {
            logger.warn(`Failed login attempt for username: ${username}`);
            req.flash('error', 'Invalid username or password');
            return res.redirect('/login');
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        console.log('Password valid:', isValidPassword); // Debug log
        
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
        console.error('Login error details:', error); // Debug log
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
    if (!req.session && req.method === 'GET' && 
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

// Test function - สำหรับทดสอบ password
async function testPassword() {
    console.log('\n🔐 Testing passwords:');
    console.log('admin password hash:', users.admin.password);
    console.log('admin123 matches:', await bcrypt.compare('admin123', users.admin.password));
    console.log('');
}

// เรียก test function เมื่อ start server (ในโหมด development)
if (process.env.NODE_ENV === 'development') {
    testPassword();
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