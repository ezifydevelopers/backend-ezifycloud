// Notification routes

import { Router } from 'express';
import { authenticateToken } from '../../../middleware/auth';
import { NotificationController } from '../controllers/notificationController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get user notifications
router.get('/', (req, res) => NotificationController.getNotifications(req as any, res));

// Get unread count
router.get('/unread-count', (req, res) => NotificationController.getUnreadCount(req as any, res));

// Mark notification as read
router.put('/:notificationId/read', (req, res) => NotificationController.markAsRead(req as any, res));

// Mark all notifications as read
router.put('/read-all', (req, res) => NotificationController.markAllAsRead(req as any, res));

// Delete notification
router.delete('/:notificationId', (req, res) => NotificationController.deleteNotification(req as any, res));

export default router;

