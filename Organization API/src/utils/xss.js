// Path: /src/utils/xss.js
const sanitizeHtml = require('sanitize-html');

// XSS protection middleware
const cleanRequestBody = (req, res, next) => {
    // Skip for non-JSON requests
    if (!req.body || typeof req.body !== 'object') {
        return next();
    }
    
    // Recursively clean object properties
    const cleanObject = (obj) => {
        const cleaned = {};
        
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                // Clean HTML tags but allow basic formatting
                cleaned[key] = sanitizeHtml(value, {
                    allowedTags: [],
                    allowedAttributes: {},
                    disallowedTagsMode: 'recursiveEscape'
                });
            } else if (Array.isArray(value)) {
                cleaned[key] = value.map(item => 
                    typeof item === 'object' ? cleanObject(item) : item
                );
            } else if (typeof value === 'object' && value !== null) {
                cleaned[key] = cleanObject(value);
            } else {
                cleaned[key] = value;
            }
        }
        
        return cleaned;
    };
    
    try {
        req.body = cleanObject(req.body);
        next();
    } catch (error) {
        next(error);
    }
};

// Clean a single string value
const cleanString = (str) => {
    if (typeof str !== 'string') return str;
    
    return sanitizeHtml(str, {
        allowedTags: [],
        allowedAttributes: {},
        disallowedTagsMode: 'recursiveEscape'
    });
};

// SQL injection prevention helper
const escapeSqlString = (str) => {
    if (typeof str !== 'string') return str;
    
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
        switch (char) {
            case "\0": return "\\0";
            case "\x08": return "\\b";
            case "\x09": return "\\t";
            case "\x1a": return "\\z";
            case "\n": return "\\n";
            case "\r": return "\\r";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\" + char;
            default:
                return char;
        }
    });
};

module.exports = {
    cleanRequestBody,
    cleanString,
    escapeSqlString
};