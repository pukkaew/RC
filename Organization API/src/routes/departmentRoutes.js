const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { validate } = require('../middleware/validation');
const departmentValidator = require('../validators/departmentValidator');

// Display all departments
router.get('/', 
    departmentValidator.searchDepartmentsRules(),
    validate,
    departmentController.showDepartmentsPage
);

// Display create form
router.get('/new', departmentController.showCreateDepartmentForm);

// Create department
router.post('/', 
    departmentValidator.createDepartmentRules(),
    validate,
    departmentController.handleCreateDepartment
);

// Display edit form
router.get('/:code/edit', 
    departmentValidator.getDepartmentByCodeRules(),
    validate,
    departmentController.showEditDepartmentForm
);

// Update department
router.post('/:code', 
    departmentValidator.updateDepartmentRules(),
    validate,
    departmentController.handleUpdateDepartment
);

// Toggle status
router.post('/:code/toggle-status', 
    departmentValidator.getDepartmentByCodeRules(),
    validate,
    departmentController.handleToggleStatus
);

// Move department
router.post('/:code/move', 
    departmentValidator.moveDepartmentRules(),
    validate,
    departmentController.handleMoveDepartment
);

// AJAX: Get divisions by company
router.get('/ajax/company/:companyCode/divisions', 
    departmentController.getDivisionsByCompany
);

module.exports = router;