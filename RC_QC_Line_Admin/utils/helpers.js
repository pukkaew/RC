// utils/helpers.js
// General helper functions

const crypto = require('crypto');
const path = require('path');
const { PAGINATION, IMAGE, DEFAULTS } = require('../config/constants');

// Generate random string
const generateRandomString = (length = 16) => {
    return crypto.randomBytes(Math.ceil(length / 2))
        .toString('hex')
        .slice(0, length);
};

// Generate unique ID
const generateUniqueId = (prefix = '') => {
    const timestamp = Date.now().toString(36);
    const random = generateRandomString(8);
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
};

// Format file size
const formatFileSize = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Format number with thousand separators
const formatNumber = (number, locale = 'th-TH') => {
    if (isNaN(number)) return '0';
    return new Intl.NumberFormat(locale).format(number);
};

// Format currency
const formatCurrency = (amount, currency = DEFAULTS.CURRENCY, locale = 'th-TH') => {
    if (isNaN(amount)) return '0';
    
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency
    }).format(amount);
};

// Truncate text with ellipsis
const truncateText = (text, maxLength = 100, suffix = '...') => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
};

// Get file extension
const getFileExtension = (filename) => {
    return path.extname(filename).toLowerCase();
};

// Get file name without extension
const getFileNameWithoutExtension = (filename) => {
    return path.basename(filename, path.extname(filename));
};

// Generate safe filename
const generateSafeFilename = (filename) => {
    // Get extension
    const ext = getFileExtension(filename);
    const name = getFileNameWithoutExtension(filename);
    
    // Remove special characters and spaces
    const safeName = name
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 50); // Limit length
    
    // Add timestamp to ensure uniqueness
    const timestamp = Date.now();
    
    return `${safeName}_${timestamp}${ext}`;
};

// Parse pagination parameters
const parsePagination = (query) => {
    const page = parseInt(query.page) || PAGINATION.DEFAULT_PAGE;
    const limit = parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT;
    
    // Ensure limit is within bounds
    const safeLimit = Math.min(Math.max(limit, 1), PAGINATION.MAX_LIMIT);
    
    // Calculate offset
    const offset = (page - 1) * safeLimit;
    
    return {
        page,
        limit: safeLimit,
        offset
    };
};

// Calculate pagination info
const calculatePagination = (totalRecords, currentPage, limit) => {
    const totalPages = Math.ceil(totalRecords / limit);
    const hasNext = currentPage < totalPages;
    const hasPrev = currentPage > 1;
    
    return {
        total: totalRecords,
        totalPages,
        currentPage,
        limit,
        hasNext,
        hasPrev,
        nextPage: hasNext ? currentPage + 1 : null,
        prevPage: hasPrev ? currentPage - 1 : null,
        startRecord: (currentPage - 1) * limit + 1,
        endRecord: Math.min(currentPage * limit, totalRecords)
    };
};

// Generate page numbers for pagination UI
const generatePageNumbers = (currentPage, totalPages, maxVisible = 5) => {
    const pages = [];
    
    if (totalPages <= maxVisible) {
        // Show all pages
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }
    } else {
        // Calculate start and end
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        
        // Adjust start if we're near the end
        if (end === totalPages) {
            start = Math.max(1, end - maxVisible + 1);
        }
        
        // Add first page and ellipsis if needed
        if (start > 1) {
            pages.push(1);
            if (start > 2) pages.push('...');
        }
        
        // Add visible pages
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        
        // Add last page and ellipsis if needed
        if (end < totalPages) {
            if (end < totalPages - 1) pages.push('...');
            pages.push(totalPages);
        }
    }
    
    return pages;
};

// Build query string from object
const buildQueryString = (params) => {
    const query = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            query.append(key, value);
        }
    });
    
    const queryString = query.toString();
    return queryString ? `?${queryString}` : '';
};

