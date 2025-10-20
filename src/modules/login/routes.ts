import { Router } from 'express';
import { login, register, forgotPassword, resetPassword, changePassword } from './controller';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// Public routes
router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.post('/change-password', authenticateToken, changePassword);

export default router;
