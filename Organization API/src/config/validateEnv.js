// Path: /src/config/validateEnv.js
const logger = require('../utils/logger');

const requiredEnvVars = [
    'DB_SERVER',
    'DB_DATABASE',
    'DB_USER',
    'DB_PASSWORD',
    'SESSION_SECRET',
    'JWT_SECRET'
];

const validateEnv = () => {
    const missing = [];
    
    requiredEnvVars.forEach(varName => {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    });
    
    if (missing.length > 0) {
        const errorMessage = `Missing required environment variables: ${missing.join(', ')}`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
    }
    
    // Validate specific formats
    if (process.env.PORT && isNaN(process.env.PORT)) {
        throw new Error('PORT must be a number');
    }
    
    if (process.env.BCRYPT_ROUNDS && isNaN(process.env.BCRYPT_ROUNDS)) {
        throw new Error('BCRYPT_ROUNDS must be a number');
    }
    
    // Set defaults for optional variables
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';
    process.env.PORT = process.env.PORT || '3000';
    process.env.API_VERSION = process.env.API_VERSION || 'v1';
    process.env.API_PREFIX = process.env.API_PREFIX || '/api/v1';
    process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || '10';
    process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
    process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'info';
    process.env.LOG_DIR = process.env.LOG_DIR || 'logs';
    
    logger.info('Environment variables validated successfully');
};

module.exports = { validateEnv };