const db = require('../config/database');
const logger = require('../utils/logger');

class User {
    constructor(data) {
        this.user_id = data.user_id;
        this.line_user_id = data.line_user_id;
        this.username = data.username;
        this.display_name = data.display_name;
        this.email = data.email;
        this.picture_url = data.picture_url;
        this.status_message = data.status_message;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        
        // Computed properties
        this.upload_count = data.upload_count || 0;
        this.last_upload = data.last_upload || null;
    }
    
    // Static methods
    static async findById(userId) {
        try {
            const result = await db.query(
                `SELECT u.*,
                    (SELECT COUNT(*) FROM Images WHERE uploaded_by = u.line_user_id) as upload_count,
                    (SELECT MAX(uploaded_at) FROM Images WHERE uploaded_by = u.line_user_id) as last_upload
                FROM Users u
                WHERE u.user_id = @userId`,
                { userId }
            );
            
            if (result.recordset.length > 0) {
                return new User(result.recordset[0]);
            }
            return null;
        } catch (error) {
            logger.error('Error finding user by ID:', error);
            throw error;
        }
    }
    
    static async findByLineUserId(lineUserId) {
        try {
            const result = await db.query(
                `SELECT u.*,
                    (SELECT COUNT(*) FROM Images WHERE uploaded_by = u.line_user_id) as upload_count,
                    (SELECT MAX(uploaded_at) FROM Images WHERE uploaded_by = u.line_user_id) as last_upload
                FROM Users u
                WHERE u.line_user_id = @lineUserId`,
                { lineUserId }
            );
            
            if (result.recordset.length > 0) {
                return new User(result.recordset[0]);
            }
            return null;
        } catch (error) {
            logger.error('Error finding user by LINE ID:', error);
            throw error;
        }
    }
    
    static async findAll(options = {}) {
        try {
            let query = `
                SELECT u.*,
                    (SELECT COUNT(*) FROM Images WHERE uploaded_by = u.line_user_id) as upload_count,
                    (SELECT MAX(uploaded_at) FROM Images WHERE uploaded_by = u.line_user_id) as last_upload
                FROM Users u
                WHERE 1=1
            `;
            
            const params = {};
            
            // Add search filter
            if (options.search) {
                query += ` AND (u.username LIKE @search OR u.display_name LIKE @search)`;
                params.search = `%${options.search}%`;
            }
            
            // Add active filter (users with uploads)
            if (options.activeOnly) {
                query = `SELECT * FROM (${query}) AS users WHERE upload_count > 0`;
            }
            
            // Add ordering
            const orderBy = options.orderBy || 'display_name';
            const orderDir = options.orderDir || 'ASC';
            query += ` ORDER BY ${orderBy} ${orderDir}`;
            
            // Add pagination
            if (options.limit) {
                const offset = ((options.page || 1) - 1) * options.limit;
                query += ` OFFSET ${offset} ROWS FETCH NEXT ${options.limit} ROWS ONLY`;
            }
            
            const result = await db.query(query, params);
            return result.recordset.map(row => new User(row));
        } catch (error) {
            logger.error('Error finding all users:', error);
            throw error;
        }
    }
    
    static async count(options = {}) {
        try {
            let query = `SELECT COUNT(*) as total FROM Users WHERE 1=1`;
            const params = {};
            
            if (options.search) {
                query += ` AND (username LIKE @search OR display_name LIKE @search)`;
                params.search = `%${options.search}%`;
            }
            
            const result = await db.query(query, params);
            return result.recordset[0].total;
        } catch (error) {
            logger.error('Error counting users:', error);
            throw error;
        }
    }
    
