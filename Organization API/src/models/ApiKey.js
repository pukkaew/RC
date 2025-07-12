const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sql, executeQuery } = require('../config/database');
const logger = require('../utils/logger');

class ApiKey {
    constructor(data) {
        this.api_key_id = data.api_key_id;
        this.api_key = data.api_key;
        this.api_key_hash = data.api_key_hash;
        this.app_name = data.app_name;
        this.description = data.description;
        this.permissions = data.permissions || 'read';
        this.is_active = data.is_active !== undefined ? data.is_active : true;
        this.last_used_date = data.last_used_date;
        this.expires_date = data.expires_date;
        this.created_date = data.created_date;
        this.created_by = data.created_by;
        this.updated_date = data.updated_date;
        this.updated_by = data.updated_by;
    }

    // Generate new API key
    static generateApiKey() {
        // Generate a 32-byte random key and convert to base64
        const buffer = crypto.randomBytes(32);
        return buffer.toString('base64').replace(/[/+=]/g, '');
    }

    // Hash API key
    static async hashApiKey(apiKey) {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(apiKey, salt);
    }

    // Verify API key
    static async verifyApiKey(apiKey, hash) {
        return await bcrypt.compare(apiKey, hash);
    }

    // Get all API keys
    static async findAll(filters = {}) {
        try {
            let query = `
                SELECT api_key_id, app_name, description, permissions,
                       is_active, last_used_date, expires_date,
                       created_date, created_by, updated_date, updated_by
                FROM API_Keys
                WHERE 1=1
            `;
            
            const inputs = {};
            
            // Apply filters
            if (filters.is_active !== undefined) {
                query += ' AND is_active = @is_active';
                inputs.is_active = filters.is_active;
            }
            
            if (filters.permissions) {
                query += ' AND permissions = @permissions';
                inputs.permissions = filters.permissions;
            }
            
            if (filters.search) {
                query += ' AND (app_name LIKE @search OR description LIKE @search)';
                inputs.search = `%${filters.search}%`;
            }
            
            query += ' ORDER BY created_date DESC';
            
            const result = await executeQuery(query, inputs);
            return result.recordset.map(row => new ApiKey(row));
        } catch (error) {
            logger.error('Error in ApiKey.findAll:', error);
            throw error;
        }
    }

    // Get API key by ID
    static async findById(apiKeyId) {
        try {
            const query = `
                SELECT api_key_id, app_name, description, permissions,
                       is_active, last_used_date, expires_date,
                       created_date, created_by, updated_date, updated_by
                FROM API_Keys
                WHERE api_key_id = @api_key_id
            `;
            
            const result = await executeQuery(query, { api_key_id: apiKeyId });
            
            if (result.recordset.length === 0) {
                return null;
            }
            
            return new ApiKey(result.recordset[0]);
        } catch (error) {
            logger.error('Error in ApiKey.findById:', error);
            throw error;
        }
    }

    // Get API key by hash (for authentication)
    static async findByHash(apiKeyHash) {
        try {
            const query = `
                SELECT api_key_id, api_key_hash, app_name, description, 
                       permissions, is_active, expires_date
                FROM API_Keys
                WHERE api_key_hash = @api_key_hash AND is_active = 1
            `;
            
            const result = await executeQuery(query, { api_key_hash: apiKeyHash });
            
            if (result.recordset.length === 0) {
                return null;
            }
            
            return new ApiKey(result.recordset[0]);
        } catch (error) {
            logger.error('Error in ApiKey.findByHash:', error);
            throw error;
        }
    }

    // Authenticate with API key
    static async authenticate(apiKey) {
        try {
            // Get all active API keys
            const query = `
                SELECT api_key_id, api_key_hash, app_name, permissions, 
                       expires_date, is_active
                FROM API_Keys
                WHERE is_active = 1
            `;
            
            const result = await executeQuery(query);
            
            // Check each API key hash
            for (const row of result.recordset) {
                const isValid = await ApiKey.verifyApiKey(apiKey, row.api_key_hash);
                
                if (isValid) {
                    // Check if expired
                    if (row.expires_date && new Date(row.expires_date) < new Date()) {
                        return { valid: false, reason: 'API key expired' };
                    }
                    
                    return {
                        valid: true,
                        apiKeyId: row.api_key_id,
                        appName: row.app_name,
                        permissions: row.permissions
                    };
                }
            }
            
            return { valid: false, reason: 'Invalid API key' };
        } catch (error) {
            logger.error('Error in ApiKey.authenticate:', error);
            throw error;
        }
    }

