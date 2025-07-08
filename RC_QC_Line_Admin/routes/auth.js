const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const AuthController = require('../controllers/AuthController');
const { isNotAuthenticated, isAuthenticated } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

// Login page
router.get('/login', isNotAuthenticated, AuthController.showLogin);

// Login process
router.post('/login', 
    isNotAuthenticated,
    rateLimiter.loginLimiter,
    [
        body('employee_id').trim().notEmpty().withMessage('Employee ID is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    AuthController.login
);

// Logout
router.get('/logout', AuthController.logout);
router.post('/logout', AuthController.logout);

// Forgot password page
router.get('/forgot-password', isNotAuthenticated, AuthController.showForgotPassword);

// Forgot password process
router.post('/forgot-password',
    isNotAuthenticated,
    rateLimiter.passwordResetLimiter,
    [
        body('employee_id').trim().notEmpty().withMessage('Employee ID is required'),
        body('email').trim().isEmail().withMessage('Valid email is required')
    ],
    AuthController.forgotPassword
);

// Change password (for logged-in users)
router.post('/change-password',
    isAuthenticated,
    [
        body('current_password').notEmpty().withMessage('Current password is required'),
        body('new_password')
            .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .withMessage('Password must contain uppercase, lowercase, number and special character'),
        body('confirm_password').custom((value, { req }) => {
            if (value !== req.body.new_password) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
    ],
    AuthController.changePassword
);

// Update language preference
router.post('/language',
    [
        body('language').isIn(['th-TH', 'en-US']).withMessage('Invalid language')
    ],
    AuthController.updateLanguage
);

module.exports = router;