    static async getTopUploaders(limit = 10) {
        try {
            const result = await db.query(
                `SELECT TOP (@limit)
                    u.*,
                    COUNT(i.image_id) as upload_count,
                    MAX(i.uploaded_at) as last_upload,
                    SUM(ISNULL(i.original_size, 0) + ISNULL(i.compressed_size, 0)) as total_size
                FROM Users u
                INNER JOIN Images i ON u.line_user_id = i.uploaded_by
                WHERE i.status = 'active'
                GROUP BY u.user_id, u.line_user_id, u.username, u.display_name, 
                         u.email, u.picture_url, u.status_message, u.created_at, u.updated_at
                ORDER BY upload_count DESC`,
                { limit }
            );
            
            return result.recordset.map(row => new User(row));
        } catch (error) {
            logger.error('Error getting top uploaders:', error);
            throw error;
        }
    }
    
    static async getUploadStatsByUser(lineUserId, startDate, endDate) {
        try {
            const result = await db.query(
                `SELECT 
                    COUNT(*) as total_uploads,
                    COUNT(DISTINCT lot_id) as lots_contributed,
                    COUNT(DISTINCT CAST(uploaded_at AS DATE)) as active_days,
                    MIN(uploaded_at) as first_upload,
                    MAX(uploaded_at) as last_upload,
                    SUM(ISNULL(original_size, 0) + ISNULL(compressed_size, 0)) as total_size,
                    AVG(ISNULL(original_size, 0)) as avg_size
                FROM Images
                WHERE uploaded_by = @lineUserId
                    AND status = 'active'
                    AND (@startDate IS NULL OR uploaded_at >= @startDate)
                    AND (@endDate IS NULL OR uploaded_at <= @endDate)`,
                { 
                    lineUserId,
                    startDate: startDate || null,
                    endDate: endDate || null
                }
            );
            
            return result.recordset[0];
        } catch (error) {
            logger.error('Error getting user upload stats:', error);
            throw error;
        }
    }
    
    // Instance methods
    async getUploadHistory(options = {}) {
        try {
            let query = `
                SELECT 
                    i.*,
                    l.lot_number
                FROM Images i
                INNER JOIN Lots l ON i.lot_id = l.lot_id
                WHERE i.uploaded_by = @lineUserId
            `;
            
            const params = { lineUserId: this.line_user_id };
            
            if (options.status) {
                query += ` AND i.status = @status`;
                params.status = options.status;
            } else {
                query += ` AND i.status = 'active'`;
            }
            
            if (options.startDate) {
                query += ` AND i.uploaded_at >= @startDate`;
                params.startDate = options.startDate;
            }
            
            if (options.endDate) {
                query += ` AND i.uploaded_at <= @endDate`;
                params.endDate = options.endDate;
            }
            
            query += ` ORDER BY i.uploaded_at DESC`;
            
            if (options.limit) {
                const offset = ((options.page || 1) - 1) * options.limit;
                query += ` OFFSET ${offset} ROWS FETCH NEXT ${options.limit} ROWS ONLY`;
            }
            
            const result = await db.query(query, params);
            return result.recordset;
        } catch (error) {
            logger.error('Error getting user upload history:', error);
            throw error;
        }
    }
    
    async getContributedLots() {
        try {
            const result = await db.query(
                `SELECT DISTINCT
                    l.lot_id,
                    l.lot_number,
                    COUNT(i.image_id) as contribution_count,
                    MIN(i.uploaded_at) as first_contribution,
                    MAX(i.uploaded_at) as last_contribution
                FROM Lots l
                INNER JOIN Images i ON l.lot_id = i.lot_id
                WHERE i.uploaded_by = @lineUserId AND i.status = 'active'
                GROUP BY l.lot_id, l.lot_number
                ORDER BY contribution_count DESC`,
                { lineUserId: this.line_user_id }
            );
            
            return result.recordset;
        } catch (error) {
            logger.error('Error getting contributed lots:', error);
            throw error;
        }
    }
    
    toJSON() {
        return {
            user_id: this.user_id,
            line_user_id: this.line_user_id,
            username: this.username,
            display_name: this.display_name,
            email: this.email,
            picture_url: this.picture_url,
            status_message: this.status_message,
            created_at: this.created_at,
            updated_at: this.updated_at,
            upload_count: this.upload_count,
            last_upload: this.last_upload
        };
    }
}

module.exports = User;