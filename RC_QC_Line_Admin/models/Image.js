const db = require('../config/database');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;

class Image {
    constructor(data) {
        this.image_id = data.image_id;
        this.lot_id = data.lot_id;
        this.image_date = data.image_date;
        this.file_name = data.file_name;
        this.file_path = data.file_path;
        this.original_size = data.original_size;
        this.compressed_size = data.compressed_size;
        this.mime_type = data.mime_type;
        this.uploaded_by = data.uploaded_by;
        this.uploaded_at = data.uploaded_at;
        this.status = data.status || 'active';
        
        // Additional properties from joins
        this.lot_number = data.lot_number;
        this.uploader_name = data.uploader_name;
    }
    
    // Static methods
    static async findById(imageId) {
        try {
            const result = await db.query(
                `SELECT i.*, l.lot_number, u.display_name as uploader_name
                FROM Images i
                INNER JOIN Lots l ON i.lot_id = l.lot_id
                LEFT JOIN Users u ON i.uploaded_by = u.line_user_id
                WHERE i.image_id = @imageId`,
                { imageId }
            );
            
            if (result.recordset.length > 0) {
                return new Image(result.recordset[0]);
            }
            return null;
        } catch (error) {
            logger.error('Error finding image by ID:', error);
            throw error;
        }
    }
    
    static async findAll(options = {}) {
        try {
            let query = `
                SELECT i.*, l.lot_number, u.display_name as uploader_name
                FROM Images i
                INNER JOIN Lots l ON i.lot_id = l.lot_id
                LEFT JOIN Users u ON i.uploaded_by = u.line_user_id
                WHERE 1=1
            `;
            
            const params = {};
            
            // Add filters
            if (options.lot_id) {
                query += ` AND i.lot_id = @lot_id`;
                params.lot_id = options.lot_id;
            }
            
            if (options.lot_number) {
                query += ` AND l.lot_number LIKE @lot_number`;
                params.lot_number = `%${options.lot_number}%`;
            }
            
            if (options.status) {
                query += ` AND i.status = @status`;
                params.status = options.status;
            } else {
                query += ` AND i.status = 'active'`;
            }
            
            if (options.startDate) {
                query += ` AND i.image_date >= @startDate`;
                params.startDate = options.startDate;
            }
            
            if (options.endDate) {
                query += ` AND i.image_date <= @endDate`;
                params.endDate = options.endDate;
            }
            
            if (options.uploaded_by) {
                query += ` AND i.uploaded_by = @uploaded_by`;
                params.uploaded_by = options.uploaded_by;
            }
            
            // Add ordering
            const orderBy = options.orderBy || 'uploaded_at';
            const orderDir = options.orderDir || 'DESC';
            query += ` ORDER BY i.${orderBy} ${orderDir}`;
            
            // Add pagination
            if (options.limit) {
                const offset = ((options.page || 1) - 1) * options.limit;
                query += ` OFFSET ${offset} ROWS FETCH NEXT ${options.limit} ROWS ONLY`;
            }
            
            const result = await db.query(query, params);
            return result.recordset.map(row => new Image(row));
        } catch (error) {
            logger.error('Error finding all images:', error);
            throw error;
        }
    }
    
    static async count(options = {}) {
        try {
            let query = `
                SELECT COUNT(*) as total
                FROM Images i
                INNER JOIN Lots l ON i.lot_id = l.lot_id
                WHERE 1=1
            `;
            
            const params = {};
            
            if (options.lot_id) {
                query += ` AND i.lot_id = @lot_id`;
                params.lot_id = options.lot_id;
            }
            
            if (options.status) {
                query += ` AND i.status = @status`;
                params.status = options.status;
            } else {
                query += ` AND i.status = 'active'`;
            }
            
            if (options.startDate) {
                query += ` AND i.image_date >= @startDate`;
                params.startDate = options.startDate;
            }
            
            if (options.endDate) {
                query += ` AND i.image_date <= @endDate`;
                params.endDate = options.endDate;
            }
            
            const result = await db.query(query, params);
            return result.recordset[0].total;
        } catch (error) {
            logger.error('Error counting images:', error);
            throw error;
        }
    }
    
