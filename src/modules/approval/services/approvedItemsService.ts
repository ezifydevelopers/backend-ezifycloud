// Approved Items Service - Handles approved items operations

import prisma from '../../../lib/prisma';
import { ApprovalLevel, ApprovalStatus } from '@prisma/client';
import { ApprovalService } from './approvalService';

export interface ApprovedItem {
  id: string;
  name: string;
  boardId: string;
  workspaceId: string;
  createdBy: string;
  createdAt: Date;
  approvalStatus: {
    level1: ApprovalStatus | null;
    level2: ApprovalStatus | null;
    level3: ApprovalStatus | null;
    overallStatus: 'pending' | 'approved' | 'rejected' | 'in_progress';
    isFullyApproved: boolean;
    isPartiallyApproved: boolean;
  };
  board?: {
    id: string;
    name: string;
    workspaceId: string;
  };
  creator?: {
    id: string;
    name: string;
    email: string;
  };
}

export class ApprovedItemsService {
  /**
   * Get all approved items for a workspace or board
   */
  static async getApprovedItems(
    userId: string,
    options?: {
      workspaceId?: string;
      boardId?: string;
      filter?: 'fully_approved' | 'partially_approved' | 'archived' | 'all';
      page?: number;
      limit?: number;
      search?: string;
    }
  ): Promise<{ items: ApprovedItem[]; total: number }> {
    // Determine if we should show archived items
    const showArchived = options?.filter === 'archived';
    
    // Get all items with approvals
    const items = await prisma.item.findMany({
      where: {
        ...(showArchived ? { deletedAt: { not: null } } : { deletedAt: null }),
        ...(options?.boardId && { boardId: options.boardId }),
        ...(options?.workspaceId && {
          board: {
            workspaceId: options.workspaceId,
          },
        }),
        ...(options?.search && {
          name: {
            contains: options.search,
            mode: 'insensitive',
          },
        }),
      },
      include: {
        board: {
          include: {
            workspace: {
              include: {
                members: {
                  where: { userId },
                },
              },
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
        approvals: {
          orderBy: {
            level: 'asc',
          },
        },
      },
      take: options?.limit || 50,
      skip: options?.page ? (options.page - 1) * (options.limit || 50) : 0,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Filter items that have at least one approval and user has access
    const itemsWithApprovals = items.filter((item) => {
      // Check workspace access - user must be a member
      const member = item.board.workspace.members.find(m => m.userId === userId);
      if (!member) return false;

      // Check if item has any approvals
      if (item.approvals.length === 0) return false;

      return true;
    });

    // Map items with approval status
    const approvedItems: ApprovedItem[] = await Promise.all(
      itemsWithApprovals.map(async (item) => {
        const approvalStatus = await ApprovalService.getItemApprovals(item.id, userId);
        
        const level1Status = approvalStatus.level1?.status || null;
        const level2Status = approvalStatus.level2?.status || null;
        const level3Status = approvalStatus.level3?.status || null;

        // Determine if fully or partially approved
        const isFullyApproved = approvalStatus.overallStatus === 'approved' && approvalStatus.isComplete;
        const isPartiallyApproved = 
          approvalStatus.overallStatus === 'in_progress' ||
          (approvalStatus.level1?.status === ApprovalStatus.approved && 
           (approvalStatus.level2?.status === ApprovalStatus.pending || !approvalStatus.level2)) ||
          (approvalStatus.level2?.status === ApprovalStatus.approved && 
           (approvalStatus.level3?.status === ApprovalStatus.pending || !approvalStatus.level3));

        return {
          id: item.id,
          name: item.name,
          boardId: item.boardId,
          workspaceId: item.board.workspaceId,
          createdBy: item.createdBy,
          createdAt: item.createdAt,
          approvalStatus: {
            level1: level1Status,
            level2: level2Status,
            level3: level3Status,
            overallStatus: approvalStatus.overallStatus,
            isFullyApproved,
            isPartiallyApproved,
          },
          board: {
            id: item.board.id,
            name: item.board.name,
            workspaceId: item.board.workspaceId,
          },
          creator: item.creator,
        };
      })
    );

    // Apply filter
    let filteredItems = approvedItems;
    if (options?.filter === 'fully_approved') {
      filteredItems = approvedItems.filter((item) => item.approvalStatus.isFullyApproved);
    } else if (options?.filter === 'partially_approved') {
      filteredItems = approvedItems.filter((item) => item.approvalStatus.isPartiallyApproved);
    } else if (options?.filter === 'archived') {
      // Archived items are already filtered by the query (deletedAt not null)
      filteredItems = approvedItems;
    }

    // Get total count (for pagination)
    const totalItems = await prisma.item.count({
      where: {
        ...(showArchived ? { deletedAt: { not: null } } : { deletedAt: null }),
        ...(options?.boardId && { boardId: options.boardId }),
        ...(options?.workspaceId && {
          board: {
            workspaceId: options.workspaceId,
          },
        }),
        ...(options?.search && {
          name: {
            contains: options.search,
            mode: 'insensitive',
          },
        }),
      },
    });

    return {
      items: filteredItems,
      total: totalItems,
    };
  }

  /**
   * Move item to different board
   */
  static async moveItemToBoard(
    itemId: string,
    targetBoardId: string,
    userId: string
  ): Promise<void> {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        board: {
          include: {
            workspace: {
              include: {
                members: {
                  where: { userId },
                },
              },
            },
          },
        },
      },
    });

    if (!item) {
      throw new Error('Item not found');
    }

    // Check access to source board
    const sourceMember = item.board.workspace.members[0];
    if (!sourceMember) {
      throw new Error('Access denied to source board');
    }

    // Check access to target board
    const targetBoard = await prisma.board.findUnique({
      where: { id: targetBoardId },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!targetBoard) {
      throw new Error('Target board not found');
    }

    const targetMember = targetBoard.workspace.members[0];
    if (!targetMember) {
      throw new Error('Access denied to target board');
    }

    // Only workspace admin/owner or item creator can move
    const canMove = 
      sourceMember.role === 'owner' ||
      sourceMember.role === 'admin' ||
      item.createdBy === userId;

    if (!canMove) {
      throw new Error('You do not have permission to move this item');
    }

    // Move item to new board
    await prisma.item.update({
      where: { id: itemId },
      data: {
        boardId: targetBoardId,
      },
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        itemId,
        userId,
        action: 'moved',
        details: {
          fromBoardId: item.boardId,
          toBoardId: targetBoardId,
          fromBoardName: item.board.name,
          toBoardName: targetBoard.name,
        } as any,
      },
    });
  }

  /**
   * Archive approved item
   */
  static async archiveItem(itemId: string, userId: string): Promise<void> {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        board: {
          include: {
            workspace: {
              include: {
                members: {
                  where: { userId },
                },
              },
            },
          },
        },
      },
    });

