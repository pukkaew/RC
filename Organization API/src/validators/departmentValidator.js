const { body, param, query } = require('express-validator');
const Department = require('../models/Department');
const Division = require('../models/Division');

// Validation rules for creating a department
const createDepartmentRules = () => {
    return [
        body('department_code')
            .trim()
            .notEmpty().withMessage('Department code is required')
            .isLength({ min: 1, max: 20 }).withMessage('Department code must be between 1 and 20 characters')
            .matches(/^[A-Z0-9_-]+$/i).withMessage('Department code can only contain letters, numbers, underscore and hyphen')
            .custom(async (value) => {
                const exists = await Department.exists(value);
                if (exists) {
                    throw new Error('Department code already exists');
                }
                return true;
            }),
        
        body('department_name')
            .trim()
            .notEmpty().withMessage('Department name is required')
            .isLength({ min: 1, max: 200 }).withMessage('Department name must be between 1 and 200 characters'),
        
        body('division_code')
            .trim()
            .notEmpty().withMessage('Division code is required')
            .custom(async (value) => {
                const division = await Division.findByCode(value);
                if (!division) {
                    throw new Error('Division not found');
                }
                if (!division.is_active) {
                    throw new Error('Cannot add department to inactive division');
                }
                return true;
            }),
        
        body('is_active')
            .optional()
            .isBoolean().withMessage('is_active must be a boolean value')
            .toBoolean()
    ];
};

// Validation rules for updating a department
const updateDepartmentRules = () => {
    return [
        param('code')
            .trim()
            .notEmpty().withMessage('Department code is required')
            .custom(async (value) => {
                const exists = await Department.exists(value);
                if (!exists) {
                    throw new Error('Department not found');
                }
                return true;
            }),
        
        body('department_name')
            .optional()
            .trim()
            .notEmpty().withMessage('Department name cannot be empty')
            .isLength({ min: 1, max: 200 }).withMessage('Department name must be between 1 and 200 characters')
    ];
};

// Validation rules for getting a department by code
const getDepartmentByCodeRules = () => {
    return [
        param('code')
            .trim()
            .notEmpty().withMessage('Department code is required')
            .isLength({ min: 1, max: 20 }).withMessage('Department code must be between 1 and 20 characters')
    ];
};

// Validation rules for getting departments by division
const getDepartmentsByDivisionRules = () => {
    return [
        param('code')
            .trim()
            .notEmpty().withMessage('Division code is required')
            .custom(async (value) => {
                const exists = await Division.exists(value);
                if (!exists) {
                    throw new Error('Division not found');
                }
                return true;
            })
    ];
};

// Validation rules for updating department status
const updateDepartmentStatusRules = () => {
    return [
        param('code')
            .trim()
            .notEmpty().withMessage('Department code is required')
            .custom(async (value) => {
                const exists = await Department.exists(value);
                if (!exists) {
                    throw new Error('Department not found');
                }
                return true;
            }),
        
        body('is_active')
            .notEmpty().withMessage('is_active is required')
            .isBoolean().withMessage('is_active must be a boolean value')
            .toBoolean()
    ];
};

// Validation rules for moving department to another division
const moveDepartmentRules = () => {
    return [
        param('code')
            .trim()
            .notEmpty().withMessage('Department code is required')
            .custom(async (value) => {
                const exists = await Department.exists(value);
                if (!exists) {
                    throw new Error('Department not found');
                }
                return true;
            }),
        
        body('division_code')
            .trim()
            .notEmpty().withMessage('Target division code is required')
            .custom(async (value) => {
                const division = await Division.findByCode(value);
                if (!division) {
                    throw new Error('Target division not found');
                }
                if (!division.is_active) {
                    throw new Error('Cannot move department to inactive division');
                }
                return true;
            })
    ];
};

// Validation rules for department search/filter
const searchDepartmentsRules = () => {
    return [
        query('page')
            .optional()
            .isInt({ min: 1 }).withMessage('Page must be a positive integer')
            .toInt(),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
            .toInt(),
        
        query('division_code')
            .optional()
            .trim()
            .isLength({ min: 1, max: 20 }).withMessage('Division code must be between 1 and 20 characters'),
        
        query('company_code')
            .optional()
            .trim()
            .isLength({ min: 1, max: 20 }).withMessage('Company code must be between 1 and 20 characters'),
        
        query('branch_code')
            .optional()
            .trim()
            .isLength({ min: 1, max: 20 }).withMessage('Branch code must be between 1 and 20 characters'),
        
        query('is_active')
            .optional()
            .isBoolean().withMessage('is_active must be a boolean value')
            .toBoolean(),
        
        query('search')
            .optional()
            .trim()
            .isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters')
            .escape(),
        
        query('sort')
            .optional()
            .isIn(['department_code', 'department_name', 'division_code', 'created_date'])
            .withMessage('Invalid sort field'),
        
        query('order')
            .optional()
            .isIn(['asc', 'desc', 'ASC', 'DESC'])
            .withMessage('Order must be either asc or desc')
    ];
};

module.exports = {
    createDepartmentRules,
    updateDepartmentRules,
    getDepartmentByCodeRules,
    getDepartmentsByDivisionRules,
    updateDepartmentStatusRules,
    moveDepartmentRules,
    searchDepartmentsRules
};