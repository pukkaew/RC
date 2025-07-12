const Company = require('../models/Company');
const Branch = require('../models/Branch');
const Division = require('../models/Division');
const Department = require('../models/Department');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendSuccess, sendPaginated, created, updated, deleted, notFound, badRequest } = require('../utils/response');
const { getPaginationParams } = require('../utils/pagination');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

// Get organization tree
const getOrganizationTree = asyncHandler(async (req, res) => {
    const { company_code } = req.query;
    
    let query = `
        SELECT 
            c.company_code,
            c.company_name_th,
            c.company_name_en,
            c.is_active as company_active,
            b.branch_code,
            b.branch_name,
            b.is_headquarters,
            b.is_active as branch_active,
            d.division_code,
            d.division_name,
            d.is_active as division_active,
            dp.department_code,
            dp.department_name,
            dp.is_active as department_active
        FROM Companies c
        LEFT JOIN Branches b ON c.company_code = b.company_code
        LEFT JOIN Divisions d ON c.company_code = d.company_code 
            AND (b.branch_code IS NULL OR b.branch_code = d.branch_code)
        LEFT JOIN Departments dp ON d.division_code = dp.division_code
        WHERE c.is_active = 1
    `;
    
    const inputs = {};
    
    if (company_code) {
        query += ' AND c.company_code = @company_code';
        inputs.company_code = company_code;
    }
    
    query += ' ORDER BY c.company_code, b.branch_code, d.division_code, dp.department_code';
    
    const result = await executeQuery(query, inputs);
    
    // Transform flat data to tree structure
    const tree = transformToTree(result.recordset);
    
    sendSuccess(res, tree, 'Organization tree retrieved successfully');
});

// Search across all entities
const searchOrganization = asyncHandler(async (req, res) => {
    const { q, type, limit = 20 } = req.query;
    
    if (!q || q.length < 2) {
        return badRequest(res, 'Search query must be at least 2 characters');
    }
    
    const searchTerm = `%${q}%`;
    const results = {
        companies: [],
        branches: [],
        divisions: [],
        departments: []
    };
    
    // Search companies
    if (!type || type === 'company') {
        const companyQuery = `
            SELECT TOP ${parseInt(limit)} 
                company_code, company_name_th, company_name_en, is_active
            FROM Companies
            WHERE (company_code LIKE @search 
                OR company_name_th LIKE @search 
                OR company_name_en LIKE @search)
            ORDER BY company_code
        `;
        
        const companyResult = await executeQuery(companyQuery, { search: searchTerm });
        results.companies = companyResult.recordset;
    }
    
    // Search branches
    if (!type || type === 'branch') {
        const branchQuery = `
            SELECT TOP ${parseInt(limit)}
                b.branch_code, b.branch_name, b.company_code, b.is_active,
                c.company_name_th
            FROM Branches b
            INNER JOIN Companies c ON b.company_code = c.company_code
            WHERE (b.branch_code LIKE @search OR b.branch_name LIKE @search)
            ORDER BY b.branch_code
        `;
        
        const branchResult = await executeQuery(branchQuery, { search: searchTerm });
        results.branches = branchResult.recordset;
    }
    
    // Search divisions
    if (!type || type === 'division') {
        const divisionQuery = `
            SELECT TOP ${parseInt(limit)}
                d.division_code, d.division_name, d.company_code, d.branch_code, d.is_active,
                c.company_name_th, b.branch_name
            FROM Divisions d
            INNER JOIN Companies c ON d.company_code = c.company_code
            LEFT JOIN Branches b ON d.branch_code = b.branch_code
            WHERE (d.division_code LIKE @search OR d.division_name LIKE @search)
            ORDER BY d.division_code
        `;
        
        const divisionResult = await executeQuery(divisionQuery, { search: searchTerm });
        results.divisions = divisionResult.recordset;
    }
    
    // Search departments
    if (!type || type === 'department') {
        const departmentQuery = `
            SELECT TOP ${parseInt(limit)}
                dp.department_code, dp.department_name, dp.division_code, dp.is_active,
                d.division_name, d.company_code, c.company_name_th
            FROM Departments dp
            INNER JOIN Divisions d ON dp.division_code = d.division_code
            INNER JOIN Companies c ON d.company_code = c.company_code
            WHERE (dp.department_code LIKE @search OR dp.department_name LIKE @search)
            ORDER BY dp.department_code
        `;
        
        const departmentResult = await executeQuery(departmentQuery, { search: searchTerm });
        results.departments = departmentResult.recordset;
    }
    
    // Calculate total results
    const totalResults = results.companies.length + results.branches.length + 
                        results.divisions.length + results.departments.length;
    
    sendSuccess(res, {
        query: q,
        total: totalResults,
        results: results
    }, 'Search completed successfully');
});

