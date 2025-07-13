// src/services/companyService.js
const Company = require('../models/Company');
const Branch = require('../models/Branch');
const Division = require('../models/Division');
const Department = require('../models/Department');
const { businessError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

class CompanyService {
    /**
     * Get all companies with optional filters and caching
     */
    static async getCompanies(filters = {}, options = {}) {
        const cacheKey = `companies:${JSON.stringify(filters)}:${JSON.stringify(options)}`;
        
        // Try to get from cache first
        const cached = await cache.get(cacheKey);
        if (cached && !options.skipCache) {
            return cached;
        }

        // Get from database
        const result = options.paginated 
            ? await Company.findPaginated(options.page || 1, options.limit || 20, filters)
            : await Company.findAll(filters);

        // Cache the result
        await cache.set(cacheKey, result, 300); // Cache for 5 minutes

        return result;
    }

    /**
     * Get company by code with related statistics
     */
    static async getCompanyDetails(companyCode) {
        const cacheKey = `company:${companyCode}:details`;
        
        const cached = await cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        // Get company basic info
        const company = await Company.findByCode(companyCode);
        if (!company) {
            throw businessError('Company not found', 'NOT_FOUND', 404);
        }

        // Get related statistics in parallel
        const [branches, divisions, stats] = await Promise.all([
            Branch.findByCompany(companyCode),
            Division.findByCompany(companyCode),
            this.getCompanyStatistics(companyCode)
        ]);

        const result = {
            ...company,
            branches: branches,
            divisions: divisions,
            statistics: stats
        };

        await cache.set(cacheKey, result, 600); // Cache for 10 minutes
        return result;
    }

    /**
     * Create new company with validation
     */
    static async createCompany(companyData, createdBy) {
        // Validate tax ID format
        if (companyData.tax_id && !this.validateTaxId(companyData.tax_id)) {
            throw businessError('Invalid tax ID format', 'VALIDATION_ERROR', 400);
        }

        // Check if company code already exists
        const exists = await Company.exists(companyData.company_code);
        if (exists) {
            throw businessError('Company code already exists', 'DUPLICATE_CODE', 409);
        }

        // Create company
        const company = await Company.create(companyData, createdBy);

        // Clear relevant caches
        await cache.deletePattern('companies:*');

        // Log the action
        logger.info(`Company created: ${company.company_code} by ${createdBy}`);

        return company;
    }

    /**
     * Update company with validation
     */
    static async updateCompany(companyCode, updateData, modifiedBy) {
        // Validate company exists
        const exists = await Company.exists(companyCode);
        if (!exists) {
            throw businessError('Company not found', 'NOT_FOUND', 404);
        }

        // Validate tax ID if provided
        if (updateData.tax_id && !this.validateTaxId(updateData.tax_id)) {
            throw businessError('Invalid tax ID format', 'VALIDATION_ERROR', 400);
        }

        // Update company
        const company = await Company.update(companyCode, updateData, modifiedBy);

        // Clear relevant caches
        await cache.deletePattern(`company:${companyCode}:*`);
        await cache.deletePattern('companies:*');

        logger.info(`Company updated: ${companyCode} by ${modifiedBy}`);

        return company;
    }

    /**
     * Change company status with cascade handling
     */
    static async changeCompanyStatus(companyCode, modifiedBy) {
        const company = await Company.findByCode(companyCode);
        if (!company) {
            throw businessError('Company not found', 'NOT_FOUND', 404);
        }

        // Check if deactivating company with active branches
        if (company.is_active) {
            const activeBranches = await Branch.findByCompany(companyCode, { is_active: true });
            if (activeBranches.length > 0) {
                throw businessError(
                    'Cannot deactivate company with active branches. Please deactivate all branches first.',
                    'BUSINESS_RULE_VIOLATION',
                    400
                );
            }
        }

        // Update status
        const updatedCompany = await Company.updateStatus(companyCode, modifiedBy);

        // Clear caches
        await cache.deletePattern(`company:${companyCode}:*`);
        await cache.deletePattern('companies:*');

        logger.info(`Company status changed: ${companyCode} to ${updatedCompany.is_active ? 'active' : 'inactive'} by ${modifiedBy}`);

        return updatedCompany;
    }

    /**
     * Delete company (soft delete)
     */
    static async deleteCompany(companyCode, deletedBy) {
        // Check for dependencies
        const [branches, divisions] = await Promise.all([
            Branch.findByCompany(companyCode),
            Division.findByCompany(companyCode)
        ]);

        if (branches.length > 0 || divisions.length > 0) {
            throw businessError(
                'Cannot delete company with existing branches or divisions',
                'DEPENDENCY_EXISTS',
                400
            );
        }

        // Perform soft delete
        const result = await Company.delete(companyCode, deletedBy);

        // Clear caches
        await cache.deletePattern(`company:${companyCode}:*`);
        await cache.deletePattern('companies:*');

        logger.info(`Company deleted: ${companyCode} by ${deletedBy}`);

        return result;
    }

    /**
     * Get company statistics
     */
    static async getCompanyStatistics(companyCode) {
        const cacheKey = `company:${companyCode}:stats`;
        
        const cached = await cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const [branches, divisions, departments] = await Promise.all([
            Branch.countByCompany(companyCode),
            Division.countByCompany(companyCode),
            Department.countByCompany(companyCode)
        ]);

        const stats = {
            total_branches: branches.total,
            active_branches: branches.active,
            total_divisions: divisions.total,
            active_divisions: divisions.active,
            total_departments: departments.total,
            active_departments: departments.active,
            headquarters_count: branches.headquarters || 0
        };

        await cache.set(cacheKey, stats, 1800); // Cache for 30 minutes
        return stats;
    }

    /**
     * Get company organization tree
     */
    static async getCompanyTree(companyCode) {
        const company = await Company.findByCode(companyCode);
        if (!company) {
            throw businessError('Company not found', 'NOT_FOUND', 404);
        }

        // Build tree structure
        const branches = await Branch.findByCompany(companyCode);
        const companyDivisions = await Division.findByCompany(companyCode, { branch_code: null });

        const tree = {
            ...company,
            branches: await Promise.all(branches.map(async (branch) => {
                const divisions = await Division.findByBranch(branch.branch_code);
                return {
                    ...branch,
                    divisions: await Promise.all(divisions.map(async (division) => {
                        const departments = await Department.findByDivision(division.division_code);
                        return {
                            ...division,
                            departments
                        };
                    }))
                };
            })),
            company_divisions: await Promise.all(companyDivisions.map(async (division) => {
                const departments = await Department.findByDivision(division.division_code);
                return {
                    ...division,
                    departments
                };
            }))
        };

        return tree;
    }

    /**
     * Search companies
     */
    static async searchCompanies(searchTerm, options = {}) {
        if (!searchTerm || searchTerm.length < 2) {
            throw businessError('Search term must be at least 2 characters', 'VALIDATION_ERROR', 400);
        }

        const results = await Company.search(searchTerm, options);
        return results;
    }

    /**
     * Export company data
     */
    static async exportCompanyData(companyCode, format = 'json') {
        const companyData = await this.getCompanyDetails(companyCode);
        const tree = await this.getCompanyTree(companyCode);

        const exportData = {
            company: companyData,
            structure: tree,
            exported_at: new Date().toISOString(),
            version: '1.0'
        };

        switch (format) {
            case 'json':
                return JSON.stringify(exportData, null, 2);
            case 'csv':
                return this.convertToCSV(exportData);
            default:
                throw businessError('Unsupported export format', 'VALIDATION_ERROR', 400);
        }
    }

    /**
     * Validate Thai tax ID format
     */
    static validateTaxId(taxId) {
        // Thai tax ID format: 13 digits
        const taxIdRegex = /^\d{13}$/;
        return taxIdRegex.test(taxId);
    }

    /**
     * Convert data to CSV format
     */
    static convertToCSV(data) {
        // Simplified CSV conversion
        const lines = [];
        lines.push('Type,Code,Name,Parent,Status');
        
        // Company
        lines.push(`Company,${data.company.company_code},"${data.company.company_name_th}",,${data.company.is_active ? 'Active' : 'Inactive'}`);
        
        // Branches and their children
        data.structure.branches.forEach(branch => {
            lines.push(`Branch,${branch.branch_code},"${branch.branch_name}",${data.company.company_code},${branch.is_active ? 'Active' : 'Inactive'}`);
            
            branch.divisions.forEach(division => {
                lines.push(`Division,${division.division_code},"${division.division_name}",${branch.branch_code},${division.is_active ? 'Active' : 'Inactive'}`);
                
                division.departments.forEach(dept => {
                    lines.push(`Department,${dept.department_code},"${dept.department_name}",${division.division_code},${dept.is_active ? 'Active' : 'Inactive'}`);
                });
            });
        });
        
        // Company-level divisions
        data.structure.company_divisions.forEach(division => {
            lines.push(`Division,${division.division_code},"${division.division_name}",${data.company.company_code},${division.is_active ? 'Active' : 'Inactive'}`);
            
            division.departments.forEach(dept => {
                lines.push(`Department,${dept.department_code},"${dept.department_name}",${division.division_code},${dept.is_active ? 'Active' : 'Inactive'}`);
            });
        });
        
        return lines.join('\n');
    }

    /**
     * Bulk import companies
     */
    static async bulkImportCompanies(companiesData, importedBy) {
        const results = {
            success: [],
            failed: []
        };

        for (const companyData of companiesData) {
            try {
                const company = await this.createCompany(companyData, importedBy);
                results.success.push({
                    company_code: company.company_code,
                    message: 'Created successfully'
                });
            } catch (error) {
                results.failed.push({
                    company_code: companyData.company_code,
                    error: error.message
                });
            }
        }

        logger.info(`Bulk import completed: ${results.success.length} succeeded, ${results.failed.length} failed`);
        return results;
    }
}

module.exports = CompanyService;