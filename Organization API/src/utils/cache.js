// src/utils/cache.js
const NodeCache = require('node-cache');
const redis = require('redis');
const { promisify } = require('util');
const logger = require('./logger');

class CacheManager {
    constructor() {
        this.cacheType = process.env.CACHE_TYPE || 'memory'; // 'memory' or 'redis'
        this.defaultTTL = parseInt(process.env.CACHE_TTL) || 3600; // 1 hour default
        
        if (this.cacheType === 'redis') {
            this.initRedis();
        } else {
            this.initMemoryCache();
        }
    }

    initMemoryCache() {
        this.cache = new NodeCache({
            stdTTL: this.defaultTTL,
            checkperiod: 120, // Check for expired keys every 2 minutes
            useClones: false // For better performance
        });

        this.cache.on('expired', (key, value) => {
            logger.debug(`Cache expired: ${key}`);
        });

        logger.info('Memory cache initialized');
    }

    initRedis() {
        try {
            this.client = redis.createClient({
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD,
                db: process.env.REDIS_DB || 0
            });

            // Promisify Redis methods
            this.redisGet = promisify(this.client.get).bind(this.client);
            this.redisSet = promisify(this.client.setex).bind(this.client);
            this.redisDel = promisify(this.client.del).bind(this.client);
            this.redisKeys = promisify(this.client.keys).bind(this.client);
            this.redisExists = promisify(this.client.exists).bind(this.client);
            this.redisTTL = promisify(this.client.ttl).bind(this.client);

            this.client.on('error', (err) => {
                logger.error('Redis Client Error:', err);
                // Fall back to memory cache
                this.cacheType = 'memory';
                this.initMemoryCache();
            });

            this.client.on('connect', () => {
                logger.info('Redis cache connected');
            });
        } catch (error) {
            logger.error('Failed to initialize Redis:', error);
            // Fall back to memory cache
            this.cacheType = 'memory';
            this.initMemoryCache();
        }
    }

    /**
     * Get value from cache
     * @param {string} key - Cache key
     * @returns {Promise<any>} - Cached value or null
     */
    async get(key) {
        try {
            if (this.cacheType === 'redis') {
                const value = await this.redisGet(key);
                return value ? JSON.parse(value) : null;
            } else {
                return this.cache.get(key) || null;
            }
        } catch (error) {
            logger.error(`Cache get error for key ${key}:`, error);
            return null;
        }
    }

