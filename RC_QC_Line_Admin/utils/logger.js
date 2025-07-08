// Path: RC_QC_Line_Admin/utils/logger.js
// Winston logger configuration for application logging

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Create logs directory if not exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'rc-qc-admin' },
    transports: [
        // Console output
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
            silent: process.env.NODE_ENV === 'test'
        }),
        
        // Application log file (rotated daily)
        new DailyRotateFile({
            filename: path.join(logsDir, 'application-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: process.env.LOG_MAX_SIZE || '20m',
            maxFiles: process.env.LOG_MAX_FILES || '14d',
            level: 'info'
        }),
        
        // Error log file (rotated daily)
        new DailyRotateFile({
            filename: path.join(logsDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: process.env.LOG_MAX_SIZE || '20m',
            maxFiles: process.env.LOG_MAX_FILES || '14d',
            level: 'error'
        }),
        
        // Audit log file (rotated daily)
        new DailyRotateFile({
            filename: path.join(logsDir, 'audit-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: process.env.LOG_MAX_SIZE || '20m',
            maxFiles: process.env.LOG_MAX_FILES || '14d',
            level: 'info',
            filter: (log) => log.isAudit === true
        })
    ],
    
    // Handle exceptions
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log')
        })
    ],
    
    // Handle rejections
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log')
        })
    ]
});

// Custom logging methods
logger.logError = (error, req = null, additionalData = {}) => {
    const errorData = {
        message: error.message,
        stack: error.stack,
        code: error.code || 'UNKNOWN',
        ...additionalData
    };
    
    if (req) {
        errorData.request = {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            user: req.session?.user?.employee_id || 'anonymous'
        };
    }
    
    logger.error('Application Error', errorData);
};

logger.logAudit = (action, data = {}) => {
    logger.info('Audit Log', {
        isAudit: true,
        action,
        ...data
    });
};

logger.logSecurity = (event, req = null, additionalData = {}) => {
    const securityData = {
        event,
        ...additionalData
    };
    
    if (req) {
        securityData.request = {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            user: req.session?.user?.employee_id || 'anonymous'
        };
    }
    
    logger.warn('Security Event', securityData);
};

// Export logger
module.exports = logger;