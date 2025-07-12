const sql = require('mssql');
const logger = require('../utils/logger');

// Database configuration
const config = {
    server: process.env.DB_SERVER || 'localhost',
    port: parseInt(process.env.DB_PORT) || 1433,
    database: process.env.DB_NAME || 'OrgStructureDB',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
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
let pool;

// Connect to database
async function connectDatabase() {
    try {
        pool = await sql.connect(config);
        logger.info('Database connection established');
        return pool;
    } catch (error) {
        logger.error('Database connection failed:', error);
        throw error;
    }
}

// Get connection pool
function getPool() {
    if (!pool) {
        throw new Error('Database not connected. Call connectDatabase() first.');
    }
    return pool;
}

// Close database connection
async function closeDatabase() {
    try {
        if (pool) {
            await pool.close();
            logger.info('Database connection closed');
        }
    } catch (error) {
        logger.error('Error closing database connection:', error);
        throw error;
    }
}

// Execute query
async function executeQuery(query, inputs = {}) {
    try {
        const pool = getPool();
        const request = pool.request();
        
        // Add inputs
        Object.keys(inputs).forEach(key => {
            request.input(key, inputs[key]);
        });
        
        const result = await request.query(query);
        return result;
    } catch (error) {
        logger.error('Query execution failed:', error);
        throw error;
    }
}

// Execute stored procedure
async function executeProcedure(procedureName, inputs = {}, outputs = {}) {
    try {
        const pool = getPool();
        const request = pool.request();
        
        // Add inputs
        Object.keys(inputs).forEach(key => {
            request.input(key, inputs[key]);
        });
        
        // Add outputs
        Object.keys(outputs).forEach(key => {
            request.output(key, outputs[key]);
        });
        
        const result = await request.execute(procedureName);
        return result;
    } catch (error) {
        logger.error('Stored procedure execution failed:', error);
        throw error;
    }
}

// Transaction helper
async function executeTransaction(callback) {
    const pool = getPool();
    const transaction = new sql.Transaction(pool);
    
    try {
        await transaction.begin();
        const result = await callback(transaction);
        await transaction.commit();
        return result;
    } catch (error) {
        await transaction.rollback();
        logger.error('Transaction failed:', error);
        throw error;
    }
}

module.exports = {
    sql,
    connectDatabase,
    getPool,
    closeDatabase,
    executeQuery,
    executeProcedure,
    executeTransaction
};