const logger = require('../utils/logger');

/**
 * Error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    // Log error
    logger.logError(err, req, {
        body: req.body,
        params: req.params,
        query: req.query,
        user: req.session?.user?.employee_id
    });
    
    // Default error values
    let status = err.status || 500;
    let message = err.message || 'Internal Server Error';
    let code = err.code || 'INTERNAL_ERROR';
    
    // Handle specific error types
    if (err.name === 'ValidationError') {
        status = 400;
        code = 'VALIDATION_ERROR';
        message = 'Validation failed';
    } else if (err.name === 'UnauthorizedError') {
        status = 401;
        code = 'UNAUTHORIZED';
        message = 'Unauthorized access';
    } else if (err.code === 'LIMIT_FILE_SIZE') {
        status = 400;
        code = 'FILE_TOO_LARGE';
        message = req.t('common:errors.file_too_large');
    } else if (err.code === 'EBADCSRFTOKEN') {
        status = 403;
        code = 'INVALID_CSRF_TOKEN';
        message = 'Invalid CSRF token';
    }
    
    // Don't expose internal error details in production
    if (process.env.NODE_ENV === 'production' && status === 500) {
        message = req.t('common:errors.system_error');
    }
    
    // Send response
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        // JSON response for AJAX requests
        res.status(status).json({
            success: false,
            error: {
                code,
                message,
                ...(process.env.NODE_ENV === 'development' && {
                    stack: err.stack,
                    details: err
                })
            }
        });
    } else {
        // HTML response for normal requests
        res.status(status).render(`errors/${status}`, {
            title: req.t(`errors:${status}.title`),
            message: message,
            error: process.env.NODE_ENV === 'development' ? err : null
        }, (renderErr, html) => {
            if (renderErr) {
                // If specific error page doesn't exist, use generic error page
                res.status(status).render('errors/500', {
                    title: 'Error',
                    message: message,
                    error: process.env.NODE_ENV === 'development' ? err : null
                });
            } else {
                res.send(html);
            }
        });
    }
};

module.exports = errorHandler;