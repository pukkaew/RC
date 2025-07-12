const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// User store (in production, this should be in database)
const users = {
    admin: {
        id: 1,
        username: 'admin',
        email: 'admin@organization.com',
        // Password: Admin@123 (hashed)
        password: '$2a$10$5K3kG7M5TqJqU1O8nZHyNuGhR8CxOXlZYHjPqV3F8Y.6hHm3qW8Aq',
        role: 'admin',
        permissions: ['read', 'write', 'delete', 'manage_users']
    },
    user: {
        id: 2,
        username: 'user',
        email: 'user@organization.com',
        // Password: User@123 (hashed)
        password: '$2a$10$Yx8sV4XKpJg8NzHHWZLYaOkHcVpBEcHZBqJqU1O8nZHyNuGhR8Cx',
        role: 'user',
        permissions: ['read']
    }
};

// Authentication middleware
const requireAuth = (req, res, next) => {
    // Check if user is logged in
    if (!req.session || !req.session.userId) {
        // For API requests, return 401
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required'
                }
            });
        }
        
        // For web requests, redirect to login
        req.flash('error', 'Please login to continue');
        req.session.returnTo = req.originalUrl;
        return res.redirect('/login');
    }
    
    // Get user from session
    const user = getUserById(req.session.userId);
    if (!user) {
        req.session.destroy();
        return res.redirect('/login');
    }
    
    // Attach user to request
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

// Check if user has required permission
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return requireAuth(req, res, next);
        }
        
        if (!req.user.permissions || !req.user.permissions.includes(permission)) {
            // For API requests
            if (req.path.startsWith('/api/')) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Insufficient permissions'
                    }
                });
            }
            
            // For web requests
            req.flash('error', 'You do not have permission to access this resource');
            return res.redirect('/');
        }
        
        next();
    };
};

// Check if user has any of the required permissions
const requireAnyPermission = (permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return requireAuth(req, res, next);
        }
        
        const hasPermission = permissions.some(permission => 
            req.user.permissions && req.user.permissions.includes(permission)
        );
        
        if (!hasPermission) {
            // For API requests
            if (req.path.startsWith('/api/')) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Insufficient permissions'
                    }
                });
            }
            
            // For web requests
            req.flash('error', 'You do not have permission to access this resource');
            return res.redirect('/');
        }
        
        next();
    };
};

// Check if user has all required permissions
const requireAllPermissions = (permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return requireAuth(req, res, next);
        }
        
        const hasAllPermissions = permissions.every(permission => 
            req.user.permissions && req.user.permissions.includes(permission)
        );
        
        if (!hasAllPermissions) {
            // For API requests
            if (req.path.startsWith('/api/')) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Insufficient permissions'
                    }
                });
            }
            
            // For web requests
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
        
        // Validate input
        if (!username || !password) {
            req.flash('error', 'Username and password are required');
            return res.redirect('/login');
        }
        
        // Find user
        const user = users[username.toLowerCase()];
        if (!user) {
            logger.warn(`Failed login attempt for username: ${username}`);
            req.flash('error', 'Invalid username or password');
            return res.redirect('/login');
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            logger.warn(`Failed login attempt for username: ${username}`);
            req.flash('error', 'Invalid username or password');
            return res.redirect('/login');
        }
        
        // Create session
        req.session.userId = user.id;
        req.session.username = user.username;
        
        logger.info(`User logged in: ${username}`);
        req.flash('success', 'Welcome back!');
        
        // Redirect to intended URL or dashboard
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
        } else {
            logger.info(`User logged out: ${username}`);
        }
        res.redirect('/login');
    });
};

// Show login page
const showLoginPage = (req, res) => {
    // If already logged in, redirect to dashboard
    if (req.session && req.session.userId) {
        return res.redirect('/');
    }
    
    res.render('auth/login', {
        title: 'Login',
        csrfToken: req.csrfToken(),
        error: req.flash('error'),
        success: req.flash('success')
    });
};

// Helper function to get user by ID
function getUserById(userId) {
    return Object.values(users).find(user => user.id === userId);
}

// Store return URL for redirect after login
const storeReturnTo = (req, res, next) => {
    if (!req.session.userId && req.method === 'GET' && 
        !req.path.includes('/login') && 
        !req.path.includes('/api/') &&
        !req.path.includes('.')) {
        req.session.returnTo = req.originalUrl;
    }
    next();
};

// Optional auth - attach user if logged in but don't require it
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

// Generate password hash (utility function)
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