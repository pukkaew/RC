// Path: /src/routes/divisionRoutes.js
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

// Display create form (ต้องอยู่ก่อน /:code)
router.get('/new', divisionController.showCreateDivisionForm);

// Create division
router.post('/', 
    divisionValidator.createDivisionRules(),
    validate,
    divisionController.handleCreateDivision
);

// Display division details
router.get('/:code', 
    divisionValidator.getDivisionByCodeRules(),
    validate,
    divisionController.showDivisionDetails
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

// Delete division
router.post('/:code/delete',
    divisionValidator.getDivisionByCodeRules(),
    validate,
    divisionController.handleDeleteDivision
);

// Toggle status
router.post('/:code/toggle-status', 
    divisionValidator.getDivisionByCodeRules(),
    validate,
    divisionController.handleToggleStatus
);

module.exports = router;