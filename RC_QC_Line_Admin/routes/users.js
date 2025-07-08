const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const UserController = require('../controllers/UserController');
const { isAdmin } = require('../middleware/auth');

// All user management routes require admin role
router.use(isAdmin);

// List all users
router.get('/', UserController.index);

// Show create user form
router.get('/create', UserController.showCreate);

// Create new user
router.post('/create',
    [
        body('employee_id').trim().notEmpty().withMessage('Employee ID is required')
            .isLength({ max: 20 }).withMessage('Employee ID too long'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .withMessage('Password must contain uppercase, lowercase, number and special character'),
        body('full_name').trim().notEmpty().withMessage('Full name is required')
            .isLength({ max: 100 }).withMessage('Full name too long'),
        body('email').trim().isEmail().withMessage('Valid email is required'),
        body('department').trim().notEmpty().withMessage('Department is required'),
        body('role').isIn(['viewer', 'manager', 'admin']).withMessage('Invalid role')
    ],
    UserController.create
);

// Show edit user form
router.get('/:id/edit',
    param('id').isInt().withMessage('Invalid user ID'),
    UserController.showEdit
);

// Update user
router.put('/:id',
    [
        param('id').isInt().withMessage('Invalid user ID'),
        body('full_name').trim().notEmpty().withMessage('Full name is required'),
        body('email').trim().isEmail().withMessage('Valid email is required'),
        body('department').trim().notEmpty().withMessage('Department is required'),
        body('role').isIn(['viewer', 'manager', 'admin']).withMessage('Invalid role')
    ],
    UserController.update
);

// Delete user
router.delete('/:id',
    param('id').isInt().withMessage('Invalid user ID'),
    UserController.delete
);

// Reset user password
router.post('/:id/reset-password',
    param('id').isInt().withMessage('Invalid user ID'),
    UserController.resetPassword
);

// Toggle user status
router.post('/:id/toggle-status',
    param('id').isInt().withMessage('Invalid user ID'),
    UserController.toggleStatus
);

// Export users to Excel
router.post('/export', UserController.export);

module.exports = router;