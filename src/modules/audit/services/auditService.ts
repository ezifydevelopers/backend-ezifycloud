import prisma from '../../../lib/prisma';
import { CreateAuditLogInput, AuditLogQueryFilters, FieldChange } from '../types';
import { Prisma } from '@prisma/client';

/**
 * Audit Service
 * Tracks all user actions for compliance and security
 */
export class AuditService {
  /**
   * Create an audit log entry
   */
  static async log(input: CreateAuditLogInput): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: input.userId,
          userName: input.userName,
          action: input.action,
          targetId: input.targetId,
          targetType: input.targetType,
          resourceId: input.resourceId,
          resourceType: input.resourceType,
          fieldChanges: input.fieldChanges ? (input.fieldChanges as unknown as Prisma.InputJsonValue) : undefined,
          oldData: input.oldData ? (input.oldData as unknown as Prisma.InputJsonValue) : undefined,
          newData: input.newData ? (input.newData as unknown as Prisma.InputJsonValue) : undefined,
          details: input.details ? (input.details as unknown as Prisma.InputJsonValue) : undefined,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          requestMethod: input.requestMethod,
          requestPath: input.requestPath,
          statusCode: input.statusCode,
        },
      });
    } catch (error) {
      // Don't throw - audit logging should not break the application
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Log a create action
   */
  static async logCreate(
    userId: string,
    userName: string,
    targetType: string,
    targetId: string,
    newData: Record<string, unknown>,
    options?: {
      resourceId?: string;
      resourceType?: string;
      ipAddress?: string;
      userAgent?: string;
      requestMethod?: string;
      requestPath?: string;
    }
  ): Promise<void> {
    await this.log({
      userId,
      userName,
      action: 'create',
      targetType,
      targetId,
      resourceId: options?.resourceId,
      resourceType: options?.resourceType,
      newData,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      requestMethod: options?.requestMethod,
      requestPath: options?.requestPath,
      statusCode: 201,
    });
  }

  /**
   * Log an update action with field-level changes
   */
  static async logUpdate(
    userId: string,
    userName: string,
    targetType: string,
    targetId: string,
    fieldChanges: FieldChange[],
    oldData?: Record<string, unknown>,
    newData?: Record<string, unknown>,
    options?: {
      resourceId?: string;
      resourceType?: string;
      ipAddress?: string;
      userAgent?: string;
      requestMethod?: string;
      requestPath?: string;
    }
  ): Promise<void> {
    await this.log({
      userId,
      userName,
      action: 'update',
      targetType,
      targetId,
      resourceId: options?.resourceId,
      resourceType: options?.resourceType,
      fieldChanges,
      oldData,
      newData,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      requestMethod: options?.requestMethod,
      requestPath: options?.requestPath,
      statusCode: 200,
    });
  }

  /**
   * Log a delete action
   */
  static async logDelete(
    userId: string,
    userName: string,
    targetType: string,
    targetId: string,
    oldData: Record<string, unknown>,
    options?: {
      resourceId?: string;
      resourceType?: string;
      ipAddress?: string;
      userAgent?: string;
      requestMethod?: string;
      requestPath?: string;
    }
  ): Promise<void> {
    await this.log({
      userId,
      userName,
      action: 'delete',
      targetType,
      targetId,
      resourceId: options?.resourceId,
      resourceType: options?.resourceType,
      oldData,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      requestMethod: options?.requestMethod,
      requestPath: options?.requestPath,
      statusCode: 200,
    });
  }

  /**
   * Log a view/read action
   */
  static async logView(
    userId: string,
    userName: string,
    targetType: string,
    targetId: string,
    options?: {
      resourceId?: string;
      resourceType?: string;
      ipAddress?: string;
      userAgent?: string;
      requestMethod?: string;
      requestPath?: string;
    }
  ): Promise<void> {
    await this.log({
      userId,
      userName,
      action: 'view',
      targetType,
      targetId,
      resourceId: options?.resourceId,
      resourceType: options?.resourceType,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      requestMethod: options?.requestMethod,
      requestPath: options?.requestPath,
      statusCode: 200,
    });
  }

  /**
   * Log an export action
   */
  static async logExport(
    userId: string,
    userName: string,
    targetType: string,
    format: string,
    options?: {
      resourceId?: string;
      resourceType?: string;
      recordCount?: number;
      ipAddress?: string;
      userAgent?: string;
      requestMethod?: string;
      requestPath?: string;
    }
  ): Promise<void> {
    await this.log({
      userId,
      userName,
      action: 'export',
      targetType,
      resourceId: options?.resourceId,
      resourceType: options?.resourceType,
      details: {
        format,
        recordCount: options?.recordCount,
      },
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      requestMethod: options?.requestMethod,
      requestPath: options?.requestPath,
      statusCode: 200,
    });
  }

  /**
   * Get audit logs with filters
   */
  static async getAuditLogs(filters: AuditLogQueryFilters) {
    const {
      userId,
      action,
      targetType,
      targetId,
      resourceType,
      resourceId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = filters;

    const where: Prisma.AuditLogWhereInput = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;
    if (resourceType) where.resourceType = resourceType;
    if (resourceId) where.resourceId = resourceId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
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
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get audit logs for a specific resource
   */
  static async getResourceAuditLogs(
    resourceType: string,
    resourceId: string,
    options?: { page?: number; limit?: number }
  ) {
    return this.getAuditLogs({
      resourceType,
      resourceId,
      page: options?.page,
      limit: options?.limit,
    });
  }

  /**
   * Get audit logs for a specific target
   */
  static async getTargetAuditLogs(
    targetType: string,
    targetId: string,
    options?: { page?: number; limit?: number }
  ) {
    return this.getAuditLogs({
      targetType,
      targetId,
      page: options?.page,
      limit: options?.limit,
    });
  }

  /**
   * Compare two objects and extract field changes
   */
  static extractFieldChanges(
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>
  ): FieldChange[] {
    const changes: FieldChange[] = [];
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      const oldValue = oldData[key];
      const newValue = newData[key];

      // Skip if values are the same
      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
        continue;
      }

      changes.push({
        field: key,
        oldValue,
        newValue,
        fieldType: typeof newValue,
      });
    }

    return changes;
  }
}

