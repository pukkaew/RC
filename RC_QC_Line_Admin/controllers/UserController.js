const AdminUser = require('../models/AdminUser');
const AuditLog = require('../models/AuditLog');
const bcrypt = require('../utils/bcrypt');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class UserController {
    // List all users
    static async index(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const role = req.query.role || '';
            const department = req.query.department || '';
            const is_active = req.query.is_active;
            
            const filters = {
                page,
                limit,
                orderBy: 'full_name',
                orderDir: 'ASC'
            };
            
            if (role) filters.role = role;
            if (department) filters.department = department;
            if (is_active !== undefined) filters.is_active = is_active === 'true';
            
            const users = await AdminUser.findAll(filters);
            const totalCount = await AdminUser.count(filters);
            const totalPages = Math.ceil(totalCount / limit);
            
            res.render('users/index', {
                title: req.t('users:title'),
                users,
                pagination: {
                    page,
                    limit,
                    totalCount,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                },
                filters: {
                    role,
                    department,
                    is_active
                }
            });
        } catch (error) {
            logger.error('Error listing users:', error);
            req.flash('error_msg', req.t('common:errors.load_failed'));
            res.redirect('/');
        }
    }
    
    // Show create user form
    static async showCreate(req, res) {
        try {
            res.render('users/create', {
                title: req.t('users:create.title'),
                user: {},
                errors: []
            });
        } catch (error) {
            logger.error('Error showing create form:', error);
            req.flash('error_msg', req.t('common:errors.load_failed'));
            res.redirect('/users');
        }
    }
    
    // Create new user
    static async create(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.render('users/create', {
                    title: req.t('users:create.title'),
                    user: req.body,
                    errors: errors.array()
                });
            }
            
            const {
                employee_id,
                password,
                full_name,
                email,
                department,
                role,
                preferred_language
            } = req.body;
            
            // Check if employee ID already exists
            const existingUser = await AdminUser.findByEmployeeId(employee_id);
            if (existingUser) {
                return res.render('users/create', {
                    title: req.t('users:create.title'),
                    user: req.body,
                    errors: [{ msg: req.t('users:errors.employee_id_exists') }]
                });
            }
            
            // Create user
            const newUser = await AdminUser.create({
                employee_id,
                password,
                full_name,
                email,
                department,
                role,
                preferred_language: preferred_language || 'th-TH',
                created_by: req.session.user.admin_id
            });
            
            // Log the action
            await AuditLog.logUserCreate(
                req.session.user.admin_id,
                newUser.admin_id,
                employee_id,
                req.ip,
                req.get('user-agent')
            );
            
            req.flash('success_msg', req.t('users:messages.create_success'));
            res.redirect('/users');
        } catch (error) {
            logger.error('Error creating user:', error);
            res.render('users/create', {
                title: req.t('users:create.title'),
                user: req.body,
                errors: [{ msg: req.t('common:errors.save_failed') }]
            });
        }
    }
    
    // Show edit user form
    static async showEdit(req, res) {
        try {
            const userId = req.params.id;
            const user = await AdminUser.findById(userId);
            
            if (!user) {
                req.flash('error_msg', req.t('users:errors.not_found'));
                return res.redirect('/users');
            }
            
            res.render('users/edit', {
                title: req.t('users:edit.title'),
                user: user.toJSON(),
                errors: []
            });
        } catch (error) {
            logger.error('Error showing edit form:', error);
            req.flash('error_msg', req.t('common:errors.load_failed'));
            res.redirect('/users');
        }
    }
    
    // Update user
    static async update(req, res) {
        try {
            const userId = req.params.id;
            const errors = validationResult(req);
            
            if (!errors.isEmpty()) {
                const user = await AdminUser.findById(userId);
                return res.render('users/edit', {
                    title: req.t('users:edit.title'),
                    user: { ...user.toJSON(), ...req.body },
                    errors: errors.array()
                });
            }
            
            const user = await AdminUser.findById(userId);
            if (!user) {
                req.flash('error_msg', req.t('users:errors.not_found'));
                return res.redirect('/users');
            }
            
            const oldData = user.toJSON();
            const updates = {
                full_name: req.body.full_name,
                email: req.body.email,
                department: req.body.department,
                role: req.body.role,
                preferred_language: req.body.preferred_language,
                is_active: req.body.is_active === 'true'
            };
            
            await user.update(updates);
            
            // Log the action
            await AuditLog.logUserUpdate(
                req.session.user.admin_id,
                userId,
                {
                    old: oldData,
                    new: updates
                },
                req.ip,
                req.get('user-agent')
            );
            
            req.flash('success_msg', req.t('users:messages.update_success'));
            res.redirect('/users');
        } catch (error) {
            logger.error('Error updating user:', error);
            req.flash('error_msg', req.t('common:errors.save_failed'));
            res.redirect(`/users/${req.params.id}/edit`);
        }
    }
    
    // Delete user
    static async delete(req, res) {
        try {
            const userId = req.params.id;
            
            // Prevent deleting self
            if (userId == req.session.user.admin_id) {
                return res.status(400).json({
                    success: false,
                    message: req.t('users:errors.cannot_delete_self')
                });
            }
            
            const user = await AdminUser.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: req.t('users:errors.not_found')
                });
            }
            
            await user.delete();
            
            // Log the action
            await AuditLog.create({
                admin_id: req.session.user.admin_id,
                action_type: 'USER_DELETE',
                entity_type: 'user',
                entity_id: userId,
                old_value: user.employee_id,
                description: `Deleted user ${user.full_name} (${user.employee_id})`,
                ip_address: req.ip,
                user_agent: req.get('user-agent')
            });
            
            res.json({
                success: true,
                message: req.t('users:messages.delete_success')
            });
        } catch (error) {
            logger.error('Error deleting user:', error);
            res.status(500).json({
                success: false,
                message: req.t('common:errors.delete_failed')
            });
        }
    }
    
    // Reset user password
    static async resetPassword(req, res) {
        try {
            const userId = req.params.id;
            const user = await AdminUser.findById(userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: req.t('users:errors.not_found')
                });
            }
            
            // Generate new password
            const newPassword = bcrypt.generatePassword();
            await user.updatePassword(newPassword);
            
            // Log the action
            await AuditLog.create({
                admin_id: req.session.user.admin_id,
                action_type: 'PASSWORD_RESET',
                entity_type: 'user',
                entity_id: userId,
                description: `Reset password for user ${user.employee_id}`,
                ip_address: req.ip,
                user_agent: req.get('user-agent')
            });
            
            res.json({
                success: true,
                message: req.t('users:messages.password_reset_success'),
                newPassword: newPassword
            });
        } catch (error) {
            logger.error('Error resetting password:', error);
            res.status(500).json({
                success: false,
                message: req.t('common:errors.operation_failed')
            });
        }
    }
    
    // Toggle user status
    static async toggleStatus(req, res) {
        try {
            const userId = req.params.id;
            
            // Prevent disabling self
            if (userId == req.session.user.admin_id) {
                return res.status(400).json({
                    success: false,
                    message: req.t('users:errors.cannot_disable_self')
                });
            }
            
            const user = await AdminUser.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: req.t('users:errors.not_found')
                });
            }
            
            await user.update({ is_active: !user.is_active });
            
            // Log the action
            await AuditLog.create({
                admin_id: req.session.user.admin_id,
                action_type: user.is_active ? 'USER_ACTIVATE' : 'USER_DEACTIVATE',
                entity_type: 'user',
                entity_id: userId,
                description: `${user.is_active ? 'Activated' : 'Deactivated'} user ${user.employee_id}`,
                ip_address: req.ip,
                user_agent: req.get('user-agent')
            });
            
            res.json({
                success: true,
                message: req.t(user.is_active ? 'users:messages.activate_success' : 'users:messages.deactivate_success'),
                is_active: user.is_active
            });
        } catch (error) {
            logger.error('Error toggling user status:', error);
            res.status(500).json({
                success: false,
                message: req.t('common:errors.operation_failed')
            });
        }
    }
    
    // Export users to Excel
    static async export(req, res) {
        try {
            const ExcelService = require('../services/ExcelService');
            
            const users = await AdminUser.findAll({
                orderBy: 'full_name',
                orderDir: 'ASC'
            });
            
            const data = users.map(user => ({
                'Employee ID': user.employee_id,
                'Full Name': user.full_name,
                'Email': user.email,
                'Department': user.department,
                'Role': user.role,
                'Status': user.is_active ? 'Active' : 'Inactive',
                'Last Login': user.last_login ? moment(user.last_login).format('DD/MM/YYYY HH:mm') : '-',
                'Created At': moment(user.created_at).format('DD/MM/YYYY HH:mm')
            }));
            
            const buffer = await ExcelService.createWorkbook({
                sheets: [{
                    name: 'Users',
                    data: data
                }]
            });
            
            // Log the action
            await AuditLog.create({
                admin_id: req.session.user.admin_id,
                action_type: 'USER_EXPORT',
                entity_type: 'user',
                description: `Exported ${users.length} users to Excel`,
                ip_address: req.ip,
                user_agent: req.get('user-agent')
            });
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=users_${moment().format('YYYYMMDD_HHmmss')}.xlsx`);
            res.send(buffer);
        } catch (error) {
            logger.error('Error exporting users:', error);
            req.flash('error_msg', req.t('common:errors.export_failed'));
            res.redirect('/users');
        }
    }
}

module.exports = UserController;