import prisma from '../../../lib/prisma';
import { Prisma, ColumnType } from '@prisma/client';
import { CreateColumnInput, UpdateColumnInput } from '../types';
import { checkWorkspaceAccess, canEditBoard } from './boardAccessService';

/**
 * Column operations - functional approach
 */
export const createColumn = async (
  boardId: string,
  userId: string,
  data: CreateColumnInput
) => {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
  });

  if (!board) {
    throw new Error('Board not found');
  }

  const role = await checkWorkspaceAccess(board.workspaceId, userId);
  if (!canEditBoard(role)) {
    throw new Error('You do not have permission to create columns');
  }

  // Get max position
  const maxPosition = await prisma.column.findFirst({
    where: { boardId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  return await prisma.column.create({
    data: {
      boardId,
      name: data.name,
      type: data.type,
      position: (maxPosition?.position || 0) + 1,
      width: data.width,
      required: data.required || false,
      defaultValue: data.defaultValue
        ? (data.defaultValue as unknown as Prisma.InputJsonValue)
        : undefined,
      settings: data.settings
        ? (data.settings as unknown as Prisma.InputJsonValue)
        : {},
      permissions: data.permissions
        ? (data.permissions as unknown as Prisma.InputJsonValue)
        : {},
      isHidden: (data as any).isHidden ?? false,
    },
  });
};

export const updateColumn = async (
  columnId: string,
  userId: string,
  data: UpdateColumnInput
) => {
  const column = await prisma.column.findUnique({
    where: { id: columnId },
    include: {
      board: true,
    },
  });

  if (!column) {
    throw new Error('Column not found');
  }

  const role = await checkWorkspaceAccess(column.board.workspaceId, userId);
  if (!canEditBoard(role)) {
    throw new Error('You do not have permission to edit this column');
  }

  return await prisma.column.update({
    where: { id: columnId },
    data: {
      name: data.name,
      type: data.type,
      width: data.width,
      required: data.required,
      defaultValue: data.defaultValue
        ? (data.defaultValue as Prisma.InputJsonValue)
        : undefined,
      settings: data.settings
        ? (data.settings as Prisma.InputJsonValue)
        : undefined,
      permissions: data.permissions
        ? (data.permissions as Prisma.InputJsonValue)
        : undefined,
      isHidden: data.isHidden,
    },
  });
};

export const deleteColumn = async (
  columnId: string,
  userId: string
): Promise<void> => {
  const column = await prisma.column.findUnique({
    where: { id: columnId },
    include: {
      board: true,
    },
  });

  if (!column) {
    throw new Error('Column not found');
  }

  const role = await checkWorkspaceAccess(column.board.workspaceId, userId);
  if (!canEditBoard(role)) {
    throw new Error('You do not have permission to delete this column');
  }

  await prisma.column.delete({
    where: { id: columnId },
  });
};

export const getBoardColumns = async (
  boardId: string,
  userId: string
) => {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
  });

  if (!board) {
    throw new Error('Board not found');
  }

  const role = await checkWorkspaceAccess(board.workspaceId, userId);
  if (!role) {
    throw new Error('You do not have access to this board');
  }

  return await prisma.column.findMany({
    where: {
      boardId,
      isHidden: false,
    },
    orderBy: {
      position: 'asc',
    },
  });
};

