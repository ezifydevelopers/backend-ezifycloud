import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { PermissionService } from '../services/permissionService';
import { PermissionAssignmentService } from '../services/permissionAssignmentService';
import prisma from '../../../lib/prisma';
import { Prisma, WorkspaceRole, BoardRole } from '@prisma/client';
import { UpdateBoardPermissionsInput, UpdateColumnPermissionsInput, UpdateCellPermissionsInput, PermissionContext, Permission, ColumnRole } from '../types';

export class PermissionController {
  /**
   * Get permissions for a resource
   */
  static async getPermissions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { resource, resourceId } = req.query;

      if (!resource || !resourceId) {
        return res.status(400).json({
          success: false,
          message: 'Resource and resourceId are required',
        });
      }

      let context: PermissionContext = { userId };

      switch (resource as string) {
        case 'workspace':
          context = { ...context, workspaceId: resourceId as string };
          break;
        case 'board':
          context = { ...context, boardId: resourceId as string };
          break;
        case 'item':
          context = { ...context, itemId: resourceId as string };
          break;
        case 'column':
          context = { ...context, columnId: resourceId as string };
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid resource type',
          });
      }

      const permissions = await PermissionService.getPermissions(
        context,
        resource as 'workspace' | 'board' | 'item' | 'column'
      );

      return res.json({
        success: true,
        data: permissions,
      });
    } catch (error) {
      console.error('Error getting permissions:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get permissions',
      });
    }
  }

  /**
   * Update board permissions
   */
  static async updateBoardPermissions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { boardId } = req.params;
      const data = req.body as UpdateBoardPermissionsInput;

      // Check if user has manage permission
      const canManage = await PermissionService.hasPermission(
        { userId, boardId },
        'manage',
        'board'
      );

      if (!canManage) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to manage board permissions',
        });
      }

      // Update board permissions
      const board = await prisma.board.update({
        where: { id: boardId },
        data: {
          permissions: data.permissions as unknown as Prisma.InputJsonValue,
        },
      });

      return res.json({
        success: true,
        data: board,
        message: 'Board permissions updated successfully',
      });
    } catch (error) {
      console.error('Error updating board permissions:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update permissions',
      });
    }
  }

  /**
   * Update column permissions
   */
  static async updateColumnPermissions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { columnId } = req.params;
      const data = req.body as UpdateColumnPermissionsInput;

      // Get column to check board access
      const column = await prisma.column.findUnique({
        where: { id: columnId },
        include: {
          board: true,
        },
      });

      if (!column) {
        return res.status(404).json({
          success: false,
          message: 'Column not found',
        });
      }

      // Check if user has manage permission on board
      const canManage = await PermissionService.hasPermission(
        { userId, boardId: column.boardId },
        'manage',
        'board'
      );

      if (!canManage) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to manage column permissions',
        });
      }

      // Update column permissions
      const updated = await prisma.column.update({
        where: { id: columnId },
        data: {
          permissions: data.permissions as unknown as Prisma.InputJsonValue,
        },
      });

      return res.json({
        success: true,
        data: updated,
        message: 'Column permissions updated successfully',
      });
    } catch (error) {
      console.error('Error updating column permissions:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update permissions',
      });
    }
  }

  /**
   * Check permission for a specific action
   */
  static async checkPermission(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { resource, resourceId, action } = req.query;

      if (!resource || !resourceId || !action) {
        return res.status(400).json({
          success: false,
          message: 'Resource, resourceId, and action are required',
        });
      }

      let context: PermissionContext = { userId };

      switch (resource as string) {
        case 'workspace':
          context = { ...context, workspaceId: resourceId as string };
          break;
        case 'board':
          context = { ...context, boardId: resourceId as string };
          break;
        case 'item':
          context = { ...context, itemId: resourceId as string };
          break;
        case 'column':
          context = { ...context, columnId: resourceId as string };
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid resource type',
          });
      }

      const hasPermission = await PermissionService.hasPermission(
        context,
        action as 'read' | 'write' | 'delete' | 'manage',
        resource as 'workspace' | 'board' | 'item' | 'column'
      );

      return res.json({
        success: true,
        data: { hasPermission },
      });
    } catch (error) {
      console.error('Error checking permission:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to check permission',
      });
    }
  }

  /**
   * Assign workspace role to user
   */
  static async assignWorkspaceRole(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { workspaceId } = req.params;
      const { targetUserId, role } = req.body;

      if (!targetUserId || !role) {
        return res.status(400).json({
          success: false,
          message: 'targetUserId and role are required',
        });
      }

      await PermissionAssignmentService.assignWorkspaceRole(
        workspaceId,
        targetUserId,
        role as WorkspaceRole,
        userId
      );

      return res.json({
        success: true,
        message: 'Workspace role assigned successfully',
      });
    } catch (error) {
      console.error('Error assigning workspace role:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to assign role',
      });
    }
  }

  /**
   * Assign board role to user
   */
  static async assignBoardRole(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { boardId } = req.params;
      const { targetUserId, role } = req.body;

      if (!targetUserId || !role) {
        return res.status(400).json({
          success: false,
          message: 'targetUserId and role are required',
        });
      }

      await PermissionAssignmentService.assignBoardRole(
        boardId,
        targetUserId,
        role as BoardRole,
        userId
      );

      return res.json({
        success: true,
        message: 'Board role assigned successfully',
      });
    } catch (error) {
      console.error('Error assigning board role:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to assign role',
      });
    }
  }

  /**
   * Assign permissions to user on board
   */
  static async assignBoardPermissionsToUser(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { boardId } = req.params;
      const { targetUserId, permissions } = req.body;

      if (!targetUserId || !permissions) {
        return res.status(400).json({
          success: false,
          message: 'targetUserId and permissions are required',
        });
      }

      await PermissionAssignmentService.assignBoardPermissionsToUser(
        boardId,
        targetUserId,
        permissions as Permission,
        userId
      );

      return res.json({
        success: true,
        message: 'Board permissions assigned successfully',
      });
    } catch (error) {
      console.error('Error assigning board permissions:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to assign permissions',
      });
    }
  }

  /**
   * Assign permissions to role on board
   */
  static async assignBoardPermissionsToRole(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { boardId } = req.params;
      const { role, permissions } = req.body;

      if (!role || !permissions) {
        return res.status(400).json({
          success: false,
          message: 'role and permissions are required',
        });
      }

      await PermissionAssignmentService.assignBoardPermissionsToRole(
        boardId,
        role as WorkspaceRole | BoardRole,
        permissions as Permission,
        userId
      );

      return res.json({
        success: true,
        message: 'Board permissions assigned to role successfully',
      });
    } catch (error) {
      console.error('Error assigning board permissions to role:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to assign permissions',
      });
    }
  }

  /**
   * Assign column role to user
   */
  static async assignColumnRole(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { columnId } = req.params;
      const { targetUserId, role } = req.body;

      if (!targetUserId || !role) {
        return res.status(400).json({
          success: false,
          message: 'targetUserId and role are required',
        });
      }

      await PermissionAssignmentService.assignColumnRole(
        columnId,
        targetUserId,
        role as ColumnRole,
        userId
      );

      return res.json({
        success: true,
        message: 'Column role assigned successfully',
      });
    } catch (error) {
      console.error('Error assigning column role:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to assign role',
      });
    }
  }

  /**
   * Assign cell permissions
   */
  static async assignCellPermissions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { columnId } = req.params;
      const data = req.body as UpdateCellPermissionsInput;

      await PermissionAssignmentService.assignCellPermissions(
        columnId,
        data.permissions,
        userId
      );

      return res.json({
        success: true,
        message: 'Cell permissions assigned successfully',
      });
    } catch (error) {
      console.error('Error assigning cell permissions:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to assign permissions',
      });
    }
  }

  /**
   * Get effective permissions (with inheritance info)
   */
  static async getEffectivePermissions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { resource, resourceId } = req.query;

      if (!resource || !resourceId) {
        return res.status(400).json({
          success: false,
          message: 'Resource and resourceId are required',
        });
      }

      const effective = await PermissionAssignmentService.getEffectivePermissions(
        userId,
        resource as 'workspace' | 'board' | 'column',
        resourceId as string
      );

      return res.json({
        success: true,
        data: effective,
      });
    } catch (error) {
      console.error('Error getting effective permissions:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get permissions',
      });
    }
  }
}

