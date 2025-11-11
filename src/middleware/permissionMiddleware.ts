import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { PermissionService } from '../modules/permission/services/permissionService';
import { PermissionContext } from '../modules/permission/types';

type ResourceType = 'workspace' | 'board' | 'item' | 'column' | 'cell';
type ActionType = 'read' | 'write' | 'delete' | 'manage';

interface PermissionMiddlewareOptions {
  resource: ResourceType;
  action: ActionType;
  resourceIdParam?: string; // Parameter name for resource ID (e.g., 'boardId', 'itemId')
  resourceIdFromBody?: string; // Field name in body for resource ID
  resourceIdFromQuery?: string; // Query parameter name for resource ID
}

/**
 * Middleware to check permissions before allowing API access
 */
export const requirePermission = (options: PermissionMiddlewareOptions) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Get resource ID from various sources
      let resourceId: string | undefined;

      if (options.resourceIdParam) {
        resourceId = req.params[options.resourceIdParam];
      } else if (options.resourceIdFromBody) {
        resourceId = req.body[options.resourceIdFromBody];
      } else if (options.resourceIdFromQuery) {
        resourceId = req.query[options.resourceIdFromQuery] as string;
      } else {
        // Try to infer from resource type
        const paramMap: Record<ResourceType, string> = {
          workspace: 'workspaceId',
          board: 'boardId',
          item: 'itemId',
          column: 'columnId',
          cell: 'cellId',
        };
        resourceId = req.params[paramMap[options.resource]] || req.body[paramMap[options.resource]] || req.query[paramMap[options.resource]] as string;
      }

      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: `Resource ID is required for ${options.resource}`,
        });
      }

      // Build permission context
      const context: PermissionContext = { userId };

      switch (options.resource) {
        case 'workspace':
          context.workspaceId = resourceId;
          break;
        case 'board':
          context.boardId = resourceId;
          break;
        case 'item':
          context.itemId = resourceId;
          break;
        case 'column':
          context.columnId = resourceId;
          break;
        case 'cell':
          context.cellId = resourceId;
          break;
      }

      // Check permission
      const hasPermission = await PermissionService.hasPermission(
        context,
        options.action,
        options.resource
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `You do not have permission to ${options.action} this ${options.resource}`,
        });
      }

      // Permission granted, continue
      return next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions',
      });
    }
  };
};

/**
 * Convenience middleware functions
 */
export const requireWorkspaceRead = requirePermission({ resource: 'workspace', action: 'read', resourceIdParam: 'workspaceId' });
export const requireWorkspaceWrite = requirePermission({ resource: 'workspace', action: 'write', resourceIdParam: 'workspaceId' });
export const requireWorkspaceManage = requirePermission({ resource: 'workspace', action: 'manage', resourceIdParam: 'workspaceId' });

export const requireBoardRead = requirePermission({ resource: 'board', action: 'read', resourceIdParam: 'boardId' });
export const requireBoardWrite = requirePermission({ resource: 'board', action: 'write', resourceIdParam: 'boardId' });
export const requireBoardManage = requirePermission({ resource: 'board', action: 'manage', resourceIdParam: 'boardId' });

export const requireItemRead = requirePermission({ resource: 'item', action: 'read', resourceIdParam: 'itemId' });
export const requireItemWrite = requirePermission({ resource: 'item', action: 'write', resourceIdParam: 'itemId' });
export const requireItemDelete = requirePermission({ resource: 'item', action: 'delete', resourceIdParam: 'itemId' });

export const requireColumnRead = requirePermission({ resource: 'column', action: 'read', resourceIdParam: 'columnId' });
export const requireColumnWrite = requirePermission({ resource: 'column', action: 'write', resourceIdParam: 'columnId' });

