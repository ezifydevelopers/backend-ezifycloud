import { PermissionContext, Permission } from '../types';
import { WorkspacePermissionService } from './workspacePermissionService';
import { BoardPermissionService } from './boardPermissionService';
import { ItemPermissionService } from './itemPermissionService';
import { ColumnPermissionService } from './columnPermissionService';
import { CellPermissionService } from './cellPermissionService';

/**
 * Main permission service - delegates to specific permission services
 * Supports multi-level permissions: Workspace -> Board -> Column -> Cell
 */
export class PermissionService {
  static async hasPermission(
    context: PermissionContext,
    action: 'read' | 'write' | 'delete' | 'manage',
    resource: 'workspace' | 'board' | 'item' | 'column' | 'cell'
  ): Promise<boolean> {
    try {
      switch (resource) {
        case 'workspace':
          return await WorkspacePermissionService.check(context, action);
        case 'board':
          return await BoardPermissionService.check(context, action);
        case 'item':
          return await ItemPermissionService.check(context, action);
        case 'column':
          return await ColumnPermissionService.check(context, action);
        case 'cell':
          return await CellPermissionService.check(context, action as 'read' | 'write');
        default:
          return false;
      }
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  static async getPermissions(
    context: PermissionContext,
    resource: 'workspace' | 'board' | 'item' | 'column' | 'cell'
  ): Promise<Permission> {
    const [read, write, del, manage] = await Promise.all([
      this.hasPermission(context, 'read', resource),
      this.hasPermission(context, 'write', resource),
      this.hasPermission(context, 'delete', resource),
      this.hasPermission(context, 'manage', resource),
    ]);

    return { read, write, delete: del, manage };
  }

  static async filterItemsByAccess(
    userId: string,
    boardId: string,
    items: Array<{ id: string; createdBy: string }>
  ): Promise<string[]> {
    const accessibleItems: string[] = [];

    for (const item of items) {
      const canRead = await this.hasPermission(
        { userId, itemId: item.id, boardId },
        'read',
        'item'
      );
      if (canRead) accessibleItems.push(item.id);
    }

    return accessibleItems;
  }

  static async canViewColumn(userId: string, columnId: string): Promise<boolean> {
    return await this.hasPermission({ userId, columnId }, 'read', 'column');
  }

  static async canEditColumn(userId: string, columnId: string): Promise<boolean> {
    return await this.hasPermission({ userId, columnId }, 'write', 'column');
  }
}

