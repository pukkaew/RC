// Database connection service
const sql = require('mssql');
const dbConfig = require('../config/database');
const logger = require('../utils/Logger');

class DatabaseService {
  constructor() {
    this.pool = null;
    this.init();
  }

  async init() {
    try {
      this.pool = await dbConfig.createPool();
      logger.info('Database connection pool initialized');
    } catch (error) {
      logger.error('Failed to initialize database connection pool:', error);
      throw error;
    }
  }

  async getPool() {
    if (!this.pool) {
      await this.init();
    }
    return this.pool;
  }

  async executeQuery(query, params = []) {
    try {
      const pool = await this.getPool();
      const request = pool.request();
      
      // Add parameters to the request
      if (params && params.length > 0) {
        params.forEach(param => {
          request.input(param.name, param.type, param.value);
        });
      }
      
      // Execute the query
      const result = await request.query(query);
      return result;
    } catch (error) {
      logger.error('Database query error:', error);
      throw error;
    }
  }

  async executeStoredProcedure(procedureName, params = []) {
    try {
      const pool = await this.getPool();
      const request = pool.request();
      
      // Add parameters to the request
      if (params && params.length > 0) {
        params.forEach(param => {
          if (param.direction === 'OUTPUT') {
            request.output(param.name, param.type);
          } else {
            request.input(param.name, param.type, param.value);
          }
        });
      }
      
      // Execute the stored procedure
      const result = await request.execute(procedureName);
      return result;
    } catch (error) {
      logger.error(`Error executing stored procedure ${procedureName}:`, error);
      throw error;
    }
  }

  // Helper method for transactions
  async transaction(callback) {
    const pool = await this.getPool();
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      logger.error('Transaction error:', error);
      throw error;
    }
  }
}

// Create a singleton instance
const dbService = new DatabaseService();

module.exports = dbService;