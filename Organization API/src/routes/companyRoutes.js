// Path: /src/routes/companyRoutes.js
const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');

// Display all companies
router.get('/', companyController.showCompaniesPage);

// Display create form (ต้องอยู่ก่อน /:code)
router.get('/new', companyController.showCreateCompanyForm);

// Create company
router.post('/', companyController.handleCreateCompany);

// Display edit form
router.get('/:code/edit', companyController.showEditCompanyForm);

// Update company
router.post('/:code', companyController.handleUpdateCompany);

// Toggle status
router.post('/:code/toggle-status', companyController.handleToggleStatus);

module.exports = router;