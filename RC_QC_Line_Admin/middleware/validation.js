// middleware/validation.js
// Input validation middleware

const { body, param, query, validationResult } = require('express-validator');
const { PASSWORD, FILE_UPLOAD } = require('../config/constants');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        } else {
            req.flash('error', errors.array()[0].msg);
            return res.redirect('back');
        }
    }
    next();
};

// Common validators
const validators = {
    // ID validators
    id: param('id').isInt().withMessage('Invalid ID format'),
    
    // Pagination validators
    pagination: [
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    ],

    // Search validators
    search: query('search').optional().trim().escape(),

    // Date validators
    dateRange: [
        query('start_date').optional().isISO8601().withMessage('Invalid start date format'),
        query('end_date').optional().isISO8601().withMessage('Invalid end date format')
    ]
};

// Authentication validators
const authValidators = {
    login: [
        body('employee_id')
            .trim()
            .notEmpty().withMessage('กรุณากรอกรหัสพนักงาน')
            .isLength({ min: 3, max: 20 }).withMessage('รหัสพนักงานต้องมีความยาว 3-20 ตัวอักษร'),
        body('password')
            .notEmpty().withMessage('กรุณากรอกรหัสผ่าน')
    ],

    changePassword: [
        body('current_password')
            .notEmpty().withMessage('กรุณากรอกรหัสผ่านปัจจุบัน'),
        body('new_password')
            .notEmpty().withMessage('กรุณากรอกรหัสผ่านใหม่')
            .isLength({ min: PASSWORD.MIN_LENGTH })
            .withMessage(`รหัสผ่านต้องมีความยาวอย่างน้อย ${PASSWORD.MIN_LENGTH} ตัวอักษร`)
            .custom((value) => {
                const validations = [];
                
                if (PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(value)) {
                    validations.push('ต้องมีตัวพิมพ์ใหญ่');
                }
                if (PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(value)) {
                    validations.push('ต้องมีตัวพิมพ์เล็ก');
                }
                if (PASSWORD.REQUIRE_NUMBER && !/[0-9]/.test(value)) {
                    validations.push('ต้องมีตัวเลข');
                }
                if (PASSWORD.REQUIRE_SPECIAL && !new RegExp(`[${PASSWORD.SPECIAL_CHARS}]`).test(value)) {
                    validations.push(`ต้องมีอักขระพิเศษ (${PASSWORD.SPECIAL_CHARS})`);
                }
                
                if (validations.length > 0) {
                    throw new Error('รหัสผ่าน' + validations.join(', '));
                }
                return true;
            }),
        body('confirm_password')
            .notEmpty().withMessage('กรุณายืนยันรหัสผ่านใหม่')
            .custom((value, { req }) => value === req.body.new_password)
            .withMessage('รหัสผ่านใหม่ไม่ตรงกัน')
    ]
};

// Lot validators
const lotValidators = {
    update: [
        validators.id,
        body('lot_number')
            .trim()
            .notEmpty().withMessage('กรุณากรอกหมายเลข Lot')
            .isLength({ min: 1, max: 100 }).withMessage('หมายเลข Lot ต้องมีความยาว 1-100 ตัวอักษร')
            .matches(/^[a-zA-Z0-9\-_]+$/).withMessage('หมายเลข Lot ต้องประกอบด้วยตัวอักษร, ตัวเลข, - หรือ _ เท่านั้น')
    ],

    delete: [
        validators.id,
        body('confirm')
            .equals('DELETE')
            .withMessage('กรุณายืนยันการลบโดยพิมพ์ DELETE')
    ]
};

// Image validators
const imageValidators = {
    view: [
        validators.id
    ],

    delete: [
        validators.id
    ],

    bulkDelete: [
        body('image_ids')
            .isArray({ min: 1, max: 50 })
            .withMessage('กรุณาเลือกรูปภาพ 1-50 รูป')
            .custom((value) => {
                return value.every(id => Number.isInteger(Number(id)));
            }).withMessage('รูปแบบ ID รูปภาพไม่ถูกต้อง')
    ],

    download: [
        query('ids')
            .optional()
            .custom((value) => {
                const ids = value.split(',');
                return ids.every(id => Number.isInteger(Number(id)));
            }).withMessage('รูปแบบ ID รูปภาพไม่ถูกต้อง')
    ]
};

