const Company = require('../models/Company');
const Branch = require('../models/Branch');
const Division = require('../models/Division');
const Department = require('../models/Department');
const ApiKey = require('../models/ApiKey');
const ApiLog = require('../models/ApiLog');
const { asyncHandler } = require('../middleware/errorHandler');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

// Show dashboard
const showDashboard = asyncHandler(async (req, res) => {
    // Get statistics from all models
    const [
        companyStats,
        branchStats,
        divisionStats,
        departmentStats,
        apiKeyStats,
        apiUsageStats,
        recentApiLogs,
        hourlyStats
    ] = await Promise.all([
        Company.getStatistics(),
        Branch.getStatistics(),
        Division.getStatistics(),
        Department.getStatistics(),
        ApiKey.getStatistics(),
        ApiLog.getStatistics({ 
            date_from: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }),
        ApiLog.findAll({ 
            limit: 10 
        }),
        ApiLog.getHourlyStatistics(new Date())
    ]);

    // Get top API endpoints
    const endpointStats = await ApiLog.getEndpointStatistics({
        date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    });

    // Get recent activities
    const recentActivities = await getRecentActivities();

    // Prepare data for charts
    const chartData = {
        hourlyRequests: hourlyStats.map(h => ({
            hour: h.hour,
            requests: h.request_count
        })),
        entityDistribution: [
            { name: 'Companies', value: companyStats.total_companies },
            { name: 'Branches', value: branchStats.total_branches },
            { name: 'Divisions', value: divisionStats.total_divisions },
            { name: 'Departments', value: departmentStats.total_departments }
        ],
        apiKeyTypes: [
            { name: 'Read Only', value: apiKeyStats.read_only_keys },
            { name: 'Write Only', value: apiKeyStats.write_only_keys },
            { name: 'Read/Write', value: apiKeyStats.read_write_keys }
        ]
    };

    res.render('dashboard/index', {
        title: 'Dashboard',
        stats: {
            companies: companyStats,
            branches: branchStats,
            divisions: divisionStats,
            departments: departmentStats,
            apiKeys: apiKeyStats,
            apiUsage: apiUsageStats
        },
        recentApiLogs,
        recentActivities,
        endpointStats: endpointStats.slice(0, 5), // Top 5 endpoints
        chartData: JSON.stringify(chartData),
        success: req.flash('success'),
        error: req.flash('error')
    });
});

// Get recent activities across all entities
async function getRecentActivities(limit = 10) {
    try {
        const query = `
            WITH RecentActivities AS (
                SELECT 
                    'Company' as entity_type,
                    company_code as entity_code,
                    company_name_th as entity_name,
                    created_date,
                    created_by,
                    updated_date,
                    updated_by,
                    CASE 
                        WHEN updated_date IS NULL THEN 'created'
                        ELSE 'updated'
                    END as action
                FROM Companies
                
                UNION ALL
                
                SELECT 
                    'Branch' as entity_type,
                    branch_code as entity_code,
                    branch_name as entity_name,
                    created_date,
                    created_by,
                    updated_date,
                    updated_by,
                    CASE 
                        WHEN updated_date IS NULL THEN 'created'
                        ELSE 'updated'
                    END as action
                FROM Branches
                
                UNION ALL
                
                SELECT 
                    'Division' as entity_type,
                    division_code as entity_code,
                    division_name as entity_name,
                    created_date,
                    created_by,
                    updated_date,
                    updated_by,
                    CASE 
                        WHEN updated_date IS NULL THEN 'created'
                        ELSE 'updated'
                    END as action
                FROM Divisions
                
                UNION ALL
                
                SELECT 
                    'Department' as entity_type,
                    department_code as entity_code,
                    department_name as entity_name,
                    created_date,
                    created_by,
                    updated_date,
                    updated_by,
                    CASE 
                        WHEN updated_date IS NULL THEN 'created'
                        ELSE 'updated'
                    END as action
                FROM Departments
            )
            SELECT TOP ${limit}
                entity_type,
                entity_code,
                entity_name,
                action,
                CASE 
                    WHEN action = 'created' THEN created_date
                    ELSE updated_date
                END as activity_date,
                CASE 
                    WHEN action = 'created' THEN created_by
                    ELSE updated_by
                END as activity_by
            FROM RecentActivities
            ORDER BY activity_date DESC
        `;

        const result = await executeQuery(query);
        return result.recordset;
    } catch (error) {
        logger.error('Error getting recent activities:', error);
        return [];
    }
}

