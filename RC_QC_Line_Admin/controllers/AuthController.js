const AdminUser = require('../models/AdminUser');
const AuditLog = require('../models/AuditLog');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const moment = require('moment-timezone');

class AuthController {
    // Show login page
    static async showLogin(req, res) {
        try {
            // If already logged in, redirect to dashboard
            if (req.session.user) {
                return res.redirect('/');
            }
            
            res.render('auth/login', {
                title: req.t('auth:login.title'),
                error: null
            });
        } catch (error) {
            logger.error('Error showing login page:', error);
            res.status(500).render('errors/500');
        }
    }
    
    // Handle login
    static async login(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.render('auth/login', {
                    title: req.t('auth:login.title'),
                    error: req.t('auth:login.validation_error'),
                    data: req.body
                });
            }
            
            const { employee_id, password, remember_me } = req.body;
            
            // Check login attempts
            const attemptsKey = `login_attempts_${employee_id}`;
            const attempts = req.session[attemptsKey] || 0;
            const lastAttempt = req.session[`${attemptsKey}_time`];
            
            // Check if locked out
            if (attempts >= parseInt(process.env.LOGIN_ATTEMPTS_LIMIT || 5)) {
                const lockoutTime = parseInt(process.env.LOGIN_ATTEMPTS_WINDOW || 900000); // 15 minutes
                if (lastAttempt && (Date.now() - lastAttempt) < lockoutTime) {
                    const remainingTime = Math.ceil((lockoutTime - (Date.now() - lastAttempt)) / 60000);
                    
                    await AuditLog.create({
                        admin_id: null,
                        action_type: 'LOGIN_LOCKED',
                        entity_type: 'auth',
                        description: `Too many failed login attempts for employee ID: ${employee_id}`,
                        ip_address: req.ip,
                        user_agent: req.get('user-agent')
                    });
                    
                    return res.render('auth/login', {
                        title: req.t('auth:login.title'),
                        error: req.t('auth:login.account_locked', { minutes: remainingTime }),
                        data: req.body
                    });
                }
                // Reset attempts after lockout period
                req.session[attemptsKey] = 0;
            }
            
            // Find user
            const user = await AdminUser.findByEmployeeId(employee_id);
            
            if (!user || !user.is_active) {
                req.session[attemptsKey] = attempts + 1;
                req.session[`${attemptsKey}_time`] = Date.now();
                
                await AuditLog.create({
                    admin_id: null,
                    action_type: 'LOGIN_FAILED',
                    entity_type: 'auth',
                    description: `Failed login attempt for employee ID: ${employee_id}`,
                    ip_address: req.ip,
                    user_agent: req.get('user-agent')
                });
                
                return res.render('auth/login', {
                    title: req.t('auth:login.title'),
                    error: req.t('auth:login.invalid_credentials'),
                    data: req.body
                });
            }
            
            // Verify password
            const isValidPassword = await user.verifyPassword(password);
            
            if (!isValidPassword) {
                req.session[attemptsKey] = attempts + 1;
                req.session[`${attemptsKey}_time`] = Date.now();
                
                await AuditLog.create({
                    admin_id: null,
                    action_type: 'LOGIN_FAILED',
                    entity_type: 'auth',
                    description: `Invalid password for employee ID: ${employee_id}`,
                    ip_address: req.ip,
                    user_agent: req.get('user-agent')
                });
                
                return res.render('auth/login', {
                    title: req.t('auth:login.title'),
                    error: req.t('auth:login.invalid_credentials'),
                    data: req.body
                });
            }
            
            // Clear login attempts
            delete req.session[attemptsKey];
            delete req.session[`${attemptsKey}_time`];
            
            // Update last login
            await user.updateLastLogin();
            
            // Set session
            req.session.user = user.toJSON();
            
            // Set language preference
            if (user.preferred_language) {
                req.session.language = user.preferred_language;
            }
            
            // Set cookie if remember me
            if (remember_me) {
                req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
            }
            
            // Log successful login
            await AuditLog.create({
                admin_id: user.admin_id,
                action_type: 'LOGIN_SUCCESS',
                entity_type: 'auth',
                description: `Successful login`,
                ip_address: req.ip,
                user_agent: req.get('user-agent')
            });
            
            req.flash('success_msg', req.t('auth:login.success', { name: user.full_name }));
            
