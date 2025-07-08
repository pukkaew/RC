const sql = require('mssql');
const logger = require('../utils/logger');

// Database configuration
const config = {
    server: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 1433,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Connection pool
let pool = null;

// Get connection pool
async function getPool() {
    try {
        if (!pool) {
            pool = await sql.connect(config);
            logger.info('Database pool created');
            
            // Handle pool errors
            pool.on('error', err => {
                logger.error('Database pool error:', err);
                pool = null;
            });
        }
        return pool;
    } catch (error) {
        logger.error('Failed to create database pool:', error);
        throw error;
    }
}

// Execute query
async function query(sqlQuery, params = {}) {
    try {
        const pool = await getPool();
        const request = pool.request();
        
        // Add parameters
        Object.keys(params).forEach(key => {
            request.input(key, params[key]);
        });
        
        // Log query in development
        if (process.env.SHOW_SQL === 'true') {
            logger.debug(`SQL: ${sqlQuery}`);
            logger.debug(`Params: ${JSON.stringify(params)}`);
        }
        
        const result = await request.query(sqlQuery);
        return result;
    } catch (error) {
        logger.error('Query error:', error);
        throw error;
    }
}

// Execute stored procedure
async function execute(procedureName, params = {}) {
    try {
        const pool = await getPool();
        const request = pool.request();
        
        // Add parameters
        Object.keys(params).forEach(key => {
            request.input(key, params[key]);
        });
        
        const result = await request.execute(procedureName);
        return result;
    } catch (error) {
        logger.error('Stored procedure error:', error);
        throw error;
    }
}

// Transaction helper
async function transaction(callback) {
    const pool = await getPool();
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
}

// Test connection
async function testConnection() {
    try {
        const pool = await getPool();
        await pool.request().query('SELECT 1 as test');
        logger.info('Database connection test successful');
        return true;
    } catch (error) {
        logger.error('Database connection test failed:', error);
        return false;
    }
}

// Close connection pool
async function close() {
    try {
        if (pool) {
            await pool.close();
            pool = null;
            logger.info('Database pool closed');
        }
    } catch (error) {
        logger.error('Error closing database pool:', error);
    }
}

// Helper functions
const helpers = {
    // Escape SQL identifiers
    escapeIdentifier(identifier) {
        return `[${identifier.replace(/\]/g, ']]')}]`;
    },
    
    // Build WHERE clause
    buildWhereClause(conditions) {
        const clauses = [];
        const params = {};
        
        Object.keys(conditions).forEach((key, index) => {
            if (conditions[key] !== null && conditions[key] !== undefined) {
                clauses.push(`${this.escapeIdentifier(key)} = @param${index}`);
                params[`param${index}`] = conditions[key];
            }
        });
        
        return {
            clause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
            params
        };
    },
    
    // Build pagination
    buildPagination(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        return `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
    },
    
    // Format date for SQL
    formatDate(date) {
        return date ? new Date(date).toISOString() : null;
    }
};

module.exports = {
    sql,
    getPool,
    query,
    execute,
    transaction,
    testConnection,
    close,
    helpers
};