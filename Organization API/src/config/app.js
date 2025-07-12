// Application configuration

module.exports = {
    app: {
        name: process.env.APP_NAME || 'Organization Structure Management System',
        version: '1.0.0',
        env: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT) || 3000,
        apiPort: parseInt(process.env.API_PORT) || 3001,
    },
    
    database: {
        server: process.env.DB_SERVER || 'localhost',
        port: parseInt(process.env.DB_PORT) || 1433,
        database: process.env.DB_NAME || 'OrgStructureDB',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        options: {
            encrypt: process.env.DB_ENCRYPT === 'true',
            trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
        }
    },
    
    security: {
        jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-key',
        apiKeySecret: process.env.API_KEY_SECRET || 'your-api-key-secret',
        sessionSecret: process.env.SESSION_SECRET || 'your-session-secret',
        saltRounds: 10
    },
    
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    },
    
    pagination: {
        defaultLimit: parseInt(process.env.DEFAULT_PAGE_SIZE) || 20,
        maxLimit: parseInt(process.env.MAX_PAGE_SIZE) || 100
    },
    
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: process.env.CORS_CREDENTIALS === 'true'
    },
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: {
            path: process.env.LOG_FILE_PATH || 'logs/app.log',
            maxSize: process.env.LOG_MAX_SIZE || '10m',
            maxFiles: process.env.LOG_MAX_FILES || '14d'
        }
    },
    
    cache: {
        ttl: parseInt(process.env.CACHE_TTL) || 3600 // 1 hour
    }
};