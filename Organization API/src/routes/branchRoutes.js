// Path: /src/routes/branchRoutes.js
const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');

// Display all branches
router.get('/', branchController.showBranchesPage);

// Display create form (ต้องอยู่ก่อน /:code)
router.get('/new', branchController.showCreateBranchForm);

// Create branch
router.post('/', branchController.handleCreateBranch);

// Display edit form
router.get('/:code/edit', branchController.showEditBranchForm);

// Update branch
router.post('/:code', branchController.handleUpdateBranch);

// Toggle status
router.post('/:code/toggle-status', branchController.handleToggleStatus);

module.exports = router;