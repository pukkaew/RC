const { sql, executeQuery, executeProcedure } = require('../config/database');
const logger = require('../utils/logger');

class ApiLog {
    constructor(data) {
        this.log_id = data.log_id;
        this.api_key_id = data.api_key_id;
        this.endpoint = data.endpoint;
        this.method = data.method;
        this.request_body = data.request_body;
        this.response_status = data.response_status;
        this.response_time_ms = data.response_time_ms;
        this.ip_address = data.ip_address;
        this.user_agent = data.user_agent;
        this.error_message = data.error_message;
        this.created_date = data.created_date;
    }

    // Create new log entry
    static async create(logData) {
        try {
            // Use stored procedure for better performance
            const result = await executeProcedure('sp_LogAPIUsage', {
                api_key_hash: logData.api_key_hash,
                endpoint: logData.endpoint,
                method: logData.method,
                request_body: logData.request_body,
                response_status: logData.response_status,
                response_time_ms: logData.response_time_ms,
                ip_address: logData.ip_address,
                user_agent: logData.user_agent,
                error_message: logData.error_message
            });
            
            return true;
        } catch (error) {
            logger.error('Error in ApiLog.create:', error);
            // Don't throw error for logging failures
            return false;
        }
    }

    // Get logs with filters
    static async findAll(filters = {}) {
        try {
            let query = `
                SELECT TOP 1000 
                    l.log_id, l.api_key_id, l.endpoint, l.method,
                    l.request_body, l.response_status, l.response_time_ms,
                    l.ip_address, l.user_agent, l.error_message, l.created_date,
                    k.app_name
                FROM API_Logs l
                INNER JOIN API_Keys k ON l.api_key_id = k.api_key_id
                WHERE 1=1
            `;
            
            const inputs = {};
            
            // Apply filters
            if (filters.api_key_id) {
                query += ' AND l.api_key_id = @api_key_id';
                inputs.api_key_id = filters.api_key_id;
            }
            
            if (filters.endpoint) {
                query += ' AND l.endpoint LIKE @endpoint';
                inputs.endpoint = `%${filters.endpoint}%`;
            }
            
            if (filters.method) {
                query += ' AND l.method = @method';
                inputs.method = filters.method;
            }
            
            if (filters.status_code) {
                query += ' AND l.response_status = @status_code';
                inputs.status_code = filters.status_code;
            }
            
            if (filters.date_from) {
                query += ' AND l.created_date >= @date_from';
                inputs.date_from = filters.date_from;
            }
            
            if (filters.date_to) {
                query += ' AND l.created_date <= @date_to';
                inputs.date_to = filters.date_to;
            }
            
            if (filters.has_error !== undefined) {
                if (filters.has_error) {
                    query += ' AND l.error_message IS NOT NULL';
                } else {
                    query += ' AND l.error_message IS NULL';
                }
            }
            
            query += ' ORDER BY l.created_date DESC';
            
            const result = await executeQuery(query, inputs);
            return result.recordset.map(row => ({
                ...new ApiLog(row),
                app_name: row.app_name
            }));
        } catch (error) {
            logger.error('Error in ApiLog.findAll:', error);
            throw error;
        }
    }

