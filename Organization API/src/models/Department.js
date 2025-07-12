const { sql, executeQuery } = require('../config/database');
const logger = require('../utils/logger');

class Department {
    constructor(data) {
        this.department_code = data.department_code;
        this.department_name = data.department_name;
        this.division_code = data.division_code;
        this.is_active = data.is_active !== undefined ? data.is_active : true;
        this.created_date = data.created_date;
        this.created_by = data.created_by;
        this.updated_date = data.updated_date;
        this.updated_by = data.updated_by;
    }

    // Get all departments
    static async findAll(filters = {}) {
        try {
            let query = `
                SELECT dp.department_code, dp.department_name, dp.division_code,
                       dp.is_active, dp.created_date, dp.created_by, 
                       dp.updated_date, dp.updated_by,
                       d.division_name, d.company_code, d.branch_code,
                       c.company_name_th, c.company_name_en,
                       b.branch_name
                FROM Departments dp
                INNER JOIN Divisions d ON dp.division_code = d.division_code
                INNER JOIN Companies c ON d.company_code = c.company_code
                LEFT JOIN Branches b ON d.branch_code = b.branch_code
                WHERE 1=1
            `;
            
            const inputs = {};
            
            // Apply filters
            if (filters.division_code) {
                query += ' AND dp.division_code = @division_code';
                inputs.division_code = filters.division_code;
            }
            
            if (filters.company_code) {
                query += ' AND d.company_code = @company_code';
                inputs.company_code = filters.company_code;
            }
            
            if (filters.branch_code) {
                query += ' AND d.branch_code = @branch_code';
                inputs.branch_code = filters.branch_code;
            }
            
            if (filters.is_active !== undefined) {
                query += ' AND dp.is_active = @is_active';
                inputs.is_active = filters.is_active;
            }
            
            if (filters.search) {
                query += ' AND (dp.department_name LIKE @search OR dp.department_code LIKE @search)';
                inputs.search = `%${filters.search}%`;
            }
            
            query += ' ORDER BY d.company_code, d.branch_code, dp.division_code, dp.department_code';
            
            const result = await executeQuery(query, inputs);
            return result.recordset.map(row => ({
                ...new Department(row),
                division_name: row.division_name,
                company_code: row.company_code,
                branch_code: row.branch_code,
                company_name_th: row.company_name_th,
                company_name_en: row.company_name_en,
                branch_name: row.branch_name
            }));
        } catch (error) {
            logger.error('Error in Department.findAll:', error);
            throw error;
        }
    }

    // Get department by code
    static async findByCode(departmentCode) {
        try {
            const query = `
                SELECT dp.department_code, dp.department_name, dp.division_code,
                       dp.is_active, dp.created_date, dp.created_by, 
                       dp.updated_date, dp.updated_by,
                       d.division_name, d.company_code, d.branch_code,
                       c.company_name_th, c.company_name_en,
                       b.branch_name
                FROM Departments dp
                INNER JOIN Divisions d ON dp.division_code = d.division_code
                INNER JOIN Companies c ON d.company_code = c.company_code
                LEFT JOIN Branches b ON d.branch_code = b.branch_code
                WHERE dp.department_code = @department_code
            `;
            
            const result = await executeQuery(query, { department_code: departmentCode });
            
            if (result.recordset.length === 0) {
                return null;
            }
            
            const row = result.recordset[0];
            return {
                ...new Department(row),
                division_name: row.division_name,
                company_code: row.company_code,
                branch_code: row.branch_code,
                company_name_th: row.company_name_th,
                company_name_en: row.company_name_en,
                branch_name: row.branch_name
            };
        } catch (error) {
            logger.error('Error in Department.findByCode:', error);
            throw error;
        }
    }