// Parse sort parameter
const parseSort = (sortParam, allowedFields, defaultSort = 'created_at', defaultOrder = 'DESC') => {
    if (!sortParam) {
        return {
            field: defaultSort,
            order: defaultOrder
        };
    }
    
    // Format: field:order (e.g., "name:asc")
    const [field, order] = sortParam.split(':');
    
    // Validate field
    const validField = allowedFields.includes(field) ? field : defaultSort;
    
    // Validate order
    const validOrder = ['ASC', 'DESC'].includes(order?.toUpperCase()) 
        ? order.toUpperCase() 
        : defaultOrder;
    
    return {
        field: validField,
        order: validOrder
    };
};

// Escape SQL LIKE pattern
const escapeLikePattern = (pattern) => {
    return pattern
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
};

// Deep clone object
const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    
    const clonedObj = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            clonedObj[key] = deepClone(obj[key]);
        }
    }
    
    return clonedObj;
};

// Merge objects deeply
const deepMerge = (target, ...sources) => {
    if (!sources.length) return target;
    const source = sources.shift();
    
    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, { [key]: {} });
                deepMerge(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }
    
    return deepMerge(target, ...sources);
};

// Check if value is object
const isObject = (item) => {
    return item && typeof item === 'object' && !Array.isArray(item);
};

// Sleep function for delays
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

// Retry function with exponential backoff
const retry = async (fn, retries = 3, delay = 1000, factor = 2) => {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) {
            throw error;
        }
        
        await sleep(delay);
        return retry(fn, retries - 1, delay * factor, factor);
    }
};

// Group array by key
const groupBy = (array, key) => {
    return array.reduce((result, item) => {
        const group = item[key];
        if (!result[group]) result[group] = [];
        result[group].push(item);
        return result;
    }, {});
};

// Chunk array into smaller arrays
const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};

// Remove duplicates from array
const uniqueArray = (array, key = null) => {
    if (!key) {
        return [...new Set(array)];
    }
    
    const seen = new Set();
    return array.filter(item => {
        const value = item[key];
        if (seen.has(value)) {
            return false;
        }
        seen.add(value);
        return true;
    });
};

// Calculate percentage
const calculatePercentage = (value, total, decimals = 2) => {
    if (total === 0) return 0;
    const percentage = (value / total) * 100;
    return parseFloat(percentage.toFixed(decimals));
};

// Generate CSV line
const generateCSVLine = (values) => {
    return values.map(value => {
        // Convert to string and escape quotes
        const str = String(value || '').replace(/"/g, '""');
        // Quote if contains comma, newline, or quotes
        return /[,\n"]/.test(str) ? `"${str}"` : str;
    }).join(',');
};

// Parse CSV line
const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++; // Skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
};

// Sanitize HTML
const sanitizeHTML = (html) => {
    return html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

// Get client IP
const getClientIP = (req) => {
    return req.ip || 
           req.headers['x-forwarded-for']?.split(',')[0] || 
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           req.connection.socket?.remoteAddress ||
           'unknown';
};

// Check if request is AJAX
const isAjaxRequest = (req) => {
    return req.xhr || 
           req.headers.accept?.indexOf('json') > -1 ||
           req.headers['content-type']?.indexOf('json') > -1;
};

// Create response object
const createResponse = (success, data = null, message = null, errors = null) => {
    const response = { success };
    
    if (data !== null) response.data = data;
    if (message !== null) response.message = message;
    if (errors !== null) response.errors = errors;
    
    return response;
};

module.exports = {
    generateRandomString,
    generateUniqueId,
    formatFileSize,
    formatNumber,
    formatCurrency,
    truncateText,
    getFileExtension,
    getFileNameWithoutExtension,
    generateSafeFilename,
    parsePagination,
    calculatePagination,
    generatePageNumbers,
    buildQueryString,
    parseSort,
    escapeLikePattern,
    deepClone,
    deepMerge,
    isObject,
    sleep,
    retry,
    groupBy,
    chunkArray,
    uniqueArray,
    calculatePercentage,
    generateCSVLine,
    parseCSVLine,
    sanitizeHTML,
    getClientIP,
    isAjaxRequest,
    createResponse
};