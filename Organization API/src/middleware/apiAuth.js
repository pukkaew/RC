const ApiKey = require('../models/ApiKey');
const ApiLog = require('../models/ApiLog');
const logger = require('../utils/logger');

// API Authentication Middleware
const apiAuth = (requiredPermissions = ['read']) => {
    return async (req, res, next) => {
        const startTime = Date.now();
        
        // Log data for API usage
        const logData = {
            endpoint: req.path,
            method: req.method,
            request_body: req.method !== 'GET' ? JSON.stringify(req.body) : null,
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.headers['user-agent']
        };

        try {
            // Get API key from header
            const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
            
            if (!apiKey) {
                const error = 'API key is required';
                logData.response_status = 401;
                logData.error_message = error;
                logData.response_time_ms = Date.now() - startTime;
                await ApiLog.create(logData);
                
                return res.status(401).json({
                    success: false,
                    error: {
                        code: 'MISSING_API_KEY',
                        message: error
                    }
                });
            }

            // Authenticate API key
            const authResult = await ApiKey.authenticate(apiKey);
            
            if (!authResult.valid) {
                logData.response_status = 401;
                logData.error_message = authResult.reason;
                logData.response_time_ms = Date.now() - startTime;
                await ApiLog.create(logData);
                
                return res.status(401).json({
                    success: false,
                    error: {
                        code: 'INVALID_API_KEY',
                        message: authResult.reason
                    }
                });
            }

            // Check permissions
            const hasPermission = checkPermissions(authResult.permissions, requiredPermissions);
            
            if (!hasPermission) {
                logData.api_key_id = authResult.apiKeyId;
                logData.response_status = 403;
                logData.error_message = 'Insufficient permissions';
                logData.response_time_ms = Date.now() - startTime;
                await ApiLog.create(logData);
                
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'INSUFFICIENT_PERMISSIONS',
                        message: 'You do not have permission to access this resource'
                    }
                });
            }

            // Add auth info to request
            req.apiAuth = {
                apiKeyId: authResult.apiKeyId,
                appName: authResult.appName,
                permissions: authResult.permissions
            };

            // Set log data for later use
            req.apiLogData = {
                ...logData,
                api_key_id: authResult.apiKeyId,
                api_key_hash: apiKey // Will be hashed in ApiLog.create
            };
            req.apiStartTime = startTime;

            // Update last used date (async, don't wait)
            ApiKey.updateLastUsed(authResult.apiKeyId);

            next();
        } catch (error) {
            logger.error('API authentication error:', error);
            
            logData.response_status = 500;
            logData.error_message = 'Authentication error';
            logData.response_time_ms = Date.now() - startTime;
            await ApiLog.create(logData);
            
            res.status(500).json({
                success: false,
                error: {
                    code: 'AUTH_ERROR',
                    message: 'An error occurred during authentication'
                }
            });
        }
    };
};

// Check if user has required permissions
function checkPermissions(userPermissions, requiredPermissions) {
    // If no specific permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
        return true;
    }

    // Convert permissions to array if string
    const userPerms = Array.isArray(userPermissions) ? userPermissions : userPermissions.split(',');
    const reqPerms = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    // Check each required permission
    for (const reqPerm of reqPerms) {
        if (reqPerm === 'read' && (userPerms.includes('read') || userPerms.includes('read_write'))) {
            continue;
        }
        if (reqPerm === 'write' && (userPerms.includes('write') || userPerms.includes('read_write'))) {
            continue;
        }
        return false;
    }

    return true;
}

// Log API response (to be used in route handlers)
const logApiResponse = async (req, res) => {
    if (req.apiLogData && req.apiStartTime) {
        req.apiLogData.response_status = res.statusCode;
        req.apiLogData.response_time_ms = Date.now() - req.apiStartTime;
        
        // Log errors if status >= 400
        if (res.statusCode >= 400 && res.locals.error) {
            req.apiLogData.error_message = res.locals.error;
        }
        
        await ApiLog.create(req.apiLogData);
    }
};

module.exports = {
    apiAuth,
    logApiResponse
};