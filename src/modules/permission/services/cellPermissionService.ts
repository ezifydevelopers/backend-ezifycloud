import prisma from '../../../lib/prisma';
import { PermissionContext, CellPermissions } from '../types';
import { ColumnPermissionService } from './columnPermissionService';

/**
 * Cell-level permission checking
 * Supports: owner_only, assignee_only, team_members, all
 */
export class CellPermissionService {
  static async check(
    context: PermissionContext,
    action: 'read' | 'write'
  ): Promise<boolean> {
    if (!context.cellId || !context.userId) {
      return false;
    }

    const cell = await this.getCell(context.cellId, context.userId);
    if (!cell) return false;

    // Check column permission first
    const columnPerm = await ColumnPermissionService.check(
      { userId: context.userId, columnId: cell.columnId },
      action
    );
    if (!columnPerm) return false;

    // Get cell permissions from column settings
    const cellPermissions = this.getCellPermissions(cell.column.settings);
    if (!cellPermissions) {
      // No cell-level restrictions, inherit from column
      return true;
    }

    // Check cell-level permissions
    return this.checkCellAccess(cellPermissions, cell, context.userId, action);
  }

  private static async getCell(cellId: string, userId: string) {
    return await prisma.cell.findUnique({
      where: { id: cellId },
      include: {
        item: {
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
        },
        column: {
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
        },
      },
    });
  }

  private static getCellPermissions(settings: unknown): CellPermissions | null {
    if (!settings || typeof settings !== 'object') return null;
    
    const settingsObj = settings as Record<string, unknown>;
    const cellPerms = settingsObj.cellPermissions as CellPermissions | undefined;
    
    if (!cellPerms || typeof cellPerms !== 'object') return null;
    
    return cellPerms;
  }

  private static async checkCellAccess(
    permissions: CellPermissions,
    cell: any,
    userId: string,
    action: 'read' | 'write'
  ): Promise<boolean> {
    const { mode, allowedUsers, allowedRoles } = permissions;

    // Owner only: Only item creator can edit
    if (mode === 'owner_only') {
      if (action === 'read') {
        // All with column access can read
        return true;
      }
      // Check if user is the item creator
      const item = await prisma.item.findUnique({
        where: { id: cell.itemId },
        select: { createdBy: true },
      });
      return item?.createdBy === userId;
    }

    // Assignee only: Only assigned users can edit
    if (mode === 'assignee_only') {
      if (action === 'read') {
        return true; // All can read
      }
      // Check if user is assigned to this item
      const assignedCells = await prisma.cell.findMany({
        where: {
          itemId: cell.itemId,
          column: { type: 'PEOPLE' },
        },
      });

      return assignedCells.some(assignedCell => {
        const value = assignedCell.value as unknown;
        if (Array.isArray(value)) {
          return value.includes(userId);
        }
        return value === userId;
      });
    }

    // Team members: Workspace members can edit
    if (mode === 'team_members') {
      if (action === 'read') {
        return true;
      }
      // Check if user is a workspace member
      const member = cell.item.board.workspace.members[0];
      return !!member;
    }

    // All: All users with column access can edit (default)
    if (mode === 'all') {
      return true;
    }

    // Check allowed users/roles if specified
    if (allowedUsers && allowedUsers.includes(userId)) {
      return true;
    }

    if (allowedRoles) {
      const member = cell.item.board.workspace.members[0];
      if (member && allowedRoles.includes(member.role)) {
        return true;
      }
    }

    return false;
  }
}

