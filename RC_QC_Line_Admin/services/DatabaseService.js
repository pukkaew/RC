const db = require('../config/database');
const logger = require('../utils/logger');

class DatabaseService {
    /**
     * Test database connection
     */
    static async testConnection() {
        try {
            await db.testConnection();
            return true;
        } catch (error) {
            logger.error('Database connection test failed:', error);
            throw error;
        }
    }
    
    /**
     * Close database connection
     */
    static async close() {
        try {
            await db.close();
            return true;
        } catch (error) {
            logger.error('Error closing database connection:', error);
            return false;
        }
    }
    
    /**
     * Execute a query with retry logic
     */
    static async queryWithRetry(sqlQuery, params = {}, maxRetries = 3) {
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await db.query(sqlQuery, params);
            } catch (error) {
                lastError = error;
                logger.warn(`Query attempt ${i + 1} failed:`, error.message);
                
                // Wait before retry (exponential backoff)
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                }
            }
        }
        
        throw lastError;
    }
    
    /**
     * Backup database tables
     */
    static async backupTables(tables = []) {
        const backupData = {};
        
        try {
            for (const table of tables) {
                const result = await db.query(`SELECT * FROM ${db.helpers.escapeIdentifier(table)}`);
                backupData[table] = result.recordset;
            }
            
            return backupData;
        } catch (error) {
            logger.error('Error backing up tables:', error);
            throw error;
        }
    }
    
    /**
     * Get database statistics
     */
    static async getDatabaseStats() {
        try {
            const stats = {};
            
            // Get database size
            const sizeResult = await db.query(`
                SELECT 
                    DB_NAME() AS database_name,
                    SUM(size * 8 / 1024) AS size_mb
                FROM sys.master_files
                WHERE database_id = DB_ID()
            `);
            
            stats.database = sizeResult.recordset[0];
            
            // Get table sizes
            const tableResult = await db.query(`
                SELECT 
                    t.name AS table_name,
                    p.rows AS row_count,
                    SUM(a.total_pages) * 8 / 1024 AS total_space_mb,
                    SUM(a.used_pages) * 8 / 1024 AS used_space_mb
                FROM sys.tables t
                INNER JOIN sys.indexes i ON t.object_id = i.object_id
                INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
                INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
                WHERE t.is_ms_shipped = 0
                GROUP BY t.name, p.rows
                ORDER BY total_space_mb DESC
            `);
            
            stats.tables = tableResult.recordset;
            
            // Get connection count
            const connectionResult = await db.query(`
                SELECT COUNT(*) as connection_count
                FROM sys.dm_exec_connections
                WHERE database_id = DB_ID()
            `);
            
            stats.connections = connectionResult.recordset[0].connection_count;
            
            return stats;
        } catch (error) {
            logger.error('Error getting database stats:', error);
            throw error;
        }
    }
    
    /**
     * Run maintenance tasks
     */
    static async runMaintenance() {
        const tasks = [];
        
        try {
            // Clean up old sessions
            const sessionResult = await db.query(`
                DELETE FROM AdminSessions 
                WHERE expires_at < GETDATE()
            `);
            
            tasks.push({
                task: 'Clean expired sessions',
                success: true,
                rowsAffected: sessionResult.rowsAffected[0]
            });
            
            // Clean up old audit logs
            const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS) || 90;
            const auditResult = await db.query(`
                DELETE FROM AuditLogs 
                WHERE created_at < DATEADD(day, -@days, GETDATE())
            `, { days: retentionDays });
            
            tasks.push({
                task: 'Clean old audit logs',
                success: true,
                rowsAffected: auditResult.rowsAffected[0]
            });
            
            // Update statistics
            await db.query(`UPDATE STATISTICS Lots WITH FULLSCAN`);
            await db.query(`UPDATE STATISTICS Images WITH FULLSCAN`);
            await db.query(`UPDATE STATISTICS AdminUsers WITH FULLSCAN`);
            
            tasks.push({
                task: 'Update statistics',
                success: true
            });
            
            return {
                success: true,
                tasks
            };
        } catch (error) {
            logger.error('Error running maintenance:', error);
            return {
                success: false,
                error: error.message,
                tasks
            };
        }
    }
    
    /**
     * Check if table exists
     */
    static async tableExists(tableName) {
        try {
            const result = await db.query(`
                SELECT COUNT(*) as count
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_NAME = @tableName
            `, { tableName });
            
            return result.recordset[0].count > 0;
        } catch (error) {
            logger.error('Error checking table existence:', error);
            return false;
        }
    }
    
    /**
     * Create admin tables if they don't exist
     */
    static async createAdminTables() {
        const tables = [];
        
        try {
            // Check and create AdminUsers table
            if (!await this.tableExists('AdminUsers')) {
                await db.query(`
                    CREATE TABLE AdminUsers (
                        admin_id INT PRIMARY KEY IDENTITY(1,1),
                        employee_id NVARCHAR(20) UNIQUE NOT NULL,
                        password_hash NVARCHAR(255) NOT NULL,
                        full_name NVARCHAR(100) NOT NULL,
                        email NVARCHAR(100),
                        department NVARCHAR(100),
                        role NVARCHAR(20) NOT NULL CHECK (role IN ('viewer', 'manager', 'admin')),
                        preferred_language NVARCHAR(10) DEFAULT 'th-TH',
                        is_active BIT DEFAULT 1,
                        last_login DATETIME,
                        created_at DATETIME DEFAULT GETDATE(),
                        created_by INT,
                        updated_at DATETIME DEFAULT GETDATE(),
                        CONSTRAINT FK_AdminUsers_CreatedBy FOREIGN KEY (created_by) 
                            REFERENCES AdminUsers(admin_id)
                    )
                `);
                
                // Create indexes
                await db.query(`CREATE INDEX IX_AdminUsers_employee_id ON AdminUsers(employee_id)`);
                await db.query(`CREATE INDEX IX_AdminUsers_role ON AdminUsers(role)`);
                
                tables.push('AdminUsers');
            }
            
            // Check and create AdminSessions table
            if (!await this.tableExists('AdminSessions')) {
                await db.query(`
                    CREATE TABLE AdminSessions (
                        session_id NVARCHAR(255) PRIMARY KEY,
                        admin_id INT NOT NULL,
                        session_data NVARCHAR(MAX),
                        expires_at DATETIME NOT NULL,
                        created_at DATETIME DEFAULT GETDATE(),
                        CONSTRAINT FK_AdminSessions_User FOREIGN KEY (admin_id) 
                            REFERENCES AdminUsers(admin_id) ON DELETE CASCADE
                    )
                `);
                
                // Create index
                await db.query(`CREATE INDEX IX_AdminSessions_expires_at ON AdminSessions(expires_at)`);
                
                tables.push('AdminSessions');
            }
            
            // Check and create AuditLogs table
            if (!await this.tableExists('AuditLogs')) {
                await db.query(`
                    CREATE TABLE AuditLogs (
                        log_id INT PRIMARY KEY IDENTITY(1,1),
                        admin_id INT,
                        action_type NVARCHAR(50) NOT NULL,
                        entity_type NVARCHAR(50),
                        entity_id INT,
                        old_value NVARCHAR(MAX),
                        new_value NVARCHAR(MAX),
                        description NVARCHAR(500),
                        ip_address NVARCHAR(50),
                        user_agent NVARCHAR(500),
                        created_at DATETIME DEFAULT GETDATE(),
                        CONSTRAINT FK_AuditLogs_User FOREIGN KEY (admin_id) 
                            REFERENCES AdminUsers(admin_id)
                    )
                `);
                
                // Create indexes
                await db.query(`CREATE INDEX IX_AuditLogs_admin_id ON AuditLogs(admin_id)`);
                await db.query(`CREATE INDEX IX_AuditLogs_created_at ON AuditLogs(created_at)`);
                await db.query(`CREATE INDEX IX_AuditLogs_action_type ON AuditLogs(action_type)`);
                await db.query(`CREATE INDEX IX_AuditLogs_entity_type ON AuditLogs(entity_type)`);
                
                tables.push('AuditLogs');
            }
            
            return {
                success: true,
                tablesCreated: tables
            };
        } catch (error) {
            logger.error('Error creating admin tables:', error);
            throw error;
        }
    }
    
    /**
     * Create default admin user
     */
    static async createDefaultAdmin() {
        try {
            // Check if any admin exists
            const result = await db.query(`
                SELECT COUNT(*) as count 
                FROM AdminUsers 
                WHERE role = 'admin'
            `);
            
            if (result.recordset[0].count === 0) {
                const bcrypt = require('../utils/bcrypt');
                const defaultPassword = 'Admin@123';
                const passwordHash = await bcrypt.hash(defaultPassword);
                
                await db.query(`
                    INSERT INTO AdminUsers 
                    (employee_id, password_hash, full_name, email, department, role)
                    VALUES ('ADMIN', @passwordHash, 'System Administrator', 
                            'admin@rcqc.com', 'IT', 'admin')
                `, { passwordHash });
                
                logger.info('Default admin user created - Employee ID: ADMIN, Password: Admin@123');
                return true;
            }
            
            return false;
        } catch (error) {
            logger.error('Error creating default admin:', error);
            throw error;
        }
    }
}

module.exports = DatabaseService;