    static async getUploadStatistics(days = 7) {
        try {
            const result = await db.query(
                `SELECT 
                    CAST(uploaded_at AS DATE) as upload_date,
                    COUNT(*) as count,
                    SUM(original_size + ISNULL(compressed_size, 0)) as total_size
                FROM Images
                WHERE uploaded_at >= DATEADD(day, -@days, GETDATE())
                    AND status = 'active'
                GROUP BY CAST(uploaded_at AS DATE)
                ORDER BY upload_date`,
                { days }
            );
            
            return result.recordset;
        } catch (error) {
            logger.error('Error getting upload statistics:', error);
            throw error;
        }
    }
    
    static async getStorageBreakdown() {
        try {
            const result = await db.query(`
                SELECT TOP 20
                    l.lot_number,
                    COUNT(i.image_id) as image_count,
                    SUM(i.original_size + ISNULL(i.compressed_size, 0)) as total_size
                FROM Images i
                INNER JOIN Lots l ON i.lot_id = l.lot_id
                WHERE i.status = 'active'
                GROUP BY l.lot_number
                ORDER BY total_size DESC
            `);
            
            return result.recordset;
        } catch (error) {
            logger.error('Error getting storage breakdown:', error);
            throw error;
        }
    }
    
    static async deleteMultiple(imageIds, deletedBy) {
        const transaction = await db.transaction(async (txn) => {
            try {
                const placeholders = imageIds.map((_, i) => `@id${i}`).join(',');
                const params = {};
                imageIds.forEach((id, i) => {
                    params[`id${i}`] = id;
                });
                
                // Get file paths before marking as deleted
                const request = txn.request();
                Object.keys(params).forEach(key => {
                    request.input(key, params[key]);
                });
                
                const filesResult = await request.query(
                    `SELECT image_id, file_path FROM Images WHERE image_id IN (${placeholders})`
                );
                
                // Mark as deleted
                const updateRequest = txn.request();
                Object.keys(params).forEach(key => {
                    updateRequest.input(key, params[key]);
                });
                
                await updateRequest.query(
                    `UPDATE Images 
                    SET status = 'deleted', updated_at = GETDATE() 
                    WHERE image_id IN (${placeholders})`
                );
                
                return filesResult.recordset;
            } catch (error) {
                throw error;
            }
        });
        
        return transaction;
    }
    
    // Instance methods
    async update(updates) {
        try {
            const allowedUpdates = ['status'];
            const updateFields = [];
            const params = { image_id: this.image_id };
            
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
                `UPDATE Images 
                SET ${updateFields.join(', ')}
                WHERE image_id = @image_id`,
                params
            );
            
            return this;
        } catch (error) {
            logger.error('Error updating image:', error);
            throw error;
        }
    }
    
    async delete() {
        try {
            await db.query(
                `UPDATE Images 
                SET status = 'deleted', updated_at = GETDATE()
                WHERE image_id = @image_id`,
                { image_id: this.image_id }
            );
            
            this.status = 'deleted';
            return true;
        } catch (error) {
            logger.error('Error deleting image:', error);
            throw error;
        }
    }
    
    async deleteFile() {
        try {
            const fullPath = path.join(process.cwd(), 'public', this.file_path);
            await fs.unlink(fullPath);
            logger.info(`Deleted file: ${fullPath}`);
            return true;
        } catch (error) {
            logger.error('Error deleting file:', error);
            return false;
        }
    }
    
    getFullPath() {
        return path.join(process.cwd(), 'public', this.file_path);
    }
    
    getPublicUrl() {
        return this.file_path.replace(/\\/g, '/');
    }
    
    getThumbnailUrl() {
        // Assuming compressed version is stored in 'compressed' subfolder
        const dir = path.dirname(this.file_path);
        const filename = path.basename(this.file_path);
        return path.join(dir, 'compressed', filename).replace(/\\/g, '/');
    }
    
    formatSize() {
        const bytes = this.original_size || 0;
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    toJSON() {
        return {
            image_id: this.image_id,
            lot_id: this.lot_id,
            lot_number: this.lot_number,
            image_date: this.image_date,
            file_name: this.file_name,
            file_path: this.file_path,
            public_url: this.getPublicUrl(),
            thumbnail_url: this.getThumbnailUrl(),
            original_size: this.original_size,
            compressed_size: this.compressed_size,
            formatted_size: this.formatSize(),
            mime_type: this.mime_type,
            uploaded_by: this.uploaded_by,
            uploader_name: this.uploader_name,
            uploaded_at: this.uploaded_at,
            status: this.status
        };
    }
}

module.exports = Image;