    // Get departments by division
    static async findByDivision(divisionCode) {
        try {
            const query = `
                SELECT department_code, department_name, division_code,
                       is_active, created_date, created_by, 
                       updated_date, updated_by
                FROM Departments
                WHERE division_code = @division_code
                ORDER BY department_code
            `;
            
            const result = await executeQuery(query, { division_code: divisionCode });
            return result.recordset.map(row => new Department(row));
        } catch (error) {
            logger.error('Error in Department.findByDivision:', error);
            throw error;
        }
    }

    // Create new department
    async create() {
        try {
            const query = `
                INSERT INTO Departments (
                    department_code, department_name, division_code, 
                    is_active, created_by
                )
                VALUES (
                    @department_code, @department_name, @division_code, 
                    @is_active, @created_by
                )
            `;
            
            const inputs = {
                department_code: this.department_code,
                department_name: this.department_name,
                division_code: this.division_code,
                is_active: this.is_active,
                created_by: this.created_by
            };
            
            await executeQuery(query, inputs);
            
            return await Department.findByCode(this.department_code);
        } catch (error) {
            logger.error('Error in Department.create:', error);
            throw error;
        }
    }

    // Update department
    async update() {
        try {
            const query = `
                UPDATE Departments
                SET department_name = @department_name,
                    updated_date = GETDATE(),
                    updated_by = @updated_by
                WHERE department_code = @department_code
            `;
            
            const inputs = {
                department_code: this.department_code,
                department_name: this.department_name,
                updated_by: this.updated_by
            };
            
            const result = await executeQuery(query, inputs);
            
            if (result.rowsAffected[0] === 0) {
                throw new Error('Department not found');
            }
            
            return await Department.findByCode(this.department_code);
        } catch (error) {
            logger.error('Error in Department.update:', error);
            throw error;
        }
    }

    // Update department status
    static async updateStatus(departmentCode, isActive, updatedBy) {
        try {
            const query = `
                UPDATE Departments
                SET is_active = @is_active,
                    updated_date = GETDATE(),
                    updated_by = @updated_by
                WHERE department_code = @department_code
            `;
            
            const inputs = {
                department_code: departmentCode,
                is_active: isActive,
                updated_by: updatedBy
            };
            
            const result = await executeQuery(query, inputs);
            
            if (result.rowsAffected[0] === 0) {
                throw new Error('Department not found');
            }
            
            return await Department.findByCode(departmentCode);
        } catch (error) {
            logger.error('Error in Department.updateStatus:', error);
            throw error;
        }
    }

    // Check if department code exists
    static async exists(departmentCode) {
        try {
            const query = `
                SELECT COUNT(*) as count
                FROM Departments
                WHERE department_code = @department_code
            `;
            
            const result = await executeQuery(query, { department_code: departmentCode });
            return result.recordset[0].count > 0;
        } catch (error) {
            logger.error('Error in Department.exists:', error);
            throw error;
        }
    }

