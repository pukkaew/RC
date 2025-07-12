const Branch = require('../models/Branch');
const Company = require('../models/Company');
const { asyncHandler } = require('../middleware/errorHandler');
const { getPaginationParams } = require('../utils/pagination');
const logger = require('../utils/logger');

// Display branches list page
const showBranchesPage = asyncHandler(async (req, res) => {
    const { page, limit } = getPaginationParams(req);
    const filters = {
        company_code: req.query.company_code,
        is_active: req.query.is_active,
        is_headquarters: req.query.is_headquarters,
        search: req.query.search
    };

    const [result, companies] = await Promise.all([
        Branch.findPaginated(page, limit, filters),
        Company.findAll({ is_active: true })
    ]);
    
    res.render('branches/index', {
        title: 'Branches',
        branches: result.data,
        pagination: result.pagination,
        companies: companies,
        filters: filters,
        query: req.query,
        success: req.flash('success'),
        error: req.flash('error')
    });
});

// Display create branch form
const showCreateBranchForm = asyncHandler(async (req, res) => {
    const companies = await Company.findAll({ is_active: true });
    
    res.render('branches/create', {
        title: 'Create Branch',
        companies: companies,
        selectedCompany: req.query.company_code,
        error: req.flash('error')
    });
});

// Display edit branch form
const showEditBranchForm = asyncHandler(async (req, res) => {
    const branch = await Branch.findByCode(req.params.code);
    
    if (!branch) {
        req.flash('error', 'Branch not found');
        return res.redirect('/branches');
    }
    
    const companies = await Company.findAll({ is_active: true });
    
    res.render('branches/edit', {
        title: 'Edit Branch',
        branch: branch,
        companies: companies,
        error: req.flash('error')
    });
});

// Handle create branch form submission
const handleCreateBranch = asyncHandler(async (req, res) => {
    try {
        const branchData = {
            branch_code: req.body.branch_code,
            branch_name: req.body.branch_name,
            company_code: req.body.company_code,
            is_headquarters: req.body.is_headquarters === 'on',
            is_active: req.body.is_active === 'on',
            created_by: req.user?.username || 'admin'
        };

        const branch = new Branch(branchData);
        await branch.create();
        
        logger.info(`Branch created: ${branch.branch_code} by ${branchData.created_by}`);
        
        req.flash('success', 'Branch created successfully');
        res.redirect('/branches');
    } catch (error) {
        logger.error('Error creating branch:', error);
        req.flash('error', error.message);
        res.redirect('/branches/new');
    }
});

// Handle update branch form submission
const handleUpdateBranch = asyncHandler(async (req, res) => {
    try {
        const branch = await Branch.findByCode(req.params.code);
        
        if (!branch) {
            req.flash('error', 'Branch not found');
            return res.redirect('/branches');
        }
        
        // Update fields
        branch.branch_name = req.body.branch_name;
        branch.is_headquarters = req.body.is_headquarters === 'on';
        branch.updated_by = req.user?.username || 'admin';
        
        await branch.update();
        
        logger.info(`Branch updated: ${branch.branch_code} by ${branch.updated_by}`);
        
        req.flash('success', 'Branch updated successfully');
        res.redirect('/branches');
    } catch (error) {
        logger.error('Error updating branch:', error);
        req.flash('error', error.message);
        res.redirect(`/branches/${req.params.code}/edit`);
    }
});

// Handle toggle branch status
const handleToggleStatus = asyncHandler(async (req, res) => {
    try {
        const branch = await Branch.findByCode(req.params.code);
        
        if (!branch) {
            req.flash('error', 'Branch not found');
            return res.redirect('/branches');
        }
        
        const newStatus = !branch.is_active;
        await Branch.updateStatus(req.params.code, newStatus, req.user?.username || 'admin');
        
        logger.info(`Branch status updated: ${req.params.code} to ${newStatus ? 'active' : 'inactive'}`);
        
        req.flash('success', `Branch ${newStatus ? 'activated' : 'deactivated'} successfully`);
        res.redirect('/branches');
    } catch (error) {
        logger.error('Error toggling branch status:', error);
        req.flash('error', error.message);
        res.redirect('/branches');
    }
});

module.exports = {
    showBranchesPage,
    showCreateBranchForm,
    showEditBranchForm,
    handleCreateBranch,
    handleUpdateBranch,
    handleToggleStatus
};