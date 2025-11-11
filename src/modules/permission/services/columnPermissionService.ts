import prisma from '../../../lib/prisma';
import { PermissionContext, ColumnRole } from '../types';
import { BoardPermissionService } from './boardPermissionService';

/**
 * Column-level permission checking
 * Supports: Column owner, Column editor, Column viewer, Hidden column
 */
export class ColumnPermissionService {
  static async check(
    context: PermissionContext,
    action: string
  ): Promise<boolean> {
    if (!context.columnId || !context.userId) {
      return false;
    }

    const column = await this.getColumn(context.columnId, context.userId);
    if (!column) return false;
    
    // Hidden columns are always no-access
    if (column.isHidden) {
      return false;
    }

    // Check board permission first
    const boardPerm = await BoardPermissionService.check(
      { userId: context.userId, boardId: column.boardId },
      action
    );
    if (!boardPerm) return false;

    // Check if user is column owner
    if (column.createdBy === context.userId) {
      return true; // Column owner has full access
    }

    // Check if user is a platform admin (even if not a workspace member)
    if (!column.board.workspace.members || column.board.workspace.members.length === 0) {
      const user = await prisma.user.findUnique({
        where: { id: context.userId },
        select: { role: true },
      });
      if (user?.role === 'admin') {
        // Platform admins have full access to all columns
        return true;
      }
    }

    // Check column-specific permissions
    return this.checkColumnOverrides(
      column.permissions, 
      action, 
      context.userId, 
      column.board.workspace.members[0]?.role,
      column.createdBy
    );
  }

  private static async getColumn(columnId: string, userId: string) {
    return await prisma.column.findUnique({
      where: { id: columnId },
      include: {
        board: {
          include: {
            workspace: {
              include: {
                members: { where: { userId } },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Check column permissions
   * Supports role-based permissions: owner, editor, viewer
   */
  private static checkColumnOverrides(
    permissions: unknown,
    action: string,
    userId: string,
    workspaceRole?: string,
    columnOwnerId?: string | null
  ): boolean {
    const columnPerms = (permissions as Record<string, unknown>) || {};
    
    // Column owner always has full access
    if (columnOwnerId === userId) {
      return true;
    }

    // Check for explicit role-based permissions
    const rolePerms = columnPerms.roles as Record<string, string> | undefined;
    if (rolePerms) {
      // Check if user has a specific column role
      const userRole = rolePerms[userId];
      if (userRole) {
        return this.checkByColumnRole(userRole as ColumnRole, action);
      }
    }

    // Check action-specific permissions
    const permValue = columnPerms[action];
    if (permValue !== undefined) {
      if (typeof permValue === 'boolean') return permValue;
      
      if (typeof permValue === 'object') {
        const permObj = permValue as Record<string, boolean>;
        if (permObj[userId] !== undefined) return permObj[userId];
        if (workspaceRole && permObj[workspaceRole] !== undefined) return permObj[workspaceRole];
      }
    }

    return true; // Default: inherit from board
  }

  /**
   * Check permissions by column role
   * - Owner: Full access (all actions)
   * - Editor: Edit column (read, write)
   * - Viewer: Read-only (read only)
   */
  private static checkByColumnRole(role: ColumnRole, action: string): boolean {
    if (role === ColumnRole.owner) return true; // Full access
    if (role === ColumnRole.editor) {
      // Editor can read and write
      return action === 'read' || action === 'write';
    }
    if (role === ColumnRole.viewer) {
      // Viewer is read-only
      return action === 'read';
    }
    return false;
  }
}

