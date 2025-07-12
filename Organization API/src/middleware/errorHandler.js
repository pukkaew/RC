const logger = require('../utils/logger');
const { logApiResponse } = require('./apiAuth');

// Error handler middleware
const errorHandler = async (err, req, res, next) => {
    // Log error
    logger.error('Error:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        user: req.user?.username || 'anonymous'
    });

    // Set error message for API logging
    res.locals.error = err.message;

    // Determine if this is an API request
    const isApiRequest = req.path.startsWith('/api/');

    // Set status code
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode);

    if (isApiRequest) {
        // API error response
        const response = {
            success: false,
            error: {
                code: err.code || 'SERVER_ERROR',
                message: err.message || 'An unexpected error occurred'
            }
        };

        // Add field information if validation error
        if (err.field) {
            response.error.field = err.field;
        }

        // Add validation errors if present
        if (err.errors) {
            response.error.details = err.errors;
        }

        // In development, add stack trace
        if (process.env.NODE_ENV === 'development') {
            response.error.stack = err.stack;
        }

        // Log API response
        await logApiResponse(req, res);

        res.json(response);
    } else {
        // Web error response (render error page)
        res.render('error', {
            title: 'Error',
            message: err.message || 'An unexpected error occurred',
            error: process.env.NODE_ENV === 'development' ? err : {},
            statusCode: statusCode
        });
    }
};

// Async error wrapper for route handlers
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Not found handler
const notFoundHandler = (req, res, next) => {
    const error = new Error('Resource not found');
    error.status = 404;
    error.code = 'NOT_FOUND';
    next(error);
};

// Validation error handler
const validationError = (message, field = null) => {
    const error = new Error(message);
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    if (field) {
        error.field = field;
    }
    return error;
};

// Database error handler
const databaseError = (message) => {
    const error = new Error(message);
    error.status = 500;
    error.code = 'DATABASE_ERROR';
    return error;
};

// Authorization error handler
const authorizationError = (message = 'Unauthorized access') => {
    const error = new Error(message);
    error.status = 403;
    error.code = 'AUTHORIZATION_ERROR';
    return error;
};

// Authentication error handler
const authenticationError = (message = 'Authentication required') => {
    const error = new Error(message);
    error.status = 401;
    error.code = 'AUTHENTICATION_ERROR';
    return error;
};

// Business logic error handler
const businessError = (message, code = 'BUSINESS_ERROR', status = 400) => {
    const error = new Error(message);
    error.status = status;
    error.code = code;
    return error;
};

module.exports = {
    errorHandler,
    asyncHandler,
    notFoundHandler,
    validationError,
    databaseError,
    authorizationError,
    authenticationError,
    businessError
};