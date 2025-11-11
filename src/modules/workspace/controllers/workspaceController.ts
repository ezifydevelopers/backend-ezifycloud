import { Request, Response } from 'express';
import { WorkspaceService } from '../services/workspaceService';
import { ApiResponse } from '@/types';

export class WorkspaceController {
  /**
   * Create a new workspace
   */
  static async createWorkspace(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const result = await WorkspaceService.createWorkspace(userId, req.body);

      const response: ApiResponse = {
        success: true,
        message: 'Workspace created successfully',
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating workspace:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to create workspace',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get workspace by ID
   */
  static async getWorkspaceById(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const workspace = await WorkspaceService.getWorkspaceById(id, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Workspace retrieved successfully',
        data: workspace,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching workspace:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to fetch workspace',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(404).json(response);
    }
  }

  /**
   * Get all workspaces for user
   */
  static async getUserWorkspaces(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      let search = req.query.search as string | undefined;
      
      // Filter out "undefined" string that comes from URL encoding
      if (search === 'undefined' || search === 'null' || search === '') {
        search = undefined;
      }

      const result = await WorkspaceService.getUserWorkspaces(userId, {
        page,
        limit,
        search,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Workspaces retrieved successfully',
        // Many frontend callers expect `data` to be an array
        data: result.workspaces,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if it's a database/table error
      const isTableMissing = errorMessage.toLowerCase().includes('does not exist') || 
                            errorMessage.toLowerCase().includes('relation') ||
                            errorMessage.toLowerCase().includes('table');
      
      const response: ApiResponse = {
        success: false,
        message: isTableMissing 
          ? 'Database tables not found. Please run: npx prisma migrate dev --name add_invoice_system'
          : 'Failed to fetch workspaces',
        error: errorMessage,
      };
      res.status(500).json(response);
    }
  }

  /**
   * Update workspace
   */
  static async updateWorkspace(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const workspace = await WorkspaceService.updateWorkspace(id, userId, req.body);

      const response: ApiResponse = {
        success: true,
        message: 'Workspace updated successfully',
        data: workspace,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error updating workspace:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update workspace',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Delete workspace
   */
  static async deleteWorkspace(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      await WorkspaceService.deleteWorkspace(id, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Workspace deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error deleting workspace:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to delete workspace',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get workspace members
   */
  static async getWorkspaceMembers(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const members = await WorkspaceService.getWorkspaceMembers(id, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Workspace members retrieved successfully',
        data: members,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching workspace members:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to fetch workspace members',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(404).json(response);
    }
  }

  /**
   * Invite member to workspace
   */
  static async inviteMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const invite = await WorkspaceService.inviteMember(id, userId, req.body);

      const response: ApiResponse = {
        success: true,
        message: 'Invitation sent successfully',
        data: invite,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error inviting member:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to invite member',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Update member role
   */
  static async updateMemberRole(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id, memberId } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const member = await WorkspaceService.updateMemberRole(
        id,
        memberId,
        userId,
        req.body.role
      );

      const response: ApiResponse = {
        success: true,
        message: 'Member role updated successfully',
        data: member,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error updating member role:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update member role',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Remove member from workspace
   */
  static async removeMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id, memberId } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      await WorkspaceService.removeMember(id, memberId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Member removed successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error removing member:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to remove member',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Accept workspace invitation
   */
  static async acceptInvitation(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { token } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      await WorkspaceService.acceptInvitation(token, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Invitation accepted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to accept invitation',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }

  /** List invitations */
  static async listInvitations(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;
      const status = (req.query.status as 'pending' | 'accepted' | 'all') || 'pending';

      if (!userId) {
        const response: ApiResponse = { success: false, message: 'Unauthorized', error: 'Missing user' };
        res.status(401).json(response);
        return;
      }

      const invites = await WorkspaceService.listInvitations(id, userId, status);
      const response: ApiResponse = { success: true, message: 'Invitations retrieved', data: invites };
      res.status(200).json(response);
    } catch (error) {
      console.error('Error listing invitations:', error);
      const response: ApiResponse = { success: false, message: 'Failed to list invitations', error: error instanceof Error ? error.message : 'Unknown error' };
      res.status(400).json(response);
    }
  }

  /** Resend invitation */
  static async resendInvitation(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { inviteId } = req.params as any;
      if (!userId) {
        const response: ApiResponse = { success: false, message: 'Unauthorized', error: 'Missing user' };
        res.status(401).json(response);
        return;
      }
      await WorkspaceService.resendInvitation(inviteId, userId);
      const response: ApiResponse = { success: true, message: 'Invitation resent' };
      res.status(200).json(response);
    } catch (error) {
      console.error('Error resending invitation:', error);
      const response: ApiResponse = { success: false, message: 'Failed to resend invitation', error: error instanceof Error ? error.message : 'Unknown error' };
      res.status(400).json(response);
    }
  }

  /** Cancel invitation */
  static async cancelInvitation(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { inviteId } = req.params as any;
      if (!userId) {
        const response: ApiResponse = { success: false, message: 'Unauthorized', error: 'Missing user' };
        res.status(401).json(response);
        return;
      }
      await WorkspaceService.cancelInvitation(inviteId, userId);
      const response: ApiResponse = { success: true, message: 'Invitation cancelled' };
      res.status(200).json(response);
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      const response: ApiResponse = { success: false, message: 'Failed to cancel invitation', error: error instanceof Error ? error.message : 'Unknown error' };
      res.status(400).json(response);
    }
  }

  /**
   * Transfer ownership to another member
   */
  static async transferOwnership(req: Request, res: Response): Promise<void> {
    try {
      const requesterUserId = (req as any).user?.id;
      const { id } = req.params; // workspace id
      const { newOwnerUserId } = req.body as { newOwnerUserId: string };

      if (!requesterUserId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      if (!newOwnerUserId) {
        const response: ApiResponse = {
          success: false,
          message: 'newOwnerUserId is required',
          error: 'Missing newOwnerUserId',
        };
        res.status(400).json(response);
        return;
      }

      await WorkspaceService.transferOwnership(id, newOwnerUserId, requesterUserId);

      const response: ApiResponse = {
        success: true,
        message: 'Ownership transferred successfully',
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Error transferring ownership:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to transfer ownership',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }
}

