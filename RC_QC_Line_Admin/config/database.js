// Path: RC_QC_Line_Admin/config/database.js
// Database configuration and connection management

const sql = require('mssql');
const logger = require('../utils/logger');

// Database configuration
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    server: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 1433,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        enableArithAbort: true
    }
};

// Connection pool
let pool = null;

// Connect to database
const connect = async () => {
    try {
        if (!pool) {
            pool = await sql.connect(config);
            logger.info('Database connection pool created');
        }
        return pool;
    } catch (error) {
        logger.error('Database connection failed:', error);
        throw error;
    }
};

// Close connection
const close = async () => {
    try {
        if (pool) {
            await pool.close();
            pool = null;
            logger.info('Database connection pool closed');
        }
    } catch (error) {
        logger.error('Error closing database connection:', error);
        throw error;
    }
};

// Execute query
const query = async (text, params = {}) => {
    try {
        const pool = await connect();
        const request = pool.request();
        
        // Add parameters
        Object.keys(params).forEach(key => {
            const value = params[key];
            if (value === null || value === undefined) {
                request.input(key, sql.NVarChar, null);
            } else if (typeof value === 'number') {
                if (Number.isInteger(value)) {
                    request.input(key, sql.Int, value);
                } else {
                    request.input(key, sql.Float, value);
                }
            } else if (value instanceof Date) {
                request.input(key, sql.DateTime, value);
            } else if (typeof value === 'boolean') {
                request.input(key, sql.Bit, value);
            } else {
                request.input(key, sql.NVarChar, value.toString());
            }
        });
        
        // Log query in development
        if (process.env.NODE_ENV === 'development' && process.env.SHOW_SQL === 'true') {
            logger.debug('SQL Query:', text);
            logger.debug('Parameters:', params);
        }
        
        const result = await request.query(text);
        return result;
    } catch (error) {
        logger.error('Query error:', error);
        logger.error('Query:', text);
        logger.error('Parameters:', params);
        throw error;
    }
};

// Transaction support
const transaction = async (callback) => {
    const pool = await connect();
    const transaction = new sql.Transaction(pool);
    
    try {
        await transaction.begin();
        const result = await callback(transaction);
        await transaction.commit();
        return result;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

// Health check
const isHealthy = async () => {
    try {
        const result = await query('SELECT 1 as healthy');
        return result.recordset[0].healthy === 1;
    } catch (error) {
        return false;
    }
};

module.exports = {
    connect,
    close,
    query,
    transaction,
    isHealthy,
    sql // Export mssql types
};