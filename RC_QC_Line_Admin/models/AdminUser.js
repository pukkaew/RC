// Path: RC_QC_Line_Admin/models/AdminUser.js
// Admin user model for authentication and user management

const db = require('../config/database');
const bcrypt = require('../utils/bcrypt');
const logger = require('../utils/logger');

class AdminUser {
    constructor(data) {
        this.admin_id = data.admin_id;
        this.employee_id = data.employee_id;
        this.password_hash = data.password_hash;
        this.full_name = data.full_name;
        this.email = data.email;
        this.department = data.department;
        this.role = data.role;
        this.is_active = data.is_active;
        this.preferred_language = data.preferred_language;
        this.last_login = data.last_login;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }
    
    // Static methods
    static async create(userData) {
        try {
            // Hash password
            const passwordHash = await bcrypt.hash(userData.password);
            
            const result = await db.query(
                `INSERT INTO AdminUsers 
                (employee_id, password_hash, full_name, email, department, role, preferred_language)
                OUTPUT INSERTED.*
                VALUES (@employee_id, @password_hash, @full_name, @email, @department, @role, @preferred_language)`,
                {
                    employee_id: userData.employee_id.toUpperCase(),
                    password_hash: passwordHash,
                    full_name: userData.full_name,
                    email: userData.email,
                    department: userData.department,
                    role: userData.role || 'viewer',
                    preferred_language: userData.preferred_language || 'th-TH'
                }
            );
            
            return new AdminUser(result.recordset[0]);
        } catch (error) {
            if (error.message.includes('UNIQUE')) {
                throw new Error('Employee ID already exists');
            }
            logger.error('Error creating admin user:', error);
            throw error;
        }
    }
    
    static async findById(adminId) {
        try {
            const result = await db.query(
                `SELECT * FROM AdminUsers WHERE admin_id = @admin_id`,
                { admin_id: adminId }
            );
            
            if (result.recordset.length === 0) {
                return null;
            }
            
            return new AdminUser(result.recordset[0]);
        } catch (error) {
            logger.error('Error finding admin user by ID:', error);
            throw error;
        }
    }
    
    static async findByEmployeeId(employeeId) {
        try {
            const result = await db.query(
                `SELECT * FROM AdminUsers WHERE employee_id = @employee_id`,
                { employee_id: employeeId.toUpperCase() }
            );
            
            if (result.recordset.length === 0) {
                return null;
            }
            
            return new AdminUser(result.recordset[0]);
        } catch (error) {
            logger.error('Error finding admin user by employee ID:', error);
            throw error;
        }
    }
    
    static async findAll(options = {}) {
        try {
            let query = `
                SELECT * FROM AdminUsers 
                WHERE 1=1
            `;
            const params = {};
            
            // Add filters
            if (options.role) {
                query += ` AND role = @role`;
                params.role = options.role;
            }
            
            if (options.department) {
                query += ` AND department = @department`;
                params.department = options.department;
            }
            
            if (options.is_active !== undefined) {
                query += ` AND is_active = @is_active`;
                params.is_active = options.is_active;
            }
            
            // Add sorting
            const orderBy = options.orderBy || 'full_name';
            const orderDir = options.orderDir || 'ASC';
            query += ` ORDER BY ${orderBy} ${orderDir}`;
            
            // Add pagination
            if (options.limit) {
                const offset = ((options.page || 1) - 1) * options.limit;
                query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
                params.offset = offset;
                params.limit = options.limit;
            }
            
            const result = await db.query(query, params);
            return result.recordset.map(row => new AdminUser(row));
        } catch (error) {
            logger.error('Error finding all admin users:', error);
            throw error;
        }
    }
    
    static async count(options = {}) {
        try {
            let query = `SELECT COUNT(*) as total FROM AdminUsers WHERE 1=1`;
            const params = {};
            
            if (options.role) {
                query += ` AND role = @role`;
                params.role = options.role;
            }
            
            if (options.department) {
                query += ` AND department = @department`;
                params.department = options.department;
            }
            
            if (options.is_active !== undefined) {
                query += ` AND is_active = @is_active`;
                params.is_active = options.is_active;
            }
            
            const result = await db.query(query, params);
            return result.recordset[0].total;
        } catch (error) {
            logger.error('Error counting admin users:', error);
            throw error;
        }
    }
    
    // Instance methods
    async update(updates) {
        try {
            const allowedUpdates = ['full_name', 'email', 'department', 'role', 'is_active', 'preferred_language'];
            const updateFields = [];
            const params = { admin_id: this.admin_id };
            
            allowedUpdates.forEach(field => {
                if (updates[field] !== undefined) {
                    updateFields.push(`${field} = @${field}`);
                    params[field] = updates[field];
                    this[field] = updates[field];
                }
            });
            
            if (updateFields.length === 0) {
                return this;
            }
            
            updateFields.push('updated_at = GETDATE()');
            
            await db.query(
                `UPDATE AdminUsers 
                SET ${updateFields.join(', ')}
                WHERE admin_id = @admin_id`,
                params
            );
            
            this.updated_at = new Date();
            return this;
        } catch (error) {
            logger.error('Error updating admin user:', error);
            throw error;
        }
    }
    
    async updatePassword(newPassword) {
        try {
            const passwordHash = await bcrypt.hash(newPassword);
            
            await db.query(
                `UPDATE AdminUsers 
                SET password_hash = @password_hash, updated_at = GETDATE()
                WHERE admin_id = @admin_id`,
                { admin_id: this.admin_id, password_hash: passwordHash }
            );
            
            this.password_hash = passwordHash;
            this.updated_at = new Date();
            return true;
        } catch (error) {
            logger.error('Error updating password:', error);
            throw error;
        }
    }
    
    async updateLastLogin() {
        try {
            const now = new Date();
            
            await db.query(
                `UPDATE AdminUsers 
                SET last_login = @last_login
                WHERE admin_id = @admin_id`,
                { admin_id: this.admin_id, last_login: now }
            );
            
            this.last_login = now;
            return true;
        } catch (error) {
            logger.error('Error updating last login:', error);
            throw error;
        }
    }
    
    async verifyPassword(password) {
        try {
            return await bcrypt.compare(password, this.password_hash);
        } catch (error) {
            logger.error('Error verifying password:', error);
            return false;
        }
    }
    
    async delete() {
        try {
            await db.query(
                `DELETE FROM AdminUsers WHERE admin_id = @admin_id`,
                { admin_id: this.admin_id }
            );
            return true;
        } catch (error) {
            logger.error('Error deleting admin user:', error);
            throw error;
        }
    }
    
    // Helper methods
    hasRole(role) {
        const roleHierarchy = {
            'viewer': 0,
            'manager': 1,
            'admin': 2
        };
        
        return roleHierarchy[this.role] >= roleHierarchy[role];
    }
    
    canManageLots() {
        return this.hasRole('manager');
    }
    
    canManageUsers() {
        return this.role === 'admin';
    }
    
    canDeleteLots() {
        return this.role === 'admin';
    }
    
    toJSON() {
        const { password_hash, ...publicData } = this;
        return publicData;
    }
}

module.exports = AdminUser;