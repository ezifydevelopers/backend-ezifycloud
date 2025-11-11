import prisma from '../../../lib/prisma';
import { WorkspaceRole } from '@prisma/client';
import { PermissionContext } from '../types';

/**
 * Workspace-level permission checking
 */
export class WorkspacePermissionService {
  static async check(
    context: PermissionContext,
    action: string
  ): Promise<boolean> {
    if (!context.workspaceId || !context.userId) {
      return false;
    }

    const member = await this.getMember(context.workspaceId, context.userId);
    
    // Check if user is a platform admin (even if not a workspace member)
    if (!member) {
      const user = await prisma.user.findUnique({
        where: { id: context.userId },
        select: { role: true },
      });
      if (user?.role === 'admin') {
        // Platform admins have full access to all workspaces
        return true;
      }
      return false;
    }

    return this.checkByRole(member.role, action);
  }

  private static async getMember(workspaceId: string, userId: string) {
    return await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });
  }

  /**
   * Check permissions by workspace role
   * - Owner: Full access (all actions)
   * - Admin: Manage workspace (all except delete workspace)
   * - Finance: Approval access (read, manage/approve)
   * - Member: Create/edit items (read, write)
   * - Viewer: Read-only (read only)
   */
  private static checkByRole(role: WorkspaceRole, action: string): boolean {
    if (role === WorkspaceRole.owner) return true; // Full access
    if (role === WorkspaceRole.admin) {
      // Admin can manage workspace but not delete it
      return action !== 'delete';
    }
    if (role === WorkspaceRole.finance) {
      // Finance has approval access (read and manage/approve)
      return action === 'read' || action === 'manage';
    }
    if (role === WorkspaceRole.member) {
      // Member can create/edit items (read and write)
      return action === 'read' || action === 'write';
    }
    if (role === WorkspaceRole.viewer) {
      // Viewer is read-only
      return action === 'read';
    }
    return false;
  }
}

