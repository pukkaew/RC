const express = require('express');
const router = express.Router();
const divisionController = require('../controllers/divisionController');
const { validate } = require('../middleware/validation');
const divisionValidator = require('../validators/divisionValidator');

// Display all divisions
router.get('/', 
    divisionValidator.searchDivisionsRules(),
    validate,
    divisionController.showDivisionsPage
);

// Display create form
router.get('/new', divisionController.showCreateDivisionForm);

// Create division
router.post('/', 
    divisionValidator.createDivisionRules(),
    validate,
    divisionController.handleCreateDivision
);

// Display edit form
router.get('/:code/edit', 
    divisionValidator.getDivisionByCodeRules(),
    validate,
    divisionController.showEditDivisionForm
);

// Update division
router.post('/:code', 
    divisionValidator.updateDivisionRules(),
    validate,
    divisionController.handleUpdateDivision
);

// Toggle status
router.post('/:code/toggle-status', 
    divisionValidator.getDivisionByCodeRules(),
    validate,
    divisionController.handleToggleStatus
);

// AJAX: Get branches by company
router.get('/ajax/company/:companyCode/branches', 
    divisionController.getBranchesByCompany
);

module.exports = router;