const { executeQuery, executeTransaction } = require('../config/database');
const logger = require('../utils/logger');

class OrganizationService {
    // Get complete organization tree
    static async getOrganizationTree(companyCode = null) {
        try {
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
                WHERE 1=1
            `;
            
            const inputs = {};
            
            if (companyCode) {
                query += ' AND c.company_code = @company_code';
                inputs.company_code = companyCode;
            }
            
            query += ' ORDER BY c.company_code, b.branch_code, d.division_code, dp.department_code';
            
            const result = await executeQuery(query, inputs);
            return this.transformToTree(result.recordset);
        } catch (error) {
            logger.error('Error in getOrganizationTree:', error);
            throw error;
        }
    }
    
    // Transform flat data to hierarchical tree structure
    static transformToTree(flatData) {
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
                    divisions: {} // For divisions without branches
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
        
        // Convert objects to arrays for easier iteration
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
    
    // Clone organization structure
    static async cloneStructure(sourceCompanyCode, targetCompanyCode, options = {}) {
        const {
            includeBranches = true,
            includeDivisions = true,
            includeDepartments = true,
            createdBy = 'system'
        } = options;
        
        try {
            return await executeTransaction(async (transaction) => {
                const results = {
                    branches: 0,
                    divisions: 0,
                    departments: 0
                };
                
                // Clone branches
                if (includeBranches) {
                    const branchQuery = `
                        INSERT INTO Branches (branch_code, branch_name, company_code, is_headquarters, is_active, created_by)
                        SELECT 
                            CONCAT(@target_prefix, '_', branch_code) as branch_code,
                            branch_name,
                            @target_company as company_code,
                            is_headquarters,
                            is_active,
                            @created_by as created_by
                        FROM Branches
                        WHERE company_code = @source_company
                    `;
                    
                    const branchResult = await transaction.request()
                        .input('source_company', sourceCompanyCode)
                        .input('target_company', targetCompanyCode)
                        .input('target_prefix', targetCompanyCode)
                        .input('created_by', createdBy)
                        .query(branchQuery);
                        
                    results.branches = branchResult.rowsAffected[0];
                }
                
                // Clone divisions
                if (includeDivisions) {
                    const divisionQuery = `
                        INSERT INTO Divisions (division_code, division_name, company_code, branch_code, is_active, created_by)
                        SELECT 
                            CONCAT(@target_prefix, '_', division_code) as division_code,
                            division_name,
                            @target_company as company_code,
                            CASE 
                                WHEN branch_code IS NULL THEN NULL
                                ELSE CONCAT(@target_prefix, '_', branch_code)
                            END as branch_code,
                            is_active,
                            @created_by as created_by
                        FROM Divisions
                        WHERE company_code = @source_company
                    `;
                    
                    const divisionResult = await transaction.request()
                        .input('source_company', sourceCompanyCode)
                        .input('target_company', targetCompanyCode)
                        .input('target_prefix', targetCompanyCode)
                        .input('created_by', createdBy)
                        .query(divisionQuery);
                        
                    results.divisions = divisionResult.rowsAffected[0];
                }
                
                // Clone departments
                if (includeDepartments && includeDivisions) {
                    const departmentQuery = `
                        INSERT INTO Departments (department_code, department_name, division_code, is_active, created_by)
                        SELECT 
                            CONCAT(@target_prefix, '_', dp.department_code) as department_code,
                            dp.department_name,
                            CONCAT(@target_prefix, '_', dp.division_code) as division_code,
                            dp.is_active,
                            @created_by as created_by
                        FROM Departments dp
                        INNER JOIN Divisions d ON dp.division_code = d.division_code
                        WHERE d.company_code = @source_company
                    `;
                    
                    const departmentResult = await transaction.request()
                        .input('source_company', sourceCompanyCode)
                        .input('target_company', targetCompanyCode)
                        .input('target_prefix', targetCompanyCode)
                        .input('created_by', createdBy)
                        .query(departmentQuery);
                        
                    results.departments = departmentResult.rowsAffected[0];
                }
                
                logger.info(`Structure cloned from ${sourceCompanyCode} to ${targetCompanyCode}:`, results);
                return results;
            });
        } catch (error) {
            logger.error('Error in cloneStructure:', error);
            throw error;
        }
    }
    
    // Validate organization hierarchy
    static async validateHierarchy() {
        try {
            const issues = [];
            
            // Check for orphaned divisions
            const orphanedDivisionsQuery = `
                SELECT d.division_code, d.division_name, d.company_code
                FROM Divisions d
                WHERE d.company_code NOT IN (SELECT company_code FROM Companies)
            `;
            
            const orphanedDivisions = await executeQuery(orphanedDivisionsQuery);
            if (orphanedDivisions.recordset.length > 0) {
                issues.push({
                    type: 'orphaned_divisions',
                    message: 'Divisions without valid company',
                    count: orphanedDivisions.recordset.length,
                    items: orphanedDivisions.recordset
                });
            }
            
            // Check for orphaned departments
            const orphanedDepartmentsQuery = `
                SELECT dp.department_code, dp.department_name, dp.division_code
                FROM Departments dp
                WHERE dp.division_code NOT IN (SELECT division_code FROM Divisions)
            `;
            
            const orphanedDepartments = await executeQuery(orphanedDepartmentsQuery);
            if (orphanedDepartments.recordset.length > 0) {
                issues.push({
                    type: 'orphaned_departments',
                    message: 'Departments without valid division',
                    count: orphanedDepartments.recordset.length,
                    items: orphanedDepartments.recordset
                });
            }
            
            // Check for inactive parents with active children
            const inactiveParentsQuery = `
                SELECT 
                    'Company-Branch' as relationship,
                    c.company_code as parent_code,
                    c.company_name_th as parent_name,
                    COUNT(b.branch_code) as active_children
                FROM Companies c
                INNER JOIN Branches b ON c.company_code = b.company_code AND b.is_active = 1
                WHERE c.is_active = 0
                GROUP BY c.company_code, c.company_name_th
                
                UNION ALL
                
                SELECT 
                    'Division-Department' as relationship,
                    d.division_code as parent_code,
                    d.division_name as parent_name,
                    COUNT(dp.department_code) as active_children
                FROM Divisions d
                INNER JOIN Departments dp ON d.division_code = dp.division_code AND dp.is_active = 1
                WHERE d.is_active = 0
                GROUP BY d.division_code, d.division_name
            `;
            
            const inactiveParents = await executeQuery(inactiveParentsQuery);
            if (inactiveParents.recordset.length > 0) {
                issues.push({
                    type: 'inactive_parents',
                    message: 'Inactive entities with active children',
                    count: inactiveParents.recordset.length,
                    items: inactiveParents.recordset
                });
            }
            
            return {
                valid: issues.length === 0,
                issues: issues
            };
        } catch (error) {
            logger.error('Error in validateHierarchy:', error);
            throw error;
        }
    }
    
    // Get entity path (breadcrumb)
    static async getEntityPath(entityType, entityCode) {
        try {
            let query;
            const inputs = { code: entityCode };
            
            switch (entityType.toLowerCase()) {
                case 'department':
                    query = `
                        SELECT 
                            c.company_code, c.company_name_th,
                            b.branch_code, b.branch_name,
                            d.division_code, d.division_name,
                            dp.department_code, dp.department_name
                        FROM Departments dp
                        INNER JOIN Divisions d ON dp.division_code = d.division_code
                        INNER JOIN Companies c ON d.company_code = c.company_code
                        LEFT JOIN Branches b ON d.branch_code = b.branch_code
                        WHERE dp.department_code = @code
                    `;
                    break;
                    
                case 'division':
                    query = `
                        SELECT 
                            c.company_code, c.company_name_th,
                            b.branch_code, b.branch_name,
                            d.division_code, d.division_name
                        FROM Divisions d
                        INNER JOIN Companies c ON d.company_code = c.company_code
                        LEFT JOIN Branches b ON d.branch_code = b.branch_code
                        WHERE d.division_code = @code
                    `;
                    break;
                    
                case 'branch':
                    query = `
                        SELECT 
                            c.company_code, c.company_name_th,
                            b.branch_code, b.branch_name
                        FROM Branches b
                        INNER JOIN Companies c ON b.company_code = c.company_code
                        WHERE b.branch_code = @code
                    `;
                    break;
                    
                case 'company':
                    query = `
                        SELECT 
                            company_code, company_name_th
                        FROM Companies
                        WHERE company_code = @code
                    `;
                    break;
                    
                default:
                    throw new Error(`Invalid entity type: ${entityType}`);
            }
            
            const result = await executeQuery(query, inputs);
            
            if (result.recordset.length === 0) {
                return null;
            }
            
            const row = result.recordset[0];
            const path = [];
            
            // Build path array
            if (row.company_code) {
                path.push({
                    type: 'company',
                    code: row.company_code,
                    name: row.company_name_th
                });
            }
            
            if (row.branch_code) {
                path.push({
                    type: 'branch',
                    code: row.branch_code,
                    name: row.branch_name
                });
            }
            
            if (row.division_code) {
                path.push({
                    type: 'division',
                    code: row.division_code,
                    name: row.division_name
                });
            }
            
            if (row.department_code) {
                path.push({
                    type: 'department',
                    code: row.department_code,
                    name: row.department_name
                });
            }
            
            return path;
        } catch (error) {
            logger.error('Error in getEntityPath:', error);
            throw error;
        }
    }
}

module.exports = OrganizationService;