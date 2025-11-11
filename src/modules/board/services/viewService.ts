import prisma from '../../../lib/prisma';
import { ViewType } from '@prisma/client';
import { WorkspaceRole } from '@prisma/client';

export interface CreateViewInput {
  boardId: string;
  name: string;
  type: ViewType;
  settings?: Record<string, unknown>;
  isDefault?: boolean;
  description?: string;
  isShared?: boolean;
}

export interface UpdateViewInput {
  name?: string;
  settings?: Record<string, unknown>;
  isDefault?: boolean;
  description?: string;
  isShared?: boolean;
}

/**
 * Check if user has access to board's workspace
 */
async function checkBoardAccess(boardId: string, userId: string): Promise<WorkspaceRole | null> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: {
      workspaceId: true,
    },
  });

  if (!board) {
    return null;
  }

  // Check if user is a workspace member
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: board.workspaceId,
        userId,
      },
    },
  });
  
  if (member?.role) return member.role;
  
  // If not a member, allow platform admins to view/edit based on global role
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role === 'admin') return WorkspaceRole.admin;
  
  return null;
}

/**
 * Check if user can edit board
 */
function canEditBoard(role: WorkspaceRole | null): boolean {
  if (!role) return false;
  return role === WorkspaceRole.owner || 
         role === WorkspaceRole.admin || 
         role === WorkspaceRole.finance;
}

export class ViewService {
  /**
   * Get all views for a board
   */
  static async getBoardViews(boardId: string, userId: string) {
    // Check if board exists
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true },
    });
    
    if (!board) {
      throw new Error('Board not found');
    }
    
    const role = await checkBoardAccess(boardId, userId);
    if (!role) {
      throw new Error('Access denied');
    }

    const views = await prisma.view.findMany({
      where: { boardId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Transform views to include description and isShared from settings
    return views.map(view => {
      const settings = (view.settings as Record<string, unknown>) || {};
      return {
        ...view,
        description: settings.description as string | undefined,
        isShared: settings.isShared as boolean | undefined || false,
      };
    });
  }

  /**
   * Get a view by ID
   */
  static async getViewById(viewId: string, userId: string) {
    const view = await prisma.view.findUnique({
      where: { id: viewId },
      select: {
        id: true,
        boardId: true,
      },
    });

    if (!view) {
      throw new Error('View not found');
    }

    const role = await checkBoardAccess(view.boardId, userId);
    if (!role) {
      throw new Error('Access denied');
    }
    
    // Get full view data
    const fullView = await prisma.view.findUnique({
      where: { id: viewId },
    });

    if (!fullView) {
      throw new Error('View not found');
    }

    const settings = (fullView.settings as Record<string, unknown>) || {};
    return {
      ...fullView,
      description: settings.description as string | undefined,
      isShared: settings.isShared as boolean | undefined || false,
    };
  }

  /**
   * Create a new view
   */
  static async createView(data: CreateViewInput, userId: string) {
    const role = await checkBoardAccess(data.boardId, userId);
    if (!role) {
      throw new Error('Board not found or access denied');
    }

    if (!canEditBoard(role)) {
      throw new Error('You do not have permission to create views');
    }

    // If setting as default, unset other default views
    if (data.isDefault) {
      await prisma.view.updateMany({
        where: { boardId: data.boardId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Store description and isShared in settings
    const settings: Record<string, unknown> = {
      ...(data.settings || {}),
      ...(data.description && { description: data.description }),
      ...(data.isShared !== undefined && { isShared: data.isShared }),
    };

    const view = await prisma.view.create({
      data: {
        boardId: data.boardId,
        name: data.name,
        type: data.type,
        settings: settings as any,
        isDefault: data.isDefault || false,
      },
    });

    return {
      ...view,
      description: data.description,
      isShared: data.isShared || false,
    };
  }

  /**
   * Update a view
   */
  static async updateView(viewId: string, data: UpdateViewInput, userId: string) {
    const view = await prisma.view.findUnique({
      where: { id: viewId },
      select: {
        id: true,
        boardId: true,
        settings: true,
      },
    });

    if (!view) {
      throw new Error('View not found');
    }

    const role = await checkBoardAccess(view.boardId, userId);
    if (!canEditBoard(role)) {
      throw new Error('You do not have permission to update views');
    }

    // If setting as default, unset other default views
    if (data.isDefault) {
      await prisma.view.updateMany({
        where: { boardId: view.boardId, isDefault: true, id: { not: viewId } },
        data: { isDefault: false },
      });
    }

    // Merge description and isShared into settings
    const currentSettings = (view.settings as Record<string, unknown>) || {};
    const updatedSettings: Record<string, unknown> = {
      ...currentSettings,
      ...(data.settings || {}),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.isShared !== undefined && { isShared: data.isShared }),
    };

    const updated = await prisma.view.update({
      where: { id: viewId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        settings: updatedSettings as any,
      },
    });

    return {
      ...updated,
      description: updatedSettings.description as string | undefined,
      isShared: updatedSettings.isShared as boolean | undefined || false,
    };
  }

  /**
   * Delete a view
   */
  static async deleteView(viewId: string, userId: string) {
    const view = await prisma.view.findUnique({
      where: { id: viewId },
      select: {
        id: true,
        boardId: true,
      },
    });

    if (!view) {
      throw new Error('View not found');
    }

    const role = await checkBoardAccess(view.boardId, userId);
    if (!canEditBoard(role)) {
      throw new Error('You do not have permission to delete views');
    }

    await prisma.view.delete({
      where: { id: viewId },
    });
  }

  /**
   * Set a view as default
   */
  static async setDefaultView(viewId: string, userId: string) {
    const view = await prisma.view.findUnique({
      where: { id: viewId },
      select: {
        id: true,
        boardId: true,
      },
    });

    if (!view) {
      throw new Error('View not found');
    }

    const role = await checkBoardAccess(view.boardId, userId);
    if (!canEditBoard(role)) {
      throw new Error('You do not have permission to set default view');
    }

    // Unset other default views
    await prisma.view.updateMany({
      where: { boardId: view.boardId, isDefault: true, id: { not: viewId } },
      data: { isDefault: false },
    });

    // Set this view as default
    return await prisma.view.update({
      where: { id: viewId },
      data: { isDefault: true },
    });
  }
}

