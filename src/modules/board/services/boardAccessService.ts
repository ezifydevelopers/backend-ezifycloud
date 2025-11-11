import prisma from '../../../lib/prisma';
import { WorkspaceRole } from '@prisma/client';

/**
 * Board access validation - functional approach
 */
export const checkWorkspaceAccess = async (
  workspaceId: string,
  userId: string
): Promise<WorkspaceRole | null> => {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });

  return member?.role || null;
};

export const canEditBoard = (role: WorkspaceRole | null): boolean => {
  if (!role) return false;
  return [
    WorkspaceRole.owner,
    WorkspaceRole.admin,
    WorkspaceRole.finance,
    WorkspaceRole.member,
  ].includes(role as any);
};

export const canViewBoard = (role: WorkspaceRole | null): boolean => {
  return role !== null;
};

