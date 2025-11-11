import prisma from '../../../lib/prisma';
import { Prisma, WorkspaceRole, BoardRole } from '@prisma/client';
import { Permission, PermissionAssignment, UpdateBoardPermissionsInput, UpdateColumnPermissionsInput, UpdateCellPermissionsInput, ColumnRole } from '../types';
import { PermissionService } from './permissionService';

/**
 * Service for assigning and managing permissions
 */
export class PermissionAssignmentService {
  /**
   * Assign workspace role to user
   */
  static async assignWorkspaceRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
    assignedBy: string
  ): Promise<void> {
    // Check if assigner has permission
    const canManage = await PermissionService.hasPermission(
      { userId: assignedBy, workspaceId },
      'manage',
      'workspace'
    );

    if (!canManage) {
      throw new Error('You do not have permission to assign workspace roles');
    }

    // Create or update workspace member
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
      create: {
        workspaceId,
        userId,
        role,
      },
      update: {
        role,
      },
    });
  }

  /**
   * Assign board role to user
   */
  static async assignBoardRole(
    boardId: string,
    userId: string,
    role: BoardRole,
    assignedBy: string
  ): Promise<void> {
    // Check if assigner has permission
    const canManage = await PermissionService.hasPermission(
      { userId: assignedBy, boardId },
      'manage',
      'board'
    );

    if (!canManage) {
      throw new Error('You do not have permission to assign board roles');
    }

    // Create or update board member
    await prisma.boardMember.upsert({
      where: {
        boardId_userId: { boardId, userId },
      },
      create: {
        boardId,
        userId,
        role,
      },
      update: {
        role,
      },
    });
  }

  /**
   * Assign permissions to user on board
   */
  static async assignBoardPermissionsToUser(
    boardId: string,
    userId: string,
    permissions: Permission,
    assignedBy: string
  ): Promise<void> {
    const canManage = await PermissionService.hasPermission(
      { userId: assignedBy, boardId },
      'manage',
      'board'
    );

    if (!canManage) {
      throw new Error('You do not have permission to assign board permissions');
    }

    // Get current board permissions
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { permissions: true },
    });

    const currentPerms = (board?.permissions as Record<string, unknown>) || {};
    
    // Update permissions for specific user
    Object.keys(permissions).forEach((action) => {
      if (!currentPerms[action]) {
        currentPerms[action] = {};
      }
      const actionPerms = currentPerms[action] as Record<string, boolean>;
      actionPerms[userId] = permissions[action as keyof Permission] as boolean;
    });

    await prisma.board.update({
      where: { id: boardId },
      data: {
        permissions: currentPerms as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Assign permissions to role on board
   */
  static async assignBoardPermissionsToRole(
    boardId: string,
    role: WorkspaceRole | BoardRole,
    permissions: Permission,
    assignedBy: string
  ): Promise<void> {
    const canManage = await PermissionService.hasPermission(
      { userId: assignedBy, boardId },
      'manage',
      'board'
    );

    if (!canManage) {
      throw new Error('You do not have permission to assign board permissions');
    }

    // Get current board permissions
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { permissions: true },
    });

    const currentPerms = (board?.permissions as Record<string, unknown>) || {};
    
    // Update permissions for specific role
    Object.keys(permissions).forEach((action) => {
      if (!currentPerms[action]) {
        currentPerms[action] = {};
      }
      const actionPerms = currentPerms[action] as Record<string, boolean>;
      actionPerms[role] = permissions[action as keyof Permission] as boolean;
    });

    await prisma.board.update({
      where: { id: boardId },
      data: {
        permissions: currentPerms as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Assign permissions to user on column
   */
  static async assignColumnPermissionsToUser(
    columnId: string,
    userId: string,
    permissions: Permission,
    assignedBy: string
  ): Promise<void> {
    // Get column to check board access
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: { board: true },
    });

    if (!column) {
      throw new Error('Column not found');
    }

    const canManage = await PermissionService.hasPermission(
      { userId: assignedBy, boardId: column.boardId },
      'manage',
      'board'
    );

    if (!canManage) {
      throw new Error('You do not have permission to assign column permissions');
    }

    // Get current column permissions
    const currentPerms = (column.permissions as Record<string, unknown>) || {};
    
    // Update permissions for specific user
    Object.keys(permissions).forEach((action) => {
      if (currentPerms[action] === undefined) {
        currentPerms[action] = {};
      }
      if (typeof currentPerms[action] === 'boolean') {
        // Convert boolean to object
        currentPerms[action] = {};
      }
      const actionPerms = currentPerms[action] as Record<string, boolean>;
      actionPerms[userId] = permissions[action as keyof Permission] as boolean;
    });

    await prisma.column.update({
      where: { id: columnId },
      data: {
        permissions: currentPerms as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Assign column role to user
   */
  static async assignColumnRole(
    columnId: string,
    userId: string,
    role: ColumnRole,
    assignedBy: string
  ): Promise<void> {
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: { board: true },
    });

    if (!column) {
      throw new Error('Column not found');
    }

    const canManage = await PermissionService.hasPermission(
      { userId: assignedBy, boardId: column.boardId },
      'manage',
      'board'
    );

    if (!canManage) {
      throw new Error('You do not have permission to assign column roles');
    }

    // Update column permissions with role
    const currentPerms = (column.permissions as Record<string, unknown>) || {};
    if (!currentPerms.roles) {
      currentPerms.roles = {};
    }
    const roles = currentPerms.roles as Record<string, string>;
    roles[userId] = role;

    await prisma.column.update({
      where: { id: columnId },
      data: {
        permissions: currentPerms as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Assign cell permissions
   */
  static async assignCellPermissions(
    columnId: string,
    permissions: UpdateCellPermissionsInput['permissions'],
    assignedBy: string
  ): Promise<void> {
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: { board: true },
    });

    if (!column) {
      throw new Error('Column not found');
    }

    const canManage = await PermissionService.hasPermission(
      { userId: assignedBy, boardId: column.boardId },
      'manage',
      'board'
    );

    if (!canManage) {
      throw new Error('You do not have permission to assign cell permissions');
    }

    // Update column settings with cell permissions
    const currentSettings = (column.settings as Record<string, unknown>) || {};
    currentSettings.cellPermissions = permissions;

    await prisma.column.update({
      where: { id: columnId },
      data: {
        settings: currentSettings as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Get effective permissions for a user (with inheritance)
   */
  static async getEffectivePermissions(
    userId: string,
    resource: 'workspace' | 'board' | 'column',
    resourceId: string
  ): Promise<Permission & { inherited: boolean; overrides: Record<string, boolean> }> {
    const permissions = await PermissionService.getPermissions(
      { userId, [resource === 'workspace' ? 'workspaceId' : resource === 'board' ? 'boardId' : 'columnId']: resourceId },
      resource
    );

    // Check for overrides
    let overrides: Record<string, boolean> = {};
    let inherited = true;

    if (resource === 'board') {
      const board = await prisma.board.findUnique({
        where: { id: resourceId },
        select: { permissions: true },
      });
      const boardPerms = (board?.permissions as Record<string, unknown>) || {};
      Object.keys(permissions).forEach((action) => {
        const actionPerms = boardPerms[action] as Record<string, boolean> | undefined;
        if (actionPerms && (actionPerms[userId] !== undefined)) {
          overrides[action] = actionPerms[userId];
          inherited = false;
        }
      });
    } else if (resource === 'column') {
      const column = await prisma.column.findUnique({
        where: { id: resourceId },
        select: { permissions: true },
      });
      const columnPerms = (column?.permissions as Record<string, unknown>) || {};
      Object.keys(permissions).forEach((action) => {
        const actionPerms = columnPerms[action] as Record<string, boolean> | boolean | undefined;
        if (typeof actionPerms === 'object' && actionPerms[userId] !== undefined) {
          overrides[action] = actionPerms[userId];
          inherited = false;
        }
      });
    }

    return {
      ...permissions,
      inherited,
      overrides,
    };
  }
}

