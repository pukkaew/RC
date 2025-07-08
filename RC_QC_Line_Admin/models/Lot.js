const db = require('../config/database');
const logger = require('../utils/logger');

class Lot {
    constructor(data) {
        this.lot_id = data.lot_id;
        this.lot_number = data.lot_number;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.status = data.status || 'active';
        
        // Computed properties
        this.image_count = data.image_count || 0;
        this.total_size = data.total_size || 0;
        this.last_upload = data.last_upload || null;
    }
    
    // Static methods
    static async findById(lotId) {
        try {
            const result = await db.query(
                `SELECT l.*, 
                    (SELECT COUNT(*) FROM Images WHERE lot_id = l.lot_id AND status = 'active') as image_count,
                    (SELECT SUM(ISNULL(original_size, 0) + ISNULL(compressed_size, 0)) 
                     FROM Images WHERE lot_id = l.lot_id AND status = 'active') as total_size,
                    (SELECT MAX(uploaded_at) FROM Images WHERE lot_id = l.lot_id) as last_upload
                FROM Lots l
                WHERE l.lot_id = @lotId`,
                { lotId }
            );
            
            if (result.recordset.length > 0) {
                return new Lot(result.recordset[0]);
            }
            return null;
        } catch (error) {
            logger.error('Error finding lot by ID:', error);
            throw error;
        }
    }
    
    static async findByLotNumber(lotNumber) {
        try {
            const result = await db.query(
                `SELECT l.*, 
                    (SELECT COUNT(*) FROM Images WHERE lot_id = l.lot_id AND status = 'active') as image_count,
                    (SELECT SUM(ISNULL(original_size, 0) + ISNULL(compressed_size, 0)) 
                     FROM Images WHERE lot_id = l.lot_id AND status = 'active') as total_size,
                    (SELECT MAX(uploaded_at) FROM Images WHERE lot_id = l.lot_id) as last_upload
                FROM Lots l
                WHERE l.lot_number = @lotNumber`,
                { lotNumber }
            );
            
            if (result.recordset.length > 0) {
                return new Lot(result.recordset[0]);
            }
            return null;
        } catch (error) {
            logger.error('Error finding lot by number:', error);
            throw error;
        }
    }
    
    static async findAll(options = {}) {
        try {
            let query = `
                SELECT l.*, 
                    (SELECT COUNT(*) FROM Images WHERE lot_id = l.lot_id AND status = 'active') as image_count,
                    (SELECT SUM(ISNULL(original_size, 0) + ISNULL(compressed_size, 0)) 
                     FROM Images WHERE lot_id = l.lot_id AND status = 'active') as total_size,
                    (SELECT MAX(uploaded_at) FROM Images WHERE lot_id = l.lot_id) as last_upload
                FROM Lots l
                WHERE 1=1
            `;
            
            const params = {};
            
            // Add search filter
            if (options.search) {
                query += ` AND l.lot_number LIKE @search`;
                params.search = `%${options.search}%`;
            }
            
            // Add status filter
            if (options.status) {
                query += ` AND l.status = @status`;
                params.status = options.status;
            }
            
            // Add date range filter
            if (options.startDate) {
                query += ` AND l.created_at >= @startDate`;
                params.startDate = options.startDate;
            }
            
            if (options.endDate) {
                query += ` AND l.created_at <= @endDate`;
                params.endDate = options.endDate;
            }
            
            // Add having clause for image count
            if (options.hasImages !== undefined) {
                query = `SELECT * FROM (${query}) AS lots WHERE image_count ${options.hasImages ? '>' : '='} 0`;
            }
            
            // Add ordering
            const orderBy = options.orderBy || 'created_at';
            const orderDir = options.orderDir || 'DESC';
            query += ` ORDER BY ${orderBy} ${orderDir}`;
            
            // Add pagination
            if (options.limit) {
                const offset = ((options.page || 1) - 1) * options.limit;
                query += ` OFFSET ${offset} ROWS FETCH NEXT ${options.limit} ROWS ONLY`;
            }
            
            const result = await db.query(query, params);
            return result.recordset.map(row => new Lot(row));
        } catch (error) {
            logger.error('Error finding all lots:', error);
            throw error;
        }
    }
    
    static async count(options = {}) {
        try {
            let query = `
                SELECT COUNT(*) as total 
                FROM Lots l
                WHERE 1=1
            `;
            
            const params = {};
            
            if (options.search) {
                query += ` AND l.lot_number LIKE @search`;
                params.search = `%${options.search}%`;
            }
            
            if (options.status) {
                query += ` AND l.status = @status`;
                params.status = options.status;
            }
            
            const result = await db.query(query, params);
            return result.recordset[0].total;
        } catch (error) {
            logger.error('Error counting lots:', error);
            throw error;
        }
    }
    
