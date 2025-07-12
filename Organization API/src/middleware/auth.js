// Basic authentication middleware for web interface
// This is a simplified version - in production, implement proper authentication

const logger = require('../utils/logger');

// Mock authentication middleware
const requireAuth = (req, res, next) => {
    // For demo purposes, we'll simulate a logged-in user
    // In production, implement proper authentication (e.g., JWT, session-based auth)
    
    if (!req.session) {
        req.session = {};
    }
    
    // Mock user - replace with actual authentication
    if (!req.session.user) {
        req.session.user = {
            id: 1,
            username: 'admin',
            email: 'admin@organization.com',
            role: 'admin',
            permissions: ['read', 'write', 'delete']
        };
    }
    
    req.user = req.session.user;
    res.locals.user = req.user;
    
    next();
};

// Check if user has required permission
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            req.flash('error', 'Authentication required');
            return res.redirect('/login');
        }
        
        if (!req.user.permissions || !req.user.permissions.includes(permission)) {
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
            req.flash('error', 'Authentication required');
            return res.redirect('/login');
        }
        
        const hasPermission = permissions.some(permission => 
            req.user.permissions && req.user.permissions.includes(permission)
        );
        
        if (!hasPermission) {
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
            req.flash('error', 'Authentication required');
            return res.redirect('/login');
        }
        
        const hasAllPermissions = permissions.every(permission => 
            req.user.permissions && req.user.permissions.includes(permission)
        );
        
        if (!hasAllPermissions) {
            req.flash('error', 'You do not have permission to access this resource');
            return res.redirect('/');
        }
        
        next();
    };
};

// Login handler (mock)
const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Mock authentication - replace with actual authentication logic
        if (username === 'admin' && password === 'admin123') {
            req.session.user = {
                id: 1,
                username: 'admin',
                email: 'admin@organization.com',
                role: 'admin',
                permissions: ['read', 'write', 'delete']
            };
            
            logger.info(`User logged in: ${username}`);
            req.flash('success', 'Welcome back!');
            
            // Redirect to intended URL or dashboard
            const redirectUrl = req.session.returnTo || '/';
            delete req.session.returnTo;
            res.redirect(redirectUrl);
        } else {
            req.flash('error', 'Invalid username or password');
            res.redirect('/login');
        }
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

// Store return URL for redirect after login
const storeReturnTo = (req, res, next) => {
    if (!req.user && req.method === 'GET' && !req.path.includes('/login')) {
        req.session.returnTo = req.originalUrl;
    }
    next();
};

module.exports = {
    requireAuth,
    requirePermission,
    requireAnyPermission,
    requireAllPermissions,
    login,
    logout,
    storeReturnTo
};