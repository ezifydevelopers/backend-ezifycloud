import { Router } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { getAllUsers, getUserById, createUser, updateUser, deleteUser, toggleUserStatus } from '../modules/user/controller';
import { createUserSchema, updateUserSchema } from '../modules/user/schema';
import { validateParams } from '../utils/validation';
import Joi from 'joi';

const router = Router();

// ID parameter validation schema
const idParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'ID must be a valid UUID',
    'any.required': 'ID is required'
  })
});

// All user routes require authentication
router.use(authenticateToken);

// Get current user profile
router.get('/profile', (req: AuthRequest, res) => {
  res.json({
    success: true,
    message: 'User profile endpoint',
    data: req.user
  });
});

// Update user profile
router.put('/profile', (req: AuthRequest, res) => {
  res.json({
    success: true,
    message: 'Update profile endpoint - Coming soon'
  });
});

// Get all users (Admin only)
router.get('/', requireRole(['admin']), getAllUsers);

// Get user by ID (Admin/Manager only)
router.get('/:id', 
  validateParams(idParamSchema),
  requireRole(['admin', 'manager']), 
  getUserById
);

// Create new user (Admin only)
router.post('/', requireRole(['admin']), createUser);

// Update user (Admin only)
router.put('/:id', 
  validateParams(idParamSchema),
  requireRole(['admin']), 
  updateUser
);

// Delete user (Admin only)
router.delete('/:id', 
  validateParams(idParamSchema),
  requireRole(['admin']), 
  deleteUser
);

// Toggle user status (Admin only)
router.patch('/:id/toggle-status', 
  validateParams(idParamSchema),
  requireRole(['admin']), 
  toggleUserStatus
);

export default router;
