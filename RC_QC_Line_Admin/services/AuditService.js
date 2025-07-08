// services/AuditService.js
// Service for audit logging operations

const sql = require('mssql');
const db = require('./DatabaseService');
const logger = require('../utils/logger');
const { AUDIT_ACTIONS, ENTITY_TYPES, AUDIT_LOG } = require('../config/constants');

class AuditService {
    /**
     * Create an audit log entry
     */
    static async log(data) {
        try {
            const pool = await db.getPool();
            
            // Ensure we have required fields
            if (!data.action_type) {
                throw new Error('Action type is required for audit log');
            }
            
            // Convert objects to JSON strings
            if (data.old_value && typeof data.old_value === 'object') {
                data.old_value = JSON.stringify(data.old_value);
            }
            if (data.new_value && typeof data.new_value === 'object') {
                data.new_value = JSON.stringify(data.new_value);
            }
            
            const result = await pool.request()
                .input('admin_id', sql.Int, data.admin_id || null)
                .input('action_type', sql.NVarChar(50), data.action_type)
                .input('entity_type', sql.NVarChar(50), data.entity_type || null)
                .input('entity_id', sql.Int, data.entity_id || null)
                .input('old_value', sql.NVarChar(sql.MAX), data.old_value || null)
                .input('new_value', sql.NVarChar(sql.MAX), data.new_value || null)
                .input('description', sql.NVarChar(500), data.description || null)
                .input('ip_address', sql.NVarChar(50), data.ip_address || null)
                .input('user_agent', sql.NVarChar(500), data.user_agent || null)
                .query(`
                    INSERT INTO AuditLogs (
                        admin_id, action_type, entity_type, entity_id,
                        old_value, new_value, description, ip_address, user_agent
                    )
                    OUTPUT INSERTED.log_id
                    VALUES (
                        @admin_id, @action_type, @entity_type, @entity_id,
                        @old_value, @new_value, @description, @ip_address, @user_agent
                    )
                `);
            
            return result.recordset[0].log_id;
        } catch (error) {
            logger.error('Failed to create audit log:', error);
            // Don't throw error to prevent disrupting main operations
            return null;
        }
    }
    
    /**
     * Log login attempt
     */
    static async logLogin(employeeId, success, adminId = null, ipAddress = null, userAgent = null) {
        return this.log({
            admin_id: success ? adminId : null,
            action_type: success ? AUDIT_ACTIONS.LOGIN_SUCCESS : AUDIT_ACTIONS.LOGIN_FAILED,
            entity_type: ENTITY_TYPES.USER,
            entity_id: adminId,
            description: success 
                ? `User ${employeeId} logged in successfully`
                : `Failed login attempt for employee ID: ${employeeId}`,
            ip_address: ipAddress,
            user_agent: userAgent
        });
    }
    
    /**
     * Log logout
     */
    static async logLogout(adminId, ipAddress = null, userAgent = null) {
        return this.log({
            admin_id: adminId,
            action_type: AUDIT_ACTIONS.LOGOUT,
            entity_type: ENTITY_TYPES.USER,
            entity_id: adminId,
            description: 'User logged out',
            ip_address: ipAddress,
            user_agent: userAgent
        });
    }
    
    /**
     * Log data changes
     */
    static async logDataChange(action, entityType, entityId, oldData, newData, adminId, ipAddress = null) {
        return this.log({
            admin_id: adminId,
            action_type: action,
            entity_type: entityType,
            entity_id: entityId,
            old_value: oldData,
            new_value: newData,
            description: `${action} on ${entityType} #${entityId}`,
            ip_address: ipAddress
        });
    }
    
