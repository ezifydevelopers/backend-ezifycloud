import prisma from '../../../lib/prisma';
import { WorkspaceRole, BoardRole } from '@prisma/client';
import { PermissionService } from './permissionService';
import { ColumnRole } from '../types';

export interface ColumnVisibilityRule {
  type: 'role' | 'user' | 'conditional';
  visible?: boolean;
  roles?: (WorkspaceRole | BoardRole | ColumnRole)[];
  userIds?: string[];
  condition?: {
    columnId?: string;
    operator?: 'equals' | 'contains' | 'greater_than' | 'less_than';
    value?: unknown;
  };
}

/**
 * Column Visibility Service
 * Determines which columns a user can view based on permissions and visibility rules
 */
export class ColumnVisibilityService {
  /**
   * Get visible columns for a user on a board
   */
  static async getVisibleColumns(
    boardId: string,
    userId: string,
    itemId?: string // Optional item context for conditional visibility
  ): Promise<string[]> {
    // Get all columns for the board
    const columns = await prisma.column.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
    });

    const visibleColumnIds: string[] = [];

    for (const column of columns) {
      const canView = await this.canViewColumn(column.id, userId, itemId);
      if (canView) {
        visibleColumnIds.push(column.id);
      }
    }

    return visibleColumnIds;
  }

  /**
   * Check if user can view a specific column
   */
  static async canViewColumn(
    columnId: string,
    userId: string,
    itemId?: string
  ): Promise<boolean> {
    // Check column permission first
    const canRead = await PermissionService.hasPermission(
      { userId, columnId },
      'read',
      'column'
    );

    if (!canRead) {
      return false;
    }

    // Get column with visibility settings
    const column = await prisma.column.findUnique({
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

    if (!column) {
      return false;
    }

    // Hidden columns are never visible
    if (column.isHidden) {
      return false;
    }

    // Check visibility rules from column settings
    const visibilityRules = this.getVisibilityRules(column.settings);
    if (visibilityRules.length === 0) {
      // No visibility rules, use default (visible if has read permission)
      return true;
    }

    // Check each visibility rule
    for (const rule of visibilityRules) {
      const matches = await this.checkVisibilityRule(rule, column, userId, itemId);
      if (matches) {
        return rule.visible !== false; // Default to visible if rule matches
      }
    }

    // No rules matched, check if there's a default visibility
    const defaultVisibility = this.getDefaultVisibility(column.settings);
    return defaultVisibility !== false; // Default to visible
  }

  /**
   * Get visibility rules from column settings
   */
  private static getVisibilityRules(settings: unknown): ColumnVisibilityRule[] {
    if (!settings || typeof settings !== 'object') {
      return [];
    }

    const settingsObj = settings as Record<string, unknown>;
    const visibility = settingsObj.visibility as ColumnVisibilityRule[] | undefined;

    if (!visibility || !Array.isArray(visibility)) {
      return [];
    }

    return visibility;
  }

  /**
   * Check if a visibility rule matches
   */
  private static async checkVisibilityRule(
    rule: ColumnVisibilityRule,
    column: any,
    userId: string,
    itemId?: string
  ): Promise<boolean> {
    if (rule.type === 'role') {
      // Role-based visibility
      if (!rule.roles || rule.roles.length === 0) {
        return false;
      }

      // Get user's workspace role
      const workspaceMember = column.board.workspace.members[0];
      if (!workspaceMember) {
        return false;
      }

      // Check if user's role matches
      if (rule.roles.includes(workspaceMember.role)) {
        return true;
      }

      // Check board role
      const boardMember = await prisma.boardMember.findUnique({
        where: {
          boardId_userId: { boardId: column.boardId, userId },
        },
      });

      if (boardMember && rule.roles.includes(boardMember.role as any)) {
        return true;
      }

      // Check column role
      const columnPerms = (column.permissions as Record<string, unknown>) || {};
      const roles = columnPerms.roles as Record<string, string> | undefined;
      if (roles && roles[userId]) {
        const userColumnRole = roles[userId] as ColumnRole;
        if (rule.roles.includes(userColumnRole)) {
          return true;
        }
      }

      return false;
    }

    if (rule.type === 'user') {
      // User-based visibility
      if (!rule.userIds || rule.userIds.length === 0) {
        return false;
      }

      return rule.userIds.includes(userId);
    }

    if (rule.type === 'conditional') {
      // Conditional visibility based on item data
      if (!itemId || !rule.condition) {
        return false;
      }

      // Get item cell value
      const cell = await prisma.cell.findFirst({
        where: {
          itemId,
          columnId: rule.condition.columnId,
        },
      });

      if (!cell) {
        return false;
      }

      return this.evaluateCondition(rule.condition, cell.value);
    }

    return false;
  }

  /**
   * Evaluate a conditional rule
   */
  private static evaluateCondition(
    condition: ColumnVisibilityRule['condition'],
    cellValue: unknown
  ): boolean {
    if (!condition || condition.value === undefined) {
      return false;
    }

    const operator = condition.operator || 'equals';

    switch (operator) {
      case 'equals':
        return cellValue === condition.value;
      case 'contains':
        if (typeof cellValue === 'string' && typeof condition.value === 'string') {
          return cellValue.toLowerCase().includes(condition.value.toLowerCase());
        }
        if (Array.isArray(cellValue)) {
          return cellValue.includes(condition.value);
        }
        return false;
      case 'greater_than':
        if (typeof cellValue === 'number' && typeof condition.value === 'number') {
          return cellValue > condition.value;
        }
        return false;
      case 'less_than':
        if (typeof cellValue === 'number' && typeof condition.value === 'number') {
          return cellValue < condition.value;
        }
        return false;
      default:
        return false;
    }
  }

  /**
   * Get default visibility from column settings
   */
  private static getDefaultVisibility(settings: unknown): boolean | undefined {
    if (!settings || typeof settings !== 'object') {
      return undefined;
    }

    const settingsObj = settings as Record<string, unknown>;
    return settingsObj.defaultVisibility as boolean | undefined;
  }

  /**
   * Check if column should be hidden for sensitive data
   */
  static async isSensitiveColumn(
    columnId: string,
    userId: string
  ): Promise<boolean> {
    const column = await prisma.column.findUnique({
      where: { id: columnId },
    });

    if (!column) {
      return false;
    }

    const settings = column.settings as Record<string, unknown> | undefined;
    const isSensitive = settings?.isSensitive as boolean | undefined;

    if (!isSensitive) {
      return false;
    }

    // Check if user has elevated permissions (admin, owner, finance)
    const columnPerms = await PermissionService.getPermissions(
      { userId, columnId },
      'column'
    );

    // Only users with manage permission can see sensitive columns
    return !columnPerms.manage;
  }

  /**
   * Get all columns with visibility information
   */
  static async getColumnsWithVisibility(
    boardId: string,
    userId: string,
    itemId?: string
  ) {
    const columns = await prisma.column.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
    });

    const columnsWithVisibility = await Promise.all(
      columns.map(async (column) => {
        const canView = await this.canViewColumn(column.id, userId, itemId);
        const isSensitive = await this.isSensitiveColumn(column.id, userId);

        return {
          ...column,
          canView,
          isSensitive,
          isHidden: !canView || isSensitive,
        };
      })
    );

    return columnsWithVisibility;
  }
}

