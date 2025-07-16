// Path: /src/routes/apiKeyRoutes.js
const express = require('express');
const router = express.Router();
const apiKeyController = require('../controllers/apiKeyController');

// Display all API keys
router.get('/', apiKeyController.showApiKeysPage);

// Display create form
router.get('/new', apiKeyController.showCreateApiKeyForm);

// Create API key
router.post('/', apiKeyController.handleCreateApiKey);

// Show API key details
router.get('/:id', apiKeyController.showApiKeyDetails);

// Toggle status
router.post('/:id/toggle-status', apiKeyController.handleToggleStatus);

// Regenerate API key - Comment ไว้ก่อนถ้ายังไม่มี function นี้
// router.post('/:id/regenerate', apiKeyController.handleRegenerateKey);

module.exports = router;