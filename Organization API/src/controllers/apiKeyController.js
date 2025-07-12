const ApiKey = require('../models/ApiKey');
const ApiLog = require('../models/ApiLog');
const { asyncHandler } = require('../middleware/errorHandler');
const { getPaginationParams } = require('../utils/pagination');
const logger = require('../utils/logger');

// Display API keys list page
const showApiKeysPage = asyncHandler(async (req, res) => {
    const { page, limit } = getPaginationParams(req);
    const filters = {
        is_active: req.query.is_active,
        permissions: req.query.permissions,
        search: req.query.search
    };

    const result = await ApiKey.findPaginated(page, limit, filters);
    
    // Get usage statistics for each API key
    const apiKeysWithStats = await Promise.all(
        result.data.map(async (apiKey) => {
            const usage = await ApiLog.getStatistics({
                api_key_id: apiKey.api_key_id,
                date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            });
            
            return {
                ...apiKey,
                usage: {
                    total_requests: usage.total_requests || 0,
                    success_rate: usage.total_requests > 0 
                        ? ((usage.successful_requests / usage.total_requests) * 100).toFixed(1)
                        : 0
                }
            };
        })
    );
    
    res.render('api-keys/index', {
        title: 'API Keys',
        apiKeys: apiKeysWithStats,
        pagination: result.pagination,
        filters: filters,
        query: req.query,
        success: req.flash('success'),
        error: req.flash('error')
    });
});

// Display create API key form
const showCreateApiKeyForm = asyncHandler(async (req, res) => {
    res.render('api-keys/create', {
        title: 'Create API Key',
        error: req.flash('error')
    });
});

// Handle create API key form submission
const handleCreateApiKey = asyncHandler(async (req, res) => {
    try {
        const apiKeyData = {
            app_name: req.body.app_name,
            description: req.body.description,
            permissions: req.body.permissions,
            expires_date: req.body.expires_date || null,
            is_active: true,
            created_by: req.user?.username || 'admin'
        };

        const apiKey = new ApiKey(apiKeyData);
        const result = await apiKey.create();
        
        logger.info(`API Key created for app: ${result.app_name} by ${apiKeyData.created_by}`);
        
        // Store the API key temporarily in session to show it once
        req.session.newApiKey = result.api_key;
        req.flash('success', 'API Key created successfully. Make sure to copy it now!');
        
        res.redirect(`/api-keys/${result.api_key_id}/show`);
    } catch (error) {
        logger.error('Error creating API key:', error);
        req.flash('error', error.message);
        res.redirect('/api-keys/new');
    }
});

// Show newly created API key (one time only)
const showNewApiKey = asyncHandler(async (req, res) => {
    const apiKey = await ApiKey.findById(req.params.id);
    
    if (!apiKey) {
        req.flash('error', 'API Key not found');
        return res.redirect('/api-keys');
    }
    
    // Get the actual key from session (only available once)
    const actualKey = req.session.newApiKey;
    delete req.session.newApiKey;
    
    if (!actualKey) {
        req.flash('error', 'API Key has already been viewed');
        return res.redirect('/api-keys');
    }
    
    res.render('api-keys/show', {
        title: 'API Key Created',
        apiKey: apiKey,
        actualKey: actualKey
    });
});

// Display API key details
const showApiKeyDetails = asyncHandler(async (req, res) => {
    const apiKey = await ApiKey.findById(req.params.id);
    
    if (!apiKey) {
        req.flash('error', 'API Key not found');
        return res.redirect('/api-keys');
    }
    
    // Get usage statistics
    const [
        last24Hours,
        last7Days,
        last30Days,
        recentLogs,
        endpointStats
    ] = await Promise.all([
        ApiLog.getStatistics({
            api_key_id: apiKey.api_key_id,
            date_from: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }),
        ApiLog.getStatistics({
            api_key_id: apiKey.api_key_id,
            date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }),
        ApiLog.getStatistics({
            api_key_id: apiKey.api_key_id,
            date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }),
        ApiLog.findPaginated(1, 20, {
            api_key_id: apiKey.api_key_id
        }),
        ApiLog.getEndpointStatistics({
            api_key_id: apiKey.api_key_id,
            date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        })
    ]);
    
    // Get hourly statistics for chart
    const hourlyStats = await ApiLog.getHourlyStatistics(new Date());
    
    res.render('api-keys/details', {
        title: `API Key: ${apiKey.app_name}`,
        apiKey: apiKey,
        stats: {
            last24Hours,
            last7Days,
            last30Days
        },
        recentLogs: recentLogs.data,
        endpointStats,
        hourlyStats: JSON.stringify(hourlyStats),
        success: req.flash('success'),
        error: req.flash('error')
    });
});

