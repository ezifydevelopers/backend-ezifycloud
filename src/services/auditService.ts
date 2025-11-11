import prisma from '../lib/prisma';
import { Activity } from '@prisma/client';

export interface AuditLog {
  id: string;
  itemId: string;
  userId: string;
  action: string;
  fieldName?: string;
  oldValue?: unknown;
  newValue?: unknown;
  details?: Record<string, unknown>;
  createdAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface AuditLogFilters {
  itemId?: string;
  userId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  fieldName?: string;
}

export class AuditService {
  /**
   * Create an audit log entry
   */
  static async logActivity(
    itemId: string,
    userId: string,
    action: string,
    options?: {
      fieldName?: string;
      oldValue?: unknown;
      newValue?: unknown;
      details?: Record<string, unknown>;
    }
  ): Promise<Activity> {
    const activity = await prisma.activity.create({
      data: {
        itemId,
        userId,
        action,
        fieldName: options?.fieldName,
        oldValue: options?.oldValue ? (options.oldValue as unknown as any) : undefined,
        newValue: options?.newValue ? (options.newValue as unknown as any) : undefined,
        details: options?.details ? (options.details as unknown as any) : {},
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    });

    return activity;
  }

  /**
   * Get audit logs with filters
   */
  static async getAuditLogs(
    filters: AuditLogFilters,
    options?: { page?: number; limit?: number }
  ): Promise<{ logs: Activity[]; total: number }> {
    const where: {
      itemId?: string;
      userId?: string;
      action?: string;
      fieldName?: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = {};

    if (filters.itemId) {
      where.itemId = filters.itemId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.fieldName) {
      where.fieldName = filters.fieldName;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePicture: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.activity.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Get field-level change history
   */
  static async getFieldHistory(
    itemId: string,
    fieldName: string
  ): Promise<Activity[]> {
    const activities = await prisma.activity.findMany({
      where: {
        itemId,
        fieldName,
        // Fetch all; filtering for non-null JSON values can be client-specific
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return activities;
  }

  /**
   * Export audit logs (for compliance/reporting)
   */
  static async exportAuditLogs(filters: AuditLogFilters): Promise<Activity[]> {
    const logs = await this.getAuditLogs(filters, { page: 1, limit: 10000 });
    return logs.logs;
  }
}