    static async getStatistics() {
        try {
            const result = await db.query(`
                SELECT 
                    COUNT(DISTINCT l.lot_id) as total_lots,
                    COUNT(i.image_id) as total_images,
                    SUM(ISNULL(i.original_size, 0) + ISNULL(i.compressed_size, 0)) as total_size,
                    (SELECT COUNT(*) FROM Images WHERE CAST(uploaded_at AS DATE) = CAST(GETDATE() AS DATE)) as images_today
                FROM Lots l
                LEFT JOIN Images i ON l.lot_id = i.lot_id AND i.status = 'active'
                WHERE l.status = 'active'
            `);
            
            return result.recordset[0];
        } catch (error) {
            logger.error('Error getting lot statistics:', error);
            throw error;
        }
    }
    
    static async getRecentActivity(limit = 10) {
        try {
            const result = await db.query(
                `SELECT TOP (@limit)
                    i.image_id,
                    i.file_name,
                    i.uploaded_at,
                    i.uploaded_by,
                    l.lot_number,
                    u.display_name as uploader_name
                FROM Images i
                INNER JOIN Lots l ON i.lot_id = l.lot_id
                LEFT JOIN Users u ON i.uploaded_by = u.line_user_id
                WHERE i.status = 'active'
                ORDER BY i.uploaded_at DESC`,
                { limit }
            );
            
            return result.recordset;
        } catch (error) {
            logger.error('Error getting recent activity:', error);
            throw error;
        }
    }
    
    // Instance methods
    async update(updates) {
        try {
            const allowedUpdates = ['lot_number', 'status'];
            const updateFields = [];
            const params = { lot_id: this.lot_id };
            
            allowedUpdates.forEach(field => {
                if (updates[field] !== undefined) {
                    updateFields.push(`${field} = @${field}`);
                    params[field] = updates[field];
                    this[field] = updates[field];
                }
            });
            
            if (updateFields.length === 0) {
                return this;
            }
            
            updateFields.push('updated_at = GETDATE()');
            
            await db.query(
                `UPDATE Lots 
                SET ${updateFields.join(', ')}
                WHERE lot_id = @lot_id`,
                params
            );
            
            this.updated_at = new Date();
            return this;
        } catch (error) {
            logger.error('Error updating lot:', error);
            throw error;
        }
    }
    
    async getImages(options = {}) {
        try {
            let query = `
                SELECT i.*, u.display_name as uploader_name
                FROM Images i
                LEFT JOIN Users u ON i.uploaded_by = u.line_user_id
                WHERE i.lot_id = @lot_id
            `;
            
            const params = { lot_id: this.lot_id };
            
            // Add status filter
            if (options.status) {
                query += ` AND i.status = @status`;
                params.status = options.status;
            } else {
                query += ` AND i.status = 'active'`;
            }
            
            // Add date filter
            if (options.date) {
                query += ` AND CAST(i.image_date AS DATE) = CAST(@date AS DATE)`;
                params.date = options.date;
            }
            
            // Add ordering
            query += ` ORDER BY i.uploaded_at DESC`;
            
            // Add pagination
            if (options.limit) {
                const offset = ((options.page || 1) - 1) * options.limit;
                query += ` OFFSET ${offset} ROWS FETCH NEXT ${options.limit} ROWS ONLY`;
            }
            
            const result = await db.query(query, params);
            return result.recordset;
        } catch (error) {
            logger.error('Error getting lot images:', error);
            throw error;
        }
    }
    
    async delete(deletedBy) {
        const transaction = await db.transaction(async (txn) => {
            try {
                // Get all images for deletion
                const imagesResult = await txn.request()
                    .input('lot_id', this.lot_id)
                    .query(`SELECT image_id, file_path FROM Images WHERE lot_id = @lot_id`);
                
                // Mark images as deleted
                await txn.request()
                    .input('lot_id', this.lot_id)
                    .query(`UPDATE Images SET status = 'deleted' WHERE lot_id = @lot_id`);
                
                // Mark lot as deleted
                await txn.request()
                    .input('lot_id', this.lot_id)
                    .query(`UPDATE Lots SET status = 'deleted', updated_at = GETDATE() WHERE lot_id = @lot_id`);
                
                return imagesResult.recordset;
            } catch (error) {
                throw error;
            }
        });
        
        return transaction;
    }
    
    async checkDuplicate(newLotNumber) {
        try {
            const result = await db.query(
                `SELECT COUNT(*) as count FROM Lots 
                WHERE lot_number = @lotNumber AND lot_id != @lot_id`,
                { lotNumber: newLotNumber, lot_id: this.lot_id }
            );
            
            return result.recordset[0].count > 0;
        } catch (error) {
            logger.error('Error checking duplicate lot number:', error);
            throw error;
        }
    }
    
    toJSON() {
        return {
            lot_id: this.lot_id,
            lot_number: this.lot_number,
            created_at: this.created_at,
            updated_at: this.updated_at,
            status: this.status,
            image_count: this.image_count,
            total_size: this.total_size,
            last_upload: this.last_upload
        };
    }
}

module.exports = Lot;