// Get complete hierarchy for a specific entity
const getEntityHierarchy = asyncHandler(async (req, res) => {
    const { type, code } = req.params;
    
    let query;
    const inputs = { code: code };
    
    switch (type) {
        case 'company':
            query = `
                SELECT 
                    c.company_code, c.company_name_th, c.company_name_en,
                    COUNT(DISTINCT b.branch_code) as branch_count,
                    COUNT(DISTINCT d.division_code) as division_count,
                    COUNT(DISTINCT dp.department_code) as department_count
                FROM Companies c
                LEFT JOIN Branches b ON c.company_code = b.company_code AND b.is_active = 1
                LEFT JOIN Divisions d ON c.company_code = d.company_code AND d.is_active = 1
                LEFT JOIN Departments dp ON d.division_code = dp.division_code AND dp.is_active = 1
                WHERE c.company_code = @code
                GROUP BY c.company_code, c.company_name_th, c.company_name_en
            `;
            break;
            
        case 'branch':
            query = `
                SELECT 
                    b.branch_code, b.branch_name, b.company_code,
                    c.company_name_th,
                    COUNT(DISTINCT d.division_code) as division_count,
                    COUNT(DISTINCT dp.department_code) as department_count
                FROM Branches b
                INNER JOIN Companies c ON b.company_code = c.company_code
                LEFT JOIN Divisions d ON b.branch_code = d.branch_code AND d.is_active = 1
                LEFT JOIN Departments dp ON d.division_code = dp.division_code AND dp.is_active = 1
                WHERE b.branch_code = @code
                GROUP BY b.branch_code, b.branch_name, b.company_code, c.company_name_th
            `;
            break;
            
        case 'division':
            query = `
                SELECT 
                    d.division_code, d.division_name, d.company_code, d.branch_code,
                    c.company_name_th, b.branch_name,
                    COUNT(DISTINCT dp.department_code) as department_count
                FROM Divisions d
                INNER JOIN Companies c ON d.company_code = c.company_code
                LEFT JOIN Branches b ON d.branch_code = b.branch_code
                LEFT JOIN Departments dp ON d.division_code = dp.division_code AND dp.is_active = 1
                WHERE d.division_code = @code
                GROUP BY d.division_code, d.division_name, d.company_code, 
                         d.branch_code, c.company_name_th, b.branch_name
            `;
            break;
            
        case 'department':
            query = `
                SELECT 
                    dp.department_code, dp.department_name, dp.division_code,
                    d.division_name, d.company_code, d.branch_code,
                    c.company_name_th, b.branch_name
                FROM Departments dp
                INNER JOIN Divisions d ON dp.division_code = d.division_code
                INNER JOIN Companies c ON d.company_code = c.company_code
                LEFT JOIN Branches b ON d.branch_code = b.branch_code
                WHERE dp.department_code = @code
            `;
            break;
            
        default:
            return badRequest(res, 'Invalid entity type');
    }
    
    const result = await executeQuery(query, inputs);
    
    if (result.recordset.length === 0) {
        return notFound(res, `${type} not found`);
    }
    
    sendSuccess(res, result.recordset[0], `${type} hierarchy retrieved successfully`);
});

