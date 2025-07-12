const { sql, executeQuery, executeTransaction } = require('../config/database');
const logger = require('../utils/logger');

class Company {
    constructor(data) {
        this.company_code = data.company_code;
        this.company_name_th = data.company_name_th;
        this.company_name_en = data.company_name_en;
        this.tax_id = data.tax_id;
        this.is_active = data.is_active !== undefined ? data.is_active : true;
        this.created_date = data.created_date;
        this.created_by = data.created_by;
        this.updated_date = data.updated_date;
        this.updated_by = data.updated_by;
    }

    // Get all companies
    static async findAll(filters = {}) {
        try {
            let query = `
                SELECT company_code, company_name_th, company_name_en, 
                       tax_id, is_active, created_date, created_by, 
                       updated_date, updated_by
                FROM Companies
                WHERE 1=1
            `;
            
            const inputs = {};
            
            // Apply filters
            if (filters.is_active !== undefined) {
                query += ' AND is_active = @is_active';
                inputs.is_active = filters.is_active;
            }
            
            if (filters.search) {
                query += ' AND (company_name_th LIKE @search OR company_name_en LIKE @search OR company_code LIKE @search)';
                inputs.search = `%${filters.search}%`;
            }
            
            // Add sorting
            query += ' ORDER BY company_code';
            
            const result = await executeQuery(query, inputs);
            return result.recordset.map(row => new Company(row));
        } catch (error) {
            logger.error('Error in Company.findAll:', error);
            throw error;
        }
    }

    // Get company by code
    static async findByCode(companyCode) {
        try {
            const query = `
                SELECT company_code, company_name_th, company_name_en, 
                       tax_id, is_active, created_date, created_by, 
                       updated_date, updated_by
                FROM Companies
                WHERE company_code = @company_code
            `;
            
            const result = await executeQuery(query, { company_code: companyCode });
            
            if (result.recordset.length === 0) {
                return null;
            }
            
            return new Company(result.recordset[0]);
        } catch (error) {
            logger.error('Error in Company.findByCode:', error);
            throw error;
        }
    }

    // Create new company
    async create() {
        try {
            const query = `
                INSERT INTO Companies (
                    company_code, company_name_th, company_name_en, 
                    tax_id, is_active, created_by
                )
                VALUES (
                    @company_code, @company_name_th, @company_name_en, 
                    @tax_id, @is_active, @created_by
                )
            `;
            
            const inputs = {
                company_code: this.company_code,
                company_name_th: this.company_name_th,
                company_name_en: this.company_name_en,
                tax_id: this.tax_id,
                is_active: this.is_active,
                created_by: this.created_by
            };
            
            await executeQuery(query, inputs);
            
            // Fetch the created record
            return await Company.findByCode(this.company_code);
        } catch (error) {
            logger.error('Error in Company.create:', error);
            throw error;
        }
    }

    // Update company
    async update() {
        try {
            const query = `
                UPDATE Companies
                SET company_name_th = @company_name_th,
                    company_name_en = @company_name_en,
                    tax_id = @tax_id,
                    updated_date = GETDATE(),
                    updated_by = @updated_by
                WHERE company_code = @company_code
            `;
            
            const inputs = {
                company_code: this.company_code,
                company_name_th: this.company_name_th,
                company_name_en: this.company_name_en,
                tax_id: this.tax_id,
                updated_by: this.updated_by
            };
            
            const result = await executeQuery(query, inputs);
            
            if (result.rowsAffected[0] === 0) {
                throw new Error('Company not found');
            }
            
            return await Company.findByCode(this.company_code);
        } catch (error) {
            logger.error('Error in Company.update:', error);
            throw error;
        }
    }

    // Update company status
    static async updateStatus(companyCode, isActive, updatedBy) {
        try {
            const query = `
                UPDATE Companies
                SET is_active = @is_active,
                    updated_date = GETDATE(),
                    updated_by = @updated_by
                WHERE company_code = @company_code
            `;
            
            const inputs = {
                company_code: companyCode,
                is_active: isActive,
                updated_by: updatedBy
            };
            
            const result = await executeQuery(query, inputs);
            
            if (result.rowsAffected[0] === 0) {
                throw new Error('Company not found');
            }
            
            return await Company.findByCode(companyCode);
        } catch (error) {
            logger.error('Error in Company.updateStatus:', error);
            throw error;
        }
    }

    // Check if company code exists
    static async exists(companyCode) {
        try {
            const query = `
                SELECT COUNT(*) as count
                FROM Companies
                WHERE company_code = @company_code
            `;
            
            const result = await executeQuery(query, { company_code: companyCode });
            return result.recordset[0].count > 0;
        } catch (error) {
            logger.error('Error in Company.exists:', error);
            throw error;
        }
    }

    // Get companies with pagination
    static async findPaginated(page = 1, limit = 20, filters = {}) {
        try {
            const offset = (page - 1) * limit;
            
            // Count total records
            let countQuery = `
                SELECT COUNT(*) as total
                FROM Companies
                WHERE 1=1
            `;
            
            const inputs = {
                limit: limit,
                offset: offset
            };
            
            // Apply filters for count
            if (filters.is_active !== undefined) {
                countQuery += ' AND is_active = @is_active';
                inputs.is_active = filters.is_active;
            }
            
            if (filters.search) {
                countQuery += ' AND (company_name_th LIKE @search OR company_name_en LIKE @search OR company_code LIKE @search)';
                inputs.search = `%${filters.search}%`;
            }
            
            const countResult = await executeQuery(countQuery, inputs);
            const total = countResult.recordset[0].total;
            
            // Get paginated data
            let dataQuery = `
                SELECT company_code, company_name_th, company_name_en, 
                       tax_id, is_active, created_date, created_by, 
                       updated_date, updated_by
                FROM Companies
                WHERE 1=1
            `;
            
            // Apply filters for data
            if (filters.is_active !== undefined) {
                dataQuery += ' AND is_active = @is_active';
            }
            
            if (filters.search) {
                dataQuery += ' AND (company_name_th LIKE @search OR company_name_en LIKE @search OR company_code LIKE @search)';
            }
            
            dataQuery += ' ORDER BY company_code OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
            
            const dataResult = await executeQuery(dataQuery, inputs);
            
            return {
                data: dataResult.recordset.map(row => new Company(row)),
                pagination: {
                    page: page,
                    limit: limit,
                    total: total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Error in Company.findPaginated:', error);
            throw error;
        }
    }

    // Get company statistics
    static async getStatistics() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_companies,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_companies,
                    SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_companies
                FROM Companies
            `;
            
            const result = await executeQuery(query);
            return result.recordset[0];
        } catch (error) {
            logger.error('Error in Company.getStatistics:', error);
            throw error;
        }
    }
}

module.exports = Company;