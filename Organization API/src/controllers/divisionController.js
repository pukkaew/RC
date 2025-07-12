const Division = require('../models/Division');
const Company = require('../models/Company');
const Branch = require('../models/Branch');
const { asyncHandler } = require('../middleware/errorHandler');
const { getPaginationParams } = require('../utils/pagination');
const logger = require('../utils/logger');

// Display divisions list page
const showDivisionsPage = asyncHandler(async (req, res) => {
    const { page, limit } = getPaginationParams(req);
    const filters = {
        company_code: req.query.company_code,
        branch_code: req.query.branch_code,
        is_active: req.query.is_active,
        search: req.query.search
    };

    const [result, companies] = await Promise.all([
        Division.findPaginated(page, limit, filters),
        Company.findAll({ is_active: true })
    ]);
    
    res.render('divisions/index', {
        title: 'Divisions',
        divisions: result.data,
        pagination: result.pagination,
        companies: companies,
        filters: filters,
        query: req.query,
        success: req.flash('success'),
        error: req.flash('error')
    });
});

// Display create division form
const showCreateDivisionForm = asyncHandler(async (req, res) => {
    const companies = await Company.findAll({ is_active: true });
    
    res.render('divisions/create', {
        title: 'Create Division',
        companies: companies,
        selectedCompany: req.query.company_code,
        error: req.flash('error')
    });
});

// Display edit division form
const showEditDivisionForm = asyncHandler(async (req, res) => {
    const division = await Division.findByCode(req.params.code);
    
    if (!division) {
        req.flash('error', 'Division not found');
        return res.redirect('/divisions');
    }
    
    const [companies, branches] = await Promise.all([
        Company.findAll({ is_active: true }),
        Branch.findByCompany(division.company_code)
    ]);
    
    res.render('divisions/edit', {
        title: 'Edit Division',
        division: division,
        companies: companies,
        branches: branches,
        error: req.flash('error')
    });
});

// Handle create division form submission
const handleCreateDivision = asyncHandler(async (req, res) => {
    try {
        const divisionData = {
            division_code: req.body.division_code,
            division_name: req.body.division_name,
            company_code: req.body.company_code,
            branch_code: req.body.branch_code || null,
            is_active: req.body.is_active === 'on',
            created_by: req.user?.username || 'admin'
        };

        const division = new Division(divisionData);
        await division.create();
        
        logger.info(`Division created: ${division.division_code} by ${divisionData.created_by}`);
        
        req.flash('success', 'Division created successfully');
        res.redirect('/divisions');
    } catch (error) {
        logger.error('Error creating division:', error);
        req.flash('error', error.message);
        res.redirect('/divisions/new');
    }
});

// Handle update division form submission
const handleUpdateDivision = asyncHandler(async (req, res) => {
    try {
        const division = await Division.findByCode(req.params.code);
        
        if (!division) {
            req.flash('error', 'Division not found');
            return res.redirect('/divisions');
        }
        
        // Update fields
        division.division_name = req.body.division_name;
        division.branch_code = req.body.branch_code || null;
        division.updated_by = req.user?.username || 'admin';
        
        await division.update();
        
        logger.info(`Division updated: ${division.division_code} by ${division.updated_by}`);
        
        req.flash('success', 'Division updated successfully');
        res.redirect('/divisions');
    } catch (error) {
        logger.error('Error updating division:', error);
        req.flash('error', error.message);
        res.redirect(`/divisions/${req.params.code}/edit`);
    }
});

// Handle toggle division status
const handleToggleStatus = asyncHandler(async (req, res) => {
    try {
        const division = await Division.findByCode(req.params.code);
        
        if (!division) {
            req.flash('error', 'Division not found');
            return res.redirect('/divisions');
        }
        
        const newStatus = !division.is_active;
        await Division.updateStatus(req.params.code, newStatus, req.user?.username || 'admin');
        
        logger.info(`Division status updated: ${req.params.code} to ${newStatus ? 'active' : 'inactive'}`);
        
        req.flash('success', `Division ${newStatus ? 'activated' : 'deactivated'} successfully`);
        res.redirect('/divisions');
    } catch (error) {
        logger.error('Error toggling division status:', error);
        req.flash('error', error.message);
        res.redirect('/divisions');
    }
});

// AJAX endpoint to get branches by company
const getBranchesByCompany = asyncHandler(async (req, res) => {
    const companyCode = req.params.companyCode;
    const branches = await Branch.findByCompany(companyCode);
    
    res.json({
        success: true,
        data: branches
    });
});

module.exports = {
    showDivisionsPage,
    showCreateDivisionForm,
    showEditDivisionForm,
    handleCreateDivision,
    handleUpdateDivision,
    handleToggleStatus,
    getBranchesByCompany
};