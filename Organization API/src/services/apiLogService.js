// Path: /src/services/apiLogService.js
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

class ApiLogService {
    /**
     * Get today's API usage statistics
     */
    static async getTodayStats() {
        const cacheKey = 'api:stats:today';
        const cached = await cache.get(cacheKey);
        if (cached) return cached;

        try {
            const query = `
                SELECT 
                    COUNT(*) as todayCalls,
                    COUNT(DISTINCT api_key_id) as uniqueKeys,
                    AVG(response_time_ms) as avgResponseTime,
                    SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) as errorCount
                FROM API_Logs
                WHERE CAST(created_date AS DATE) = CAST(GETDATE() AS DATE)
            `;
            
            const result = await executeQuery(query);
            const stats = result.recordset[0] || {
                todayCalls: 0,
                uniqueKeys: 0,
                avgResponseTime: 0,
                errorCount: 0
            };

            await cache.set(cacheKey, stats, 300); // Cache for 5 minutes
            return stats;
        } catch (error) {
            logger.error('Error getting today API stats:', error);
            return {
                todayCalls: 0,
                uniqueKeys: 0,
                avgResponseTime: 0,
                errorCount: 0
            };
        }
    }

    /**
     * Get API usage chart data
     */
    static async getUsageChartData(period = '7days') {
        try {
            let query;
            const inputs = {};

            switch (period) {
                case '7days':
                    query = `
                        SELECT 
                            CAST(created_date AS DATE) as date,
                            COUNT(*) as calls,
                            SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) as errors
                        FROM API_Logs
                        WHERE created_date >= DATEADD(day, -7, GETDATE())
                        GROUP BY CAST(created_date AS DATE)
                        ORDER BY date
                    `;
                    break;
                    
                case '30days':
                    query = `
                        SELECT 
                            CAST(created_date AS DATE) as date,
                            COUNT(*) as calls,
                            SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) as errors
                        FROM API_Logs
                        WHERE created_date >= DATEADD(day, -30, GETDATE())
                        GROUP BY CAST(created_date AS DATE)
                        ORDER BY date
                    `;
                    break;
                    
                case '90days':
                    query = `
                        SELECT 
                            CAST(created_date AS DATE) as date,
                            COUNT(*) as calls,
                            SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) as errors
                        FROM API_Logs
                        WHERE created_date >= DATEADD(day, -90, GETDATE())
                        GROUP BY CAST(created_date AS DATE)
                        ORDER BY date
                    `;
                    break;
                    
                default:
                    throw new Error('Invalid period');
            }

            const result = await executeQuery(query, inputs);
            return result.recordset;
        } catch (error) {
            logger.error('Error getting API usage chart data:', error);
            return [];
        }
    }

    /**
     * Log API request
     */
    static async logRequest(requestData) {
        try {
            const query = `
                INSERT INTO API_Logs (
                    api_key_id, endpoint, method, request_body,
                    response_status, response_time_ms, ip_address,
                    user_agent, error_message
                ) VALUES (
                    @api_key_id, @endpoint, @method, @request_body,
                    @response_status, @response_time_ms, @ip_address,
                    @user_agent, @error_message
                )
            `;

            await executeQuery(query, requestData);
        } catch (error) {
            logger.error('Error logging API request:', error);
        }
    }

    /**
     * Get API usage by endpoint
     */
    static async getUsageByEndpoint(days = 7) {
        try {
            const query = `
                SELECT 
                    endpoint,
                    method,
                    COUNT(*) as count,
                    AVG(response_time_ms) as avg_response_time,
                    SUM(CASE WHEN response_status >= 200 AND response_status < 300 THEN 1 ELSE 0 END) as success_count,
                    SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) as error_count
                FROM API_Logs
                WHERE created_date >= DATEADD(day, @days, GETDATE())
                GROUP BY endpoint, method
                ORDER BY count DESC
            `;

            const result = await executeQuery(query, { days: -days });
            return result.recordset;
        } catch (error) {
            logger.error('Error getting usage by endpoint:', error);
            return [];
        }
    }

    /**
     * Get API key statistics
     */
    static async getApiKeyStats(apiKeyId) {
        try {
            const query = `
                SELECT 
                    ak.app_name,
                    ak.permissions,
                    COUNT(al.log_id) as total_requests,
                    AVG(al.response_time_ms) as avg_response_time,
                    SUM(CASE WHEN al.response_status >= 200 AND al.response_status < 300 THEN 1 ELSE 0 END) as success_count,
                    SUM(CASE WHEN al.response_status >= 400 THEN 1 ELSE 0 END) as error_count,
                    MAX(al.created_date) as last_used
                FROM API_Keys ak
                LEFT JOIN API_Logs al ON ak.api_key_id = al.api_key_id
                WHERE ak.api_key_id = @api_key_id
                GROUP BY ak.app_name, ak.permissions
            `;

            const result = await executeQuery(query, { api_key_id: apiKeyId });
            return result.recordset[0];
        } catch (error) {
            logger.error('Error getting API key stats:', error);
            return null;
        }
    }

    /**
     * Clean old logs
     */
    static async cleanOldLogs(daysToKeep = 90) {
        try {
            const query = `
                DELETE FROM API_Logs 
                WHERE created_date < DATEADD(day, @days, GETDATE())
            `;

            const result = await executeQuery(query, { days: -daysToKeep });
            logger.info(`Cleaned ${result.rowsAffected[0]} old API logs`);
            return result.rowsAffected[0];
        } catch (error) {
            logger.error('Error cleaning old logs:', error);
            return 0;
        }
    }
}

module.exports = ApiLogService;