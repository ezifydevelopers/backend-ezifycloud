// Notification controller - API endpoints for notifications

import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { NotificationService } from '../services/notificationService';

export class NotificationController {
  /**
   * Get user notifications
   * GET /api/notifications
   */
  static async getNotifications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const unreadOnly = req.query.unreadOnly === 'true';
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const notifications = await NotificationService.getUserNotifications(userId, {
        unreadOnly,
        limit,
        offset,
      });

      return res.json({
        success: true,
        data: notifications,
      });
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications',
        error: error.message,
      });
    }
  }

  /**
   * Get unread notification count
   * GET /api/notifications/unread-count
   */
  static async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;

      const count = await NotificationService.getUnreadCount(userId);

      return res.json({
        success: true,
        data: { count },
      });
    } catch (error: any) {
      console.error('Error fetching unread count:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch unread count',
        error: error.message,
      });
    }
  }

  /**
   * Mark notification as read
   * PUT /api/notifications/:notificationId/read
   */
  static async markAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { notificationId } = req.params;

      // Verify notification belongs to user
      const notification = await NotificationService.getUserNotifications(userId, {
        limit: 1000,
      });
      
      const userNotification = notification.find(n => n.id === notificationId);
      if (!userNotification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found',
        });
      }

      await NotificationService.markAsRead(notificationId);

      return res.json({
        success: true,
        message: 'Notification marked as read',
      });
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
        error: error.message,
      });
    }
  }

  /**
   * Mark all notifications as read
   * PUT /api/notifications/read-all
   */
  static async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;

      await NotificationService.markAllAsRead(userId);

      return res.json({
        success: true,
        message: 'All notifications marked as read',
      });
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read',
        error: error.message,
      });
    }
  }

  /**
   * Delete notification
   * DELETE /api/notifications/:notificationId
   */
  static async deleteNotification(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { notificationId } = req.params;

      // Verify notification belongs to user
      const notification = await NotificationService.getUserNotifications(userId, {
        limit: 1000,
      });
      
      const userNotification = notification.find(n => n.id === notificationId);
      if (!userNotification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found',
        });
      }

      await NotificationService.deleteNotification(notificationId);

      return res.json({
        success: true,
        message: 'Notification deleted',
      });
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete notification',
        error: error.message,
      });
    }
  }
}

