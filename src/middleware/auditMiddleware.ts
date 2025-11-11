import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AuditService } from '../modules/audit/services/auditService';

/**
 * Audit middleware to automatically log API actions
 */
export const auditMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Store original methods
  const originalSend = res.send;
  const originalJson = res.json;

  // Override res.send to capture response
  res.send = function (body: any) {
    logAudit(req, res, body);
    return originalSend.call(this, body);
  };

  res.json = function (body: any) {
    logAudit(req, res, body);
    return originalJson.call(this, body);
  };

  next();
};

/**
 * Log audit entry after response is sent
 */
async function logAudit(req: AuthRequest, res: Response, responseBody: any): Promise<void> {
  // Only log if user is authenticated
  if (!req.user) {
    return;
  }

  // Skip logging for certain endpoints (health checks, static files, etc.)
  const skipPaths = ['/health', '/api/health', '/favicon.ico'];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return;
  }

  try {
    const method = req.method;
    const path = req.path;
    const statusCode = res.statusCode;

    // Determine action type from HTTP method
    let action: string;
    switch (method) {
      case 'GET':
        action = 'view';
        break;
      case 'POST':
        action = 'create';
        break;
      case 'PUT':
      case 'PATCH':
        action = 'update';
        break;
      case 'DELETE':
        action = 'delete';
        break;
      default:
        action = method.toLowerCase();
    }

    // Extract target type and ID from path
    const pathParts = path.split('/').filter(Boolean);
    let targetType: string | undefined;
    let targetId: string | undefined;
    let resourceType: string | undefined;
    let resourceId: string | undefined;

    // Parse common patterns: /api/workspaces/:workspaceId/boards/:boardId/items/:itemId
    if (pathParts.includes('workspaces') && pathParts.length > 1) {
      const workspaceIndex = pathParts.indexOf('workspaces');
      resourceType = 'workspace';
      resourceId = pathParts[workspaceIndex + 1];
    }

    if (pathParts.includes('boards') && pathParts.length > 1) {
      const boardIndex = pathParts.indexOf('boards');
      if (!targetType) {
        targetType = 'board';
        targetId = pathParts[boardIndex + 1];
      }
    }

    if (pathParts.includes('items') && pathParts.length > 1) {
      const itemIndex = pathParts.indexOf('items');
      targetType = 'item';
      targetId = pathParts[itemIndex + 1];
    }

    if (pathParts.includes('columns') && pathParts.length > 1) {
      const columnIndex = pathParts.indexOf('columns');
      targetType = 'column';
      targetId = pathParts[columnIndex + 1];
    }

    if (pathParts.includes('files') && pathParts.length > 1) {
      const fileIndex = pathParts.indexOf('files');
      targetType = 'file';
      targetId = pathParts[fileIndex + 1];
    }

    // Get IP address
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      undefined;

    // Get user agent
    const userAgent = req.headers['user-agent'];

    // Log the action
    await AuditService.log({
      userId: req.user.id,
      userName: req.user.name || req.user.email,
      action,
      targetType,
      targetId,
      resourceType,
      resourceId,
      requestMethod: method,
      requestPath: path,
      statusCode,
      ipAddress,
      userAgent,
      details: {
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        bodySize: req.body ? JSON.stringify(req.body).length : 0,
        responseSize: responseBody ? JSON.stringify(responseBody).length : 0,
      },
    });
  } catch (error) {
    // Don't break the request if audit logging fails
    console.error('Audit middleware error:', error);
  }
}

/**
 * Manual audit logging helper for complex operations
 */
export const logAuditAction = async (
  req: AuthRequest,
  action: string,
  targetType: string,
  targetId: string,
  options?: {
    resourceType?: string;
    resourceId?: string;
    fieldChanges?: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
    oldData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
    details?: Record<string, unknown>;
  }
): Promise<void> => {
  if (!req.user) return;

  const ipAddress =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    undefined;

  const userAgent = req.headers['user-agent'];

  await AuditService.log({
    userId: req.user.id,
    userName: req.user.name || req.user.email,
    action,
    targetType,
    targetId,
    resourceType: options?.resourceType,
    resourceId: options?.resourceId,
    fieldChanges: options?.fieldChanges,
    oldData: options?.oldData,
    newData: options?.newData,
    details: options?.details,
    requestMethod: req.method,
    requestPath: req.path,
    ipAddress,
    userAgent,
  });
};

