import { Request, Response } from 'express';
import { ApprovalService } from '../services/approvalService';
import { ApiResponse } from '../../../types';
import { ApprovalFilters, ApprovalAction, BulkApprovalAction } from '../types';

export class ApprovalController {
  /**
   * Get all leave approvals with filtering and pagination
   */
  static async getLeaveApprovals(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const filters: ApprovalFilters = {
        search: req.query.search as string,
        status: req.query.status as 'pending' | 'approved' | 'rejected' | 'all',
        leaveType: req.query.leaveType as string,
        priority: req.query.priority as 'low' | 'medium' | 'high' | 'all',
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
      };

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      const result = await ApprovalService.getLeaveApprovals(managerId, filters);

      const response: ApiResponse = {
        success: true,
        message: 'Leave approvals retrieved successfully',
        data: result.approvals,
        pagination: result.pagination
      };

      // Add cache-busting headers
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getLeaveApprovals:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve leave approvals',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get leave approval by ID
   */
  static async getLeaveApprovalById(req: Request, res: Response): Promise<void> {
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
          message: 'Approval ID is required',
          error: 'Missing approval ID'
        };
        res.status(400).json(response);
        return;
      }

      const approval = await ApprovalService.getLeaveApprovalById(managerId, id);

      if (!approval) {
        const response: ApiResponse = {
          success: false,
          message: 'Leave approval not found',
          error: 'Leave approval with the given ID does not exist or is not under your management'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Leave approval retrieved successfully',
        data: approval
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getLeaveApprovalById:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve leave approval',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Process leave approval action
   */
  static async processApprovalAction(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const action: ApprovalAction = req.body;

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      if (!action.requestId || !action.action) {
        const response: ApiResponse = {
          success: false,
          message: 'Request ID and action are required',
          error: 'Missing required fields'
        };
        res.status(400).json(response);
        return;
      }

      if (!['approve', 'reject'].includes(action.action)) {
        const response: ApiResponse = {
          success: false,
          message: 'Action must be either approve or reject',
          error: 'Invalid action value'
        };
        res.status(400).json(response);
        return;
      }

      const approval = await ApprovalService.processApprovalAction(managerId, action);

      const response: ApiResponse = {
        success: true,
        message: `Leave request ${action.action}d successfully`,
        data: approval
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in processApprovalAction:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to process approval action',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(400).json(response);
    }
  }

  /**
   * Update leave request paid/unpaid status
   */
  static async updateLeaveRequestPaidStatus(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const { id } = req.params;
      const { isPaid, comments } = req.body;

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
          message: 'Leave request ID is required',
          error: 'Missing leave request ID'
        };
        res.status(400).json(response);
        return;
      }

      if (typeof isPaid !== 'boolean') {
        const response: ApiResponse = {
          success: false,
          message: 'isPaid must be a boolean value',
          error: 'Invalid isPaid value'
        };
        res.status(400).json(response);
        return;
      }

      const approval = await ApprovalService.updateLeaveRequestPaidStatus(
        managerId,
        id,
        isPaid,
        comments
      );

      const response: ApiResponse = {
        success: true,
        message: `Leave request updated to ${isPaid ? 'paid' : 'unpaid'} successfully`,
        data: approval
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateLeaveRequestPaidStatus:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update leave request paid status',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(400).json(response);
    }
  }

  /**
   * Process bulk approval actions
   */
  static async processBulkApprovalAction(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const action: BulkApprovalAction = req.body;

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      if (!action.requestIds || !Array.isArray(action.requestIds) || action.requestIds.length === 0) {
        const response: ApiResponse = {
          success: false,
          message: 'Request IDs array is required',
          error: 'Missing or invalid request IDs'
        };
        res.status(400).json(response);
        return;
      }

      if (!action.action || !['approve', 'reject'].includes(action.action)) {
        const response: ApiResponse = {
          success: false,
          message: 'Action must be either approve or reject',
          error: 'Invalid action value'
        };
        res.status(400).json(response);
        return;
      }

      const result = await ApprovalService.processBulkApprovalAction(managerId, action);

      const response: ApiResponse = {
        success: true,
        message: `Bulk ${action.action} completed: ${result.updated} updated, ${result.failed} failed`,
        data: result
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in processBulkApprovalAction:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to process bulk approval action',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(400).json(response);
    }
  }

  /**
   * Get approval statistics
   */
  static async getApprovalStats(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔍 getApprovalStats: Starting...');
      const managerId = (req as any).user?.id;
      const { startDate, endDate } = req.query;
      
      console.log('🔍 getApprovalStats: managerId:', managerId);
      console.log('🔍 getApprovalStats: query params:', { startDate, endDate });

      if (!managerId) {
        console.log('❌ getApprovalStats: No manager ID found');
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      const dateRange = startDate && endDate ? {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      } : undefined;

      const stats = await ApprovalService.getApprovalStats(managerId, dateRange);

      const response: ApiResponse = {
        success: true,
        message: 'Approval statistics retrieved successfully',
        data: stats
      };

      // Add cache-busting headers
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getApprovalStats:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve approval statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get pending approvals count
   */
  static async getPendingCount(req: Request, res: Response): Promise<void> {
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

      const count = await ApprovalService.getPendingCount(managerId);

      const response: ApiResponse = {
        success: true,
        message: 'Pending count retrieved successfully',
        data: { pendingCount: count }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getPendingCount:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve pending count',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get urgent approvals
   */
  static async getUrgentApprovals(req: Request, res: Response): Promise<void> {
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

      const urgentApprovals = await ApprovalService.getUrgentApprovals(managerId);

      const response: ApiResponse = {
        success: true,
        message: 'Urgent approvals retrieved successfully',
        data: urgentApprovals
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getUrgentApprovals:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve urgent approvals',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get approval history
   */
  static async getApprovalHistory(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const { page = '1', limit = '10' } = req.query;

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      const filters: ApprovalFilters = {
        status: 'all', // Get all processed approvals
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: 'approvedAt',
        sortOrder: 'desc'
      };

      const result = await ApprovalService.getLeaveApprovals(managerId, filters);

      const response: ApiResponse = {
        success: true,
        message: 'Approval history retrieved successfully',
        data: result.approvals,
        pagination: result.pagination
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getApprovalHistory:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve approval history',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }
}