    // Create new API key
    async create() {
        try {
            // Generate API key
            const apiKey = ApiKey.generateApiKey();
            const apiKeyHash = await ApiKey.hashApiKey(apiKey);
            
            const query = `
                INSERT INTO API_Keys (
                    api_key, api_key_hash, app_name, description,
                    permissions, is_active, expires_date, created_by
                )
                VALUES (
                    @api_key, @api_key_hash, @app_name, @description,
                    @permissions, @is_active, @expires_date, @created_by
                );
                SELECT SCOPE_IDENTITY() as api_key_id;
            `;
            
            const inputs = {
                api_key: apiKey.substring(0, 8) + '...', // Store partial key for reference
                api_key_hash: apiKeyHash,
                app_name: this.app_name,
                description: this.description,
                permissions: this.permissions,
                is_active: this.is_active,
                expires_date: this.expires_date,
                created_by: this.created_by
            };
            
            const result = await executeQuery(query, inputs);
            this.api_key_id = result.recordset[0].api_key_id;
            
            // Return the full API key (only shown once)
            return {
                ...await ApiKey.findById(this.api_key_id),
                api_key: apiKey // Include the actual key only on creation
            };
        } catch (error) {
            logger.error('Error in ApiKey.create:', error);
            throw error;
        }
    }

    // Update API key
    async update() {
        try {
            const query = `
                UPDATE API_Keys
                SET app_name = @app_name,
                    description = @description,
                    permissions = @permissions,
                    expires_date = @expires_date,
                    updated_date = GETDATE(),
                    updated_by = @updated_by
                WHERE api_key_id = @api_key_id
            `;
            
            const inputs = {
                api_key_id: this.api_key_id,
                app_name: this.app_name,
                description: this.description,
                permissions: this.permissions,
                expires_date: this.expires_date,
                updated_by: this.updated_by
            };
            
            const result = await executeQuery(query, inputs);
            
            if (result.rowsAffected[0] === 0) {
                throw new Error('API Key not found');
            }
            
            return await ApiKey.findById(this.api_key_id);
        } catch (error) {
            logger.error('Error in ApiKey.update:', error);
            throw error;
        }
    }

    // Update API key status
    static async updateStatus(apiKeyId, isActive, updatedBy) {
        try {
            const query = `
                UPDATE API_Keys
                SET is_active = @is_active,
                    updated_date = GETDATE(),
                    updated_by = @updated_by
                WHERE api_key_id = @api_key_id
            `;
            
            const inputs = {
                api_key_id: apiKeyId,
                is_active: isActive,
                updated_by: updatedBy
            };
            
            const result = await executeQuery(query, inputs);
            
            if (result.rowsAffected[0] === 0) {
                throw new Error('API Key not found');
            }
            
            return await ApiKey.findById(apiKeyId);
        } catch (error) {
            logger.error('Error in ApiKey.updateStatus:', error);
            throw error;
        }
    }

    // Update last used date
    static async updateLastUsed(apiKeyId) {
        try {
            const query = `
                UPDATE API_Keys
                SET last_used_date = GETDATE()
                WHERE api_key_id = @api_key_id
            `;
            
            await executeQuery(query, { api_key_id: apiKeyId });
        } catch (error) {
            logger.error('Error in ApiKey.updateLastUsed:', error);
            // Don't throw error for this operation
        }
    }

    // Get API keys with pagination
    static async findPaginated(page = 1, limit = 20, filters = {}) {
        try {
            const offset = (page - 1) * limit;
            
            // Build WHERE clause
            let whereClause = ' WHERE 1=1';
            const inputs = {
                limit: limit,
                offset: offset
            };
            
            if (filters.is_active !== undefined) {
                whereClause += ' AND is_active = @is_active';
                inputs.is_active = filters.is_active;
            }
            
            if (filters.permissions) {
                whereClause += ' AND permissions = @permissions';
                inputs.permissions = filters.permissions;
            }
            
            if (filters.search) {
                whereClause += ' AND (app_name LIKE @search OR description LIKE @search)';
                inputs.search = `%${filters.search}%`;
            }
            
            // Count total records
            const countQuery = `
                SELECT COUNT(*) as total
                FROM API_Keys
                ${whereClause}
            `;
            
            const countResult = await executeQuery(countQuery, inputs);
            const total = countResult.recordset[0].total;
            
            // Get paginated data
            const dataQuery = `
                SELECT api_key_id, app_name, description, permissions,
                       is_active, last_used_date, expires_date,
                       created_date, created_by, updated_date, updated_by
                FROM API_Keys
                ${whereClause}
                ORDER BY created_date DESC
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
            `;
            
            const dataResult = await executeQuery(dataQuery, inputs);
            
            return {
                data: dataResult.recordset.map(row => new ApiKey(row)),
                pagination: {
                    page: page,
                    limit: limit,
                    total: total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Error in ApiKey.findPaginated:', error);
            throw error;
        }
    }

    // Get API key statistics
    static async getStatistics() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_keys,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_keys,
                    SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_keys,
                    SUM(CASE WHEN expires_date < GETDATE() THEN 1 ELSE 0 END) as expired_keys,
                    SUM(CASE WHEN permissions = 'read' THEN 1 ELSE 0 END) as read_only_keys,
                    SUM(CASE WHEN permissions = 'write' THEN 1 ELSE 0 END) as write_only_keys,
                    SUM(CASE WHEN permissions = 'read_write' THEN 1 ELSE 0 END) as read_write_keys
                FROM API_Keys
            `;
            
            const result = await executeQuery(query);
            return result.recordset[0];
        } catch (error) {
            logger.error('Error in ApiKey.getStatistics:', error);
            throw error;
        }
    }
}

module.exports = ApiKey;