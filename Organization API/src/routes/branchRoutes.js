// Path: /src/routes/branchRoutes.js
const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const { validate } = require('../middleware/validation');
const branchValidator = require('../validators/branchValidator');

// Display all branches
router.get('/', 
    branchValidator.searchBranchesRules(),
    validate,
    branchController.showBranchesPage
);

// Display create form (ต้องอยู่ก่อน /:code)
router.get('/new', branchController.showCreateBranchForm);

// Create branch
router.post('/', 
    branchValidator.createBranchRules(),
    validate,
    branchController.handleCreateBranch
);

// Display branch details
router.get('/:code', 
    branchValidator.getBranchByCodeRules(),
    validate,
    branchController.showBranchDetails
);

// Display edit form
router.get('/:code/edit', 
    branchValidator.getBranchByCodeRules(),
    validate,
    branchController.showEditBranchForm
);

// Update branch
router.post('/:code', 
    branchValidator.updateBranchRules(),
    validate,
    branchController.handleUpdateBranch
);

// Delete branch
router.post('/:code/delete',
    branchValidator.getBranchByCodeRules(),
    validate,
    branchController.handleDeleteBranch
);

// Toggle status
router.post('/:code/toggle-status', 
    branchValidator.getBranchByCodeRules(),
    validate,
    branchController.handleToggleStatus
);

module.exports = router;