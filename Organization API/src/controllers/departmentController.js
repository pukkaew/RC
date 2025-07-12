const Department = require('../models/Department');
const Division = require('../models/Division');
const Company = require('../models/Company');
const { asyncHandler } = require('../middleware/errorHandler');
const { getPaginationParams } = require('../utils/pagination');
const logger = require('../utils/logger');

// Display departments list page
const showDepartmentsPage = asyncHandler(async (req, res) => {
    const { page, limit } = getPaginationParams(req);
    const filters = {
        division_code: req.query.division_code,
        company_code: req.query.company_code,
        branch_code: req.query.branch_code,
        is_active: req.query.is_active,
        search: req.query.search
    };

    const [result, companies, divisions] = await Promise.all([
        Department.findPaginated(page, limit, filters),
        Company.findAll({ is_active: true }),
        Division.findAll({ is_active: true })
    ]);
    
    res.render('departments/index', {
        title: 'Departments',
        departments: result.data,
        pagination: result.pagination,
        companies: companies,
        divisions: divisions,
        filters: filters,
        query: req.query,
        success: req.flash('success'),
        error: req.flash('error')
    });
});

// Display create department form
const showCreateDepartmentForm = asyncHandler(async (req, res) => {
    const divisions = await Division.findAll({ is_active: true });
    
    res.render('departments/create', {
        title: 'Create Department',
        divisions: divisions,
        selectedDivision: req.query.division_code,
        error: req.flash('error')
    });
});

// Display edit department form
const showEditDepartmentForm = asyncHandler(async (req, res) => {
    const department = await Department.findByCode(req.params.code);
    
    if (!department) {
        req.flash('error', 'Department not found');
        return res.redirect('/departments');
    }
    
    const divisions = await Division.findAll({ is_active: true });
    
    res.render('departments/edit', {
        title: 'Edit Department',
        department: department,
        divisions: divisions,
        error: req.flash('error')
    });
});

// Handle create department form submission
const handleCreateDepartment = asyncHandler(async (req, res) => {
    try {
        const departmentData = {
            department_code: req.body.department_code,
            department_name: req.body.department_name,
            division_code: req.body.division_code,
            is_active: req.body.is_active === 'on',
            created_by: req.user?.username || 'admin'
        };

        const department = new Department(departmentData);
        await department.create();
        
        logger.info(`Department created: ${department.department_code} by ${departmentData.created_by}`);
        
        req.flash('success', 'Department created successfully');
        res.redirect('/departments');
    } catch (error) {
        logger.error('Error creating department:', error);
        req.flash('error', error.message);
        res.redirect('/departments/new');
    }
});

// Handle update department form submission
const handleUpdateDepartment = asyncHandler(async (req, res) => {
    try {
        const department = await Department.findByCode(req.params.code);
        
        if (!department) {
            req.flash('error', 'Department not found');
            return res.redirect('/departments');
        }
        
        // Update fields
        department.department_name = req.body.department_name;
        department.updated_by = req.user?.username || 'admin';
        
        await department.update();
        
        logger.info(`Department updated: ${department.department_code} by ${department.updated_by}`);
        
        req.flash('success', 'Department updated successfully');
        res.redirect('/departments');
    } catch (error) {
        logger.error('Error updating department:', error);
        req.flash('error', error.message);
        res.redirect(`/departments/${req.params.code}/edit`);
    }
});

// Handle toggle department status
const handleToggleStatus = asyncHandler(async (req, res) => {
    try {
        const department = await Department.findByCode(req.params.code);
        
        if (!department) {
            req.flash('error', 'Department not found');
            return res.redirect('/departments');
        }
        
        const newStatus = !department.is_active;
        await Department.updateStatus(req.params.code, newStatus, req.user?.username || 'admin');
        
        logger.info(`Department status updated: ${req.params.code} to ${newStatus ? 'active' : 'inactive'}`);
        
        req.flash('success', `Department ${newStatus ? 'activated' : 'deactivated'} successfully`);
        res.redirect('/departments');
    } catch (error) {
        logger.error('Error toggling department status:', error);
        req.flash('error', error.message);
        res.redirect('/departments');
    }
});

// Handle move department to another division
const handleMoveDepartment = asyncHandler(async (req, res) => {
    try {
        const result = await Department.moveToDivision(
            req.params.code,
            req.body.division_code,
            req.user?.username || 'admin'
        );
        
        logger.info(`Department ${req.params.code} moved to division ${req.body.division_code}`);
        
        req.flash('success', 'Department moved successfully');
        res.redirect('/departments');
    } catch (error) {
        logger.error('Error moving department:', error);
        req.flash('error', error.message);
        res.redirect('/departments');
    }
});

// AJAX endpoint to get divisions by company
const getDivisionsByCompany = asyncHandler(async (req, res) => {
    const companyCode = req.params.companyCode;
    const divisions = await Division.findByCompany(companyCode);
    
    res.json({
        success: true,
        data: divisions
    });
});

module.exports = {
    showDepartmentsPage,
    showCreateDepartmentForm,
    showEditDepartmentForm,
    handleCreateDepartment,
    handleUpdateDepartment,
    handleToggleStatus,
    handleMoveDepartment,
    getDivisionsByCompany
};