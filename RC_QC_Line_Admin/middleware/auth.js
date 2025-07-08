// Path: RC_QC_Line_Admin/middleware/auth.js
// Authentication and authorization middleware

const logger = require('../utils/logger');

/**
 * Check if user is authenticated
 */
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        // Set user role helpers
        res.locals.isViewer = true;
        res.locals.isManager = req.session.user.role === 'manager' || req.session.user.role === 'admin';
        res.locals.isAdmin = req.session.user.role === 'admin';
        
        return next();
    }
    
    // Store the URL they were trying to access
    req.session.returnTo = req.originalUrl;
    
    // Log unauthorized access attempt
    logger.logSecurity('Unauthorized access attempt', req);
    
    req.flash('error_msg', req.t('auth:errors.login_required'));
    res.redirect('/auth/login');
};

/**
 * Check if user is NOT authenticated (for login page)
 */
const isNotAuthenticated = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return next();
    }
    
    res.redirect('/');
};

/**
 * Check if user has manager role or higher
 */
const canManageLots = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            success: false,
            message: req.t('auth:errors.login_required')
        });
    }
    
    const userRole = req.session.user.role;
    if (userRole === 'manager' || userRole === 'admin') {
        return next();
    }
    
    logger.logSecurity('Insufficient permissions - Manager required', req);
    
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(403).json({
            success: false,
            message: req.t('auth:errors.insufficient_permissions')
        });
    } else {
        req.flash('error_msg', req.t('auth:errors.insufficient_permissions'));
        res.redirect('/');
    }
};

/**
 * Check if user has admin role
 */
const canDeleteLots = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            success: false,
            message: req.t('auth:errors.login_required')
        });
    }
    
    if (req.session.user.role === 'admin') {
        return next();
    }
    
    logger.logSecurity('Insufficient permissions - Admin required', req);
    
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(403).json({
            success: false,
            message: req.t('auth:errors.insufficient_permissions')
        });
    } else {
        req.flash('error_msg', req.t('auth:errors.insufficient_permissions'));
        res.redirect('/');
    }
};

/**
 * Check if user is admin (alias for canDeleteLots)
 */
const isAdmin = canDeleteLots;

/**
 * Check if user can view audit logs (admin only)
 */
const canViewAuditLogs = isAdmin;

/**
 * Check if user can manage users (admin only)
 */
const canManageUsers = isAdmin;

/**
 * Role-based middleware generator
 */
const hasRole = (roles) => {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({
                success: false,
                message: req.t('auth:errors.login_required')
            });
        }
        
        const userRole = req.session.user.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        
        if (allowedRoles.includes(userRole)) {
            return next();
        }
        
        logger.logSecurity(`Insufficient permissions - Required: ${allowedRoles.join(', ')}`, req);
        
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(403).json({
                success: false,
                message: req.t('auth:errors.insufficient_permissions')
            });
        } else {
            req.flash('error_msg', req.t('auth:errors.insufficient_permissions'));
            res.redirect('/');
        }
    };
};

module.exports = {
    isAuthenticated,
    isNotAuthenticated,
    canManageLots,
    canDeleteLots,
    isAdmin,
    canViewAuditLogs,
    canManageUsers,
    hasRole
};