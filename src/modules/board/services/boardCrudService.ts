import prisma from '../../../lib/prisma';
import { Prisma, WorkspaceRole } from '@prisma/client';
import { CreateBoardInput, UpdateBoardInput } from '../types';
import { checkWorkspaceAccess, canEditBoard, canViewBoard } from './boardAccessService';

/**
 * Board CRUD operations - functional approach
 */
export const createBoard = async (
  userId: string,
  data: CreateBoardInput
) => {
  const role = await checkWorkspaceAccess(data.workspaceId, userId);
  if (!canEditBoard(role)) {
    throw new Error('You do not have permission to create boards');
  }

  return await prisma.board.create({
    data: {
      workspaceId: data.workspaceId,
      name: data.name,
      type: data.type,
      description: data.description,
      color: data.color,
      icon: data.icon,
      permissions: (data.permissions || {}) as Prisma.InputJsonValue,
      settings: (data.settings || {}) as Prisma.InputJsonValue,
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      columns: true,
      _count: {
        select: {
          items: true,
          columns: true,
        },
      },
    },
  });
};

export const getBoardById = async (
  boardId: string,
  userId: string
) => {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          columns: true,
        },
      },
    },
  });

  if (!board) {
    throw new Error('Board not found');
  }

  const role = await checkWorkspaceAccess(board.workspaceId, userId);
  if (!canViewBoard(role)) {
    throw new Error('You do not have access to this board');
  }

  const columns = await prisma.column.findMany({
    where: {
      boardId,
      isHidden: false,
    },
    orderBy: {
      position: 'asc',
    },
  });

  return {
    ...board,
    columns,
  };
};

export const getWorkspaceBoards = async (
  workspaceId: string,
  userId: string,
  filters?: { isArchived?: boolean; type?: string }
) => {
  const role = await checkWorkspaceAccess(workspaceId, userId);
  if (!canViewBoard(role)) {
    throw new Error('You do not have access to this workspace');
  }

  const where: Prisma.BoardWhereInput = {
    workspaceId,
    deletedAt: null,
  };

  if (filters?.isArchived !== undefined) {
    where.isArchived = filters.isArchived;
  }

  if (filters?.type) {
    where.type = filters.type as any;
  }

  return await prisma.board.findMany({
    where,
    include: {
      _count: {
        select: {
          items: true,
          columns: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const updateBoard = async (
  boardId: string,
  userId: string,
  data: UpdateBoardInput
) => {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
  });

  if (!board) {
    throw new Error('Board not found');
  }

  const role = await checkWorkspaceAccess(board.workspaceId, userId);
  if (!canEditBoard(role)) {
    throw new Error('You do not have permission to edit this board');
  }

  return await prisma.board.update({
    where: { id: boardId },
    data: {
      name: data.name,
      description: data.description,
      color: data.color,
      icon: data.icon,
      isPublic: data.isPublic,
      isArchived: data.isArchived,
      permissions: data.permissions
        ? (data.permissions as Prisma.InputJsonValue)
        : undefined,
      settings: data.settings
        ? (data.settings as Prisma.InputJsonValue)
        : undefined,
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
};

export const deleteBoard = async (
  boardId: string,
  userId: string
): Promise<void> => {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
  });

  if (!board) {
    throw new Error('Board not found');
  }

  const role = await checkWorkspaceAccess(board.workspaceId, userId);
  if (role !== WorkspaceRole.owner && role !== WorkspaceRole.admin) {
    throw new Error('Only workspace owners and admins can delete boards');
  }

  await prisma.board.update({
    where: { id: boardId },
    data: {
      deletedAt: new Date(),
    },
  });
};

