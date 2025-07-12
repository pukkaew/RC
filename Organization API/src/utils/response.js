// Standard API response utility

// Success response
const successResponse = (data, message = 'Success', meta = null) => {
    const response = {
        success: true,
        data: data,
        message: message
    };
    
    if (meta) {
        response.meta = meta;
    }
    
    return response;
};

// Error response
const errorResponse = (code, message, field = null, details = null) => {
    const response = {
        success: false,
        error: {
            code: code,
            message: message
        }
    };
    
    if (field) {
        response.error.field = field;
    }
    
    if (details) {
        response.error.details = details;
    }
    
    return response;
};

// Paginated response
const paginatedResponse = (data, pagination, message = 'Success') => {
    return {
        success: true,
        data: data,
        message: message,
        meta: {
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total: pagination.total,
                pages: pagination.pages,
                hasNext: pagination.page < pagination.pages,
                hasPrev: pagination.page > 1
            }
        }
    };
};

// Response helpers for Express
const sendSuccess = (res, data, message = 'Success', statusCode = 200, meta = null) => {
    res.status(statusCode).json(successResponse(data, message, meta));
};

const sendError = (res, code, message, statusCode = 400, field = null, details = null) => {
    res.status(statusCode).json(errorResponse(code, message, field, details));
};

const sendPaginated = (res, data, pagination, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json(paginatedResponse(data, pagination, message));
};

// Common success responses
const created = (res, data, message = 'Created successfully') => {
    sendSuccess(res, data, message, 201);
};

const updated = (res, data, message = 'Updated successfully') => {
    sendSuccess(res, data, message, 200);
};

const deleted = (res, message = 'Deleted successfully') => {
    sendSuccess(res, null, message, 200);
};

// Common error responses
const badRequest = (res, message = 'Bad request', field = null) => {
    sendError(res, 'BAD_REQUEST', message, 400, field);
};

const unauthorized = (res, message = 'Unauthorized') => {
    sendError(res, 'UNAUTHORIZED', message, 401);
};

const forbidden = (res, message = 'Forbidden') => {
    sendError(res, 'FORBIDDEN', message, 403);
};

const notFound = (res, message = 'Resource not found') => {
    sendError(res, 'NOT_FOUND', message, 404);
};

const conflict = (res, message = 'Resource already exists', field = null) => {
    sendError(res, 'CONFLICT', message, 409, field);
};

const serverError = (res, message = 'Internal server error') => {
    sendError(res, 'SERVER_ERROR', message, 500);
};

module.exports = {
    // Basic responses
    successResponse,
    errorResponse,
    paginatedResponse,
    
    // Express helpers
    sendSuccess,
    sendError,
    sendPaginated,
    
    // Common responses
    created,
    updated,
    deleted,
    badRequest,
    unauthorized,
    forbidden,
    notFound,
    conflict,
    serverError
};