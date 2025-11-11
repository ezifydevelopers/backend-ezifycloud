// Notification service - Handles creating and managing notifications

import prisma from '../../../lib/prisma';
import { NotificationType, Prisma } from '@prisma/client';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(data: CreateNotificationInput) {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
        metadata: (data.metadata || {}) as Prisma.InputJsonValue,
      },
    });

    // Broadcast notification via WebSocket
    try {
      const { websocketService } = await import('../../websocket/services/websocketService');
      websocketService.broadcastToUser(data.userId, {
        type: 'notification:new',
        payload: {
          notification: {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            link: notification.link,
            read: notification.read,
            createdAt: notification.createdAt.toISOString(),
          },
        },
        timestamp: new Date().toISOString(),
        userId: data.userId,
      });
    } catch (error) {
      console.error('Error broadcasting notification:', error);
      // Don't fail notification creation if broadcast fails
    }

    return notification;
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark notification email as sent
   */
  static async markEmailSent(notificationId: string) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        emailSent: true,
        emailSentAt: new Date(),
      },
    });
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(userId: string, options?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { userId };
    if (options?.unreadOnly) {
      where.read = false;
    }

    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string) {
    return prisma.notification.delete({
      where: { id: notificationId },
    });
  }
}

