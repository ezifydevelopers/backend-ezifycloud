import { WorkspaceRole, BoardRole } from '@prisma/client';

// ColumnRole enum (defined locally since Prisma may not export it)
export enum ColumnRole {
  owner = 'owner',
  editor = 'editor',
  viewer = 'viewer',
}

export interface Permission {
  read: boolean;
  write: boolean;
  delete: boolean;
  manage?: boolean;
}

export interface PermissionContext {
  userId: string;
  workspaceId?: string;
  boardId?: string;
  itemId?: string;
  columnId?: string;
  cellId?: string;
}

export interface PermissionRule {
  userId?: string;
  role?: WorkspaceRole | BoardRole | ColumnRole;
  permission: Permission;
}

export interface BoardPermissions {
  [key: string]: Permission; // supports both userId and role keys
}

export interface ColumnPermissions {
  read?: boolean | { [key: string]: boolean };
  write?: boolean | { [key: string]: boolean };
  delete?: boolean | { [key: string]: boolean };
}

export interface CellPermissions {
  mode: 'owner_only' | 'assignee_only' | 'team_members' | 'all';
  allowedUsers?: string[];
  allowedRoles?: (WorkspaceRole | BoardRole)[];
}

export interface UpdateBoardPermissionsInput {
  permissions: BoardPermissions;
}

export interface UpdateColumnPermissionsInput {
  permissions: ColumnPermissions;
}

export interface UpdateCellPermissionsInput {
  permissions: CellPermissions;
}

export interface PermissionAssignment {
  userId?: string;
  role?: WorkspaceRole | BoardRole | ColumnRole;
  permissions: Permission;
}
