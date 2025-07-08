const db = require('../config/database');
const logger = require('../utils/logger');

class AuditLog {
    constructor(data) {
        this.log_id = data.log_id;
        this.admin_id = data.admin_id;
        this.action_type = data.action_type;
        this.entity_type = data.entity_type;
        this.entity_id = data.entity_id;
        this.old_value = data.old_value;
        this.new_value = data.new_value;
        this.description = data.description;
        this.ip_address = data.ip_address;
        this.user_agent = data.user_agent;
        this.created_at = data.created_at;
        
        // From joins
        this.admin_name = data.admin_name;
        this.admin_employee_id = data.admin_employee_id;
    }
    
    // Static methods
    static async create(logData) {
        try {
            const result = await db.query(
                `INSERT INTO AuditLogs 
                (admin_id, action_type, entity_type, entity_id, old_value, 
                 new_value, description, ip_address, user_agent)
                OUTPUT INSERTED.*
                VALUES (@admin_id, @action_type, @entity_type, @entity_id, 
                        @old_value, @new_value, @description, @ip_address, @user_agent)`,
                {
                    admin_id: logData.admin_id || null,
                    action_type: logData.action_type,
                    entity_type: logData.entity_type || null,
                    entity_id: logData.entity_id || null,
                    old_value: logData.old_value || null,
                    new_value: logData.new_value || null,
                    description: logData.description || null,
                    ip_address: logData.ip_address || null,
                    user_agent: logData.user_agent || null
                }
            );
            
            return new AuditLog(result.recordset[0]);
        } catch (error) {
            logger.error('Error creating audit log:', error);
            // Don't throw error for audit logs - we don't want to break the main operation
            return null;
        }
    }
    
    static async findAll(options = {}) {
        try {
            let query = `
                SELECT 
                    al.*,
                    au.full_name as admin_name,
                    au.employee_id as admin_employee_id
                FROM AuditLogs al
                LEFT JOIN AdminUsers au ON al.admin_id = au.admin_id
                WHERE 1=1
            `;
            
            const params = {};
            
            // Add filters
            if (options.admin_id) {
                query += ` AND al.admin_id = @admin_id`;
                params.admin_id = options.admin_id;
            }
            
            if (options.action_type) {
                query += ` AND al.action_type = @action_type`;
                params.action_type = options.action_type;
            }
            
            if (options.entity_type) {
                query += ` AND al.entity_type = @entity_type`;
                params.entity_type = options.entity_type;
            }
            
            if (options.entity_id) {
                query += ` AND al.entity_id = @entity_id`;
                params.entity_id = options.entity_id;
            }
            
            if (options.startDate) {
                query += ` AND al.created_at >= @startDate`;
                params.startDate = options.startDate;
            }
            
            if (options.endDate) {
                query += ` AND al.created_at <= @endDate`;
                params.endDate = options.endDate;
            }
            
            if (options.search) {
                query += ` AND (al.description LIKE @search OR au.full_name LIKE @search OR au.employee_id LIKE @search)`;
                params.search = `%${options.search}%`;
            }
            
            // Add ordering
            query += ` ORDER BY al.created_at DESC`;
            
            // Add pagination
            if (options.limit) {
                const offset = ((options.page || 1) - 1) * options.limit;
                query += ` OFFSET ${offset} ROWS FETCH NEXT ${options.limit} ROWS ONLY`;
            }
            
            const result = await db.query(query, params);
            return result.recordset.map(row => new AuditLog(row));
        } catch (error) {
            logger.error('Error finding audit logs:', error);
            throw error;
        }
    }
    
    static async count(options = {}) {
        try {
            let query = `
                SELECT COUNT(*) as total
                FROM AuditLogs al
                LEFT JOIN AdminUsers au ON al.admin_id = au.admin_id
                WHERE 1=1
            `;
            
            const params = {};
            
            if (options.admin_id) {
                query += ` AND al.admin_id = @admin_id`;
                params.admin_id = options.admin_id;
            }
            
            if (options.action_type) {
                query += ` AND al.action_type = @action_type`;
                params.action_type = options.action_type;
            }
            
            if (options.entity_type) {
                query += ` AND al.entity_type = @entity_type`;
                params.entity_type = options.entity_type;
            }
            
            if (options.startDate) {
                query += ` AND al.created_at >= @startDate`;
                params.startDate = options.startDate;
            }
            
            if (options.endDate) {
                query += ` AND al.created_at <= @endDate`;
                params.endDate = options.endDate;
            }
            
            if (options.search) {
                query += ` AND (al.description LIKE @search OR au.full_name LIKE @search)`;
                params.search = `%${options.search}%`;
            }
            
            const result = await db.query(query, params);
            return result.recordset[0].total;
        } catch (error) {
            logger.error('Error counting audit logs:', error);
            throw error;
        }
    }
    
    static async getActionTypes() {
        try {
            const result = await db.query(`
                SELECT DISTINCT action_type 
                FROM AuditLogs 
                ORDER BY action_type
            `);
            
            return result.recordset.map(row => row.action_type);
        } catch (error) {
            logger.error('Error getting action types:', error);
            throw error;
        }
    }
    
    static async getEntityTypes() {
        try {
            const result = await db.query(`
                SELECT DISTINCT entity_type 
                FROM AuditLogs 
                WHERE entity_type IS NOT NULL
                ORDER BY entity_type
            `);
            
            return result.recordset.map(row => row.entity_type);
        } catch (error) {
            logger.error('Error getting entity types:', error);
            throw error;
        }
    }
    
