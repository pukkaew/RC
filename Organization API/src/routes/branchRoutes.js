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

// Display create form
router.get('/new', branchController.showCreateBranchForm);

// Create branch
router.post('/', 
    branchValidator.createBranchRules(),
    validate,
    branchController.handleCreateBranch
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

// Toggle status
router.post('/:code/toggle-status', 
    branchValidator.getBranchByCodeRules(),
    validate,
    branchController.handleToggleStatus
);

module.exports = router;