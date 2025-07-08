const { body, param, query, validationResult } = require('express-validator');

/**
 * Common validation rules
 */
const validators = {
    // ID validators
    id: param('id').isInt().withMessage('Invalid ID'),
    
    // Pagination validators
    pagination: [
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100')
    ],
    
    // Date validators
    dateRange: [
        query('start_date').optional().isISO8601().toDate().withMessage('Invalid start date'),
        query('end_date').optional().isISO8601().toDate().withMessage('Invalid end date')
            .custom((value, { req }) => {
                if (value && req.query.start_date) {
                    return new Date(value) >= new Date(req.query.start_date);
                }
                return true;
            }).withMessage('End date must be after start date')
    ],
    
    // Employee ID validator
    employeeId: body('employee_id')
        .trim()
        .notEmpty().withMessage('Employee ID is required')
        .isLength({ max: 20 }).withMessage('Employee ID too long')
        .matches(/^[A-Z0-9-]+$/i).withMessage('Employee ID can only contain letters, numbers and hyphens'),
    
    // Password validator
    password: body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number and special character'),
    
    // Email validator
    email: body('email')
        .trim()
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
    
    // Lot number validator
    lotNumber: body('lot_number')
        .trim()
        .notEmpty().withMessage('Lot number is required')
        .isLength({ max: 100 }).withMessage('Lot number too long')
        .matches(/^[A-Z0-9-_]+$/i).withMessage('Lot number can only contain letters, numbers, hyphens and underscores'),
    
    // Role validator
    role: body('role')
        .isIn(['viewer', 'manager', 'admin']).withMessage('Invalid role'),
    
    // Language validator
    language: body('language')
        .isIn(['th-TH', 'en-US']).withMessage('Invalid language')
};

/**
 * Custom validators
 */
const customValidators = {
    // Check if value is Thai text
    isThaiText: (value) => {
        if (!value) return true;
        const thaiRegex = /^[\u0E00-\u0E7F\s]+$/;
        return thaiRegex.test(value);
    },
    
    // Check if value is valid file type
    isValidFileType: (value, allowedTypes) => {
        if (!value) return true;
        return allowedTypes.includes(value);
    },
    
    // Check if value is valid file size
    isValidFileSize: (value, maxSize) => {
        if (!value) return true;
        return value <= maxSize;
    },
    
    // Check if array has valid length
    hasValidLength: (array, min, max) => {
        if (!Array.isArray(array)) return false;
        return array.length >= min && array.length <= max;
    }
};

/**
 * Validation middleware
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        // For AJAX requests
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(400).json({
                success: false,
                message: req.t('common:errors.validation_error'),
                errors: errors.array()
            });
        }
        
        // For form submissions
        req.flash('error_msg', errors.array()[0].msg);
        return res.redirect('back');
    }
    
    next();
};

/**
 * Sanitizers
 */
const sanitizers = {
    // Sanitize HTML
    sanitizeHtml: (value) => {
        if (!value) return value;
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },
    
    // Sanitize filename
    sanitizeFilename: (filename) => {
        if (!filename) return filename;
        return filename
            .replace(/[^a-z0-9.-]/gi, '_')
            .replace(/_{2,}/g, '_')
            .toLowerCase();
    },
    
    // Sanitize SQL identifier
    sanitizeSqlIdentifier: (identifier) => {
        if (!identifier) return identifier;
        return identifier.replace(/[^a-zA-Z0-9_]/g, '');
    }
};

/**
 * Validation rule builders
 */
const buildValidationRules = {
    // Create user validation
    createUser: [
        validators.employeeId,
        validators.password,
        validators.email,
        body('full_name').trim().notEmpty().withMessage('Full name is required')
            .isLength({ max: 100 }).withMessage('Full name too long'),
        body('department').trim().notEmpty().withMessage('Department is required'),
        validators.role
    ],
    
    // Update user validation
    updateUser: [
        validators.id,
        validators.email,
        body('full_name').trim().notEmpty().withMessage('Full name is required')
            .isLength({ max: 100 }).withMessage('Full name too long'),
        body('department').trim().notEmpty().withMessage('Department is required'),
        validators.role
    ],
    
    // Login validation
    login: [
        body('employee_id').trim().notEmpty().withMessage('Employee ID is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    
    // Change password validation
    changePassword: [
        body('current_password').notEmpty().withMessage('Current password is required'),
        validators.password,
        body('confirm_password').custom((value, { req }) => {
            return value === req.body.new_password;
        }).withMessage('Passwords do not match')
    ]
};

module.exports = {
    validators,
    customValidators,
    validate,
    sanitizers,
    buildValidationRules
};