    if (!item) {
      throw new Error('Item not found');
    }

    // Check access
    const member = item.board.workspace.members[0];
    if (!member) {
      throw new Error('Access denied');
    }

    // Only workspace admin/owner or item creator can archive
    const canArchive = 
      member.role === 'owner' ||
      member.role === 'admin' ||
      item.createdBy === userId;

    if (!canArchive) {
      throw new Error('You do not have permission to archive this item');
    }

    // Check if item is fully approved
    const approvalStatus = await ApprovalService.getItemApprovals(itemId, userId);
    if (!approvalStatus.isComplete || approvalStatus.overallStatus !== 'approved') {
      throw new Error('Item must be fully approved before archiving');
    }

    // Archive item (soft delete)
    await prisma.item.update({
      where: { id: itemId },
      data: {
        deletedAt: new Date(),
      },
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        itemId,
        userId,
        action: 'archived',
        details: {
          reason: 'Approved item archived',
        } as any,
      },
    });
  }

  /**
   * Restore archived item
   */
  static async restoreItem(itemId: string, userId: string): Promise<void> {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        board: {
          include: {
            workspace: {
              include: {
                members: {
                  where: { userId },
                },
              },
            },
          },
        },
      },
    });

    if (!item) {
      throw new Error('Item not found');
    }

    // Check access
    const member = item.board.workspace.members[0];
    if (!member) {
      throw new Error('Access denied');
    }

    // Only workspace admin/owner or item creator can restore
    const canRestore = 
      member.role === 'owner' ||
      member.role === 'admin' ||
      item.createdBy === userId;

    if (!canRestore) {
      throw new Error('You do not have permission to restore this item');
    }

    // Restore item
    await prisma.item.update({
      where: { id: itemId },
      data: {
        deletedAt: null,
      },
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        itemId,
        userId,
        action: 'restored',
        details: {
          reason: 'Archived item restored',
        } as any,
      },
    });
  }
}

