const { sql, executeQuery, executeTransaction } = require('../config/database');
const logger = require('../utils/logger');

class Branch {
    constructor(data) {
        this.branch_code = data.branch_code;
        this.branch_name = data.branch_name;
        this.company_code = data.company_code;
        this.is_headquarters = data.is_headquarters !== undefined ? data.is_headquarters : false;
        this.is_active = data.is_active !== undefined ? data.is_active : true;
        this.created_date = data.created_date;
        this.created_by = data.created_by;
        this.updated_date = data.updated_date;
        this.updated_by = data.updated_by;
    }

    // Get all branches
    static async findAll(filters = {}) {
        try {
            let query = `
                SELECT b.branch_code, b.branch_name, b.company_code, 
                       b.is_headquarters, b.is_active, b.created_date, 
                       b.created_by, b.updated_date, b.updated_by,
                       c.company_name_th, c.company_name_en
                FROM Branches b
                INNER JOIN Companies c ON b.company_code = c.company_code
                WHERE 1=1
            `;
            
            const inputs = {};
            
            // Apply filters
            if (filters.company_code) {
                query += ' AND b.company_code = @company_code';
                inputs.company_code = filters.company_code;
            }
            
            if (filters.is_active !== undefined) {
                query += ' AND b.is_active = @is_active';
                inputs.is_active = filters.is_active;
            }
            
            if (filters.is_headquarters !== undefined) {
                query += ' AND b.is_headquarters = @is_headquarters';
                inputs.is_headquarters = filters.is_headquarters;
            }
            
            if (filters.search) {
                query += ' AND (b.branch_name LIKE @search OR b.branch_code LIKE @search)';
                inputs.search = `%${filters.search}%`;
            }
            
            query += ' ORDER BY b.company_code, b.branch_code';
            
            const result = await executeQuery(query, inputs);
            return result.recordset.map(row => ({
                ...new Branch(row),
                company_name_th: row.company_name_th,
                company_name_en: row.company_name_en
            }));
        } catch (error) {
            logger.error('Error in Branch.findAll:', error);
            throw error;
        }
    }

    // Get branch by code
    static async findByCode(branchCode) {
        try {
            const query = `
                SELECT b.branch_code, b.branch_name, b.company_code, 
                       b.is_headquarters, b.is_active, b.created_date, 
                       b.created_by, b.updated_date, b.updated_by,
                       c.company_name_th, c.company_name_en
                FROM Branches b
                INNER JOIN Companies c ON b.company_code = c.company_code
                WHERE b.branch_code = @branch_code
            `;
            
            const result = await executeQuery(query, { branch_code: branchCode });
            
            if (result.recordset.length === 0) {
                return null;
            }
            
            const row = result.recordset[0];
            return {
                ...new Branch(row),
                company_name_th: row.company_name_th,
                company_name_en: row.company_name_en
            };
        } catch (error) {
            logger.error('Error in Branch.findByCode:', error);
            throw error;
        }
    }

    // Get branches by company
    static async findByCompany(companyCode) {
        try {
            const query = `
                SELECT branch_code, branch_name, company_code, 
                       is_headquarters, is_active, created_date, 
                       created_by, updated_date, updated_by
                FROM Branches
                WHERE company_code = @company_code
                ORDER BY is_headquarters DESC, branch_code
            `;
            
            const result = await executeQuery(query, { company_code: companyCode });
            return result.recordset.map(row => new Branch(row));
        } catch (error) {
            logger.error('Error in Branch.findByCompany:', error);
            throw error;
        }
    }

    // Create new branch
    async create() {
        try {
            // Check if setting as headquarters
            if (this.is_headquarters) {
                // Remove headquarters status from other branches in the same company
                await executeQuery(
                    `UPDATE Branches 
                     SET is_headquarters = 0, 
                         updated_date = GETDATE(), 
                         updated_by = @updated_by
                     WHERE company_code = @company_code AND is_headquarters = 1`,
                    { 
                        company_code: this.company_code,
                        updated_by: this.created_by
                    }
                );
            }

            const query = `
                INSERT INTO Branches (
                    branch_code, branch_name, company_code, 
                    is_headquarters, is_active, created_by
                )
                VALUES (
                    @branch_code, @branch_name, @company_code, 
                    @is_headquarters, @is_active, @created_by
                )
            `;
            
            const inputs = {
                branch_code: this.branch_code,
                branch_name: this.branch_name,
                company_code: this.company_code,
                is_headquarters: this.is_headquarters,
                is_active: this.is_active,
                created_by: this.created_by
            };
            
            await executeQuery(query, inputs);
            
            return await Branch.findByCode(this.branch_code);
        } catch (error) {
            logger.error('Error in Branch.create:', error);
            throw error;
        }
    }

