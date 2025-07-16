// Path: /src/routes/departmentRoutes.js
const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');

// Display all departments
router.get('/', departmentController.showDepartmentsPage);

// Display create form (ต้องอยู่ก่อน /:code)
router.get('/new', departmentController.showCreateDepartmentForm);

// Create department
router.post('/', departmentController.handleCreateDepartment);

// Display edit form
router.get('/:code/edit', departmentController.showEditDepartmentForm);

// Update department
router.post('/:code', departmentController.handleUpdateDepartment);

// Toggle status
router.post('/:code/toggle-status', departmentController.handleToggleStatus);

module.exports = router;