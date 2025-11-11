import prisma from '../../../lib/prisma';
import { PermissionContext } from '../types';
import { BoardPermissionService } from './boardPermissionService';

/**
 * Item-level (row-level) permission checking
 */
export class ItemPermissionService {
  static async check(
    context: PermissionContext,
    action: string
  ): Promise<boolean> {
    if (!context.itemId || !context.userId) {
      return false;
    }

    const item = await this.getItem(context.itemId, context.userId);
    if (!item) return false;

    // Check board permission first
    const boardPerm = await BoardPermissionService.check(
      { userId: context.userId, boardId: item.boardId },
      action
    );
    if (!boardPerm) return false;

    // Item-specific rules
    if (item.createdBy === context.userId) return true; // Creator always has access
    if (await this.isAssigned(item.id, context.userId) && action !== 'delete') return true;
    
    const member = item.board.workspace.members[0];
    if (member && action === 'read') return true; // All members can read
    if (member && ['member', 'finance', 'admin', 'owner'].includes(member.role)) {
      return action !== 'delete'; // Only creator can delete
    }

    return false;
  }

  private static async getItem(itemId: string, userId: string) {
    return await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        board: {
          include: {
            workspace: {
              include: {
                members: { where: { userId } },
              },
            },
          },
        },
      },
    });
  }

  private static async isAssigned(itemId: string, userId: string): Promise<boolean> {
    const cells = await prisma.cell.findMany({
      where: {
        itemId,
        column: { type: 'PEOPLE' },
      },
    });

    return cells.some(cell => {
      const value = cell.value as unknown;
      return Array.isArray(value) && value.includes(userId);
    });
  }
}

