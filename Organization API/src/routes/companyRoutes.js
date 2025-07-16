// Path: /src/routes/companyRoutes.js
const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { validate } = require('../middleware/validation');
const companyValidator = require('../validators/companyValidator');

// Display all companies
router.get('/', 
    companyValidator.searchCompaniesRules(),
    validate,
    companyController.showCompaniesPage
);

// Display create form (ต้องอยู่ก่อน /:code)
router.get('/new', companyController.showCreateCompanyForm);

// Create company
router.post('/', 
    companyValidator.createCompanyRules(),
    validate,
    companyController.handleCreateCompany
);

// Display company details
router.get('/:code', 
    companyValidator.getCompanyByCodeRules(),
    validate,
    companyController.showCompanyDetails
);

// Display edit form
router.get('/:code/edit', 
    companyValidator.getCompanyByCodeRules(),
    validate,
    companyController.showEditCompanyForm
);

// Update company
router.post('/:code', 
    companyValidator.updateCompanyRules(),
    validate,
    companyController.handleUpdateCompany
);

// Delete company
router.post('/:code/delete',
    companyValidator.getCompanyByCodeRules(),
    validate,
    companyController.handleDeleteCompany
);

// Toggle status
router.post('/:code/toggle-status', 
    companyValidator.getCompanyByCodeRules(),
    validate,
    companyController.handleToggleStatus
);

module.exports = router;