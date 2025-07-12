const { body, param, query } = require('express-validator');
const Company = require('../models/Company');

// Validation rules for creating a company
const createCompanyRules = () => {
    return [
        body('company_code')
            .trim()
            .notEmpty().withMessage('Company code is required')
            .isLength({ min: 1, max: 20 }).withMessage('Company code must be between 1 and 20 characters')
            .matches(/^[A-Z0-9_-]+$/i).withMessage('Company code can only contain letters, numbers, underscore and hyphen')
            .custom(async (value) => {
                const exists = await Company.exists(value);
                if (exists) {
                    throw new Error('Company code already exists');
                }
                return true;
            }),
        
        body('company_name_th')
            .trim()
            .notEmpty().withMessage('Thai company name is required')
            .isLength({ min: 1, max: 200 }).withMessage('Thai company name must be between 1 and 200 characters'),
        
        body('company_name_en')
            .optional({ nullable: true })
            .trim()
            .isLength({ max: 200 }).withMessage('English company name must not exceed 200 characters'),
        
        body('tax_id')
            .optional({ nullable: true })
            .trim()
            .matches(/^\d{13}$/).withMessage('Tax ID must be exactly 13 digits'),
        
        body('is_active')
            .optional()
            .isBoolean().withMessage('is_active must be a boolean value')
            .toBoolean()
    ];
};

// Validation rules for updating a company
const updateCompanyRules = () => {
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
            }),
        
        body('company_name_th')
            .optional()
            .trim()
            .notEmpty().withMessage('Thai company name cannot be empty')
            .isLength({ min: 1, max: 200 }).withMessage('Thai company name must be between 1 and 200 characters'),
        
        body('company_name_en')
            .optional({ nullable: true })
            .trim()
            .isLength({ max: 200 }).withMessage('English company name must not exceed 200 characters'),
        
        body('tax_id')
            .optional({ nullable: true })
            .trim()
            .matches(/^\d{13}$/).withMessage('Tax ID must be exactly 13 digits')
    ];
};

// Validation rules for getting a company by code
const getCompanyByCodeRules = () => {
    return [
        param('code')
            .trim()
            .notEmpty().withMessage('Company code is required')
            .isLength({ min: 1, max: 20 }).withMessage('Company code must be between 1 and 20 characters')
    ];
};

// Validation rules for updating company status
const updateCompanyStatusRules = () => {
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
            }),
        
        body('is_active')
            .notEmpty().withMessage('is_active is required')
            .isBoolean().withMessage('is_active must be a boolean value')
            .toBoolean()
    ];
};

// Validation rules for company search/filter
const searchCompaniesRules = () => {
    return [
        query('page')
            .optional()
            .isInt({ min: 1 }).withMessage('Page must be a positive integer')
            .toInt(),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
            .toInt(),
        
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
            .isIn(['company_code', 'company_name_th', 'company_name_en', 'created_date'])
            .withMessage('Invalid sort field'),
        
        query('order')
            .optional()
            .isIn(['asc', 'desc', 'ASC', 'DESC'])
            .withMessage('Order must be either asc or desc')
    ];
};

module.exports = {
    createCompanyRules,
    updateCompanyRules,
    getCompanyByCodeRules,
    updateCompanyStatusRules,
    searchCompaniesRules
};