// Get organization statistics
const getOrganizationStatistics = asyncHandler(async (req, res) => {
    const query = `
        SELECT 
            (SELECT COUNT(*) FROM Companies WHERE is_active = 1) as active_companies,
            (SELECT COUNT(*) FROM Companies WHERE is_active = 0) as inactive_companies,
            (SELECT COUNT(*) FROM Branches WHERE is_active = 1) as active_branches,
            (SELECT COUNT(*) FROM Branches WHERE is_active = 0) as inactive_branches,
            (SELECT COUNT(*) FROM Divisions WHERE is_active = 1) as active_divisions,
            (SELECT COUNT(*) FROM Divisions WHERE is_active = 0) as inactive_divisions,
            (SELECT COUNT(*) FROM Departments WHERE is_active = 1) as active_departments,
            (SELECT COUNT(*) FROM Departments WHERE is_active = 0) as inactive_departments,
            (SELECT COUNT(DISTINCT company_code) FROM Branches) as companies_with_branches,
            (SELECT COUNT(DISTINCT company_code) FROM Companies WHERE company_code NOT IN (SELECT DISTINCT company_code FROM Branches)) as companies_without_branches
    `;
    
    const result = await executeQuery(query);
    const stats = result.recordset[0];
    
    // Calculate totals
    stats.total_companies = stats.active_companies + stats.inactive_companies;
    stats.total_branches = stats.active_branches + stats.inactive_branches;
    stats.total_divisions = stats.active_divisions + stats.inactive_divisions;
    stats.total_departments = stats.active_departments + stats.inactive_departments;
    stats.total_entities = stats.total_companies + stats.total_branches + 
                          stats.total_divisions + stats.total_departments;
    
    sendSuccess(res, stats, 'Organization statistics retrieved successfully');
});

// Helper function to transform flat data to tree structure
function transformToTree(flatData) {
    const tree = {};
    
    flatData.forEach(row => {
        // Company level
        if (!tree[row.company_code]) {
            tree[row.company_code] = {
                company_code: row.company_code,
                company_name_th: row.company_name_th,
                company_name_en: row.company_name_en,
                is_active: row.company_active,
                branches: {},
                divisions: {}
            };
        }
        
        const company = tree[row.company_code];
        
        // Branch level
        if (row.branch_code) {
            if (!company.branches[row.branch_code]) {
                company.branches[row.branch_code] = {
                    branch_code: row.branch_code,
                    branch_name: row.branch_name,
                    is_headquarters: row.is_headquarters,
                    is_active: row.branch_active,
                    divisions: {}
                };
            }
        }
        
        // Division level
        if (row.division_code) {
            const divisionContainer = row.branch_code 
                ? company.branches[row.branch_code].divisions 
                : company.divisions;
                
            if (!divisionContainer[row.division_code]) {
                divisionContainer[row.division_code] = {
                    division_code: row.division_code,
                    division_name: row.division_name,
                    is_active: row.division_active,
                    departments: {}
                };
            }
            
            // Department level
            if (row.department_code) {
                divisionContainer[row.division_code].departments[row.department_code] = {
                    department_code: row.department_code,
                    department_name: row.department_name,
                    is_active: row.department_active
                };
            }
        }
    });
    
    // Convert objects to arrays
    return Object.values(tree).map(company => ({
        ...company,
        branches: Object.values(company.branches).map(branch => ({
            ...branch,
            divisions: Object.values(branch.divisions).map(division => ({
                ...division,
                departments: Object.values(division.departments)
            }))
        })),
        divisions: Object.values(company.divisions).map(division => ({
            ...division,
            departments: Object.values(division.departments)
        }))
    }));
}

module.exports = {
    getOrganizationTree,
    searchOrganization,
    getEntityHierarchy,
    getOrganizationStatistics
};