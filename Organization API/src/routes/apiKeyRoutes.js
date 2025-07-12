const express = require('express');
const router = express.Router();
const apiKeyController = require('../controllers/apiKeyController');

// Display all API keys
router.get('/', apiKeyController.showApiKeysPage);

// Display create form
router.get('/new', apiKeyController.showCreateApiKeyForm);

// Create API key
router.post('/', apiKeyController.handleCreateApiKey);

// Show newly created API key (one time only)
router.get('/:id/show', apiKeyController.showNewApiKey);

// Display API key details
router.get('/:id', apiKeyController.showApiKeyDetails);

// Display edit form
router.get('/:id/edit', apiKeyController.showEditApiKeyForm);

// Update API key
router.post('/:id', apiKeyController.handleUpdateApiKey);

// Toggle status
router.post('/:id/toggle-status', apiKeyController.handleToggleStatus);

// Regenerate API key
router.post('/:id/regenerate', apiKeyController.handleRegenerateApiKey);

// View API logs
router.get('/:id/logs', apiKeyController.showApiLogs);

module.exports = router;