// Path: RC_QC_Line_Admin/middleware/rateLimiter.js
// Rate limiting middleware to prevent abuse

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
        logger.logSecurity('Rate limit exceeded', req);
        res.status(429).json({
            success: false,
            message: req.t('common:errors.rate_limit_exceeded')
        });
    }
});

// Strict rate limiter for login attempts
const loginLimiter = rateLimit({
    windowMs: parseInt(process.env.LOGIN_ATTEMPTS_WINDOW) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.LOGIN_ATTEMPTS_LIMIT) || 5,
    skipSuccessfulRequests: true,
    message: 'Too many login attempts, please try again later.',
    handler: (req, res) => {
        logger.logSecurity('Login rate limit exceeded', req);
        res.status(429).render('auth/login', {
            title: req.t('auth:login.title'),
            error: req.t('auth:login.too_many_attempts'),
            data: req.body
        });
    }
});

// Password reset rate limiter
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: 'Too many password reset requests, please try again later.',
    handler: (req, res) => {
        logger.logSecurity('Password reset rate limit exceeded', req);
        res.status(429).render('auth/forgot-password', {
            title: req.t('auth:forgot_password.title'),
            error: req.t('auth:forgot_password.too_many_attempts'),
            data: req.body
        });
    }
});

// File download rate limiter
const downloadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50,
    message: 'Too many download requests, please try again later.',
    handler: (req, res) => {
        logger.logSecurity('Download rate limit exceeded', req);
        res.status(429).json({
            success: false,
            message: req.t('common:errors.download_limit_exceeded')
        });
    }
});

// Report export rate limiter
const exportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: 'Too many export requests, please try again later.',
    handler: (req, res) => {
        logger.logSecurity('Export rate limit exceeded', req);
        res.status(429).json({
            success: false,
            message: req.t('common:errors.export_limit_exceeded')
        });
    }
});

module.exports = {
    apiLimiter,
    loginLimiter,
    passwordResetLimiter,
    downloadLimiter,
    exportLimiter
};