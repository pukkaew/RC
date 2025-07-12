const { body, param, query } = require('express-validator');
const Branch = require('../models/Branch');
const Company = require('../models/Company');

// Validation rules for creating a branch
const createBranchRules = () => {
    return [
        body('branch_code')
            .trim()
            .notEmpty().withMessage('Branch code is required')
            .isLength({ min: 1, max: 20 }).withMessage('Branch code must be between 1 and 20 characters')
            .matches(/^[A-Z0-9_-]+$/i).withMessage('Branch code can only contain letters, numbers, underscore and hyphen')
            .custom(async (value) => {
                const exists = await Branch.exists(value);
                if (exists) {
                    throw new Error('Branch code already exists');
                }
                return true;
            }),
        
        body('branch_name')
            .trim()
            .notEmpty().withMessage('Branch name is required')
            .isLength({ min: 1, max: 200 }).withMessage('Branch name must be between 1 and 200 characters'),
        
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
        
        body('is_headquarters')
            .optional()
            .isBoolean().withMessage('is_headquarters must be a boolean value')
            .toBoolean(),
        
        body('is_active')
            .optional()
            .isBoolean().withMessage('is_active must be a boolean value')
            .toBoolean()
    ];
};

// Validation rules for updating a branch
const updateBranchRules = () => {
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
            }),
        
        body('branch_name')
            .optional()
            .trim()
            .notEmpty().withMessage('Branch name cannot be empty')
            .isLength({ min: 1, max: 200 }).withMessage('Branch name must be between 1 and 200 characters'),
        
        body('is_headquarters')
            .optional()
            .isBoolean().withMessage('is_headquarters must be a boolean value')
            .toBoolean()
    ];
};

// Validation rules for getting a branch by code
const getBranchByCodeRules = () => {
    return [
        param('code')
            .trim()
            .notEmpty().withMessage('Branch code is required')
            .isLength({ min: 1, max: 20 }).withMessage('Branch code must be between 1 and 20 characters')
    ];
};

// Validation rules for getting branches by company
const getBranchesByCompanyRules = () => {
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

// Validation rules for updating branch status
const updateBranchStatusRules = () => {
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
            }),
        
        body('is_active')
            .notEmpty().withMessage('is_active is required')
            .isBoolean().withMessage('is_active must be a boolean value')
            .toBoolean()
    ];
};

// Validation rules for branch search/filter
const searchBranchesRules = () => {
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
        
        query('is_active')
            .optional()
            .isBoolean().withMessage('is_active must be a boolean value')
            .toBoolean(),
        
        query('is_headquarters')
            .optional()
            .isBoolean().withMessage('is_headquarters must be a boolean value')
            .toBoolean(),
        
        query('search')
            .optional()
            .trim()
            .isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters')
            .escape(),
        
        query('sort')
            .optional()
            .isIn(['branch_code', 'branch_name', 'company_code', 'created_date'])
            .withMessage('Invalid sort field'),
        
        query('order')
            .optional()
            .isIn(['asc', 'desc', 'ASC', 'DESC'])
            .withMessage('Order must be either asc or desc')
    ];
};

module.exports = {
    createBranchRules,
    updateBranchRules,
    getBranchByCodeRules,
    getBranchesByCompanyRules,
    updateBranchStatusRules,
    searchBranchesRules
};