    /**
     * Get audit logs with filters
     */
    static async getLogs(filters = {}, pagination = {}) {
        try {
            const pool = await db.getPool();
            const { page = 1, limit = 20 } = pagination;
            const offset = (page - 1) * limit;
            
            // Build WHERE conditions
            const conditions = [];
            const params = {};
            
            if (filters.start_date) {
                conditions.push('al.created_at >= @start_date');
                params.start_date = { type: sql.DateTime, value: filters.start_date };
            }
            
            if (filters.end_date) {
                conditions.push('al.created_at <= @end_date');
                params.end_date = { type: sql.DateTime, value: filters.end_date };
            }
            
            if (filters.action_type) {
                conditions.push('al.action_type = @action_type');
                params.action_type = { type: sql.NVarChar, value: filters.action_type };
            }
            
            if (filters.entity_type) {
                conditions.push('al.entity_type = @entity_type');
                params.entity_type = { type: sql.NVarChar, value: filters.entity_type };
            }
            
            if (filters.admin_id) {
                conditions.push('al.admin_id = @admin_id');
                params.admin_id = { type: sql.Int, value: filters.admin_id };
            }
            
            const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
            
            // Get total count
            let countQuery = `SELECT COUNT(*) as total FROM AuditLogs al ${whereClause}`;
            const countRequest = pool.request();
            
            // Add parameters
            Object.entries(params).forEach(([key, param]) => {
                countRequest.input(key, param.type, param.value);
            });
            
            const countResult = await countRequest.query(countQuery);
            const total = countResult.recordset[0].total;
            
            // Get logs with pagination
            let dataQuery = `
                SELECT 
                    al.*,
                    au.full_name as admin_name,
                    au.employee_id
                FROM AuditLogs al
                LEFT JOIN AdminUsers au ON al.admin_id = au.admin_id
                ${whereClause}
                ORDER BY al.created_at DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `;
            
            const dataRequest = pool.request();
            
            // Add parameters
            Object.entries(params).forEach(([key, param]) => {
                dataRequest.input(key, param.type, param.value);
            });
            
            dataRequest.input('offset', sql.Int, offset);
            dataRequest.input('limit', sql.Int, limit);
            
            const dataResult = await dataRequest.query(dataQuery);
            
            return {
                logs: dataResult.recordset,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Failed to get audit logs:', error);
            throw error;
        }
    }
    
    /**
     * Clean up old audit logs
     */
    static async cleanupOldLogs() {
        try {
            const pool = await db.getPool();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - AUDIT_LOG.RETENTION_DAYS);
            
            const result = await pool.request()
                .input('cutoff_date', sql.DateTime, cutoffDate)
                .query(`
                    DELETE FROM AuditLogs
                    WHERE created_at < @cutoff_date
                `);
            
            if (result.rowsAffected[0] > 0) {
                logger.info(`Cleaned up ${result.rowsAffected[0]} old audit logs`);
            }
            
            return result.rowsAffected[0];
        } catch (error) {
            logger.error('Failed to cleanup audit logs:', error);
            throw error;
        }
    }
    
    /**
     * Get user activity summary
     */
    static async getUserActivitySummary(userId, days = 7) {
        try {
            const pool = await db.getPool();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            const result = await pool.request()
                .input('admin_id', sql.Int, userId)
                .input('start_date', sql.DateTime, startDate)
                .query(`
                    SELECT 
                        action_type,
                        COUNT(*) as count,
                        CAST(created_at as DATE) as date
                    FROM AuditLogs
                    WHERE admin_id = @admin_id
                        AND created_at >= @start_date
                    GROUP BY action_type, CAST(created_at as DATE)
                    ORDER BY date DESC, count DESC
                `);
            
            return result.recordset;
        } catch (error) {
            logger.error('Failed to get user activity summary:', error);
            throw error;
        }
    }
    
    /**
     * Get system activity summary
     */
    static async getSystemActivitySummary(days = 7) {
        try {
            const pool = await db.getPool();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            const result = await pool.request()
                .input('start_date', sql.DateTime, startDate)
                .query(`
                    SELECT 
                        action_type,
                        COUNT(*) as count,
                        COUNT(DISTINCT admin_id) as unique_users
                    FROM AuditLogs
                    WHERE created_at >= @start_date
                    GROUP BY action_type
                    ORDER BY count DESC
                `);
            
            return result.recordset;
        } catch (error) {
            logger.error('Failed to get system activity summary:', error);
            throw error;
        }
    }
}

module.exports = AuditService;