    /**
     * Set value in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in seconds (optional)
     * @returns {Promise<boolean>} - Success status
     */
    async set(key, value, ttl = null) {
        try {
            const ttlSeconds = ttl || this.defaultTTL;
            
            if (this.cacheType === 'redis') {
                await this.redisSet(key, ttlSeconds, JSON.stringify(value));
            } else {
                this.cache.set(key, value, ttlSeconds);
            }
            
            logger.debug(`Cache set: ${key} (TTL: ${ttlSeconds}s)`);
            return true;
        } catch (error) {
            logger.error(`Cache set error for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Delete value from cache
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} - Success status
     */
    async delete(key) {
        try {
            if (this.cacheType === 'redis') {
                await this.redisDel(key);
            } else {
                this.cache.del(key);
            }
            
            logger.debug(`Cache deleted: ${key}`);
            return true;
        } catch (error) {
            logger.error(`Cache delete error for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Delete all keys matching a pattern
     * @param {string} pattern - Pattern to match (e.g., 'user:*')
     * @returns {Promise<number>} - Number of keys deleted
     */
    async deletePattern(pattern) {
        try {
            let deletedCount = 0;
            
            if (this.cacheType === 'redis') {
                const keys = await this.redisKeys(pattern);
                if (keys.length > 0) {
                    deletedCount = await this.redisDel(...keys);
                }
            } else {
                const keys = this.cache.keys();
                const regex = new RegExp(pattern.replace('*', '.*'));
                
                keys.forEach(key => {
                    if (regex.test(key)) {
                        this.cache.del(key);
                        deletedCount++;
                    }
                });
            }
            
            logger.debug(`Cache pattern deleted: ${pattern} (${deletedCount} keys)`);
            return deletedCount;
        } catch (error) {
            logger.error(`Cache delete pattern error for ${pattern}:`, error);
            return 0;
        }
    }

    /**
     * Check if key exists
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} - Existence status
     */
    async exists(key) {
        try {
            if (this.cacheType === 'redis') {
                return await this.redisExists(key) === 1;
            } else {
                return this.cache.has(key);
            }
        } catch (error) {
            logger.error(`Cache exists error for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Get remaining TTL for a key
     * @param {string} key - Cache key
     * @returns {Promise<number>} - TTL in seconds or -1 if no TTL
     */
    async getTTL(key) {
        try {
            if (this.cacheType === 'redis') {
                return await this.redisTTL(key);
            } else {
                return this.cache.getTtl(key) || -1;
            }
        } catch (error) {
            logger.error(`Cache TTL error for key ${key}:`, error);
            return -1;
        }
    }

    /**
     * Clear all cache
     * @returns {Promise<boolean>} - Success status
     */
    async clear() {
        try {
            if (this.cacheType === 'redis') {
                await this.client.flushdb();
            } else {
                this.cache.flushAll();
            }
            
            logger.info('Cache cleared');
            return true;
        } catch (error) {
            logger.error('Cache clear error:', error);
            return false;
        }
    }

    /**
     * Get cache statistics
     * @returns {Promise<object>} - Cache statistics
     */
    async getStats() {
        try {
            if (this.cacheType === 'redis') {
                const info = await promisify(this.client.info).bind(this.client)();
                const keys = await this.redisKeys('*');
                
                return {
                    type: 'redis',
                    keys: keys.length,
                    info: info
                };
            } else {
                return {
                    type: 'memory',
                    keys: this.cache.keys().length,
                    stats: this.cache.getStats()
                };
            }
        } catch (error) {
            logger.error('Cache stats error:', error);
            return { error: error.message };
        }
    }

    /**
     * Wrap a function with caching
     * @param {string} keyPrefix - Cache key prefix
     * @param {Function} fn - Function to wrap
     * @param {number} ttl - TTL in seconds
     * @returns {Function} - Wrapped function
     */
    wrap(keyPrefix, fn, ttl = null) {
        return async (...args) => {
            // Create cache key from prefix and arguments
            const key = `${keyPrefix}:${JSON.stringify(args)}`;
            
            // Try to get from cache
            const cached = await this.get(key);
            if (cached !== null) {
                logger.debug(`Cache hit: ${key}`);
                return cached;
            }
            
            // Execute function and cache result
            logger.debug(`Cache miss: ${key}`);
            const result = await fn(...args);
            
            // Only cache non-null results
            if (result !== null && result !== undefined) {
                await this.set(key, result, ttl);
            }
            
            return result;
        };
    }

    /**
     * Invalidate cache for specific entity types
     * @param {string} entityType - Entity type (company, branch, division, department)
     * @param {string} entityCode - Entity code (optional)
     */
    async invalidateEntity(entityType, entityCode = null) {
        const patterns = {
            company: [
                entityCode ? `company:${entityCode}:*` : 'company:*',
                'companies:*',
                'organization-tree:*'
            ],
            branch: [
                entityCode ? `branch:${entityCode}:*` : 'branch:*',
                'branches:*',
                'company:*:branches',
                'organization-tree:*'
            ],
            division: [
                entityCode ? `division:${entityCode}:*` : 'division:*',
                'divisions:*',
                'company:*:divisions',
                'branch:*:divisions',
                'organization-tree:*'
            ],
            department: [
                entityCode ? `department:${entityCode}:*` : 'department:*',
                'departments:*',
                'division:*:departments',
                'organization-tree:*'
            ]
        };

        const patternsToDelete = patterns[entityType] || [`${entityType}:*`];
        
        for (const pattern of patternsToDelete) {
            await this.deletePattern(pattern);
        }
        
        logger.info(`Cache invalidated for ${entityType}${entityCode ? ` ${entityCode}` : ''}`);
    }

    /**
     * Batch get multiple keys
     * @param {string[]} keys - Array of cache keys
     * @returns {Promise<object>} - Object with key-value pairs
     */
    async mget(keys) {
        const results = {};
        
        if (this.cacheType === 'redis') {
            // Redis MGET command
            const values = await promisify(this.client.mget).bind(this.client)(...keys);
            keys.forEach((key, index) => {
                results[key] = values[index] ? JSON.parse(values[index]) : null;
            });
        } else {
            // Memory cache batch get
            for (const key of keys) {
                results[key] = this.cache.get(key) || null;
            }
        }
        
        return results;
    }

    /**
     * Batch set multiple key-value pairs
     * @param {object} items - Object with key-value pairs
     * @param {number} ttl - TTL in seconds
     * @returns {Promise<boolean>} - Success status
     */
    async mset(items, ttl = null) {
        try {
            const promises = Object.entries(items).map(([key, value]) => 
                this.set(key, value, ttl)
            );
            
            await Promise.all(promises);
            return true;
        } catch (error) {
            logger.error('Cache mset error:', error);
            return false;
        }
    }
}

// Create singleton instance
const cacheManager = new CacheManager();

// Helper functions for common cache operations
const cacheHelpers = {
    /**
     * Cache for paginated results
     */
    paginatedKey: (entity, page = 1, limit = 20, filters = {}) => {
        const filterString = Object.entries(filters)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}:${v}`)
            .join(':');
        
        return `${entity}:paginated:${page}:${limit}:${filterString}`;
    },

    /**
     * Cache for entity lists
     */
    listKey: (entity, filters = {}) => {
        const filterString = Object.entries(filters)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}:${v}`)
            .join(':');
        
        return `${entity}:list:${filterString}`;
    },

    /**
     * Cache for single entity
     */
    entityKey: (entity, code) => `${entity}:${code}`,

    /**
     * Cache for statistics
     */
    statsKey: (entity, code = null) => 
        code ? `${entity}:${code}:stats` : `${entity}:stats`,

    /**
     * Cache for search results
     */
    searchKey: (query, type = null) => 
        type ? `search:${type}:${query}` : `search:${query}`
};

module.exports = {
    cache: cacheManager,
    cacheHelpers
};