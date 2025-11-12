import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { TeamService } from '../services/teamService';
import { ApiResponse } from '../../../types';
import { TeamFilters } from '../types';
import prisma from '../../../lib/prisma';

export class TeamController {
  /**
   * Get all team members with filtering and pagination
   */
  static async getTeamMembers(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      console.log('🔍 TeamController: getTeamMembers called');
      console.log('🔍 TeamController: req.user:', (req as any).user);
      console.log('🔍 TeamController: managerId extracted:', managerId);
      
      const filters: TeamFilters = {
        search: req.query.search && req.query.search !== 'undefined' ? req.query.search as string : '',
        department: req.query.department && req.query.department !== 'undefined' ? req.query.department as string : '',
        role: req.query.role && req.query.role !== 'undefined' ? req.query.role as string : '',
        status: req.query.status && req.query.status !== 'undefined' ? req.query.status as 'active' | 'inactive' | 'all' : 'all',
        performance: req.query.performance && req.query.performance !== 'undefined' ? req.query.performance as 'high' | 'medium' | 'low' | 'all' : 'all',
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
      };
      
      console.log('🔍 TeamController: filters after processing:', filters);

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      const result = await TeamService.getTeamMembers(managerId, filters);

      const response: ApiResponse = {
        success: true,
        message: 'Team members retrieved successfully',
        data: result.teamMembers,
        pagination: result.pagination
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getTeamMembers:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve team members',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get team member by ID
   */
  static async getTeamMemberById(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const { id } = req.params;

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      if (!id) {
        const response: ApiResponse = {
          success: false,
          message: 'Team member ID is required',
          error: 'Missing team member ID'
        };
        res.status(400).json(response);
        return;
      }

      const teamMember = await TeamService.getTeamMemberById(managerId, id);

      if (!teamMember) {
        const response: ApiResponse = {
          success: false,
          message: 'Team member not found',
          error: 'Team member with the given ID does not exist or is not under your management'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Team member retrieved successfully',
        data: teamMember
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getTeamMemberById:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve team member',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Add new team member
   */
  static async addTeamMember(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const memberData = req.body;

      console.log('🔍 TeamController: addTeamMember called');
      console.log('🔍 TeamController: managerId:', managerId);
      console.log('🔍 TeamController: memberData:', memberData);

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      const result = await TeamService.addTeamMember(managerId, memberData);

      const response: ApiResponse = {
        success: true,
        message: 'Team member added successfully',
        data: result
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('❌ TeamController: Error adding team member:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to add team member',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Update team member
   */
  static async updateTeamMember(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const { id } = req.params;
      const updateData = req.body;

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      if (!id) {
        const response: ApiResponse = {
          success: false,
          message: 'Team member ID is required',
          error: 'Missing team member ID'
        };
        res.status(400).json(response);
        return;
      }

      // Get editor info for audit log
      const editor = (req as any).user;
      const editedBy = editor ? {
        userId: editor.id,
        userName: editor.name || editor.email,
        ipAddress: req.ip || req.headers['x-forwarded-for'] as string || undefined,
        userAgent: req.headers['user-agent']
      } : undefined;

      const teamMember = await TeamService.updateTeamMember(managerId, id, updateData, editedBy);

      const response: ApiResponse = {
        success: true,
        message: 'Team member updated successfully',
        data: teamMember
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateTeamMember:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update team member',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(400).json(response);
    }
  }

  /**
   * Toggle team member status
   */
  static async toggleTeamMemberStatus(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const { id } = req.params;
      const { isActive } = req.body;

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      if (!id) {
        const response: ApiResponse = {
          success: false,
          message: 'Team member ID is required',
          error: 'Missing team member ID'
        };
        res.status(400).json(response);
        return;
      }

      if (typeof isActive !== 'boolean') {
        const response: ApiResponse = {
          success: false,
          message: 'isActive must be a boolean value',
          error: 'Invalid isActive value'
        };
        res.status(400).json(response);
        return;
      }

      const teamMember = await TeamService.toggleTeamMemberStatus(managerId, id, isActive);

      const response: ApiResponse = {
        success: true,
        message: `Team member ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: teamMember
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in toggleTeamMemberStatus:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to toggle team member status',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(400).json(response);
    }
  }

  /**
   * Get team statistics
   */
  static async getTeamStats(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      const stats = await TeamService.getTeamStats(managerId);

      const response: ApiResponse = {
        success: true,
        message: 'Team statistics retrieved successfully',
        data: stats
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getTeamStats:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve team statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get team departments
   */
  static async getTeamDepartments(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      const departments = await TeamService.getTeamDepartments(managerId);

      const response: ApiResponse = {
        success: true,
        message: 'Team departments retrieved successfully',
        data: departments
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getTeamDepartments:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve team departments',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get team member performance
   */
  static async getTeamMemberPerformance(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const { id } = req.params;

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      if (!id) {
        const response: ApiResponse = {
          success: false,
          message: 'Team member ID is required',
          error: 'Missing team member ID'
        };
        res.status(400).json(response);
        return;
      }

      const teamMember = await TeamService.getTeamMemberById(managerId, id);

      if (!teamMember) {
        const response: ApiResponse = {
          success: false,
          message: 'Team member not found',
          error: 'Team member with the given ID does not exist or is not under your management'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Team member performance retrieved successfully',
        data: teamMember.performance
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getTeamMemberPerformance:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve team member performance',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get team member recent leaves
   */
  static async getTeamMemberRecentLeaves(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const { id } = req.params;
      const { limit = '5' } = req.query;

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      if (!id) {
        const response: ApiResponse = {
          success: false,
          message: 'Team member ID is required',
          error: 'Missing team member ID'
        };
        res.status(400).json(response);
        return;
      }

      const teamMember = await TeamService.getTeamMemberById(managerId, id);

      if (!teamMember) {
        const response: ApiResponse = {
          success: false,
          message: 'Team member not found',
          error: 'Team member with the given ID does not exist or is not under your management'
        };
        res.status(404).json(response);
        return;
      }

      const recentLeaves = teamMember.recentLeaves.slice(0, parseInt(limit as string, 10));

      const response: ApiResponse = {
        success: true,
        message: 'Team member recent leaves retrieved successfully',
        data: recentLeaves
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getTeamMemberRecentLeaves:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve team member recent leaves',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get team member leave balance
   */
  static async getTeamMemberLeaveBalance(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const memberId = req.params.id;

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      if (!memberId) {
        const response: ApiResponse = {
          success: false,
          message: 'Member ID is required',
          error: 'Missing member ID'
        };
        res.status(400).json(response);
        return;
      }

      const leaveBalance = await TeamService.getTeamMemberLeaveBalance(managerId, memberId);

      const response: ApiResponse = {
        success: true,
        message: 'Team member leave balance retrieved successfully',
        data: leaveBalance
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getTeamMemberLeaveBalance:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve team member leave balance',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Manually adjust team member leave balance (Manager only)
   */
  static async adjustTeamMemberLeaveBalance(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const memberId = req.params.id;
      const { leaveType, additionalDays, reason } = req.body;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;

      if (!managerId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      if (!leaveType || !additionalDays || additionalDays <= 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid request. leaveType and additionalDays (positive number) are required.'
        });
        return;
      }

      if (!reason || reason.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'Reason is required for leave balance adjustments'
        });
        return;
      }

      const result = await TeamService.adjustTeamMemberLeaveBalance(
        managerId,
        memberId,
        leaveType,
        additionalDays,
        reason,
        year
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.leaveBalance
      });
    } catch (error) {
      console.error('Error in adjustTeamMemberLeaveBalance:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to adjust team member leave balance'
      });
    }
  }

  /**
   * Get team performance metrics
   */
  static async getTeamPerformance(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      const performanceMetrics = await TeamService.getTeamPerformanceMetrics(managerId);

      const response: ApiResponse = {
        success: true,
        message: 'Team performance metrics retrieved successfully',
        data: performanceMetrics
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getTeamPerformance:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve team performance metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get team capacity metrics
   */
  static async getTeamCapacity(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      const capacityMetrics = await TeamService.getTeamCapacityMetrics(managerId);

      const response: ApiResponse = {
        success: true,
        message: 'Team capacity metrics retrieved successfully',
        data: capacityMetrics
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getTeamCapacity:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve team capacity metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get pending user approvals for manager's department
   */
  static async getPendingUserApprovals(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      const result = await TeamService.getPendingUserApprovals(managerId, page, limit);

      const response: ApiResponse = {
        success: true,
        message: 'Pending user approvals retrieved successfully',
        data: {
          data: result.users,
          total: result.pagination.totalItems,
          page: result.pagination.page,
          limit: result.pagination.limit,
          totalPages: result.pagination.totalPages
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getPendingUserApprovals:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve pending user approvals',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Approve user access
   */
  static async approveUserAccess(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const { userId } = req.params;

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      const approvedUser = await TeamService.approveUserAccess(managerId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'User access approved successfully',
        data: approvedUser
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in approveUserAccess:', error);
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to approve user access',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Reject user access
   */
  static async rejectUserAccess(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const userId = req.params.userId || req.params.id;
      const { reason } = req.body;

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      const rejectedUser = await TeamService.rejectUserAccess(managerId, userId, reason);

      const response: ApiResponse = {
        success: true,
        message: 'User access rejected successfully',
        data: rejectedUser
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in rejectUserAccess:', error);
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reject user access',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get team member edit history
   */
  static async getTeamMemberEditHistory(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      if (!id) {
        const response: ApiResponse = {
          success: false,
          message: 'Team member ID is required',
          error: 'Missing team member ID'
        };
        res.status(400).json(response);
        return;
      }

      // Verify team member belongs to this manager
      const member = await prisma.user.findFirst({
        where: {
          id,
          managerId: managerId
        }
      });

      if (!member) {
        const response: ApiResponse = {
          success: false,
          message: 'Team member not found or not under your management',
          error: 'Unauthorized'
        };
        res.status(403).json(response);
        return;
      }

      const { AuditService } = await import('../../audit/services/auditService');
      const result = await AuditService.getAuditLogs({
        targetType: 'employee',
        targetId: id,
        action: 'update',
        page,
        limit
      });

      const response: ApiResponse = {
        success: true,
        message: 'Team member edit history retrieved successfully',
        data: result.logs,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getTeamMemberEditHistory:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve team member edit history',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Reset team member password (Manager only)
   */
  static async resetTeamMemberPassword(req: Request, res: Response): Promise<void> {
    try {
      const memberId = req.params.id;
      const { newPassword } = req.body;
      const managerId = (req as any).user?.id;

      if (!memberId) {
        const response: ApiResponse = {
          success: false,
          message: 'Team member ID is required',
          error: 'Missing team member ID'
        };
        res.status(400).json(response);
        return;
      }

      if (!newPassword || newPassword.length < 6) {
        const response: ApiResponse = {
          success: false,
          message: 'New password must be at least 6 characters long',
          error: 'Invalid password'
        };
        res.status(400).json(response);
        return;
      }

      // Verify manager has access to this team member
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        select: { id: true, department: true }
      });

      if (!manager) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager not found',
          error: 'Manager does not exist'
        };
        res.status(404).json(response);
        return;
      }

      // Check if team member exists and belongs to manager's department or is assigned to manager
      const teamMember = await prisma.user.findFirst({
        where: {
          id: memberId,
          OR: [
            { department: manager.department },
            { managerId: managerId }
          ]
        },
        select: { id: true, email: true, name: true, role: true }
      });

      if (!teamMember) {
        const response: ApiResponse = {
          success: false,
          message: 'Team member not found or you do not have permission to reset their password',
          error: 'Access denied'
        };
        res.status(403).json(response);
        return;
      }

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: memberId },
        data: {
          passwordHash,
          updatedAt: new Date()
        }
      });

      // Log the action
      console.log(`Manager ${managerId} reset password for team member ${memberId} (${teamMember.email})`);

      const response: ApiResponse = {
        success: true,
        message: 'Team member password has been reset successfully',
        data: {
          memberId,
          email: teamMember.email,
          name: teamMember.name
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in resetTeamMemberPassword:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to reset team member password',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }
}