    // Get logs with pagination
    static async findPaginated(page = 1, limit = 50, filters = {}) {
        try {
            const offset = (page - 1) * limit;
            
            // Build WHERE clause
            let whereClause = ' WHERE 1=1';
            const inputs = {
                limit: limit,
                offset: offset
            };
            
            if (filters.api_key_id) {
                whereClause += ' AND l.api_key_id = @api_key_id';
                inputs.api_key_id = filters.api_key_id;
            }
            
            if (filters.endpoint) {
                whereClause += ' AND l.endpoint LIKE @endpoint';
                inputs.endpoint = `%${filters.endpoint}%`;
            }
            
            if (filters.method) {
                whereClause += ' AND l.method = @method';
                inputs.method = filters.method;
            }
            
            if (filters.status_code) {
                whereClause += ' AND l.response_status = @status_code';
                inputs.status_code = filters.status_code;
            }
            
            if (filters.date_from) {
                whereClause += ' AND l.created_date >= @date_from';
                inputs.date_from = filters.date_from;
            }
            
            if (filters.date_to) {
                whereClause += ' AND l.created_date <= @date_to';
                inputs.date_to = filters.date_to;
            }
            
            // Count total records
            const countQuery = `
                SELECT COUNT(*) as total
                FROM API_Logs l
                ${whereClause}
            `;
            
            const countResult = await executeQuery(countQuery, inputs);
            const total = countResult.recordset[0].total;
            
            // Get paginated data
            const dataQuery = `
                SELECT l.log_id, l.api_key_id, l.endpoint, l.method,
                       l.request_body, l.response_status, l.response_time_ms,
                       l.ip_address, l.user_agent, l.error_message, l.created_date,
                       k.app_name
                FROM API_Logs l
                INNER JOIN API_Keys k ON l.api_key_id = k.api_key_id
                ${whereClause}
                ORDER BY l.created_date DESC
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
            `;
            
            const dataResult = await executeQuery(dataQuery, inputs);
            
            return {
                data: dataResult.recordset.map(row => ({
                    ...new ApiLog(row),
                    app_name: row.app_name
                })),
                pagination: {
                    page: page,
                    limit: limit,
                    total: total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Error in ApiLog.findPaginated:', error);
            throw error;
        }
    }

    // Get API usage statistics
    static async getStatistics(filters = {}) {
        try {
            let query = `
                SELECT 
                    COUNT(*) as total_requests,
                    AVG(response_time_ms) as avg_response_time,
                    MAX(response_time_ms) as max_response_time,
                    MIN(response_time_ms) as min_response_time,
                    SUM(CASE WHEN response_status >= 200 AND response_status < 300 THEN 1 ELSE 0 END) as successful_requests,
                    SUM(CASE WHEN response_status >= 400 AND response_status < 500 THEN 1 ELSE 0 END) as client_errors,
                    SUM(CASE WHEN response_status >= 500 THEN 1 ELSE 0 END) as server_errors,
                    COUNT(DISTINCT api_key_id) as unique_api_keys,
                    COUNT(DISTINCT endpoint) as unique_endpoints
                FROM API_Logs
                WHERE 1=1
            `;
            
            const inputs = {};
            
            if (filters.date_from) {
                query += ' AND created_date >= @date_from';
                inputs.date_from = filters.date_from;
            }
            
            if (filters.date_to) {
                query += ' AND created_date <= @date_to';
                inputs.date_to = filters.date_to;
            }
            
            if (filters.api_key_id) {
                query += ' AND api_key_id = @api_key_id';
                inputs.api_key_id = filters.api_key_id;
            }
            
            const result = await executeQuery(query, inputs);
            return result.recordset[0];
        } catch (error) {
            logger.error('Error in ApiLog.getStatistics:', error);
            throw error;
        }
    }

    // Get endpoint statistics
    static async getEndpointStatistics(filters = {}) {
        try {
            let query = `
                SELECT 
                    endpoint,
                    method,
                    COUNT(*) as request_count,
                    AVG(response_time_ms) as avg_response_time,
                    SUM(CASE WHEN response_status >= 200 AND response_status < 300 THEN 1 ELSE 0 END) as success_count,
                    SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) as error_count
                FROM API_Logs
                WHERE 1=1
            `;
            
            const inputs = {};
            
            if (filters.date_from) {
                query += ' AND created_date >= @date_from';
                inputs.date_from = filters.date_from;
            }
            
            if (filters.date_to) {
                query += ' AND created_date <= @date_to';
                inputs.date_to = filters.date_to;
            }
            
            query += `
                GROUP BY endpoint, method
                ORDER BY request_count DESC
            `;
            
            const result = await executeQuery(query, inputs);
            return result.recordset;
        } catch (error) {
            logger.error('Error in ApiLog.getEndpointStatistics:', error);
            throw error;
        }
    }

    // Get hourly statistics
    static async getHourlyStatistics(date = new Date()) {
        try {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            
            const query = `
                SELECT 
                    DATEPART(hour, created_date) as hour,
                    COUNT(*) as request_count,
                    AVG(response_time_ms) as avg_response_time
                FROM API_Logs
                WHERE created_date >= @start_date AND created_date <= @end_date
                GROUP BY DATEPART(hour, created_date)
                ORDER BY hour
            `;
            
            const result = await executeQuery(query, {
                start_date: startDate,
                end_date: endDate
            });
            
            // Fill in missing hours with zero
            const hourlyData = Array(24).fill(null).map((_, hour) => ({
                hour,
                request_count: 0,
                avg_response_time: 0
            }));
            
            result.recordset.forEach(row => {
                hourlyData[row.hour] = row;
            });
            
            return hourlyData;
        } catch (error) {
            logger.error('Error in ApiLog.getHourlyStatistics:', error);
            throw error;
        }
    }

    // Clean old logs
    static async cleanOldLogs(daysToKeep = 30) {
        try {
            const query = `
                DELETE FROM API_Logs
                WHERE created_date < DATEADD(day, -@days_to_keep, GETDATE())
            `;
            
            const result = await executeQuery(query, { days_to_keep: daysToKeep });
            
            logger.info(`Cleaned ${result.rowsAffected[0]} old API logs`);
            return result.rowsAffected[0];
        } catch (error) {
            logger.error('Error in ApiLog.cleanOldLogs:', error);
            throw error;
        }
    }

    // Get usage by API key
    static async getUsageByApiKey(filters = {}) {
        try {
            let query = `
                SELECT 
                    k.api_key_id,
                    k.app_name,
                    COUNT(l.log_id) as request_count,
                    AVG(l.response_time_ms) as avg_response_time,
                    MAX(l.created_date) as last_used
                FROM API_Keys k
                LEFT JOIN API_Logs l ON k.api_key_id = l.api_key_id
            `;
            
            const inputs = {};
            let whereConditions = [];
            
            if (filters.date_from || filters.date_to) {
                if (filters.date_from) {
                    whereConditions.push('l.created_date >= @date_from');
                    inputs.date_from = filters.date_from;
                }
                
                if (filters.date_to) {
                    whereConditions.push('l.created_date <= @date_to');
                    inputs.date_to = filters.date_to;
                }
            }
            
            if (whereConditions.length > 0) {
                query += ' AND ' + whereConditions.join(' AND ');
            }
            
            query += `
                WHERE k.is_active = 1
                GROUP BY k.api_key_id, k.app_name
                ORDER BY request_count DESC
            `;
            
            const result = await executeQuery(query, inputs);
            return result.recordset;
        } catch (error) {
            logger.error('Error in ApiLog.getUsageByApiKey:', error);
            throw error;
        }
    }
}

module.exports = ApiLog;