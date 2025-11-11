import { WorkspaceRole, BoardType } from '@prisma/client';

export type { WorkspaceRole, BoardType };

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  settings?: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: Date;
  updatedAt: Date;
  workspace?: Workspace;
  user?: {
    id: string;
    name: string;
    email: string;
    profilePicture?: string;
  };
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  invitedBy: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  logo?: string;
  settings?: Record<string, unknown>;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
  logo?: string;
  settings?: Record<string, unknown>;
}

export interface InviteMemberInput {
  email: string;
  role: WorkspaceRole;
}

export interface UpdateMemberRoleInput {
  role: WorkspaceRole;
}

export interface WorkspaceStats {
  totalMembers: number;
  totalBoards: number;
  recentActivity?: Activity[];
}

export interface Activity {
  id: string;
  action: string;
  userId: string;
  userName?: string;
  createdAt: Date;
}