// User management validators
const userValidators = {
    create: [
        body('employee_id')
            .trim()
            .notEmpty().withMessage('กรุณากรอกรหัสพนักงาน')
            .isLength({ min: 3, max: 20 }).withMessage('รหัสพนักงานต้องมีความยาว 3-20 ตัวอักษร')
            .matches(/^[a-zA-Z0-9]+$/).withMessage('รหัสพนักงานต้องประกอบด้วยตัวอักษรและตัวเลขเท่านั้น'),
        body('full_name')
            .trim()
            .notEmpty().withMessage('กรุณากรอกชื่อ-นามสกุล')
            .isLength({ min: 2, max: 100 }).withMessage('ชื่อ-นามสกุลต้องมีความยาว 2-100 ตัวอักษร'),
        body('email')
            .trim()
            .notEmpty().withMessage('กรุณากรอกอีเมล')
            .isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง')
            .normalizeEmail(),
        body('department')
            .trim()
            .notEmpty().withMessage('กรุณากรอกแผนก')
            .isLength({ max: 100 }).withMessage('ชื่อแผนกต้องไม่เกิน 100 ตัวอักษร'),
        body('role')
            .notEmpty().withMessage('กรุณาเลือกระดับสิทธิ์')
            .isIn(['viewer', 'manager', 'admin']).withMessage('ระดับสิทธิ์ไม่ถูกต้อง'),
        body('password')
            .notEmpty().withMessage('กรุณากรอกรหัสผ่าน')
            .isLength({ min: PASSWORD.MIN_LENGTH })
            .withMessage(`รหัสผ่านต้องมีความยาวอย่างน้อย ${PASSWORD.MIN_LENGTH} ตัวอักษร`)
    ],

    update: [
        validators.id,
        body('full_name')
            .trim()
            .notEmpty().withMessage('กรุณากรอกชื่อ-นามสกุล')
            .isLength({ min: 2, max: 100 }).withMessage('ชื่อ-นามสกุลต้องมีความยาว 2-100 ตัวอักษร'),
        body('email')
            .trim()
            .notEmpty().withMessage('กรุณากรอกอีเมล')
            .isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง')
            .normalizeEmail(),
        body('department')
            .trim()
            .notEmpty().withMessage('กรุณากรอกแผนก')
            .isLength({ max: 100 }).withMessage('ชื่อแผนกต้องไม่เกิน 100 ตัวอักษร'),
        body('role')
            .notEmpty().withMessage('กรุณาเลือกระดับสิทธิ์')
            .isIn(['viewer', 'manager', 'admin']).withMessage('ระดับสิทธิ์ไม่ถูกต้อง')
    ],

    resetPassword: [
        validators.id,
        body('new_password')
            .notEmpty().withMessage('กรุณากรอกรหัสผ่านใหม่')
            .isLength({ min: PASSWORD.MIN_LENGTH })
            .withMessage(`รหัสผ่านต้องมีความยาวอย่างน้อย ${PASSWORD.MIN_LENGTH} ตัวอักษร`)
    ],

    toggleStatus: [
        validators.id
    ]
};

// Report validators
const reportValidators = {
    generate: [
        body('report_type')
            .notEmpty().withMessage('กรุณาเลือกประเภทรายงาน')
            .isIn(['daily_summary', 'lot_summary', 'user_activity', 'system_audit'])
            .withMessage('ประเภทรายงานไม่ถูกต้อง'),
        body('start_date')
            .notEmpty().withMessage('กรุณาเลือกวันที่เริ่มต้น')
            .isISO8601().withMessage('รูปแบบวันที่ไม่ถูกต้อง'),
        body('end_date')
            .notEmpty().withMessage('กรุณาเลือกวันที่สิ้นสุด')
            .isISO8601().withMessage('รูปแบบวันที่ไม่ถูกต้อง')
            .custom((value, { req }) => {
                const start = new Date(req.body.start_date);
                const end = new Date(value);
                return end >= start;
            }).withMessage('วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น')
    ]
};

// Custom sanitizers
const sanitizers = {
    // Clean HTML tags
    cleanHTML: (value) => {
        return value.replace(/<[^>]*>?/gm, '');
    },

    // Clean file path
    cleanPath: (value) => {
        return value.replace(/[^a-zA-Z0-9\-_\/\.]/g, '');
    },

    // Normalize whitespace
    normalizeWhitespace: (value) => {
        return value.trim().replace(/\s+/g, ' ');
    }
};

// File upload validator
const validateFileUpload = (fieldName) => {
    return (req, res, next) => {
        if (!req.files || !req.files[fieldName]) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const file = req.files[fieldName];

        // Check file size
        if (file.size > FILE_UPLOAD.MAX_SIZE) {
            return res.status(400).json({
                success: false,
                message: `File size exceeds ${FILE_UPLOAD.MAX_SIZE / 1024 / 1024}MB limit`
            });
        }

        // Check file type
        if (!FILE_UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid file type. Allowed types: ' + FILE_UPLOAD.ALLOWED_EXTENSIONS.join(', ')
            });
        }

        next();
    };
};

module.exports = {
    handleValidationErrors,
    validators,
    authValidators,
    lotValidators,
    imageValidators,
    userValidators,
    reportValidators,
    sanitizers,
    validateFileUpload
};