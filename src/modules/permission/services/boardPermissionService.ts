import prisma from '../../../lib/prisma';
import { PermissionContext } from '../types';
import { WorkspacePermissionService } from './workspacePermissionService';
import { BoardRole } from '@prisma/client';

/**
 * Board-level permission checking
 * Supports: Board owner, Board admin, Board editor, Board viewer, Private board
 */
export class BoardPermissionService {
  static async check(
    context: PermissionContext,
    action: string
  ): Promise<boolean> {
    if (!context.boardId || !context.userId) {
      return false;
    }

    const board = await this.getBoard(context.boardId, context.userId);
    if (!board) return false;

    // Check if board is private (owner only)
    if (board.isPrivate) {
      if (board.createdBy === context.userId) {
        return true; // Board owner has full access
      }
      // Check if user is a board member with owner role
      const boardMember = board.members?.find(m => m.userId === context.userId);
      if (boardMember?.role === BoardRole.owner) {
        return true;
      }
      return false; // Private board, no access
    }

    const workspaceMember = board.workspace.members[0];
    
    // Check if user is a platform admin (even if not a workspace member)
    if (!workspaceMember) {
      const user = await prisma.user.findUnique({
        where: { id: context.userId },
        select: { role: true },
      });
      if (user?.role === 'admin') {
        // Platform admins have full access to all boards
        return true;
      }
      return false;
    }

    // Check workspace permission first
    const workspacePerm = await WorkspacePermissionService.check(
      { userId: context.userId, workspaceId: board.workspaceId },
      action
    );
    if (!workspacePerm) return false;

    // Check board member role (if user is a board member)
    const boardMember = board.members?.find(m => m.userId === context.userId);
    if (boardMember) {
      return this.checkByBoardRole(boardMember.role, action);
    }

    // Check if user is board owner
    if (board.createdBy === context.userId) {
      return true; // Board owner has full access
    }

    // Check board-specific permission overrides
    return this.checkBoardOverrides(board.permissions, action, context.userId, workspaceMember.role);
  }

  private static async getBoard(boardId: string, userId: string) {
    return await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        workspace: {
          include: {
            members: { where: { userId } },
          },
        },
        members: {
          where: { userId },
          include: {
            user: true,
          },
        },
      },
    });
  }

  /**
   * Check permissions by board role
   * - Owner: Full access (all actions)
   * - Admin: Manage board (all except delete)
   * - Editor: Edit board (read, write)
   * - Viewer: Read-only (read only)
   */
  private static checkByBoardRole(role: BoardRole, action: string): boolean {
    if (role === BoardRole.owner) return true; // Full access
    if (role === BoardRole.admin) {
      // Admin can manage board but not delete it
      return action !== 'delete';
    }
    if (role === BoardRole.editor) {
      // Editor can read and write
      return action === 'read' || action === 'write';
    }
    if (role === BoardRole.viewer) {
      // Viewer is read-only
      return action === 'read';
    }
    return false;
  }

  private static checkBoardOverrides(
    permissions: unknown,
    action: string,
    userId: string,
    workspaceRole: string
  ): boolean {
    const boardPerms = (permissions as Record<string, unknown>) || {};
    const overrides = boardPerms[action] as Record<string, boolean> | undefined;

    if (overrides) {
      if (overrides[userId] !== undefined) return overrides[userId];
      if (overrides[workspaceRole] !== undefined) return overrides[workspaceRole];
    }

    return true; // Inherit from workspace
  }
}

