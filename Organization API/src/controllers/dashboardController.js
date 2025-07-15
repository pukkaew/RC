// Path: /src/controllers/dashboardController.js
const logger = require('../utils/logger');

// Simple dashboard controller without database
const showDashboard = async (req, res) => {
    try {
        // Mock data for testing (ในระบบจริงจะดึงจาก database)
        const stats = {
            companies: {
                total_companies: 5,
                active_companies: 4
            },
            branches: {
                total_branches: 12,
                active_branches: 10
            },
            divisions: {
                total_divisions: 25,
                active_divisions: 22
            },
            departments: {
                total_departments: 48,
                active_departments: 45
            },
            apiKeys: {
                total_keys: 8,
                active_keys: 7,
                read_only_keys: 3,
                write_only_keys: 1,
                read_write_keys: 4
            },
            apiUsage: {
                total_requests: 1523,
                successful_requests: 1456,
                failed_requests: 67,
                average_response_time: 123
            }
        };
        
        // Mock recent activities
        const recentActivities = [
            {
                entity_type: 'Company',
                entity_code: 'COMP001',
                entity_name: 'บริษัท ABC จำกัด',
                action: 'created',
                created_by: 'admin',
                action_date: new Date()
            },
            {
                entity_type: 'Branch',
                entity_code: 'BR001',
                entity_name: 'สาขาเชียงใหม่',
                action: 'updated',
                updated_by: 'admin',
                action_date: new Date(Date.now() - 3600000)
            }
        ];
        
        // Mock recent API logs
        const recentApiLogs = [
            {
                endpoint: '/api/v1/companies',
                method: 'GET',
                response_status: 200,
                response_time_ms: 45,
                created_date: new Date()
            },
            {
                endpoint: '/api/v1/branches',
                method: 'POST',
                response_status: 201,
                response_time_ms: 123,
                created_date: new Date(Date.now() - 600000)
            }
        ];
        
        // Mock endpoint stats
        const endpointStats = [
            { endpoint: '/api/v1/companies', method: 'GET', request_count: 234, avg_response_time: 45 },
            { endpoint: '/api/v1/branches', method: 'GET', request_count: 189, avg_response_time: 52 },
            { endpoint: '/api/v1/departments', method: 'GET', request_count: 156, avg_response_time: 38 },
            { endpoint: '/api/v1/divisions', method: 'GET', request_count: 134, avg_response_time: 41 },
            { endpoint: '/api/v1/companies', method: 'POST', request_count: 89, avg_response_time: 124 }
        ];
        
        // Mock chart data
        const chartData = {
            hourlyRequests: Array.from({ length: 24 }, (_, i) => ({
                hour: i,
                requests: Math.floor(Math.random() * 100) + 20
            })),
            entityDistribution: [
                { name: 'Companies', value: stats.companies.total_companies },
                { name: 'Branches', value: stats.branches.total_branches },
                { name: 'Divisions', value: stats.divisions.total_divisions },
                { name: 'Departments', value: stats.departments.total_departments }
            ],
            apiKeyTypes: [
                { name: 'Read Only', value: stats.apiKeys.read_only_keys },
                { name: 'Write Only', value: stats.apiKeys.write_only_keys },
                { name: 'Read/Write', value: stats.apiKeys.read_write_keys }
            ]
        };
        
        // Render view using res.render with view name
        res.render('dashboard/index', {
            view: '../dashboard/index',
            title: 'Dashboard',
            stats,
            recentApiLogs,
            recentActivities,
            endpointStats,
            chartData: JSON.stringify(chartData),
            success: req.flash('success'),
            error: req.flash('error')
        });
        
    } catch (error) {
        logger.error('Dashboard error:', error);
        res.render('error', {
            title: 'Error',
            message: 'Failed to load dashboard',
            error: process.env.NODE_ENV === 'development' ? error : null
        });
    }
};

module.exports = {
    showDashboard
};