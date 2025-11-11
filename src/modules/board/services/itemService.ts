import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';
import { CreateItemInput, UpdateItemInput } from '../types';
import { checkWorkspaceAccess, canEditBoard } from './boardAccessService';

/**
 * Item operations - functional approach
 */
export const createItem = async (
  boardId: string,
  userId: string,
  data: CreateItemInput
) => {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
  });

  if (!board) {
    throw new Error('Board not found');
  }

  const role = await checkWorkspaceAccess(board.workspaceId, userId);
  if (!canEditBoard(role)) {
    throw new Error('You do not have permission to create items');
  }

  const item = await prisma.item.create({
    data: {
      boardId,
      name: data.name,
      status: data.status,
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

  // Create cells if provided
  if (Array.isArray(data.cells) && data.cells.length > 0) {
    await Promise.all(
      (data.cells as Array<{ columnId: string; value: unknown }>).map((cell) =>
        prisma.cell.create({
          data: {
            itemId: item.id,
            columnId: cell.columnId,
            value: cell.value as unknown as Prisma.InputJsonValue,
          },
        })
      )
    );
  }

  return await prisma.item.findUnique({
    where: { id: item.id },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      cells: {
        include: {
          column: true,
        },
      },
    },
  });
};

export const getBoardItems = async (
  boardId: string,
  userId: string,
  options?: {
    page?: number;
    limit?: number;
    filters?: {
      status?: string;
      search?: string;
    };
  }
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

  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const skip = (page - 1) * limit;

  const where: Prisma.ItemWhereInput = {
    boardId,
    deletedAt: null,
  };

  if (options?.filters?.status) {
    where.status = options.filters.status;
  }

  if (options?.filters?.search) {
    where.name = {
      contains: options.filters.search,
      mode: 'insensitive',
    };
  }

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      skip,
      take: limit,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        cells: {
          include: {
            column: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.item.count({ where }),
  ]);

  return { items, total, page, limit };
};

export const updateItem = async (
  itemId: string,
  userId: string,
  data: UpdateItemInput
) => {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      board: true,
    },
  });

  if (!item) {
    throw new Error('Item not found');
  }

  const role = await checkWorkspaceAccess(item.board.workspaceId, userId);
  if (!canEditBoard(role)) {
    // Allow creator to edit their own items
    if (item.createdBy !== userId) {
      throw new Error('You do not have permission to edit this item');
    }
  }

  // Update item fields
  if (data.name !== undefined || data.status !== undefined) {
    await prisma.item.update({
      where: { id: itemId },
      data: {
        name: data.name,
        status: data.status,
      },
    });
  }

  // Update cells
  if (Array.isArray(data.cells) && data.cells.length > 0) {
    await Promise.all(
      (data.cells as Array<{ columnId: string; value: unknown }>).map((cell) =>
        prisma.cell.upsert({
          where: {
            itemId_columnId: {
              itemId,
              columnId: cell.columnId,
            },
          },
          update: {
            value: cell.value as unknown as Prisma.InputJsonValue,
            version: { increment: 1 },
          },
          create: {
            itemId,
            columnId: cell.columnId,
            value: cell.value as unknown as Prisma.InputJsonValue,
          },
        })
      )
    );
  }

  return await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      cells: {
        include: {
          column: true,
        },
      },
    },
  });
};

export const deleteItem = async (
  itemId: string,
  userId: string
): Promise<void> => {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      board: true,
    },
  });

  if (!item) {
    throw new Error('Item not found');
  }

  // Only creator or workspace admin/owner can delete
  const role = await checkWorkspaceAccess(item.board.workspaceId, userId);
  if (item.createdBy !== userId && role !== 'owner' && role !== 'admin') {
    throw new Error('You do not have permission to delete this item');
  }

  await prisma.item.update({
    where: { id: itemId },
    data: {
      deletedAt: new Date(),
    },
  });
};