            // Redirect to original URL or dashboard
            const redirectUrl = req.session.returnTo || '/';
            delete req.session.returnTo;
            res.redirect(redirectUrl);
            
        } catch (error) {
            logger.error('Login error:', error);
            res.render('auth/login', {
                title: req.t('auth:login.title'),
                error: req.t('common:errors.system_error'),
                data: req.body
            });
        }
    }
    
    // Handle logout
    static async logout(req, res) {
        try {
            if (req.session.user) {
                await AuditLog.create({
                    admin_id: req.session.user.admin_id,
                    action_type: 'LOGOUT',
                    entity_type: 'auth',
                    description: 'User logged out',
                    ip_address: req.ip,
                    user_agent: req.get('user-agent')
                });
            }
            
            req.session.destroy((err) => {
                if (err) {
                    logger.error('Session destroy error:', err);
                }
                res.redirect('/auth/login');
            });
        } catch (error) {
            logger.error('Logout error:', error);
            res.redirect('/auth/login');
        }
    }
    
    // Show forgot password page
    static async showForgotPassword(req, res) {
        try {
            res.render('auth/forgot-password', {
                title: req.t('auth:forgot_password.title'),
                error: null,
                success: null
            });
        } catch (error) {
            logger.error('Error showing forgot password page:', error);
            res.status(500).render('errors/500');
        }
    }
    
    // Handle forgot password
    static async forgotPassword(req, res) {
        try {
            const { employee_id, email } = req.body;
            
            // Find user
            const user = await AdminUser.findByEmployeeId(employee_id);
            
            if (!user || user.email !== email) {
                return res.render('auth/forgot-password', {
                    title: req.t('auth:forgot_password.title'),
                    error: req.t('auth:forgot_password.user_not_found'),
                    success: null,
                    data: req.body
                });
            }
            
            // In a real implementation, you would:
            // 1. Generate a reset token
            // 2. Send an email with reset link
            // 3. Store token with expiration
            
            // For now, just show a message
            res.render('auth/forgot-password', {
                title: req.t('auth:forgot_password.title'),
                error: null,
                success: req.t('auth:forgot_password.contact_admin'),
                data: null
            });
            
            await AuditLog.create({
                admin_id: user.admin_id,
                action_type: 'PASSWORD_RESET_REQUEST',
                entity_type: 'auth',
                description: 'Password reset requested',
                ip_address: req.ip,
                user_agent: req.get('user-agent')
            });
            
        } catch (error) {
            logger.error('Forgot password error:', error);
            res.render('auth/forgot-password', {
                title: req.t('auth:forgot_password.title'),
                error: req.t('common:errors.system_error'),
                success: null,
                data: req.body
            });
        }
    }
    
    // Change password (for logged-in users)
    static async changePassword(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: req.t('common:errors.validation_error'),
                    errors: errors.array()
                });
            }
            
            const { current_password, new_password } = req.body;
            const user = await AdminUser.findById(req.session.user.admin_id);
            
            // Verify current password
            const isValid = await user.verifyPassword(current_password);
            if (!isValid) {
                return res.status(400).json({
                    success: false,
                    message: req.t('auth:change_password.invalid_current')
                });
            }
            
            // Update password
            await user.updatePassword(new_password);
            
            await AuditLog.create({
                admin_id: user.admin_id,
                action_type: 'PASSWORD_CHANGED',
                entity_type: 'auth',
                description: 'Password changed successfully',
                ip_address: req.ip,
                user_agent: req.get('user-agent')
            });
            
            res.json({
                success: true,
                message: req.t('auth:change_password.success')
            });
            
        } catch (error) {
            logger.error('Change password error:', error);
            res.status(500).json({
                success: false,
                message: req.t('common:errors.system_error')
            });
        }
    }
    
    // Update language preference
    static async updateLanguage(req, res) {
        try {
            const { language } = req.body;
            const supportedLanguages = process.env.SUPPORTED_LANGUAGES?.split(',') || ['th-TH', 'en-US'];
            
            if (!supportedLanguages.includes(language)) {
                return res.status(400).json({
                    success: false,
                    message: 'Unsupported language'
                });
            }
            
            // Update session
            req.session.language = language;
            
            // Update user preference if logged in
            if (req.session.user) {
                const user = await AdminUser.findById(req.session.user.admin_id);
                await user.update({ preferred_language: language });
                req.session.user.preferred_language = language;
            }
            
            res.json({
                success: true,
                message: req.t('common:language_updated')
            });
            
        } catch (error) {
            logger.error('Update language error:', error);
            res.status(500).json({
                success: false,
                message: req.t('common:errors.system_error')
            });
        }
    }
}

module.exports = AuthController;