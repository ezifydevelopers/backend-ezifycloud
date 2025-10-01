import { Router } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { getAllUsers, getUserById, createUser, updateUser, deleteUser, toggleUserStatus } from '../modules/user/controller';
import { createUserSchema, updateUserSchema } from '../modules/user/schema';

const router = Router();

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
router.get('/:id', requireRole(['admin', 'manager']), getUserById);

// Create new user (Admin only)
router.post('/', requireRole(['admin']), createUser);

// Update user (Admin only)
router.put('/:id', requireRole(['admin']), updateUser);

// Delete user (Admin only)
router.delete('/:id', requireRole(['admin']), deleteUser);

// Toggle user status (Admin only)
router.patch('/:id/toggle-status', requireRole(['admin']), toggleUserStatus);

export default router;