// Display edit API key form
const showEditApiKeyForm = asyncHandler(async (req, res) => {
    const apiKey = await ApiKey.findById(req.params.id);
    
    if (!apiKey) {
        req.flash('error', 'API Key not found');
        return res.redirect('/api-keys');
    }
    
    res.render('api-keys/edit', {
        title: 'Edit API Key',
        apiKey: apiKey,
        error: req.flash('error')
    });
});

// Handle update API key form submission
const handleUpdateApiKey = asyncHandler(async (req, res) => {
    try {
        const apiKey = await ApiKey.findById(req.params.id);
        
        if (!apiKey) {
            req.flash('error', 'API Key not found');
            return res.redirect('/api-keys');
        }
        
        // Update fields
        apiKey.app_name = req.body.app_name;
        apiKey.description = req.body.description;
        apiKey.permissions = req.body.permissions;
        apiKey.expires_date = req.body.expires_date || null;
        apiKey.updated_by = req.user?.username || 'admin';
        
        await apiKey.update();
        
        logger.info(`API Key updated: ${apiKey.app_name} by ${apiKey.updated_by}`);
        
        req.flash('success', 'API Key updated successfully');
        res.redirect(`/api-keys/${apiKey.api_key_id}`);
    } catch (error) {
        logger.error('Error updating API key:', error);
        req.flash('error', error.message);
        res.redirect(`/api-keys/${req.params.id}/edit`);
    }
});

// Handle toggle API key status
const handleToggleStatus = asyncHandler(async (req, res) => {
    try {
        const apiKey = await ApiKey.findById(req.params.id);
        
        if (!apiKey) {
            req.flash('error', 'API Key not found');
            return res.redirect('/api-keys');
        }
        
        const newStatus = !apiKey.is_active;
        await ApiKey.updateStatus(req.params.id, newStatus, req.user?.username || 'admin');
        
        logger.info(`API Key ${apiKey.app_name} ${newStatus ? 'activated' : 'deactivated'} by ${req.user?.username || 'admin'}`);
        
        req.flash('success', `API Key ${newStatus ? 'activated' : 'deactivated'} successfully`);
        res.redirect('/api-keys');
    } catch (error) {
        logger.error('Error toggling API key status:', error);
        req.flash('error', error.message);
        res.redirect('/api-keys');
    }
});

// Handle regenerate API key
const handleRegenerateApiKey = asyncHandler(async (req, res) => {
    try {
        const oldApiKey = await ApiKey.findById(req.params.id);
        
        if (!oldApiKey) {
            req.flash('error', 'API Key not found');
            return res.redirect('/api-keys');
        }
        
        // Deactivate old key
        await ApiKey.updateStatus(oldApiKey.api_key_id, false, req.user?.username || 'admin');
        
        // Create new key with same settings
        const newApiKeyData = {
            app_name: oldApiKey.app_name + ' (Regenerated)',
            description: oldApiKey.description,
            permissions: oldApiKey.permissions,
            expires_date: oldApiKey.expires_date,
            is_active: true,
            created_by: req.user?.username || 'admin'
        };
        
        const newApiKey = new ApiKey(newApiKeyData);
        const result = await newApiKey.create();
        
        logger.info(`API Key regenerated for app: ${oldApiKey.app_name} by ${newApiKeyData.created_by}`);
        
        // Store the API key temporarily in session to show it once
        req.session.newApiKey = result.api_key;
        req.flash('success', 'API Key regenerated successfully. The old key has been deactivated.');
        
        res.redirect(`/api-keys/${result.api_key_id}/show`);
    } catch (error) {
        logger.error('Error regenerating API key:', error);
        req.flash('error', error.message);
        res.redirect('/api-keys');
    }
});

// API logs for specific key
const showApiLogs = asyncHandler(async (req, res) => {
    const apiKey = await ApiKey.findById(req.params.id);
    
    if (!apiKey) {
        req.flash('error', 'API Key not found');
        return res.redirect('/api-keys');
    }
    
    const { page, limit } = getPaginationParams(req);
    const filters = {
        api_key_id: apiKey.api_key_id,
        endpoint: req.query.endpoint,
        method: req.query.method,
        status_code: req.query.status_code,
        date_from: req.query.date_from,
        date_to: req.query.date_to
    };
    
    const result = await ApiLog.findPaginated(page, limit, filters);
    
    res.render('api-keys/logs', {
        title: `API Logs: ${apiKey.app_name}`,
        apiKey: apiKey,
        logs: result.data,
        pagination: result.pagination,
        filters: filters,
        query: req.query
    });
});

module.exports = {
    showApiKeysPage,
    showCreateApiKeyForm,
    handleCreateApiKey,
    showNewApiKey,
    showApiKeyDetails,
    showEditApiKeyForm,
    handleUpdateApiKey,
    handleToggleStatus,
    handleRegenerateApiKey,
    showApiLogs
};