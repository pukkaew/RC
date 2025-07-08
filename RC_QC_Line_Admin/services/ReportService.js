const db = require('../config/database');
const logger = require('../utils/logger');
const moment = require('moment-timezone');

class ReportService {
    /**
     * Get summary statistics for date range
     */
    static async getSummaryStats(startDate, endDate) {
        try {
            const result = await db.query(`
                SELECT 
                    COUNT(DISTINCT l.lot_id) as total_lots,
                    COUNT(DISTINCT i.image_id) as total_images,
                    COUNT(DISTINCT CASE 
                        WHEN CAST(i.uploaded_at AS DATE) = CAST(GETDATE() AS DATE) 
                        THEN i.image_id 
                    END) as images_today,
                    COUNT(DISTINCT i.uploaded_by) as unique_uploaders,
                    SUM(ISNULL(i.original_size, 0) + ISNULL(i.compressed_size, 0)) as total_size,
                    COUNT(DISTINCT CASE 
                        WHEN i.uploaded_at >= @startDate AND i.uploaded_at <= @endDate 
                        THEN i.image_id 
                    END) as images_in_range
                FROM Lots l
                LEFT JOIN Images i ON l.lot_id = i.lot_id AND i.status = 'active'
                WHERE l.status = 'active'
            `, { startDate, endDate });
            
            return result.recordset[0];
        } catch (error) {
            logger.error('Error getting summary stats:', error);
            throw error;
        }
    }
    
    /**
     * Get top lots by image count
     */
    static async getTopLots(limit = 10) {
        try {
            const result = await db.query(`
                SELECT TOP (@limit)
                    l.lot_id,
                    l.lot_number,
                    COUNT(i.image_id) as image_count,
                    SUM(ISNULL(i.original_size, 0) + ISNULL(i.compressed_size, 0)) as total_size,
                    MAX(i.uploaded_at) as last_upload
                FROM Lots l
                LEFT JOIN Images i ON l.lot_id = i.lot_id AND i.status = 'active'
                WHERE l.status = 'active'
                GROUP BY l.lot_id, l.lot_number
                ORDER BY image_count DESC
            `, { limit });
            
            return result.recordset;
        } catch (error) {
            logger.error('Error getting top lots:', error);
            throw error;
        }
    }
    
    /**
     * Get upload trends for date range
     */
    static async getUploadTrends(startDate, endDate) {
        try {
            const result = await db.query(`
                SELECT 
                    CAST(uploaded_at AS DATE) as upload_date,
                    COUNT(*) as upload_count,
                    COUNT(DISTINCT uploaded_by) as unique_uploaders,
                    COUNT(DISTINCT lot_id) as lots_updated,
                    SUM(ISNULL(original_size, 0) + ISNULL(compressed_size, 0)) as total_size
                FROM Images
                WHERE uploaded_at >= @startDate 
                    AND uploaded_at <= @endDate
                    AND status = 'active'
                GROUP BY CAST(uploaded_at AS DATE)
                ORDER BY upload_date
            `, { startDate, endDate });
            
            return result.recordset;
        } catch (error) {
            logger.error('Error getting upload trends:', error);
            throw error;
        }
    }
    
    /**
     * Get daily report data
     */
    static async getDailyReport(date) {
        try {
            const startOfDay = moment(date).startOf('day').toDate();
            const endOfDay = moment(date).endOf('day').toDate();
            
            // Get uploads by hour
            const hourlyUploads = await db.query(`
                SELECT 
                    DATEPART(hour, uploaded_at) as hour,
                    COUNT(*) as count
                FROM Images
                WHERE uploaded_at >= @startDate 
                    AND uploaded_at <= @endDate
                    AND status = 'active'
                GROUP BY DATEPART(hour, uploaded_at)
                ORDER BY hour
            `, { startDate: startOfDay, endDate: endOfDay });
            
            // Get uploads by lot
            const lotUploads = await db.query(`
                SELECT 
                    l.lot_number,
                    COUNT(i.image_id) as image_count,
                    MIN(i.uploaded_at) as first_upload,
                    MAX(i.uploaded_at) as last_upload
                FROM Images i
                INNER JOIN Lots l ON i.lot_id = l.lot_id
                WHERE i.uploaded_at >= @startDate 
                    AND i.uploaded_at <= @endDate
                    AND i.status = 'active'
                GROUP BY l.lot_number
                ORDER BY image_count DESC
            `, { startDate: startOfDay, endDate: endOfDay });
            
            // Get uploads by user
            const userUploads = await db.query(`
                SELECT 
                    i.uploaded_by,
                    u.display_name as uploader_name,
                    COUNT(i.image_id) as upload_count
                FROM Images i
                LEFT JOIN Users u ON i.uploaded_by = u.line_user_id
                WHERE i.uploaded_at >= @startDate 
                    AND i.uploaded_at <= @endDate
                    AND i.status = 'active'
                GROUP BY i.uploaded_by, u.display_name
                ORDER BY upload_count DESC
            `, { startDate: startOfDay, endDate: endOfDay });
            
            return {
                date: date,
                hourlyUploads: hourlyUploads.recordset,
                lotUploads: lotUploads.recordset,
                userUploads: userUploads.recordset
            };
        } catch (error) {
            logger.error('Error getting daily report:', error);
            throw error;
        }
    }
    
