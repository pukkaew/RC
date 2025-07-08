// utils/validators.js
// Custom validation functions

const { PASSWORD, FILE_UPLOAD } = require('../config/constants');

// Validate email format
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validate phone number (Thai format)
const isValidPhoneNumber = (phone) => {
    // Remove spaces and dashes
    const cleaned = phone.replace(/[\s-]/g, '');
    
    // Thai mobile: 08x, 09x (10 digits)
    // Thai landline: 02xxxxxxx (9 digits), 03x-07x (9 digits)
    const thaiMobileRegex = /^0[89]\d{8}$/;
    const thaiLandlineRegex = /^0[2-7]\d{7,8}$/;
    
    return thaiMobileRegex.test(cleaned) || thaiLandlineRegex.test(cleaned);
};

// Validate employee ID format
const isValidEmployeeId = (employeeId) => {
    // Alphanumeric, 3-20 characters
    const regex = /^[a-zA-Z0-9]{3,20}$/;
    return regex.test(employeeId);
};

// Validate password strength
const validatePassword = (password) => {
    const errors = [];
    
    if (password.length < PASSWORD.MIN_LENGTH) {
        errors.push(`Password must be at least ${PASSWORD.MIN_LENGTH} characters long`);
    }
    
    if (PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    if (PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    if (PASSWORD.REQUIRE_NUMBER && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    
    if (PASSWORD.REQUIRE_SPECIAL) {
        const specialRegex = new RegExp(`[${PASSWORD.SPECIAL_CHARS}]`);
        if (!specialRegex.test(password)) {
            errors.push(`Password must contain at least one special character (${PASSWORD.SPECIAL_CHARS})`);
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// Calculate password strength score
const getPasswordStrength = (password) => {
    let score = 0;
    
    // Length score
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    
    // Character variety score
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    
    // Pattern penalty
    if (/(.)\1{2,}/.test(password)) score -= 1; // Repeated characters
    if (/^[0-9]+$/.test(password)) score -= 1; // Only numbers
    if (/^[a-zA-Z]+$/.test(password)) score -= 1; // Only letters
    
    // Normalize score
    score = Math.max(0, Math.min(score, 5));
    
    const strengthLevels = [
        'Very Weak',
        'Weak',
        'Fair',
        'Good',
        'Strong',
        'Very Strong'
    ];
    
    return {
        score,
        level: strengthLevels[score],
        percentage: (score / 5) * 100
    };
};

// Validate lot number format
const isValidLotNumber = (lotNumber) => {
    // Alphanumeric with dash and underscore, 1-100 characters
    const regex = /^[a-zA-Z0-9\-_]{1,100}$/;
    return regex.test(lotNumber);
};

// Validate file upload
const validateFileUpload = (file) => {
    const errors = [];
    
    // Check if file exists
    if (!file) {
        errors.push('No file provided');
        return { isValid: false, errors };
    }
    
    // Check file size
    if (file.size > FILE_UPLOAD.MAX_SIZE) {
        errors.push(`File size exceeds ${FILE_UPLOAD.MAX_SIZE / 1024 / 1024}MB limit`);
    }
    
    // Check file type
    if (!FILE_UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
        errors.push(`Invalid file type. Allowed types: ${FILE_UPLOAD.ALLOWED_EXTENSIONS.join(', ')}`);
    }
    
    // Check file extension
    const extension = file.name.split('.').pop().toLowerCase();
    if (!FILE_UPLOAD.ALLOWED_EXTENSIONS.includes(`.${extension}`)) {
        errors.push(`Invalid file extension. Allowed extensions: ${FILE_UPLOAD.ALLOWED_EXTENSIONS.join(', ')}`);
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// Validate date format
const isValidDate = (dateString, format = 'YYYY-MM-DD') => {
    const moment = require('moment');
    return moment(dateString, format, true).isValid();
};

// Validate date range
const isValidDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return false;
    }
    
    // End date should be after or equal to start date
    return end >= start;
};

// Validate Thai ID card number
const isValidThaiId = (id) => {
    // Remove spaces and dashes
    const cleaned = id.replace(/[\s-]/g, '');
    
    // Must be 13 digits
    if (!/^\d{13}$/.test(cleaned)) {
        return false;
    }
    
    // Checksum validation
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(cleaned[i]) * (13 - i);
    }
    
    const checkDigit = (11 - (sum % 11)) % 10;
    return checkDigit === parseInt(cleaned[12]);
};

// Validate URL format
const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

// Validate IP address
const isValidIP = (ip) => {
    // IPv4
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    // IPv6
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

// Validate positive integer
const isPositiveInteger = (value) => {
    const num = Number(value);
    return Number.isInteger(num) && num > 0;
};

// Validate decimal number
const isValidDecimal = (value, maxDecimals = 2) => {
    const regex = new RegExp(`^\\d+(\\.\\d{1,${maxDecimals}})?// utils/validators.js
// Custom validation functions

const { PASSWORD, FILE_UPLOAD } = require('../config/constants');

// Validate email format
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validate phone number (Thai format)
const isValidPhoneNumber = (phone) => {
    // Remove spaces and dashes
    const cleaned = phone.replace(/[\s-]/g, '');
    
    // Thai mobile: 08x, 09x (10 digits)
    // Thai landline: 02xxxxxxx (9 digits), 03x-07x (9 digits)
    const thaiMobileRegex = /^0[89]\d{8}$/;
    const thaiLandlineRegex = /^0[2-7]\d{7,8}$/;
    
    return thaiMobileRegex.test(cleaned) || thaiLandlineRegex.test(cleaned);
};

// Validate employee ID format
const isValidEmployeeId = (employeeId) => {
    // Alphanumeric, 3-20 characters
    const regex = /^[a-zA-Z0-9]{3,20}$/;
    return regex.test(employeeId);
};

// Validate password strength
const validatePassword = (password) => {
    const errors = [];
    
    if (password.length < PASSWORD.MIN_LENGTH) {
        errors.push(`Password must be at least ${PASSWORD.MIN_LENGTH} characters long`);
    }
    
    if (PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    if (PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    if (PASSWORD.REQUIRE_NUMBER && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    
    if (PASSWORD.REQUIRE_SPECIAL) {
        const specialRegex = new RegExp(`[${PASSWORD.SPECIAL_CHARS}]`);
        if (!specialRegex.test(password)) {
            errors.push(`Password must contain at least one special character (${PASSWORD.SPECIAL_CHARS})`);
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// Calculate password strength score
const getPasswordStrength = (password) => {
    let score = 0;
    
    // Length score
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    
    // Character variety score
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    
    // Pattern penalty
    if (/(.)\1{2,}/.test(password)) score -= 1; // Repeated characters
    if (/^[0-9]+$/.test(password)) score -= 1; // Only numbers
    if (/^[a-zA-Z]+$/.test(password)) score -= 1; // Only letters
    
    // Normalize score
    score = Math.max(0, Math.min(score, 5));
    
    const strengthLevels = [
        'Very Weak',
        'Weak',
        'Fair',
        'Good',
        'Strong',
        'Very Strong'
    ];
    
    return {
        score,
        level: strengthLevels[score],
        percentage: (score / 5) * 100
    };
};

// Validate lot number format
const isValidLotNumber = (lotNumber) => {
    // Alphanumeric with dash and underscore, 1-100 characters
    const regex = /^[a-zA-Z0-9\-_]{1,100}$/;
    return regex.test(lotNumber);
};

// Validate file upload
const validateFileUpload = (file) => {
    const errors = [];
    
    // Check if file exists
    if (!file) {
        errors.push('No file provided');
        return { isValid: false, errors };
    }
    
    // Check file size
    if (file.size > FILE_UPLOAD.MAX_SIZE) {
        errors.push(`File size exceeds ${FILE_UPLOAD.MAX_SIZE / 1024 / 1024}MB limit`);
    }
    
    // Check file type
    if (!FILE_UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
        errors.push(`Invalid file type. Allowed types: ${FILE_UPLOAD.ALLOWED_EXTENSIONS.join(', ')}`);
    }
    
    // Check file extension
    const extension = file.name.split('.').pop().toLowerCase();
    if (!FILE_UPLOAD.ALLOWED_EXTENSIONS.includes(`.${extension}`)) {
        errors.push(`Invalid file extension. Allowed extensions: ${FILE_UPLOAD.ALLOWED_EXTENSIONS.join(', ')}`);
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// Validate date format
const isValidDate = (dateString, format = 'YYYY-MM-DD') => {
    const moment = require('moment');
    return moment(dateString, format, true).isValid();
};

// Validate date range
const isValidDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return false;
    }
    
    // End date should be after or equal to start date
    return end >= start;
};

// Validate Thai ID card number
const isValidThaiId = (id) => {
    // Remove spaces and dashes
    const cleaned = id.replace(/[\s-]/g, '');
    
    // Must be 13 digits
    if (!/^\d{13}$/.test(cleaned)) {
        return false;
    }
    
    // Checksum validation
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(cleaned[i]) * (13 - i);
    }
    
    const checkDigit = (11 - (sum % 11)) % 10;
    return checkDigit === parseInt(cleaned[12]);
};

// Validate URL format
const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

);
    return regex.test(value);
};

// Validate percentage (0-100)
const isValidPercentage = (value) => {
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0 && num <= 100;
};

// Validate Thai characters
const containsThaiCharacters = (text) => {
    const thaiRegex = /[\u0E00-\u0E7F]/;
    return thaiRegex.test(text);
};

// Validate English characters only
const isEnglishOnly = (text) => {
    const englishRegex = /^[a-zA-Z\s]+$/;
    return englishRegex.test(text);
};

// Validate alphanumeric with specific allowed characters
const isAlphanumericWith = (text, allowedChars = '') => {
    const escaped = allowedChars.replace(/[.*+?^${}()|[\]\\]/g, '\\// Validate IP address
const isValidIP = (ip) => {');
    const regex = new RegExp(`^[a-zA-Z0-9${escaped}]+// utils/validators.js
// Custom validation functions

const { PASSWORD, FILE_UPLOAD } = require('../config/constants');

// Validate email format
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validate phone number (Thai format)
const isValidPhoneNumber = (phone) => {
    // Remove spaces and dashes
    const cleaned = phone.replace(/[\s-]/g, '');
    
    // Thai mobile: 08x, 09x (10 digits)
    // Thai landline: 02xxxxxxx (9 digits), 03x-07x (9 digits)
    const thaiMobileRegex = /^0[89]\d{8}$/;
    const thaiLandlineRegex = /^0[2-7]\d{7,8}$/;
    
    return thaiMobileRegex.test(cleaned) || thaiLandlineRegex.test(cleaned);
};

// Validate employee ID format
const isValidEmployeeId = (employeeId) => {
    // Alphanumeric, 3-20 characters
    const regex = /^[a-zA-Z0-9]{3,20}$/;
    return regex.test(employeeId);
};

// Validate password strength
const validatePassword = (password) => {
    const errors = [];
    
    if (password.length < PASSWORD.MIN_LENGTH) {
        errors.push(`Password must be at least ${PASSWORD.MIN_LENGTH} characters long`);
    }
    
    if (PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    if (PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    if (PASSWORD.REQUIRE_NUMBER && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    
    if (PASSWORD.REQUIRE_SPECIAL) {
        const specialRegex = new RegExp(`[${PASSWORD.SPECIAL_CHARS}]`);
        if (!specialRegex.test(password)) {
            errors.push(`Password must contain at least one special character (${PASSWORD.SPECIAL_CHARS})`);
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// Calculate password strength score
const getPasswordStrength = (password) => {
    let score = 0;
    
    // Length score
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    
    // Character variety score
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    
    // Pattern penalty
    if (/(.)\1{2,}/.test(password)) score -= 1; // Repeated characters
    if (/^[0-9]+$/.test(password)) score -= 1; // Only numbers
    if (/^[a-zA-Z]+$/.test(password)) score -= 1; // Only letters
    
    // Normalize score
    score = Math.max(0, Math.min(score, 5));
    
    const strengthLevels = [
        'Very Weak',
        'Weak',
        'Fair',
        'Good',
        'Strong',
        'Very Strong'
    ];
    
    return {
        score,
        level: strengthLevels[score],
        percentage: (score / 5) * 100
    };
};

// Validate lot number format
const isValidLotNumber = (lotNumber) => {
    // Alphanumeric with dash and underscore, 1-100 characters
    const regex = /^[a-zA-Z0-9\-_]{1,100}$/;
    return regex.test(lotNumber);
};

// Validate file upload
const validateFileUpload = (file) => {
    const errors = [];
    
    // Check if file exists
    if (!file) {
        errors.push('No file provided');
        return { isValid: false, errors };
    }
    
    // Check file size
    if (file.size > FILE_UPLOAD.MAX_SIZE) {
        errors.push(`File size exceeds ${FILE_UPLOAD.MAX_SIZE / 1024 / 1024}MB limit`);
    }
    
    // Check file type
    if (!FILE_UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
        errors.push(`Invalid file type. Allowed types: ${FILE_UPLOAD.ALLOWED_EXTENSIONS.join(', ')}`);
    }
    
    // Check file extension
    const extension = file.name.split('.').pop().toLowerCase();
    if (!FILE_UPLOAD.ALLOWED_EXTENSIONS.includes(`.${extension}`)) {
        errors.push(`Invalid file extension. Allowed extensions: ${FILE_UPLOAD.ALLOWED_EXTENSIONS.join(', ')}`);
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

// Validate date format
const isValidDate = (dateString, format = 'YYYY-MM-DD') => {
    const moment = require('moment');
    return moment(dateString, format, true).isValid();
};

// Validate date range
const isValidDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return false;
    }
    
    // End date should be after or equal to start date
    return end >= start;
};

// Validate Thai ID card number
const isValidThaiId = (id) => {
    // Remove spaces and dashes
    const cleaned = id.replace(/[\s-]/g, '');
    
    // Must be 13 digits
    if (!/^\d{13}$/.test(cleaned)) {
        return false;
    }
    
    // Checksum validation
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(cleaned[i]) * (13 - i);
    }
    
    const checkDigit = (11 - (sum % 11)) % 10;
    return checkDigit === parseInt(cleaned[12]);
};

// Validate URL format
const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

);
    return regex.test(text);
};

// Validate no special characters
const hasNoSpecialCharacters = (text) => {
    const regex = /^[a-zA-Z0-9\s]+$/;
    return regex.test(text);
};

// Validate SQL injection patterns
const containsSQLInjectionPattern = (input) => {
    const sqlPatterns = [
        /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|vbscript)\b)/gi,
        /(--|#|\/\*|\*\/|;|\||@@|char|nchar|varchar|nvarchar|alter|begin|cast|convert|cursor|declare|exec|execute|fetch|kill|sys|sysobjects|syscolumns)/gi,
        /('|(\')|"|(\")|(--)|(%27)|(%22))/gi
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
};

// Validate XSS patterns
const containsXSSPattern = (input) => {
    const xssPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /<iframe[^>]*>.*?<\/iframe>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<embed[^>]*>/gi,
        /<object[^>]*>/gi
    ];
    
    return xssPatterns.some(pattern => pattern.test(input));
};

// Sanitize input for SQL
const sanitizeForSQL = (input) => {
    if (typeof input !== 'string') return input;
    
    return input
        .replace(/'/g, "''")
        .replace(/"/g, '""')
        .replace(/\\/g, '\\\\')
        .replace(/\0/g, '\\0')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\x1a/g, '\\Z');
};

// Sanitize input for HTML
const sanitizeForHTML = (input) => {
    if (typeof input !== 'string') return input;
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
    };
    
    return input.replace(/[&<>"'/]/g, char => map[char]);
};

// Validate array of IDs
const isValidIdArray = (ids) => {
    if (!Array.isArray(ids)) return false;
    if (ids.length === 0) return false;
    
    return ids.every(id => {
        const num = Number(id);
        return Number.isInteger(num) && num > 0;
    });
};

// Validate JSON string
const isValidJSON = (str) => {
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
};

// Validate base64 string
const isValidBase64 = (str) => {
    const base64Regex = /^[A-Za-z0-9+/]*(=|==)?$/;
    
    if (!base64Regex.test(str)) return false;
    
    // Check if length is multiple of 4
    return str.length % 4 === 0;
};

// Validate hexadecimal color
const isValidHexColor = (color) => {
    const hexRegex = /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/;
    return hexRegex.test(color);
};

// Validate department name
const isValidDepartmentName = (name) => {
    // Allow letters, numbers, spaces, and some special characters
    const regex = /^[a-zA-Z0-9\s\-&.,()ก-๙]+$/;
    return regex.test(name) && name.length >= 2 && name.length <= 100;
};

// Validate role
const isValidRole = (role) => {
    const validRoles = ['viewer', 'manager', 'admin'];
    return validRoles.includes(role);
};

// Validate sort order
const isValidSortOrder = (order) => {
    const validOrders = ['ASC', 'DESC', 'asc', 'desc'];
    return validOrders.includes(order);
};

// Validate language code
const isValidLanguageCode = (code) => {
    const validCodes = ['th-TH', 'en-US'];
    return validCodes.includes(code);
};

// Validate timezone
const isValidTimezone = (timezone) => {
    try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
        return true;
    } catch {
        return false;
    }
};

// Custom validation builder
const createValidator = (rules) => {
    return (value) => {
        const errors = [];
        
        for (const rule of rules) {
            if (rule.required && !value) {
                errors.push(rule.message || 'This field is required');
                continue;
            }
            
            if (value && rule.validator && !rule.validator(value)) {
                errors.push(rule.message || 'Invalid value');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    };
};

// Batch validation
const validateBatch = (data, validators) => {
    const results = {};
    const errors = {};
    let isValid = true;
    
    for (const [field, validator] of Object.entries(validators)) {
        const value = data[field];
        const result = validator(value);
        
        results[field] = result;
        
        if (!result.isValid) {
            isValid = false;
            errors[field] = result.errors || ['Invalid value'];
        }
    }
    
    return {
        isValid,
        results,
        errors
    };
};

module.exports = {
    isValidEmail,
    isValidPhoneNumber,
    isValidEmployeeId,
    validatePassword,
    getPasswordStrength,
    isValidLotNumber,
    validateFileUpload,
    isValidDate,
    isValidDateRange,
    isValidThaiId,
    isValidUrl,
    isValidIP,
    isPositiveInteger,
    isValidDecimal,
    isValidPercentage,
    containsThaiCharacters,
    isEnglishOnly,
    isAlphanumericWith,
    hasNoSpecialCharacters,
    containsSQLInjectionPattern,
    containsXSSPattern,
    sanitizeForSQL,
    sanitizeForHTML,
    isValidIdArray,
    isValidJSON,
    isValidBase64,
    isValidHexColor,
    isValidDepartmentName,
    isValidRole,
    isValidSortOrder,
    isValidLanguageCode,
    isValidTimezone,
    createValidator,
    validateBatch
};