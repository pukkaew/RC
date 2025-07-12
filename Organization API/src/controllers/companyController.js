const Company = require('../models/Company');
const { asyncHandler, businessError } = require('../middleware/errorHandler');
const { sendSuccess, sendPaginated, created, updated, notFound } = require('../utils/response');
const { getPaginationParams } = require('../utils/pagination');
const logger = require('../utils/logger');

// Get all companies with pagination
const getAllCompanies = asyncHandler(async (req, res) => {
    const { page, limit } = getPaginationParams(req);
    const filters = {
        is_active: req.query.is_active,
        search: req.query.search
    };

    const result = await Company.findPaginated(page, limit, filters);
    
    sendPaginated(res, result.data, result.pagination, 'Companies retrieved successfully');
});

// Get company by code
const getCompanyByCode = asyncHandler(async (req, res) => {
    const company = await Company.findByCode(req.params.code);
    
    if (!company) {
        return notFound(res, 'Company not found');
    }
    
    sendSuccess(res, company, 'Company retrieved successfully');
});

// Create new company
const createCompany = asyncHandler(async (req, res) => {
    const companyData = {
        company_code: req.body.company_code,
        company_name_th: req.body.company_name_th,
        company_name_en: req.body.company_name_en,
        tax_id: req.body.tax_id,
        is_active: req.body.is_active !== undefined ? req.body.is_active : true,
        created_by: req.user?.username || 'system'
    };

    const company = new Company(companyData);
    const result = await company.create();
    
    logger.info(`Company created: ${result.company_code} by ${companyData.created_by}`);
    
    created(res, result, 'Company created successfully');
});

// Update company
const updateCompany = asyncHandler(async (req, res) => {
    const company = await Company.findByCode(req.params.code);
    
    if (!company) {
        return notFound(res, 'Company not found');
    }
    
    // Update only provided fields
    if (req.body.company_name_th !== undefined) {
        company.company_name_th = req.body.company_name_th;
    }
    if (req.body.company_name_en !== undefined) {
        company.company_name_en = req.body.company_name_en;
    }
    if (req.body.tax_id !== undefined) {
        company.tax_id = req.body.tax_id;
    }
    
    company.updated_by = req.user?.username || 'system';
    
    const result = await company.update();
    
    logger.info(`Company updated: ${result.company_code} by ${company.updated_by}`);
    
    updated(res, result, 'Company updated successfully');
});

// Update company status
const updateCompanyStatus = asyncHandler(async (req, res) => {
    const { code } = req.params;
    const { is_active } = req.body;
    const updatedBy = req.user?.username || 'system';
    
    const result = await Company.updateStatus(code, is_active, updatedBy);
    
    logger.info(`Company status updated: ${code} to ${is_active ? 'active' : 'inactive'} by ${updatedBy}`);
    
    updated(res, result, `Company ${is_active ? 'activated' : 'deactivated'} successfully`);
});

// Get company statistics
const getCompanyStatistics = asyncHandler(async (req, res) => {
    const stats = await Company.getStatistics();
    
    sendSuccess(res, stats, 'Company statistics retrieved successfully');
});

// Web controllers (for rendering views)

// Display companies list page
const showCompaniesPage = asyncHandler(async (req, res) => {
    const { page, limit } = getPaginationParams(req);
    const filters = {
        is_active: req.query.is_active,
        search: req.query.search
    };

    const result = await Company.findPaginated(page, limit, filters);
    
    res.render('companies/index', {
        title: 'Companies',
        companies: result.data,
        pagination: result.pagination,
        filters: filters,
        query: req.query,
        success: req.flash('success'),
        error: req.flash('error')
    });
});

// Display create company form
const showCreateCompanyForm = asyncHandler(async (req, res) => {
    res.render('companies/create', {
        title: 'Create Company',
        error: req.flash('error')
    });
});

// Display edit company form
const showEditCompanyForm = asyncHandler(async (req, res) => {
    const company = await Company.findByCode(req.params.code);
    
    if (!company) {
        req.flash('error', 'Company not found');
        return res.redirect('/companies');
    }
    
    res.render('companies/edit', {
        title: 'Edit Company',
        company: company,
        error: req.flash('error')
    });
});

// Handle create company form submission
const handleCreateCompany = asyncHandler(async (req, res) => {
    try {
        const companyData = {
            company_code: req.body.company_code,
            company_name_th: req.body.company_name_th,
            company_name_en: req.body.company_name_en,
            tax_id: req.body.tax_id,
            is_active: req.body.is_active === 'on',
            created_by: req.user?.username || 'admin'
        };

        const company = new Company(companyData);
        await company.create();
        
        req.flash('success', 'Company created successfully');
        res.redirect('/companies');
    } catch (error) {
        logger.error('Error creating company:', error);
        req.flash('error', error.message);
        res.redirect('/companies/new');
    }
});

// Handle update company form submission
const handleUpdateCompany = asyncHandler(async (req, res) => {
    try {
        const company = await Company.findByCode(req.params.code);
        
        if (!company) {
            req.flash('error', 'Company not found');
            return res.redirect('/companies');
        }
        
        // Update fields
        company.company_name_th = req.body.company_name_th;
        company.company_name_en = req.body.company_name_en;
        company.tax_id = req.body.tax_id;
        company.updated_by = req.user?.username || 'admin';
        
        await company.update();
        
        req.flash('success', 'Company updated successfully');
        res.redirect('/companies');
    } catch (error) {
        logger.error('Error updating company:', error);
        req.flash('error', error.message);
        res.redirect(`/companies/${req.params.code}/edit`);
    }
});

// Handle toggle company status
const handleToggleStatus = asyncHandler(async (req, res) => {
    try {
        const company = await Company.findByCode(req.params.code);
        
        if (!company) {
            req.flash('error', 'Company not found');
            return res.redirect('/companies');
        }
        
        const newStatus = !company.is_active;
        await Company.updateStatus(req.params.code, newStatus, req.user?.username || 'admin');
        
        req.flash('success', `Company ${newStatus ? 'activated' : 'deactivated'} successfully`);
        res.redirect('/companies');
    } catch (error) {
        logger.error('Error toggling company status:', error);
        req.flash('error', error.message);
        res.redirect('/companies');
    }
});

module.exports = {
    // API controllers
    getAllCompanies,
    getCompanyByCode,
    createCompany,
    updateCompany,
    updateCompanyStatus,
    getCompanyStatistics,
    
    // Web controllers
    showCompaniesPage,
    showCreateCompanyForm,
    showEditCompanyForm,
    handleCreateCompany,
    handleUpdateCompany,
    handleToggleStatus
};