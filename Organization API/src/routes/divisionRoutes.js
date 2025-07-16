// Path: /src/routes/divisionRoutes.js
const express = require('express');
const router = express.Router();
const divisionController = require('../controllers/divisionController');

// Display all divisions
router.get('/', divisionController.showDivisionsPage);

// Display create form (ต้องอยู่ก่อน /:code)
router.get('/new', divisionController.showCreateDivisionForm);

// Create division
router.post('/', divisionController.handleCreateDivision);

// Display edit form
router.get('/:code/edit', divisionController.showEditDivisionForm);

// Update division
router.post('/:code', divisionController.handleUpdateDivision);

// Toggle status
router.post('/:code/toggle-status', divisionController.handleToggleStatus);

module.exports = router;