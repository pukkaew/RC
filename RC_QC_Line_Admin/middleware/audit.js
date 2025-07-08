// middleware/audit.js
// Middleware for audit logging

const AuditLog = require('../models/AuditLog');
const { AUDIT_ACTIONS, ENTITY_TYPES } = require('../config/constants');

// Audit logging middleware
const auditLogger = (action, entityType = null) => {
    return async (req, res, next) => {
        // Store original functions
        const originalJson = res.json;
        const originalRedirect = res.redirect;
        const originalRender = res.render;
        
        // Store request data
        const auditData = {
            admin_id: req.session?.user?.admin_id || null,
            action_type: action,
            entity_type: entityType,
            entity_id: null,
            old_value: null,
            new_value: null,
            description: null,
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('user-agent')
        };

        // Extract entity ID from request
        if (req.params.id) {
            auditData.entity_id = req.params.id;
        }

        // Override res.json to capture response
        res.json = function(data) {
            // Log successful API responses
            if (res.statusCode < 400) {
                auditData.description = `${action} completed successfully`;
                if (data && data.id) {
                    auditData.entity_id = data.id;
                }
                createAuditLog(auditData);
            }
            return originalJson.call(this, data);
        };

        // Override res.redirect to capture redirects
        res.redirect = function(url) {
            // Log successful redirects
            if (res.statusCode < 400) {
                auditData.description = `${action} completed with redirect`;
                createAuditLog(auditData);
            }
            return originalRedirect.call(this, url);
        };

        // Override res.render to capture renders
        res.render = function(view, options) {
            // Log successful renders
            if (res.statusCode < 400) {
                auditData.description = `${action} - page viewed`;
                createAuditLog(auditData);
            }
            return originalRender.call(this, view, options);
        };

        // Store audit data in request for manual logging
        req.audit = auditData;
        req.logAudit = (data) => {
            createAuditLog({ ...auditData, ...data });
        };

        next();
    };
};

// Create audit log entry
async function createAuditLog(data) {
    try {
        // Convert objects to JSON strings
        if (data.old_value && typeof data.old_value === 'object') {
            data.old_value = JSON.stringify(data.old_value);
        }
        if (data.new_value && typeof data.new_value === 'object') {
            data.new_value = JSON.stringify(data.new_value);
        }

        await AuditLog.create(data);
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw error to prevent disrupting the main operation
    }
}

// Specific audit middleware for common actions
const auditLogin = async (req, res, next) => {
    const { employee_id } = req.body;
    
    // Override the login method to capture result
    const originalLogin = req.login;
    if (originalLogin) {
        req.login = function(user, callback) {
            // Log successful login
            createAuditLog({
                admin_id: user.admin_id,
                action_type: AUDIT_ACTIONS.LOGIN_SUCCESS,
                entity_type: ENTITY_TYPES.USER,
                entity_id: user.admin_id,
                description: `User ${employee_id} logged in successfully`,
                ip_address: req.ip || req.connection.remoteAddress,
                user_agent: req.get('user-agent')
            });
            
            return originalLogin.call(this, user, callback);
        };
    }
    
    // Log failed login attempts
    res.on('finish', () => {
        if (res.statusCode === 401 && employee_id) {
            createAuditLog({
                admin_id: null,
                action_type: AUDIT_ACTIONS.LOGIN_FAILED,
                entity_type: ENTITY_TYPES.USER,
                description: `Failed login attempt for employee ID: ${employee_id}`,
                ip_address: req.ip || req.connection.remoteAddress,
                user_agent: req.get('user-agent')
            });
        }
    });
    
    next();
};

// Audit logout
const auditLogout = async (req, res, next) => {
    if (req.session?.user) {
        createAuditLog({
            admin_id: req.session.user.admin_id,
            action_type: AUDIT_ACTIONS.LOGOUT,
            entity_type: ENTITY_TYPES.USER,
            entity_id: req.session.user.admin_id,
            description: 'User logged out',
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('user-agent')
        });
    }
    next();
};

// Audit data changes
const auditDataChange = (entityType) => {
    return async (req, res, next) => {
        // Store original data for comparison
        if (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
            try {
                // This is a simplified example - you'd need to implement
                // entity-specific logic to fetch the original data
                req.originalData = null; // Fetch original data based on entity type
            } catch (error) {
                console.error('Failed to fetch original data for audit:', error);
            }
        }

        // Capture response to log changes
        const originalJson = res.json;
        res.json = function(data) {
            if (res.statusCode < 400) {
                const auditData = {
                    admin_id: req.session?.user?.admin_id,
                    entity_type: entityType,
                    entity_id: req.params.id || data?.id,
                    ip_address: req.ip || req.connection.remoteAddress,
                    user_agent: req.get('user-agent')
                };

                switch (req.method) {
                    case 'POST':
                        auditData.action_type = `${entityType}_CREATE`;
                        auditData.new_value = JSON.stringify(req.body);
                        auditData.description = `Created new ${entityType.toLowerCase()}`;
                        break;
                    case 'PUT':
                    case 'PATCH':
                        auditData.action_type = `${entityType}_UPDATE`;
                        auditData.old_value = req.originalData ? JSON.stringify(req.originalData) : null;
                        auditData.new_value = JSON.stringify(req.body);
                        auditData.description = `Updated ${entityType.toLowerCase()}`;
                        break;
                    case 'DELETE':
                        auditData.action_type = `${entityType}_DELETE`;
                        auditData.old_value = req.originalData ? JSON.stringify(req.originalData) : null;
                        auditData.description = `Deleted ${entityType.toLowerCase()}`;
                        break;
                }

                createAuditLog(auditData);
            }
            return originalJson.call(this, data);
        };

        next();
    };
};

module.exports = {
    auditLogger,
    auditLogin,
    auditLogout,
    auditDataChange,
    AUDIT_ACTIONS,
    ENTITY_TYPES
};