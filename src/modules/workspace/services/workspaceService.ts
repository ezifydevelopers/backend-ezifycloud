import prisma from '../../../lib/prisma';
import { WorkspaceRole, Prisma } from '@prisma/client';
import { CreateWorkspaceInput, UpdateWorkspaceInput, WorkspaceMember, InviteMemberInput } from '../types';

export class WorkspaceService {
  /**
   * Create a new workspace
   */
  static async createWorkspace(
    userId: string,
    data: CreateWorkspaceInput
  ): Promise<{ workspace: any; member: any }> {
    // Generate slug from name
    const slug = this.generateSlug(data.name);

    // Check if slug already exists
    const existing = await prisma.workspace.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new Error(`Workspace with slug "${slug}" already exists`);
    }

    // Create workspace and add creator as owner
    const workspace = await prisma.workspace.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        logo: data.logo,
        settings: (data.settings || {}) as Prisma.InputJsonValue,
        createdBy: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    });

    // Add creator as owner
    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: WorkspaceRole.owner,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    });

    return { workspace, member };
  }

  /**
   * Get workspace by ID
   */
  static async getWorkspaceById(
    workspaceId: string,
    userId: string
  ): Promise<any> {
    // Check if user has access (member or platform admin)
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });
    if (!member) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user?.role !== 'admin') {
        throw new Error('You do not have access to this workspace');
      }
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true,
              },
            },
          },
        },
        _count: {
          select: {
            boards: true,
            members: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    return workspace;
  }

  /**
   * Get all workspaces for a user
   */
  static async getUserWorkspaces(
    userId: string,
    options?: { page?: number; limit?: number; search?: string }
  ): Promise<{ workspaces: any[]; total: number; page: number; limit: number }> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const skip = (page - 1) * limit;

      // If platform admin, show all workspaces (even if not a member)
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      const isPlatformAdmin = user?.role === 'admin';

      const where: any = {
        deletedAt: null,
      };

      if (!isPlatformAdmin) {
        where.members = { some: { userId } };
      }

      if (options?.search) {
        where.OR = [
          { name: { contains: options.search, mode: 'insensitive' } },
          { description: { contains: options.search, mode: 'insensitive' } },
        ];
      }

      const [workspaces, total] = await Promise.all([
        prisma.workspace.findMany({
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
            members: isPlatformAdmin
              ? false
              : {
                  where: { userId },
                  select: { role: true },
                },
            _count: {
              select: {
                boards: true,
                members: true,
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
        }),
        prisma.workspace.count({ where }),
      ]);

      return {
        workspaces,
        total,
        page,
        limit,
      };
    } catch (error) {
      // If tables don't exist, return empty result instead of throwing
      if (error instanceof Error && error.message.includes('does not exist')) {
        console.warn('Workspace tables do not exist. Please run migration: npx prisma migrate dev --name add_invoice_system');
        return {
          workspaces: [],
          total: 0,
          page: options?.page || 1,
          limit: options?.limit || 20,
        };
      }
      throw error;
    }
  }

  /**
   * Update workspace
   */
  static async updateWorkspace(
    workspaceId: string,
    userId: string,
    data: UpdateWorkspaceInput
  ): Promise<any> {
    // Check permissions (owner or admin only)
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!member || (member.role !== WorkspaceRole.owner && member.role !== WorkspaceRole.admin)) {
      throw new Error('You do not have permission to update this workspace');
    }

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: data.name,
        description: data.description,
        logo: data.logo,
        settings: data.settings ? (data.settings as Prisma.InputJsonValue) : undefined,
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

    return workspace;
  }

  /**
   * Delete workspace (soft delete)
   */
  static async deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
    // Check if user is owner
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!member || member.role !== WorkspaceRole.owner) {
      throw new Error('Only workspace owner can delete the workspace');
    }

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Generate URL-friendly slug from name
   */
  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, hyphens with single hyphen
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50); // Limit length
  }

  /**
   * Get workspace members
   */
  static async getWorkspaceMembers(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceMember[]> {
    // Check access (member or platform admin)
    const hasAccess = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });
    if (!hasAccess) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user?.role !== 'admin') {
        throw new Error('You do not have access to this workspace');
      }
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Map to match WorkspaceMember type (convert null to undefined for profilePicture)
    return members.map((member) => ({
      ...member,
      user: member.user ? {
        ...member.user,
        profilePicture: member.user.profilePicture ?? undefined,
      } : undefined,
    })) as WorkspaceMember[];
  }

  /**
   * Invite member to workspace
   */
  static async inviteMember(
    workspaceId: string,
    userId: string,
    data: InviteMemberInput
  ): Promise<any> {
    // Check permissions (owner or admin only)
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!member || (member.role !== WorkspaceRole.owner && member.role !== WorkspaceRole.admin)) {
      throw new Error('You do not have permission to invite members');
    }

    // Check if user already exists in workspace
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMember) {
        throw new Error('User is already a member of this workspace');
      }
    }

    // Determine role: explicit -> workspace default -> member
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    const settings = (workspace?.settings as any) || {};
    const resolvedRole: WorkspaceRole = data.role || settings.defaultMemberRole || WorkspaceRole.member;

    // Generate invitation token
    const token = this.generateInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Check for existing pending invitation
    const existingInvite = await prisma.workspaceInvite.findUnique({
      where: {
        workspaceId_email: {
          workspaceId,
          email: data.email,
        },
      },
    });

    if (existingInvite && !existingInvite.acceptedAt) {
      // Resend existing invitation
      const invite = await prisma.workspaceInvite.update({
        where: { id: existingInvite.id },
        data: {
          role: resolvedRole,
          token,
          expiresAt,
          invitedBy: userId,
        },
      });

      return invite;
    }

    // Create new invitation
    const invite = await prisma.workspaceInvite.create({
      data: {
        workspaceId,
        email: data.email,
        role: resolvedRole,
        token,
        expiresAt,
        invitedBy: userId,
      },
    });

    return invite;
  }

  /**
   * Generate random invitation token
   */
  private static generateInviteToken(): string {
    return Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(36);
  }

  /**
   * Accept workspace invitation
   */
  static async acceptInvitation(token: string, userId: string): Promise<void> {
    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      throw new Error('Invalid invitation token');
    }

    if (invite.acceptedAt) {
      throw new Error('Invitation has already been accepted');
    }

    if (invite.expiresAt < new Date()) {
      throw new Error('Invitation has expired');
    }

    // Verify user email matches invitation
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.email !== invite.email) {
      throw new Error('Email mismatch. Please use the email address that was invited.');
    }

    // Check if already a member
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invite.workspaceId,
          userId,
        },
      },
    });

    if (existingMember) {
      // Mark invite as accepted even if already member
      await prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
      return;
    }

    // Create workspace member
    await prisma.$transaction([
      prisma.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId,
          role: invite.role,
        },
      }),
      prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
    ]);
  }

  /**
   * Update member role
   */
  static async updateMemberRole(
    workspaceId: string,
    memberUserId: string,
    userId: string,
    role: WorkspaceRole
  ): Promise<WorkspaceMember> {
    // Check permissions (owner or admin only)
    const requester = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!requester || (requester.role !== WorkspaceRole.owner && requester.role !== WorkspaceRole.admin)) {
      throw new Error('You do not have permission to update member roles');
    }

    // Prevent changing owner role
    const targetMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberUserId,
        },
      },
    });

    if (targetMember?.role === WorkspaceRole.owner && role !== WorkspaceRole.owner) {
      throw new Error('Cannot change owner role');
    }

    // Prevent non-owner from assigning owner role
    if (role === WorkspaceRole.owner && requester.role !== WorkspaceRole.owner) {
      throw new Error('Only workspace owner can assign owner role');
    }

    const member = await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberUserId,
        },
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    });

    // Map to match WorkspaceMember type (convert null to undefined for profilePicture)
    return {
      ...member,
      user: member.user ? {
        ...member.user,
        profilePicture: member.user.profilePicture ?? undefined,
      } : undefined,
    } as WorkspaceMember;
  }

  /**
   * Remove member from workspace
   */
  static async removeMember(
    workspaceId: string,
    memberUserId: string,
    userId: string
  ): Promise<void> {
    // Check permissions (owner or admin only)
    const requester = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!requester || (requester.role !== WorkspaceRole.owner && requester.role !== WorkspaceRole.admin)) {
      throw new Error('You do not have permission to remove members');
    }

    // Prevent removing owner
    const targetMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberUserId,
        },
      },
    });

    if (targetMember?.role === WorkspaceRole.owner) {
      throw new Error('Cannot remove workspace owner');
    }

    await prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberUserId,
        },
      },
    });
  }

  /**
   * Transfer ownership to another member
   */
  static async transferOwnership(
    workspaceId: string,
    newOwnerUserId: string,
    requesterUserId: string
  ): Promise<void> {
    // Only current owner can transfer
    const requester = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: requesterUserId } },
    });
    if (!requester || requester.role !== WorkspaceRole.owner) {
      throw new Error('Only current owner can transfer ownership');
    }

    // New owner must be an existing member
    const target = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: newOwnerUserId } },
    });
    if (!target) {
      throw new Error('Target user is not a member of this workspace');
    }

    if (target.userId === requesterUserId) {
      // Nothing to do
      return;
    }

    await prisma.$transaction([
      // Demote current owner to admin
      prisma.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId, userId: requesterUserId } },
        data: { role: WorkspaceRole.admin },
      }),
      // Promote target to owner
      prisma.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId, userId: newOwnerUserId } },
        data: { role: WorkspaceRole.owner },
      }),
    ]);
  }

  /**
   * List invitations (default: pending)
   */
  static async listInvitations(
    workspaceId: string,
    userId: string,
    status: 'pending' | 'accepted' | 'all' = 'pending'
  ) {
    // Only admin/owner can view
    const requester = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!requester || (requester.role !== WorkspaceRole.owner && requester.role !== WorkspaceRole.admin)) {
      throw new Error('You do not have permission to view invitations');
    }

    const where: any = { workspaceId };
    if (status === 'pending') where.acceptedAt = null;
    if (status === 'accepted') where.acceptedAt = { not: null };

    return prisma.workspaceInvite.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Resend invitation (regenerate token + extend expiry)
   */
  static async resendInvitation(
    inviteId: string,
    userId: string
  ): Promise<void> {
    const invite = await prisma.workspaceInvite.findUnique({ where: { id: inviteId } });
    if (!invite) throw new Error('Invitation not found');

    // Only admin/owner can resend
    const requester = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
    });
    if (!requester || (requester.role !== WorkspaceRole.owner && requester.role !== WorkspaceRole.admin)) {
      throw new Error('You do not have permission to resend invitations');
    }

    const token = this.generateInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.workspaceInvite.update({
      where: { id: inviteId },
      data: { token, expiresAt, invitedBy: userId },
    });
  }

  /**
   * Cancel a pending invitation
   */
  static async cancelInvitation(
    inviteId: string,
    userId: string
  ): Promise<void> {
    const invite = await prisma.workspaceInvite.findUnique({ where: { id: inviteId } });
    if (!invite) throw new Error('Invitation not found');

    // Only admin/owner can cancel
    const requester = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
    });
    if (!requester || (requester.role !== WorkspaceRole.owner && requester.role !== WorkspaceRole.admin)) {
      throw new Error('You do not have permission to cancel invitations');
    }

    if (invite.acceptedAt) {
      throw new Error('Cannot cancel an already accepted invitation');
    }

    await prisma.workspaceInvite.delete({ where: { id: inviteId } });
  }
}

