const { body, param, query } = require('express-validator');
const Division = require('../models/Division');
const Company = require('../models/Company');
const Branch = require('../models/Branch');

// Validation rules for creating a division
const createDivisionRules = () => {
    return [
        body('division_code')
            .trim()
            .notEmpty().withMessage('Division code is required')
            .isLength({ min: 1, max: 20 }).withMessage('Division code must be between 1 and 20 characters')
            .matches(/^[A-Z0-9_-]+$/i).withMessage('Division code can only contain letters, numbers, underscore and hyphen')
            .custom(async (value) => {
                const exists = await Division.exists(value);
                if (exists) {
                    throw new Error('Division code already exists');
                }
                return true;
            }),
        
        body('division_name')
            .trim()
            .notEmpty().withMessage('Division name is required')
            .isLength({ min: 1, max: 200 }).withMessage('Division name must be between 1 and 200 characters'),
        
        body('company_code')
            .trim()
            .notEmpty().withMessage('Company code is required')
            .custom(async (value) => {
                const exists = await Company.exists(value);
                if (!exists) {
                    throw new Error('Company not found');
                }
                return true;
            }),
        
        body('branch_code')
            .optional({ nullable: true })
            .trim()
            .custom(async (value, { req }) => {
                if (value) {
                    const branch = await Branch.findByCode(value);
                    if (!branch) {
                        throw new Error('Branch not found');
                    }
                    // Check if branch belongs to the same company
                    if (branch.company_code !== req.body.company_code) {
                        throw new Error('Branch does not belong to the specified company');
                    }
                }
                return true;
            }),
        
        body('is_active')
            .optional()
            .isBoolean().withMessage('is_active must be a boolean value')
            .toBoolean()
    ];
};

// Validation rules for updating a division
const updateDivisionRules = () => {
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
            }),
        
        body('division_name')
            .optional()
            .trim()
            .notEmpty().withMessage('Division name cannot be empty')
            .isLength({ min: 1, max: 200 }).withMessage('Division name must be between 1 and 200 characters'),
        
        body('branch_code')
            .optional({ nullable: true })
            .trim()
            .custom(async (value, { req }) => {
                if (value) {
                    const division = await Division.findByCode(req.params.code);
                    const branch = await Branch.findByCode(value);
                    
                    if (!branch) {
                        throw new Error('Branch not found');
                    }
                    // Check if branch belongs to the same company as division
                    if (branch.company_code !== division.company_code) {
                        throw new Error('Branch does not belong to the same company as the division');
                    }
                }
                return true;
            })
    ];
};

// Validation rules for getting a division by code
const getDivisionByCodeRules = () => {
    return [
        param('code')
            .trim()
            .notEmpty().withMessage('Division code is required')
            .isLength({ min: 1, max: 20 }).withMessage('Division code must be between 1 and 20 characters')
    ];
};

// Validation rules for getting divisions by company
const getDivisionsByCompanyRules = () => {
    return [
        param('code')
            .trim()
            .notEmpty().withMessage('Company code is required')
            .custom(async (value) => {
                const exists = await Company.exists(value);
                if (!exists) {
                    throw new Error('Company not found');
                }
                return true;
            })
    ];
};

// Validation rules for getting divisions by branch
const getDivisionsByBranchRules = () => {
    return [
        param('code')
            .trim()
            .notEmpty().withMessage('Branch code is required')
            .custom(async (value) => {
                const exists = await Branch.exists(value);
                if (!exists) {
                    throw new Error('Branch not found');
                }
                return true;
            })
    ];
};

// Validation rules for updating division status
const updateDivisionStatusRules = () => {
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
            }),
        
        body('is_active')
            .notEmpty().withMessage('is_active is required')
            .isBoolean().withMessage('is_active must be a boolean value')
            .toBoolean()
    ];
};

// Validation rules for moving division to another branch
const moveDivisionRules = () => {
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
            }),
        
        body('branch_code')
            .trim()
            .notEmpty().withMessage('Target branch code is required')
            .custom(async (value) => {
                const exists = await Branch.exists(value);
                if (!exists) {
                    throw new Error('Target branch not found');
                }
                return true;
            })
    ];
};

// Validation rules for division search/filter
const searchDivisionsRules = () => {
    return [
        query('page')
            .optional()
            .isInt({ min: 1 }).withMessage('Page must be a positive integer')
            .toInt(),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
            .toInt(),
        
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
            .isIn(['division_code', 'division_name', 'company_code', 'branch_code', 'created_date'])
            .withMessage('Invalid sort field'),
        
        query('order')
            .optional()
            .isIn(['asc', 'desc', 'ASC', 'DESC'])
            .withMessage('Order must be either asc or desc')
    ];
};

module.exports = {
    createDivisionRules,
    updateDivisionRules,
    getDivisionByCodeRules,
    getDivisionsByCompanyRules,
    getDivisionsByBranchRules,
    updateDivisionStatusRules,
    moveDivisionRules,
    searchDivisionsRules
};