// Path: /src/utils/cache.js
const logger = require('./logger');

/**
 * Simple in-memory cache implementation
 * In production, consider using Redis or similar
 */
class Cache {
    constructor() {
        this.store = new Map();
        this.timers = new Map();
        logger.info('Memory cache initialized');
    }

    /**
     * Get value from cache
     * @param {string} key - Cache key
     * @returns {*} Cached value or null
     */
    async get(key) {
        const item = this.store.get(key);
        if (!item) return null;

        if (Date.now() > item.expiry) {
            this.delete(key);
            return null;
        }

        return item.value;
    }

    /**
     * Set value in cache
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {number} ttl - Time to live in seconds
     */
    async set(key, value, ttl = 3600) {
        // Clear existing timer if any
        this.clearTimer(key);

        const expiry = Date.now() + (ttl * 1000);
        this.store.set(key, { value, expiry });

        // Set auto-cleanup timer
        const timer = setTimeout(() => {
            this.delete(key);
        }, ttl * 1000);

        this.timers.set(key, timer);
    }

    /**
     * Delete value from cache
     * @param {string} key - Cache key
     */
    delete(key) {
        this.store.delete(key);
        this.clearTimer(key);
    }

    /**
     * Clear all cache
     */
    clear() {
        // Clear all timers
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
        this.store.clear();
        logger.info('Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getStats() {
        let validItems = 0;
        let expiredItems = 0;
        const now = Date.now();

        this.store.forEach((item, key) => {
            if (now > item.expiry) {
                expiredItems++;
            } else {
                validItems++;
            }
        });

        return {
            totalItems: this.store.size,
            validItems,
            expiredItems,
            memoryUsage: process.memoryUsage().heapUsed
        };
    }

    /**
     * Clear timer for a key
     * @private
     */
    clearTimer(key) {
        const timer = this.timers.get(key);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(key);
        }
    }

    /**
     * Check if key exists and is valid
     * @param {string} key - Cache key
     * @returns {boolean}
     */
    has(key) {
        const item = this.store.get(key);
        if (!item) return false;

        if (Date.now() > item.expiry) {
            this.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Get remaining TTL for a key
     * @param {string} key - Cache key
     * @returns {number} Remaining seconds or -1 if not found
     */
    ttl(key) {
        const item = this.store.get(key);
        if (!item) return -1;

        const remaining = Math.floor((item.expiry - Date.now()) / 1000);
        return remaining > 0 ? remaining : -1;
    }
}

// Create singleton instance
const cache = new Cache();

// Optional: Clear expired items periodically
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    cache.store.forEach((item, key) => {
        if (now > item.expiry) {
            cache.delete(key);
            cleaned++;
        }
    });

    if (cleaned > 0) {
        logger.debug(`Cleaned ${cleaned} expired cache items`);
    }
}, 60000); // Run every minute

module.exports = cache;