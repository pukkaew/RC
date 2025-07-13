// src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');
const logger = require('../utils/logger');

// Create Redis client for rate limiting (optional - falls back to memory if not available)
let redisClient;
try {
    redisClient = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
    });
    
    redisClient.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        redisClient = null; // Fall back to memory store
    });
} catch (error) {
    logger.warn('Redis not available, using memory store for rate limiting');
}

/**
 * Create rate limiter with custom options
 */
function createRateLimiter(options = {}) {
    const defaults = {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        handler: (req, res) => {
            logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
            res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: options.message || defaults.message,
                    retryAfter: req.rateLimit.resetTime
                }
            });
        }
    };

    const config = { ...defaults, ...options };

    // Use Redis store if available
    if (redisClient && options.useRedis !== false) {
        config.store = new RedisStore({
            client: redisClient,
            prefix: options.prefix || 'rl:'
        });
    }

    return rateLimit(config);
}

/**
 * Rate limiters for different endpoints
 */
const rateLimiters = {
    // Strict limit for authentication endpoints
    auth: createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 login attempts per 15 minutes
        message: 'Too many login attempts, please try again later.',
        prefix: 'rl:auth:',
        skipSuccessfulRequests: true // Don't count successful logins
    }),

    // API general endpoints
    api: createRateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'API rate limit exceeded. Please upgrade your plan for higher limits.',
        prefix: 'rl:api:',
        keyGenerator: (req) => {
            // Use API key if available, otherwise IP
            return req.headers['x-api-key'] || req.ip;
        }
    }),

    // Strict limit for write operations
    apiWrite: createRateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 30, // 30 write operations per 15 minutes
        message: 'Too many write operations. Please wait before making more changes.',
        prefix: 'rl:api:write:',
        keyGenerator: (req) => {
            return req.headers['x-api-key'] || req.ip;
        }
    }),

    // Search endpoints (more permissive)
    search: createRateLimiter({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 30, // 30 searches per minute
        message: 'Too many search requests. Please wait a moment.',
        prefix: 'rl:search:'
    }),

    // File upload endpoints
    upload: createRateLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10, // 10 uploads per hour
        message: 'Upload limit exceeded. Please try again later.',
        prefix: 'rl:upload:'
    }),

    // Export endpoints
    export: createRateLimiter({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 20, // 20 exports per hour
        message: 'Export limit exceeded. Please try again later.',
        prefix: 'rl:export:'
    }),

    // Public endpoints (most permissive)
    public: createRateLimiter({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 60, // 60 requests per minute
        message: 'Too many requests. Please slow down.',
        prefix: 'rl:public:'
    })
};

/**
 * Dynamic rate limiter based on API key tier
 */
function createDynamicApiLimiter() {
    return async (req, res, next) => {
        const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
        
        if (!apiKey) {
            // Use default rate limit for unauthenticated requests
            return rateLimiters.api(req, res, next);
        }

        // Get API key tier from request (set by apiAuth middleware)
        const tier = req.apiAuth?.tier || 'basic';
        
        // Define limits based on tier
        const tierLimits = {
            basic: { windowMs: 15 * 60 * 1000, max: 100 },
            standard: { windowMs: 15 * 60 * 1000, max: 500 },
            premium: { windowMs: 15 * 60 * 1000, max: 2000 },
            enterprise: { windowMs: 15 * 60 * 1000, max: 10000 }
        };

        const limits = tierLimits[tier] || tierLimits.basic;
        
        // Create tier-specific limiter
        const tierLimiter = createRateLimiter({
            ...limits,
            prefix: `rl:api:${tier}:`,
            keyGenerator: () => apiKey,
            message: `API rate limit exceeded for ${tier} tier. Current limit: ${limits.max} requests per ${limits.windowMs / 60000} minutes.`
        });

        return tierLimiter(req, res, next);
    };
}

/**
 * Skip rate limiting for whitelisted IPs or API keys
 */
function skipRateLimitForWhitelist(req) {
    const whitelist = {
        ips: (process.env.RATE_LIMIT_WHITELIST_IPS || '').split(',').filter(Boolean),
        apiKeys: (process.env.RATE_LIMIT_WHITELIST_API_KEYS || '').split(',').filter(Boolean)
    };

    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    return whitelist.ips.includes(req.ip) || whitelist.apiKeys.includes(apiKey);
}

/**
 * Middleware to apply different rate limiters based on route
 */
function applyRateLimiting(req, res, next) {
    // Skip for whitelisted IPs/keys
    if (skipRateLimitForWhitelist(req)) {
        return next();
    }

    const path = req.path.toLowerCase();
    const method = req.method.toUpperCase();

    // Authentication endpoints
    if (path.includes('/login') || path.includes('/auth')) {
        return rateLimiters.auth(req, res, next);
    }

    // API write operations
    if (path.startsWith('/api') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        return rateLimiters.apiWrite(req, res, next);
    }

    // Search endpoints
    if (path.includes('/search')) {
        return rateLimiters.search(req, res, next);
    }

    // Upload endpoints
    if (path.includes('/upload') || path.includes('/import')) {
        return rateLimiters.upload(req, res, next);
    }

    // Export endpoints
    if (path.includes('/export') || path.includes('/download')) {
        return rateLimiters.export(req, res, next);
    }

    // API endpoints (use dynamic limiter)
    if (path.startsWith('/api')) {
        return createDynamicApiLimiter()(req, res, next);
    }

    // Default to public rate limit
    return rateLimiters.public(req, res, next);
}

/**
 * Get rate limit status for a key
 */
async function getRateLimitStatus(key, limiterName = 'api') {
    if (!redisClient) {
        return null;
    }

    try {
        const prefix = `rl:${limiterName}:`;
        const redisKey = `${prefix}${key}`;
        
        const [count, ttl] = await Promise.all([
            redisClient.get(redisKey),
            redisClient.ttl(redisKey)
        ]);

        return {
            count: parseInt(count) || 0,
            remaining: rateLimiters[limiterName].max - (parseInt(count) || 0),
            resetTime: ttl > 0 ? Date.now() + (ttl * 1000) : null
        };
    } catch (error) {
        logger.error('Error getting rate limit status:', error);
        return null;
    }
}

/**
 * Reset rate limit for a key
 */
async function resetRateLimit(key, limiterName = 'api') {
    if (!redisClient) {
        return false;
    }

    try {
        const prefix = `rl:${limiterName}:`;
        const redisKey = `${prefix}${key}`;
        
        await redisClient.del(redisKey);
        logger.info(`Rate limit reset for key: ${key} in limiter: ${limiterName}`);
        return true;
    } catch (error) {
        logger.error('Error resetting rate limit:', error);
        return false;
    }
}

module.exports = {
    createRateLimiter,
    rateLimiters,
    createDynamicApiLimiter,
    applyRateLimiting,
    getRateLimitStatus,
    resetRateLimit
};