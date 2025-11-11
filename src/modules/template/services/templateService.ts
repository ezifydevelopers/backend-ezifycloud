import prisma from '../../../lib/prisma';
import { BoardType, Prisma } from '@prisma/client';

export interface SaveTemplateInput {
  name: string;
  description?: string;
  category?: string;
  coverImage?: string;
}

export const saveBoardAsTemplate = async (
  boardId: string,
  userId: string,
  input: SaveTemplateInput
) => {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { workspace: true, columns: true },
  });
  if (!board) throw new Error('Board not found');

  const template = await prisma.boardTemplate.create({
    data: {
      workspaceId: board.workspaceId,
      name: input.name,
      description: input.description,
      category: input.category,
      coverImage: input.coverImage,
      boardType: board.type as BoardType,
      config: (board.settings || {}) as unknown as Prisma.InputJsonValue,
      columns: (board.columns || []).map(c => ({
        name: c.name,
        type: c.type,
        width: c.width,
        required: c.required,
        defaultValue: c.defaultValue,
        settings: c.settings,
        permissions: c.permissions,
        isHidden: c.isHidden,
      })) as unknown as Prisma.InputJsonValue,
      createdBy: userId,
    },
  });

  return template;
};

export const listTemplates = async (workspaceId?: string) => {
  return prisma.boardTemplate.findMany({
    where: workspaceId ? { OR: [{ workspaceId }, { workspaceId: null }] } : {},
    orderBy: { updatedAt: 'desc' },
  });
};

export const createBoardFromTemplate = async (
  templateId: string,
  userId: string,
  workspaceId: string,
  overrides?: { name?: string; color?: string; icon?: string }
) => {
  const tpl = await prisma.boardTemplate.findUnique({ where: { id: templateId } });
  if (!tpl) throw new Error('Template not found');

  const board = await prisma.board.create({
    data: {
      workspaceId,
      name: overrides?.name || tpl.name,
      type: tpl.boardType,
      description: tpl.description || undefined,
      color: overrides?.color,
      icon: overrides?.icon,
      settings: tpl.config as any,
    },
  });

  const columns = (tpl.columns as any as Array<any>) || [];
  for (const [idx, col] of columns.entries()) {
    await prisma.column.create({
      data: {
        boardId: board.id,
        name: col.name,
        type: col.type,
        position: idx + 1,
        width: col.width || 200,
        required: !!col.required,
        defaultValue: (col.defaultValue as any) ?? undefined,
        settings: (col.settings as any) ?? {},
        permissions: (col.permissions as any) ?? {},
        isHidden: !!col.isHidden,
      },
    });
  }

  return board;
};


