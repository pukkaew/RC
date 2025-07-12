const logger = require('../utils/logger');

// Required environment variables
const requiredEnvVars = [
    'DB_SERVER',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'SESSION_SECRET',
    'JWT_SECRET',
    'API_KEY_SECRET'
];

// Optional but recommended environment variables
const recommendedEnvVars = [
    'NODE_ENV',
    'PORT',
    'CORS_ORIGIN',
    'LOG_LEVEL',
    'RATE_LIMIT_WINDOW_MS',
    'RATE_LIMIT_MAX_REQUESTS'
];

function validateEnv() {
    const missingRequired = [];
    const missingRecommended = [];
    
    // Check required variables
    requiredEnvVars.forEach(varName => {
        if (!process.env[varName]) {
            missingRequired.push(varName);
        }
    });
    
    // Check recommended variables
    recommendedEnvVars.forEach(varName => {
        if (!process.env[varName]) {
            missingRecommended.push(varName);
        }
    });
    
    // Log warnings for recommended variables
    if (missingRecommended.length > 0) {
        logger.warn(`Missing recommended environment variables: ${missingRecommended.join(', ')}`);
    }
    
    // Throw error for required variables
    if (missingRequired.length > 0) {
        throw new Error(`Missing required environment variables: ${missingRequired.join(', ')}`);
    }
    
    // Validate specific values
    if (process.env.NODE_ENV && !['development', 'test', 'production'].includes(process.env.NODE_ENV)) {
        throw new Error('NODE_ENV must be one of: development, test, production');
    }
    
    if (process.env.PORT && isNaN(parseInt(process.env.PORT))) {
        throw new Error('PORT must be a valid number');
    }
    
    // Security checks
    if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
        logger.warn('SESSION_SECRET should be at least 32 characters long for security');
    }
    
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        logger.warn('JWT_SECRET should be at least 32 characters long for security');
    }
    
    logger.info('Environment variables validated successfully');
}

module.exports = { validateEnv };