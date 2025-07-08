const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6
};

// Define log colors
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    verbose: 'cyan',
    debug: 'blue',
    silly: 'gray'
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Define log format for console
const consoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
    })
);

// Create logs directory if it doesn't exist
const logsDir = process.env.LOG_FILE_PATH || './logs';

// Define transports
const transports = [];

// Console transport
if (process.env.NODE_ENV !== 'production') {
    transports.push(
        new winston.transports.Console({
            format: consoleFormat,
            level: process.env.LOG_LEVEL || 'debug'
        })
    );
}

// File transport for all logs
transports.push(
    new DailyRotateFile({
        filename: path.join(logsDir, 'application-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: process.env.LOG_MAX_SIZE || '20m',
        maxFiles: process.env.LOG_MAX_FILES || '14d',
        format,
        level: process.env.LOG_LEVEL || 'info'
    })
);

// File transport for errors only
transports.push(
    new DailyRotateFile({
        filename: path.join(logsDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: process.env.LOG_MAX_SIZE || '20m',
        maxFiles: process.env.LOG_MAX_FILES || '14d',
        format,
        level: 'error'
    })
);

// Create logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels,
    format,
    transports,
    exitOnError: false
});

// Create a stream object for Morgan
logger.stream = {
    write: (message) => {
        logger.http(message.trim());
    }
};

// Helper functions for specific log types
logger.logRequest = (req, additionalInfo = {}) => {
    logger.http('Request', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.session?.user?.admin_id,
        ...additionalInfo
    });
};

logger.logError = (error, req = null, additionalInfo = {}) => {
    const errorInfo = {
        message: error.message,
        stack: error.stack,
        code: error.code,
        ...additionalInfo
    };
    
    if (req) {
        errorInfo.request = {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userId: req.session?.user?.admin_id
        };
    }
    
    logger.error('Error occurred', errorInfo);
};

logger.logSecurity = (event, req, additionalInfo = {}) => {
    logger.warn(`Security: ${event}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.session?.user?.admin_id,
        url: req.originalUrl,
        ...additionalInfo
    });
};

logger.logDatabase = (operation, query, params = {}, duration = null) => {
    const logData = {
        operation,
        query: query.substring(0, 1000), // Truncate long queries
        params: Object.keys(params).length > 0 ? params : undefined,
        duration: duration ? `${duration}ms` : undefined
    };
    
    logger.debug('Database operation', logData);
};

logger.logAudit = (action, userId, details = {}) => {
    logger.info(`Audit: ${action}`, {
        userId,
        action,
        timestamp: new Date().toISOString(),
        ...details
    });
};

// Export logger
module.exports = logger;