    // Update branch
    async update() {
        try {
            // Check if setting as headquarters
            if (this.is_headquarters) {
                // Remove headquarters status from other branches in the same company
                await executeQuery(
                    `UPDATE Branches 
                     SET is_headquarters = 0, 
                         updated_date = GETDATE(), 
                         updated_by = @updated_by
                     WHERE company_code = @company_code 
                     AND is_headquarters = 1 
                     AND branch_code != @branch_code`,
                    { 
                        company_code: this.company_code,
                        branch_code: this.branch_code,
                        updated_by: this.updated_by
                    }
                );
            }

            const query = `
                UPDATE Branches
                SET branch_name = @branch_name,
                    is_headquarters = @is_headquarters,
                    updated_date = GETDATE(),
                    updated_by = @updated_by
                WHERE branch_code = @branch_code
            `;
            
            const inputs = {
                branch_code: this.branch_code,
                branch_name: this.branch_name,
                is_headquarters: this.is_headquarters,
                updated_by: this.updated_by
            };
            
            const result = await executeQuery(query, inputs);
            
            if (result.rowsAffected[0] === 0) {
                throw new Error('Branch not found');
            }
            
            return await Branch.findByCode(this.branch_code);
        } catch (error) {
            logger.error('Error in Branch.update:', error);
            throw error;
        }
    }

    // Update branch status
    static async updateStatus(branchCode, isActive, updatedBy) {
        try {
            const query = `
                UPDATE Branches
                SET is_active = @is_active,
                    updated_date = GETDATE(),
                    updated_by = @updated_by
                WHERE branch_code = @branch_code
            `;
            
            const inputs = {
                branch_code: branchCode,
                is_active: isActive,
                updated_by: updatedBy
            };
            
            const result = await executeQuery(query, inputs);
            
            if (result.rowsAffected[0] === 0) {
                throw new Error('Branch not found');
            }
            
            return await Branch.findByCode(branchCode);
        } catch (error) {
            logger.error('Error in Branch.updateStatus:', error);
            throw error;
        }
    }

    // Check if branch code exists
    static async exists(branchCode) {
        try {
            const query = `
                SELECT COUNT(*) as count
                FROM Branches
                WHERE branch_code = @branch_code
            `;
            
            const result = await executeQuery(query, { branch_code: branchCode });
            return result.recordset[0].count > 0;
        } catch (error) {
            logger.error('Error in Branch.exists:', error);
            throw error;
        }
    }

    // Get branches with pagination
    static async findPaginated(page = 1, limit = 20, filters = {}) {
        try {
            const offset = (page - 1) * limit;
            
            // Build WHERE clause
            let whereClause = ' WHERE 1=1';
            const inputs = {
                limit: limit,
                offset: offset
            };
            
            if (filters.company_code) {
                whereClause += ' AND b.company_code = @company_code';
                inputs.company_code = filters.company_code;
            }
            
            if (filters.is_active !== undefined) {
                whereClause += ' AND b.is_active = @is_active';
                inputs.is_active = filters.is_active;
            }
            
            if (filters.search) {
                whereClause += ' AND (b.branch_name LIKE @search OR b.branch_code LIKE @search)';
                inputs.search = `%${filters.search}%`;
            }
            
            // Count total records
            const countQuery = `
                SELECT COUNT(*) as total
                FROM Branches b
                ${whereClause}
            `;
            
            const countResult = await executeQuery(countQuery, inputs);
            const total = countResult.recordset[0].total;
            
            // Get paginated data
            const dataQuery = `
                SELECT b.branch_code, b.branch_name, b.company_code, 
                       b.is_headquarters, b.is_active, b.created_date, 
                       b.created_by, b.updated_date, b.updated_by,
                       c.company_name_th, c.company_name_en
                FROM Branches b
                INNER JOIN Companies c ON b.company_code = c.company_code
                ${whereClause}
                ORDER BY b.company_code, b.branch_code
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
            `;
            
            const dataResult = await executeQuery(dataQuery, inputs);
            
            return {
                data: dataResult.recordset.map(row => ({
                    ...new Branch(row),
                    company_name_th: row.company_name_th,
                    company_name_en: row.company_name_en
                })),
                pagination: {
                    page: page,
                    limit: limit,
                    total: total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Error in Branch.findPaginated:', error);
            throw error;
        }
    }

    // Get branch statistics
    static async getStatistics(companyCode = null) {
        try {
            let query = `
                SELECT 
                    COUNT(*) as total_branches,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_branches,
                    SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_branches,
                    SUM(CASE WHEN is_headquarters = 1 THEN 1 ELSE 0 END) as headquarters_count
                FROM Branches
            `;
            
            const inputs = {};
            
            if (companyCode) {
                query += ' WHERE company_code = @company_code';
                inputs.company_code = companyCode;
            }
            
            const result = await executeQuery(query, inputs);
            return result.recordset[0];
        } catch (error) {
            logger.error('Error in Branch.getStatistics:', error);
            throw error;
        }
    }

    // Check if company has branches
    static async companyHasBranches(companyCode) {
        try {
            const query = `
                SELECT COUNT(*) as count
                FROM Branches
                WHERE company_code = @company_code
            `;
            
            const result = await executeQuery(query, { company_code: companyCode });
            return result.recordset[0].count > 0;
        } catch (error) {
            logger.error('Error in Branch.companyHasBranches:', error);
            throw error;
        }
    }
}

module.exports = Branch;