// Get organization health metrics
const getOrganizationHealth = asyncHandler(async (req, res) => {
    // Check for various health indicators
    const healthChecks = await performHealthChecks();
    
    const overallHealth = calculateOverallHealth(healthChecks);
    
    res.json({
        success: true,
        data: {
            overall: overallHealth,
            checks: healthChecks
        }
    });
});

// Perform health checks
async function performHealthChecks() {
    const checks = [];
    
    try {
        // Check database connectivity
        const dbCheck = await checkDatabaseHealth();
        checks.push(dbCheck);
        
        // Check for orphaned entities
        const orphanCheck = await checkOrphanedEntities();
        checks.push(orphanCheck);
        
        // Check for inactive entities with active children
        const hierarchyCheck = await checkHierarchyConsistency();
        checks.push(hierarchyCheck);
        
        // Check API performance
        const apiCheck = await checkApiPerformance();
        checks.push(apiCheck);
        
        // Check data completeness
        const dataCheck = await checkDataCompleteness();
        checks.push(dataCheck);
        
    } catch (error) {
        logger.error('Error performing health checks:', error);
    }
    
    return checks;
}

// Check database health
async function checkDatabaseHealth() {
    try {
        const startTime = Date.now();
        await executeQuery('SELECT 1');
        const responseTime = Date.now() - startTime;
        
        return {
            name: 'Database Connection',
            status: responseTime < 100 ? 'healthy' : 'warning',
            message: `Response time: ${responseTime}ms`,
            details: { responseTime }
        };
    } catch (error) {
        return {
            name: 'Database Connection',
            status: 'critical',
            message: 'Database connection failed',
            details: { error: error.message }
        };
    }
}

// Check for orphaned entities
async function checkOrphanedEntities() {
    try {
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM Divisions WHERE company_code NOT IN (SELECT company_code FROM Companies)) as orphaned_divisions,
                (SELECT COUNT(*) FROM Departments WHERE division_code NOT IN (SELECT division_code FROM Divisions)) as orphaned_departments,
                (SELECT COUNT(*) FROM Divisions d WHERE d.branch_code IS NOT NULL AND d.branch_code NOT IN (SELECT branch_code FROM Branches)) as divisions_invalid_branch
        `;
        
        const result = await executeQuery(query);
        const data = result.recordset[0];
        const total = data.orphaned_divisions + data.orphaned_departments + data.divisions_invalid_branch;
        
        return {
            name: 'Data Integrity',
            status: total === 0 ? 'healthy' : 'warning',
            message: total === 0 ? 'No orphaned entities found' : `${total} orphaned entities found`,
            details: data
        };
    } catch (error) {
        return {
            name: 'Data Integrity',
            status: 'error',
            message: 'Failed to check data integrity',
            details: { error: error.message }
        };
    }
}

// Check hierarchy consistency
async function checkHierarchyConsistency() {
    try {
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM Companies c WHERE c.is_active = 0 AND EXISTS (SELECT 1 FROM Branches b WHERE b.company_code = c.company_code AND b.is_active = 1)) as inactive_companies_with_active_branches,
                (SELECT COUNT(*) FROM Branches b WHERE b.is_active = 0 AND EXISTS (SELECT 1 FROM Divisions d WHERE d.branch_code = b.branch_code AND d.is_active = 1)) as inactive_branches_with_active_divisions,
                (SELECT COUNT(*) FROM Divisions d WHERE d.is_active = 0 AND EXISTS (SELECT 1 FROM Departments dp WHERE dp.division_code = d.division_code AND dp.is_active = 1)) as inactive_divisions_with_active_departments
        `;
        
        const result = await executeQuery(query);
        const data = result.recordset[0];
        const total = data.inactive_companies_with_active_branches + 
                     data.inactive_branches_with_active_divisions + 
                     data.inactive_divisions_with_active_departments;
        
        return {
            name: 'Hierarchy Consistency',
            status: total === 0 ? 'healthy' : 'warning',
            message: total === 0 ? 'Hierarchy is consistent' : `${total} inconsistencies found`,
            details: data
        };
    } catch (error) {
        return {
            name: 'Hierarchy Consistency',
            status: 'error',
            message: 'Failed to check hierarchy consistency',
            details: { error: error.message }
        };
    }
}