    static async cleanup(retentionDays) {
        try {
            const result = await db.query(
                `DELETE FROM AuditLogs 
                WHERE created_at < DATEADD(day, -@days, GETDATE())`,
                { days: retentionDays }
            );
            
            logger.info(`Cleaned up ${result.rowsAffected[0]} old audit logs`);
            return result.rowsAffected[0];
        } catch (error) {
            logger.error('Error cleaning up audit logs:', error);
            throw error;
        }
    }
    
    // Helper method to log common actions
    static async logLotUpdate(adminId, lotId, oldLotNumber, newLotNumber, ipAddress, userAgent) {
        return this.create({
            admin_id: adminId,
            action_type: 'LOT_UPDATE',
            entity_type: 'lot',
            entity_id: lotId,
            old_value: oldLotNumber,
            new_value: newLotNumber,
            description: `Updated lot number from ${oldLotNumber} to ${newLotNumber}`,
            ip_address: ipAddress,
            user_agent: userAgent
        });
    }
    
    static async logLotDelete(adminId, lotId, lotNumber, imageCount, ipAddress, userAgent) {
        return this.create({
            admin_id: adminId,
            action_type: 'LOT_DELETE',
            entity_type: 'lot',
            entity_id: lotId,
            old_value: lotNumber,
            description: `Deleted lot ${lotNumber} with ${imageCount} images`,
            ip_address: ipAddress,
            user_agent: userAgent
        });
    }
    
    static async logImageDelete(adminId, imageId, fileName, ipAddress, userAgent) {
        return this.create({
            admin_id: adminId,
            action_type: 'IMAGE_DELETE',
            entity_type: 'image',
            entity_id: imageId,
            old_value: fileName,
            description: `Deleted image ${fileName}`,
            ip_address: ipAddress,
            user_agent: userAgent
        });
    }
    
    static async logBulkImageDelete(adminId, imageCount, ipAddress, userAgent) {
        return this.create({
            admin_id: adminId,
            action_type: 'BULK_IMAGE_DELETE',
            entity_type: 'image',
            description: `Deleted ${imageCount} images`,
            ip_address: ipAddress,
            user_agent: userAgent
        });
    }
    
    static async logUserCreate(adminId, newUserId, employeeId, ipAddress, userAgent) {
        return this.create({
            admin_id: adminId,
            action_type: 'USER_CREATE',
            entity_type: 'user',
            entity_id: newUserId,
            new_value: employeeId,
            description: `Created new user with employee ID ${employeeId}`,
            ip_address: ipAddress,
            user_agent: userAgent
        });
    }
    
    static async logUserUpdate(adminId, userId, changes, ipAddress, userAgent) {
        return this.create({
            admin_id: adminId,
            action_type: 'USER_UPDATE',
            entity_type: 'user',
            entity_id: userId,
            old_value: JSON.stringify(changes.old),
            new_value: JSON.stringify(changes.new),
            description: `Updated user information`,
            ip_address: ipAddress,
            user_agent: userAgent
        });
    }
    
    static async logReportExport(adminId, reportType, parameters, ipAddress, userAgent) {
        return this.create({
            admin_id: adminId,
            action_type: 'REPORT_EXPORT',
            entity_type: 'report',
            new_value: JSON.stringify(parameters),
            description: `Exported ${reportType} report`,
            ip_address: ipAddress,
            user_agent: userAgent
        });
    }
    
    // Format action type for display
    getActionTypeDisplay() {
        const actionTypeMap = {
            'LOGIN_SUCCESS': { text: 'เข้าสู่ระบบ', icon: 'sign-in-alt', color: 'green' },
            'LOGIN_FAILED': { text: 'เข้าสู่ระบบล้มเหลว', icon: 'exclamation-triangle', color: 'red' },
            'LOGIN_LOCKED': { text: 'บัญชีถูกล็อค', icon: 'lock', color: 'red' },
            'LOGOUT': { text: 'ออกจากระบบ', icon: 'sign-out-alt', color: 'gray' },
            'PASSWORD_CHANGED': { text: 'เปลี่ยนรหัสผ่าน', icon: 'key', color: 'yellow' },
            'LOT_UPDATE': { text: 'แก้ไข Lot', icon: 'edit', color: 'blue' },
            'LOT_DELETE': { text: 'ลบ Lot', icon: 'trash', color: 'red' },
            'IMAGE_DELETE': { text: 'ลบรูปภาพ', icon: 'image', color: 'red' },
            'BULK_IMAGE_DELETE': { text: 'ลบรูปภาพหลายรูป', icon: 'images', color: 'red' },
            'USER_CREATE': { text: 'สร้างผู้ใช้', icon: 'user-plus', color: 'green' },
            'USER_UPDATE': { text: 'แก้ไขผู้ใช้', icon: 'user-edit', color: 'blue' },
            'USER_DELETE': { text: 'ลบผู้ใช้', icon: 'user-times', color: 'red' },
            'REPORT_EXPORT': { text: 'ส่งออกรายงาน', icon: 'file-export', color: 'purple' }
        };
        
        return actionTypeMap[this.action_type] || {
            text: this.action_type,
            icon: 'circle',
            color: 'gray'
        };
    }
    
    toJSON() {
        const actionDisplay = this.getActionTypeDisplay();
        
        return {
            log_id: this.log_id,
            admin_id: this.admin_id,
            admin_name: this.admin_name,
            admin_employee_id: this.admin_employee_id,
            action_type: this.action_type,
            action_display: actionDisplay,
            entity_type: this.entity_type,
            entity_id: this.entity_id,
            old_value: this.old_value,
            new_value: this.new_value,
            description: this.description,
            ip_address: this.ip_address,
            user_agent: this.user_agent,
            created_at: this.created_at
        };
    }
}

module.exports = AuditLog;