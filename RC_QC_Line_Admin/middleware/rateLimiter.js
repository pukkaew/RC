const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.logSecurity('Rate limit exceeded', req, {
            limit: req.rateLimit.limit,
            current: req.rateLimit.current,
            remaining: req.rateLimit.remaining
        });
        
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            res.status(429).json({
                success: false,
                message: req.t('common:errors.rate_limit_exceeded'),
                retryAfter: req.rateLimit.resetTime
            });
        } else {
            res.status(429).render('errors/429', {
                title: req.t('errors:429.title'),
                retryAfter: req.rateLimit.resetTime
            });
        }
    }
});

// Stricter rate limiter for login attempts
const loginLimiter = rateLimit({
    windowMs: parseInt(process.env.LOGIN_ATTEMPTS_WINDOW) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.LOGIN_ATTEMPTS_LIMIT) || 5,
    message: 'Too many login attempts, please try again later.',
    skipSuccessfulRequests: true, // Don't count successful logins
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use combination of IP and employee_id for key
        return `${req.ip}-${req.body.employee_id || 'unknown'}`;
    },
    handler: (req, res) => {
        logger.logSecurity('Too many login attempts', req, {
            employee_id: req.body.employee_id,
            attempts: req.rateLimit.current
        });
        
        res.status(429).render('auth/login', {
            title: req.t('auth:login.title'),
            error: req.t('auth:login.too_many_attempts'),
            data: req.body
        });
    }
});

// Rate limiter for password reset
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: 'Too many password reset requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return `${req.ip}-${req.body.employee_id || 'unknown'}`;
    },
    handler: (req, res) => {
        logger.logSecurity('Too many password reset attempts', req, {
            employee_id: req.body.employee_id
        });
        
        res.status(429).render('auth/forgot-password', {
            title: req.t('auth:forgot_password.title'),
            error: req.t('auth:forgot_password.too_many_attempts'),
            success: null,
            data: req.body
        });
    }
});

// Rate limiter for file downloads
const downloadLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20,
    message: 'Too many download requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.logSecurity('Too many download requests', req);
        
        if (req.xhr) {
            res.status(429).json({
                success: false,
                message: req.t('common:errors.download_rate_limit')
            });
        } else {
            req.flash('error_msg', req.t('common:errors.download_rate_limit'));
            res.redirect('back');
        }
    }
});

// Rate limiter for report generation
const reportLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5,
    message: 'Too many report generation requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.logSecurity('Too many report requests', req);
        
        res.status(429).json({
            success: false,
            message: req.t('reports:errors.rate_limit')
        });
    }
});

// Rate limiter for image operations
const imageLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50,
    message: 'Too many image operation requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

// Create custom rate limiter
function createLimiter(options) {
    return rateLimit({
        windowMs: options.windowMs || 15 * 60 * 1000,
        max: options.max || 100,
        message: options.message || 'Too many requests',
        standardHeaders: true,
        legacyHeaders: false,
        ...options
    });
}

module.exports = {
    apiLimiter,
    loginLimiter,
    passwordResetLimiter,
    downloadLimiter,
    reportLimiter,
    imageLimiter,
    createLimiter
};