// config/constants.js
// Application constants and configuration values

module.exports = {
    // User roles
    ROLES: {
        VIEWER: 'viewer',
        MANAGER: 'manager',
        ADMIN: 'admin'
    },

    // Role hierarchy for permission checking
    ROLE_HIERARCHY: {
        viewer: 0,
        manager: 1,
        admin: 2
    },

    // Action types for audit logs
    AUDIT_ACTIONS: {
        // Authentication
        LOGIN_SUCCESS: 'LOGIN_SUCCESS',
        LOGIN_FAILED: 'LOGIN_FAILED',
        LOGOUT: 'LOGOUT',
        SESSION_EXPIRED: 'SESSION_EXPIRED',
        
        // Lot operations
        LOT_VIEW: 'LOT_VIEW',
        LOT_UPDATE: 'LOT_UPDATE',
        LOT_DELETE: 'LOT_DELETE',
        
        // Image operations
        IMAGE_VIEW: 'IMAGE_VIEW',
        IMAGE_DOWNLOAD: 'IMAGE_DOWNLOAD',
        IMAGE_DELETE: 'IMAGE_DELETE',
        IMAGE_BULK_DELETE: 'IMAGE_BULK_DELETE',
        
        // User management
        USER_CREATE: 'USER_CREATE',
        USER_UPDATE: 'USER_UPDATE',
        USER_DELETE: 'USER_DELETE',
        USER_ACTIVATE: 'USER_ACTIVATE',
        USER_DEACTIVATE: 'USER_DEACTIVATE',
        
        // Reports
        REPORT_GENERATE: 'REPORT_GENERATE',
        REPORT_EXPORT: 'REPORT_EXPORT'
    },

    // Entity types for audit logs
    ENTITY_TYPES: {
        USER: 'USER',
        LOT: 'LOT',
        IMAGE: 'IMAGE',
        REPORT: 'REPORT',
        SYSTEM: 'SYSTEM'
    },

    // Pagination defaults
    PAGINATION: {
        DEFAULT_PAGE: 1,
        DEFAULT_LIMIT: 20,
        MAX_LIMIT: 100,
        LIMITS: [10, 20, 50, 100]
    },

    // File upload constraints
    FILE_UPLOAD: {
        MAX_SIZE: 10 * 1024 * 1024, // 10MB
        ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
        ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif']
    },

    // Session configuration
    SESSION: {
        TIMEOUT: 30 * 60 * 1000, // 30 minutes in milliseconds
        CHECK_INTERVAL: 5 * 60 * 1000, // Check every 5 minutes
        MAX_AGE: 24 * 60 * 60 * 1000 // 24 hours
    },

    // Password requirements
    PASSWORD: {
        MIN_LENGTH: 8,
        REQUIRE_UPPERCASE: true,
        REQUIRE_LOWERCASE: true,
        REQUIRE_NUMBER: true,
        REQUIRE_SPECIAL: true,
        SPECIAL_CHARS: '!@#$%^&*',
        SALT_ROUNDS: 10
    },

    // Login security
    LOGIN_SECURITY: {
        MAX_ATTEMPTS: 5,
        LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
        ATTEMPT_WINDOW: 15 * 60 * 1000 // 15 minutes
    },

    // Date/Time formats
    DATETIME: {
        DATE_FORMAT: 'DD/MM/YYYY',
        TIME_FORMAT: 'HH:mm',
        DATETIME_FORMAT: 'DD/MM/YYYY HH:mm',
        DATE_FORMAT_EN: 'MM/DD/YYYY',
        TIME_FORMAT_EN: 'hh:mm A',
        DATETIME_FORMAT_EN: 'MM/DD/YYYY hh:mm A'
    },

    // Audit log retention
    AUDIT_LOG: {
        RETENTION_DAYS: 90,
        BATCH_SIZE: 1000
    },

    // Soft delete retention
    SOFT_DELETE: {
        RETENTION_DAYS: 30
    },

    // Export limits
    EXPORT: {
        MAX_RECORDS: 10000,
        BATCH_SIZE: 1000
    },

    // API rate limits
    RATE_LIMITS: {
        WINDOW_MS: 15 * 60 * 1000, // 15 minutes
        MAX_REQUESTS: 100,
        LOGIN_MAX_REQUESTS: 5
    },

    // Error codes
    ERROR_CODES: {
        E001: 'Database connection failed',
        E002: 'Invalid credentials',
        E003: 'Session expired',
        E004: 'Insufficient permissions',
        E005: 'Record not found',
        E006: 'Duplicate entry',
        E007: 'File not found',
        E008: 'Invalid file format',
        E009: 'Operation timeout',
        E010: 'System error'
    },

    // HTTP status codes
    HTTP_STATUS: {
        OK: 200,
        CREATED: 201,
        NO_CONTENT: 204,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        UNPROCESSABLE_ENTITY: 422,
        TOO_MANY_REQUESTS: 429,
        INTERNAL_SERVER_ERROR: 500,
        SERVICE_UNAVAILABLE: 503
    },

    // Supported languages
    LANGUAGES: {
        'th-TH': {
            code: 'th-TH',
            name: 'ภาษาไทย',
            nameEn: 'Thai',
            flag: '🇹🇭',
            default: true
        },
        'en-US': {
            code: 'en-US',
            name: 'English',
            nameEn: 'English',
            flag: '🇺🇸',
            default: false
        }
    },

    // Image processing
    IMAGE: {
        THUMBNAIL_WIDTH: 200,
        THUMBNAIL_HEIGHT: 200,
        COMPRESSION_QUALITY: 85,
        LAZY_LOAD_BATCH: 20
    },

    // Report types
    REPORT_TYPES: {
        DAILY_SUMMARY: 'daily_summary',
        LOT_SUMMARY: 'lot_summary',
        USER_ACTIVITY: 'user_activity',
        SYSTEM_AUDIT: 'system_audit'
    },

    // Cache configuration
    CACHE: {
        TTL_SHORT: 5 * 60, // 5 minutes
        TTL_MEDIUM: 30 * 60, // 30 minutes
        TTL_LONG: 24 * 60 * 60 // 24 hours
    },

    // File paths
    PATHS: {
        UPLOADS: 'public/uploads',
        TEMP: 'temp',
        LOGS: 'logs',
        EXPORTS: 'exports'
    },

    // Environment configurations
    ENV: {
        DEVELOPMENT: 'development',
        PRODUCTION: 'production',
        TEST: 'test'
    },

    // Default values
    DEFAULTS: {
        TIMEZONE: 'Asia/Bangkok',
        LOCALE: 'th-TH',
        CURRENCY: 'THB'
    }
};