    // Get departments with pagination
    static async findPaginated(page = 1, limit = 20, filters = {}) {
        try {
            const offset = (page - 1) * limit;
            
            // Build WHERE clause
            let whereClause = ' WHERE 1=1';
            const inputs = {
                limit: limit,
                offset: offset
            };
            
            if (filters.division_code) {
                whereClause += ' AND dp.division_code = @division_code';
                inputs.division_code = filters.division_code;
            }
            
            if (filters.company_code) {
                whereClause += ' AND d.company_code = @company_code';
                inputs.company_code = filters.company_code;
            }
            
            if (filters.branch_code) {
                whereClause += ' AND d.branch_code = @branch_code';
                inputs.branch_code = filters.branch_code;
            }
            
            if (filters.is_active !== undefined) {
                whereClause += ' AND dp.is_active = @is_active';
                inputs.is_active = filters.is_active;
            }
            
            if (filters.search) {
                whereClause += ' AND (dp.department_name LIKE @search OR dp.department_code LIKE @search)';
                inputs.search = `%${filters.search}%`;
            }
            
            // Count total records
            const countQuery = `
                SELECT COUNT(*) as total
                FROM Departments dp
                INNER JOIN Divisions d ON dp.division_code = d.division_code
                ${whereClause}
            `;
            
            const countResult = await executeQuery(countQuery, inputs);
            const total = countResult.recordset[0].total;
            
            // Get paginated data
            const dataQuery = `
                SELECT dp.department_code, dp.department_name, dp.division_code,
                       dp.is_active, dp.created_date, dp.created_by, 
                       dp.updated_date, dp.updated_by,
                       d.division_name, d.company_code, d.branch_code,
                       c.company_name_th, c.company_name_en,
                       b.branch_name
                FROM Departments dp
                INNER JOIN Divisions d ON dp.division_code = d.division_code
                INNER JOIN Companies c ON d.company_code = c.company_code
                LEFT JOIN Branches b ON d.branch_code = b.branch_code
                ${whereClause}
                ORDER BY d.company_code, d.branch_code, dp.division_code, dp.department_code
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
            `;
            
            const dataResult = await executeQuery(dataQuery, inputs);
            
            return {
                data: dataResult.recordset.map(row => ({
                    ...new Department(row),
                    division_name: row.division_name,
                    company_code: row.company_code,
                    branch_code: row.branch_code,
                    company_name_th: row.company_name_th,
                    company_name_en: row.company_name_en,
                    branch_name: row.branch_name
                })),
                pagination: {
                    page: page,
                    limit: limit,
                    total: total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Error in Department.findPaginated:', error);
            throw error;
        }
    }

    // Get department statistics
    static async getStatistics(filters = {}) {
        try {
            let query = `
                SELECT 
                    COUNT(*) as total_departments,
                    SUM(CASE WHEN dp.is_active = 1 THEN 1 ELSE 0 END) as active_departments,
                    SUM(CASE WHEN dp.is_active = 0 THEN 1 ELSE 0 END) as inactive_departments,
                    COUNT(DISTINCT dp.division_code) as divisions_count
                FROM Departments dp
                INNER JOIN Divisions d ON dp.division_code = d.division_code
                WHERE 1=1
            `;
            
            const inputs = {};
            
            if (filters.division_code) {
                query += ' AND dp.division_code = @division_code';
                inputs.division_code = filters.division_code;
            }
            
            if (filters.company_code) {
                query += ' AND d.company_code = @company_code';
                inputs.company_code = filters.company_code;
            }
            
            if (filters.branch_code) {
                query += ' AND d.branch_code = @branch_code';
                inputs.branch_code = filters.branch_code;
            }
            
            const result = await executeQuery(query, inputs);
            return result.recordset[0];
        } catch (error) {
            logger.error('Error in Department.getStatistics:', error);
            throw error;
        }
    }

    // Move department to another division
    static async moveToDivision(departmentCode, newDivisionCode, updatedBy) {
        try {
            // Check if the division exists
            const checkQuery = `
                SELECT COUNT(*) as count
                FROM Divisions
                WHERE division_code = @division_code AND is_active = 1
            `;
            
            const checkResult = await executeQuery(checkQuery, {
                division_code: newDivisionCode
            });
            
            if (checkResult.recordset[0].count === 0) {
                throw new Error('Target division not found or inactive');
            }
            
            // Update the department's division
            const updateQuery = `
                UPDATE Departments
                SET division_code = @division_code,
                    updated_date = GETDATE(),
                    updated_by = @updated_by
                WHERE department_code = @department_code
            `;
            
            const result = await executeQuery(updateQuery, {
                department_code: departmentCode,
                division_code: newDivisionCode,
                updated_by: updatedBy
            });
            
            if (result.rowsAffected[0] === 0) {
                throw new Error('Department not found');
            }
            
            return await Department.findByCode(departmentCode);
        } catch (error) {
            logger.error('Error in Department.moveToDivision:', error);
            throw error;
        }
    }
}

module.exports = Department;