    /**
     * Get lot summary for export
     */
    static async getLotSummary(startDate, endDate) {
        try {
            const result = await db.query(`
                SELECT 
                    l.lot_id,
                    l.lot_number,
                    l.created_at,
                    l.status,
                    COUNT(i.image_id) as image_count,
                    SUM(ISNULL(i.original_size, 0) + ISNULL(i.compressed_size, 0)) as total_size,
                    MIN(i.uploaded_at) as first_upload,
                    MAX(i.uploaded_at) as last_upload
                FROM Lots l
                LEFT JOIN Images i ON l.lot_id = i.lot_id 
                    AND i.status = 'active'
                    AND i.uploaded_at >= @startDate 
                    AND i.uploaded_at <= @endDate
                WHERE l.created_at >= @startDate 
                    AND l.created_at <= @endDate
                GROUP BY l.lot_id, l.lot_number, l.created_at, l.status
                ORDER BY l.created_at DESC
            `, { startDate, endDate });
            
            return result.recordset;
        } catch (error) {
            logger.error('Error getting lot summary:', error);
            throw error;
        }
    }
    
    /**
     * Get daily upload statistics
     */
    static async getDailyUploads(startDate, endDate) {
        try {
            const result = await db.query(`
                SELECT 
                    CAST(uploaded_at AS DATE) as upload_date,
                    COUNT(*) as upload_count,
                    COUNT(DISTINCT uploaded_by) as unique_uploaders,
                    COUNT(DISTINCT lot_id) as lots_updated,
                    SUM(ISNULL(original_size, 0) + ISNULL(compressed_size, 0)) as total_size
                FROM Images
                WHERE uploaded_at >= @startDate 
                    AND uploaded_at <= @endDate
                    AND status = 'active'
                GROUP BY CAST(uploaded_at AS DATE)
                ORDER BY upload_date
            `, { startDate, endDate });
            
            return result.recordset;
        } catch (error) {
            logger.error('Error getting daily uploads:', error);
            throw error;
        }
    }
    
    /**
     * Get storage analysis
     */
    static async getStorageAnalysis() {
        try {
            // Storage by lot
            const lotStorage = await db.query(`
                SELECT TOP 20
                    l.lot_number,
                    COUNT(i.image_id) as image_count,
                    SUM(ISNULL(i.original_size, 0)) as original_size,
                    SUM(ISNULL(i.compressed_size, 0)) as compressed_size,
                    SUM(ISNULL(i.original_size, 0) + ISNULL(i.compressed_size, 0)) as total_size
                FROM Lots l
                INNER JOIN Images i ON l.lot_id = i.lot_id AND i.status = 'active'
                WHERE l.status = 'active'
                GROUP BY l.lot_number
                ORDER BY total_size DESC
            `);
            
            // Storage by date
            const dateStorage = await db.query(`
                SELECT 
                    CAST(uploaded_at AS DATE) as upload_date,
                    COUNT(*) as image_count,
                    SUM(ISNULL(original_size, 0) + ISNULL(compressed_size, 0)) as total_size
                FROM Images
                WHERE status = 'active'
                    AND uploaded_at >= DATEADD(day, -30, GETDATE())
                GROUP BY CAST(uploaded_at AS DATE)
                ORDER BY upload_date
            `);
            
            // Storage by file type
            const typeStorage = await db.query(`
                SELECT 
                    mime_type,
                    COUNT(*) as file_count,
                    SUM(ISNULL(original_size, 0) + ISNULL(compressed_size, 0)) as total_size
                FROM Images
                WHERE status = 'active'
                GROUP BY mime_type
                ORDER BY total_size DESC
            `);
            
            return {
                byLot: lotStorage.recordset,
                byDate: dateStorage.recordset,
                byType: typeStorage.recordset
            };
        } catch (error) {
            logger.error('Error getting storage analysis:', error);
            throw error;
        }
    }
    