// Check API performance
async function checkApiPerformance() {
    try {
        const stats = await ApiLog.getStatistics({
            date_from: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        });
        
        const avgResponseTime = stats.avg_response_time || 0;
        const errorRate = stats.total_requests > 0 
            ? ((stats.client_errors + stats.server_errors) / stats.total_requests) * 100 
            : 0;
        
        let status = 'healthy';
        if (avgResponseTime > 1000 || errorRate > 10) {
            status = 'critical';
        } else if (avgResponseTime > 500 || errorRate > 5) {
            status = 'warning';
        }
        
        return {
            name: 'API Performance',
            status: status,
            message: `Avg response: ${Math.round(avgResponseTime)}ms, Error rate: ${errorRate.toFixed(1)}%`,
            details: {
                avgResponseTime: Math.round(avgResponseTime),
                errorRate: errorRate.toFixed(1),
                totalRequests: stats.total_requests
            }
        };
    } catch (error) {
        return {
            name: 'API Performance',
            status: 'error',
            message: 'Failed to check API performance',
            details: { error: error.message }
        };
    }
}

// Check data completeness
async function checkDataCompleteness() {
    try {
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM Companies WHERE tax_id IS NULL OR tax_id = '') as companies_missing_tax_id,
                (SELECT COUNT(*) FROM Companies WHERE company_name_en IS NULL OR company_name_en = '') as companies_missing_english_name,
                (SELECT COUNT(*) FROM Branches WHERE is_headquarters = 1) as headquarters_count,
                (SELECT COUNT(DISTINCT company_code) FROM Branches) as companies_with_branches
        `;
        
        const result = await executeQuery(query);
        const data = result.recordset[0];
        
        const issues = [];
        if (data.companies_missing_tax_id > 0) {
            issues.push(`${data.companies_missing_tax_id} companies missing tax ID`);
        }
        if (data.headquarters_count !== data.companies_with_branches) {
            issues.push('Some companies with branches lack headquarters designation');
        }
        
        return {
            name: 'Data Completeness',
            status: issues.length === 0 ? 'healthy' : 'info',
            message: issues.length === 0 ? 'All required data is complete' : issues.join(', '),
            details: data
        };
    } catch (error) {
        return {
            name: 'Data Completeness',
            status: 'error',
            message: 'Failed to check data completeness',
            details: { error: error.message }
        };
    }
}

// Calculate overall health score
function calculateOverallHealth(checks) {
    const statusWeights = {
        healthy: 100,
        info: 90,
        warning: 60,
        error: 30,
        critical: 0
    };
    
    const totalWeight = checks.reduce((sum, check) => 
        sum + (statusWeights[check.status] || 0), 0
    );
    
    const score = Math.round(totalWeight / checks.length);
    
    let status = 'healthy';
    if (score < 50) status = 'critical';
    else if (score < 70) status = 'warning';
    else if (score < 90) status = 'info';
    
    return {
        score,
        status,
        checkedAt: new Date().toISOString()
    };
}

module.exports = {
    showDashboard,
    getOrganizationHealth
};