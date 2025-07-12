const { validationResult } = require('express-validator');
const { validationError } = require('./errorHandler');

// Validation middleware to check validation results
const validate = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => ({
            field: error.param,
            message: error.msg,
            value: error.value
        }));
        
        const error = validationError('Validation failed');
        error.errors = errorMessages;
        return next(error);
    }
    
    next();
};

// Sanitize input
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    
    // Remove potentially dangerous characters
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove < and >
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, ''); // Remove event handlers
};

// Validate pagination parameters
const validatePagination = (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || parseInt(process.env.DEFAULT_PAGE_SIZE) || 20;
    const maxLimit = parseInt(process.env.MAX_PAGE_SIZE) || 100;
    
    if (page < 1) {
        return next(validationError('Page must be greater than 0', 'page'));
    }
    
    if (limit < 1) {
        return next(validationError('Limit must be greater than 0', 'limit'));
    }
    
    if (limit > maxLimit) {
        return next(validationError(`Limit cannot exceed ${maxLimit}`, 'limit'));
    }
    
    req.pagination = { page, limit };
    next();
};

// Validate sort parameters
const validateSort = (allowedFields) => {
    return (req, res, next) => {
        const { sort, order } = req.query;
        
        if (sort) {
            if (!allowedFields.includes(sort)) {
                return next(validationError(`Invalid sort field. Allowed fields: ${allowedFields.join(', ')}`, 'sort'));
            }
        }
        
        if (order) {
            const validOrders = ['asc', 'desc', 'ASC', 'DESC'];
            if (!validOrders.includes(order)) {
                return next(validationError('Order must be either "asc" or "desc"', 'order'));
            }
        }
        
        req.sort = {
            field: sort || allowedFields[0],
            order: (order || 'asc').toUpperCase()
        };
        
        next();
    };
};

// Validate date range
const validateDateRange = (req, res, next) => {
    const { date_from, date_to } = req.query;
    
    if (date_from) {
        const fromDate = new Date(date_from);
        if (isNaN(fromDate.getTime())) {
            return next(validationError('Invalid date_from format', 'date_from'));
        }
        req.query.date_from = fromDate;
    }
    
    if (date_to) {
        const toDate = new Date(date_to);
        if (isNaN(toDate.getTime())) {
            return next(validationError('Invalid date_to format', 'date_to'));
        }
        req.query.date_to = toDate;
    }
    
    if (date_from && date_to) {
        if (req.query.date_from > req.query.date_to) {
            return next(validationError('date_from must be before date_to'));
        }
    }
    
    next();
};

// Validate boolean parameters
const validateBoolean = (paramName) => {
    return (req, res, next) => {
        const value = req.query[paramName] || req.body[paramName];
        
        if (value !== undefined) {
            const boolValue = value === 'true' || value === '1' || value === true || value === 1;
            const falseValue = value === 'false' || value === '0' || value === false || value === 0;
            
            if (!boolValue && !falseValue) {
                return next(validationError(`${paramName} must be a boolean value`, paramName));
            }
            
            if (req.query[paramName] !== undefined) {
                req.query[paramName] = boolValue;
            } else {
                req.body[paramName] = boolValue;
            }
        }
        
        next();
    };
};

// Check if value exists in enum
const validateEnum = (paramName, allowedValues, location = 'body') => {
    return (req, res, next) => {
        const value = location === 'body' ? req.body[paramName] : req.query[paramName];
        
        if (value !== undefined && !allowedValues.includes(value)) {
            return next(validationError(
                `${paramName} must be one of: ${allowedValues.join(', ')}`,
                paramName
            ));
        }
        
        next();
    };
};

// Validate required fields
const validateRequired = (fields, location = 'body') => {
    return (req, res, next) => {
        const data = location === 'body' ? req.body : req.query;
        const missingFields = [];
        
        fields.forEach(field => {
            if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
                missingFields.push(field);
            }
        });
        
        if (missingFields.length > 0) {
            return next(validationError(
                `Missing required fields: ${missingFields.join(', ')}`
            ));
        }
        
        next();
    };
};

// Clean request body - remove undefined and null values
const cleanRequestBody = (req, res, next) => {
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (req.body[key] === undefined || req.body[key] === null || req.body[key] === '') {
                delete req.body[key];
            } else if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeInput(req.body[key]);
            }
        });
    }
    next();
};

module.exports = {
    validate,
    sanitizeInput,
    validatePagination,
    validateSort,
    validateDateRange,
    validateBoolean,
    validateEnum,
    validateRequired,
    cleanRequestBody
};