    /**
     * Get user activity
     */
    static async getUserActivity(startDate, endDate) {
        try {
            // Upload activity
            const uploadActivity = await db.query(`
                SELECT 
                    i.uploaded_by as user_id,
                    u.display_name as user_name,
                    COUNT(i.image_id) as upload_count,
                    COUNT(DISTINCT i.lot_id) as lots_touched,
                    COUNT(DISTINCT CAST(i.uploaded_at AS DATE)) as active_days,
                    MIN(i.uploaded_at) as first_upload,
                    MAX(i.uploaded_at) as last_upload
                FROM Images i
                LEFT JOIN Users u ON i.uploaded_by = u.line_user_id
                WHERE i.uploaded_at >= @startDate 
                    AND i.uploaded_at <= @endDate
                    AND i.status = 'active'
                GROUP BY i.uploaded_by, u.display_name
                ORDER BY upload_count DESC
            `, { startDate, endDate });
            
            // Admin activity
            const adminActivity = await db.query(`
                SELECT 
                    au.employee_id,
                    au.full_name,
                    au.role,
                    COUNT(DISTINCT CASE WHEN al.action_type LIKE 'LOGIN%' THEN al.log_id END) as login_count,
                    COUNT(DISTINCT CASE WHEN al.action_type LIKE '%DELETE%' THEN al.log_id END) as delete_actions,
                    COUNT(DISTINCT CASE WHEN al.action_type LIKE '%UPDATE%' THEN al.log_id END) as update_actions,
                    COUNT(al.log_id) as total_actions,
                    MAX(al.created_at) as last_activity
                FROM AdminUsers au
                LEFT JOIN AuditLogs al ON au.admin_id = al.admin_id
                    AND al.created_at >= @startDate 
                    AND al.created_at <= @endDate
                WHERE au.is_active = 1
                GROUP BY au.employee_id, au.full_name, au.role
                ORDER BY total_actions DESC
            `, { startDate, endDate });
            
            return {
                uploadActivity: uploadActivity.recordset,
                adminActivity: adminActivity.recordset
            };
        } catch (error) {
            logger.error('Error getting user activity:', error);
            throw error;
        }
    }
    
    /**
     * Get lot analysis
     */
    static async getLotAnalysis(filters) {
        try {
            let query = `
                SELECT 
                    l.lot_number,
                    l.created_at,
                    COUNT(i.image_id) as total_images,
                    COUNT(DISTINCT i.uploaded_by) as unique_uploaders,
                    COUNT(DISTINCT CAST(i.uploaded_at AS DATE)) as upload_days,
                    DATEDIFF(day, MIN(i.uploaded_at), MAX(i.uploaded_at)) as upload_span_days,
                    SUM(ISNULL(i.original_size, 0) + ISNULL(i.compressed_size, 0)) as total_size,
                    AVG(ISNULL(i.original_size, 0)) as avg_image_size
                FROM Lots l
                LEFT JOIN Images i ON l.lot_id = i.lot_id AND i.status = 'active'
                WHERE l.status = 'active'
            `;
            
            const params = {};
            const conditions = [];
            
            if (filters.startDate) {
                conditions.push('l.created_at >= @startDate');
                params.startDate = filters.startDate;
            }
            
            if (filters.endDate) {
                conditions.push('l.created_at <= @endDate');
                params.endDate = filters.endDate;
            }
            
            if (conditions.length > 0) {
                query += ' AND ' + conditions.join(' AND ');
            }
            
            query += ' GROUP BY l.lot_number, l.created_at ORDER BY l.created_at DESC';
            
            const result = await db.query(query, params);
            return result.recordset;
        } catch (error) {
            logger.error('Error getting lot analysis:', error);
            throw error;
        }
    }
    
    /**
     * Get user statistics
     */
    static async getUserStatistics(filters) {
        try {
            const result = await db.query(`
                SELECT 
                    u.line_user_id,
                    u.display_name,
                    u.username,
                    COUNT(i.image_id) as total_uploads,
                    COUNT(DISTINCT i.lot_id) as lots_contributed,
                    COUNT(DISTINCT CAST(i.uploaded_at AS DATE)) as active_days,
                    MIN(i.uploaded_at) as first_upload,
                    MAX(i.uploaded_at) as last_upload,
                    SUM(ISNULL(i.original_size, 0) + ISNULL(i.compressed_size, 0)) as total_size
                FROM Users u
                LEFT JOIN Images i ON u.line_user_id = i.uploaded_by AND i.status = 'active'
                GROUP BY u.line_user_id, u.display_name, u.username
                HAVING COUNT(i.image_id) > 0
                ORDER BY total_uploads DESC
            `);
            
            return result.recordset;
        } catch (error) {
            logger.error('Error getting user statistics:', error);
            throw error;
        }
    }
}

module.exports = ReportService;