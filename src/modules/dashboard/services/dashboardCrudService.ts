import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';
import { CreateDashboardInput, UpdateDashboardInput } from '../types';
import { checkWorkspaceAccess, canEditBoard } from '../../board/services/boardAccessService';

/**
 * Dashboard CRUD operations - functional approach
 */
export const createDashboard = async (
  userId: string,
  data: CreateDashboardInput
) => {
  const role = await checkWorkspaceAccess(data.workspaceId, userId);
  if (!role) {
    throw new Error('You do not have access to this workspace');
  }

  return await prisma.dashboard.create({
    data: {
      workspaceId: data.workspaceId,
      name: data.name,
      description: data.description,
      widgets: (data.widgets || []) as unknown as Prisma.InputJsonValue,
      filters: data.filters ? (data.filters as unknown as Prisma.InputJsonValue) : undefined,
      layout: data.layout ? (data.layout as unknown as Prisma.InputJsonValue) : undefined,
      isPublic: data.isPublic || false,
      sharedWith: data.sharedWith ? (data.sharedWith as unknown as Prisma.InputJsonValue) : undefined,
      createdBy: userId,
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

export const getDashboardById = async (
  dashboardId: string,
  userId: string
) => {
  const dashboard = await prisma.dashboard.findUnique({
    where: { id: dashboardId },
    include: {
      workspace: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!dashboard) {
    throw new Error('Dashboard not found');
  }

  // Check access: public, creator, or shared with user
  if (!dashboard.isPublic && dashboard.createdBy !== userId) {
    const sharedWith = (dashboard.sharedWith as string[]) || [];
    const isShared = sharedWith.includes(userId) || sharedWith.some(role => {
      // Check if user has the role (simplified - would need proper role checking)
      return false; // TODO: Implement role-based sharing check
    });
    
    if (!isShared) {
      const member = dashboard.workspace.members[0];
      if (!member) {
        throw new Error('You do not have access to this dashboard');
      }
    }
  }

  return dashboard;
};

export const getWorkspaceDashboards = async (
  workspaceId: string,
  userId: string
) => {
  const role = await checkWorkspaceAccess(workspaceId, userId);
  if (!role) {
    throw new Error('You do not have access to this workspace');
  }

  return await prisma.dashboard.findMany({
    where: {
      workspaceId,
      OR: [
        { isPublic: true },
        { createdBy: userId },
      ],
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });
};

export const updateDashboard = async (
  dashboardId: string,
  userId: string,
  data: UpdateDashboardInput
) => {
  const dashboard = await prisma.dashboard.findUnique({
    where: { id: dashboardId },
  });

  if (!dashboard) {
    throw new Error('Dashboard not found');
  }

  if (dashboard.createdBy !== userId) {
    throw new Error('Only the creator can edit this dashboard');
  }

  return await prisma.dashboard.update({
    where: { id: dashboardId },
    data: {
      name: data.name,
      description: data.description,
      widgets: data.widgets
        ? (data.widgets as unknown as Prisma.InputJsonValue)
        : undefined,
      filters: data.filters
        ? (data.filters as unknown as Prisma.InputJsonValue)
        : undefined,
      layout: data.layout
        ? (data.layout as unknown as Prisma.InputJsonValue)
        : undefined,
      isPublic: data.isPublic,
      sharedWith: data.sharedWith
        ? (data.sharedWith as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });
};

export const deleteDashboard = async (
  dashboardId: string,
  userId: string
): Promise<void> => {
  const dashboard = await prisma.dashboard.findUnique({
    where: { id: dashboardId },
  });

  if (!dashboard) {
    throw new Error('Dashboard not found');
  }

  if (dashboard.createdBy !== userId) {
    throw new Error('Only the creator can delete this dashboard');
  }

  await prisma.dashboard.delete({
    where: { id: dashboardId },
  });
};

export const shareDashboard = async (
  dashboardId: string,
  userId: string,
  sharedWith: string[]
): Promise<unknown> => {
  const dashboard = await prisma.dashboard.findUnique({
    where: { id: dashboardId },
  });

  if (!dashboard) {
    throw new Error('Dashboard not found');
  }

  if (dashboard.createdBy !== userId) {
    throw new Error('Only the creator can share this dashboard');
  }

  return await prisma.dashboard.update({
    where: { id: dashboardId },
    data: {
      sharedWith: sharedWith as unknown as Prisma.InputJsonValue,
    },
  });
};

