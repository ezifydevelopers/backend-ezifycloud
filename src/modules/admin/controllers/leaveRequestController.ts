import { Request, Response } from 'express';
import { LeaveRequestService } from '../services/leaveRequestService';
import { ApiResponse } from '../../../types';
import { LeaveRequestFilters } from '../types';

export class LeaveRequestController {
  /**
   * Get all leave requests with filtering and pagination
   */
  static async getLeaveRequests(req: Request, res: Response): Promise<void> {
    try {
      const filters: LeaveRequestFilters = {
        search: req.query.search as string,
        status: req.query.status as 'pending' | 'approved' | 'rejected' | 'all',
        leaveType: req.query.leaveType as string,
        department: req.query.department as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
      };

      const result = await LeaveRequestService.getLeaveRequests(filters);

      const response: ApiResponse = {
        success: true,
        message: 'Leave requests retrieved successfully',
        data: result.leaveRequests,
        pagination: result.pagination
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getLeaveRequests:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve leave requests',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get leave request by ID
   */
  static async getLeaveRequestById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        const response: ApiResponse = {
          success: false,
          message: 'Leave request ID is required',
          error: 'Missing leave request ID'
        };
        res.status(400).json(response);
        return;
      }

      const leaveRequest = await LeaveRequestService.getLeaveRequestById(id);

      if (!leaveRequest) {
        const response: ApiResponse = {
          success: false,
          message: 'Leave request not found',
          error: 'Leave request with the given ID does not exist'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Leave request retrieved successfully',
        data: leaveRequest
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getLeaveRequestById:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve leave request',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Update leave request status
   */
  static async updateLeaveRequestStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, comments } = req.body;
      const reviewerId = (req as any).user?.id;

      if (!id) {
        const response: ApiResponse = {
          success: false,
          message: 'Leave request ID is required',
          error: 'Missing leave request ID'
        };
        res.status(400).json(response);
        return;
      }

      if (!status || !['approved', 'rejected'].includes(status)) {
        const response: ApiResponse = {
          success: false,
          message: 'Valid status is required (approved or rejected)',
          error: 'Invalid status value'
        };
        res.status(400).json(response);
        return;
      }

      if (!reviewerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Reviewer ID is required',
          error: 'Missing reviewer information'
        };
        res.status(400).json(response);
        return;
      }

      const leaveRequest = await LeaveRequestService.updateLeaveRequestStatus(
        id, 
        status, 
        reviewerId, 
        comments
      );

      const response: ApiResponse = {
        success: true,
        message: `Leave request ${status} successfully`,
        data: leaveRequest
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateLeaveRequestStatus:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update leave request status',
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
      const { id } = req.params;
      const { isPaid, comments } = req.body;
      const reviewerId = (req as any).user?.id;

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

      if (!reviewerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Reviewer ID is required',
          error: 'Missing reviewer information'
        };
        res.status(400).json(response);
        return;
      }

      const leaveRequest = await LeaveRequestService.updateLeaveRequestPaidStatus(
        id,
        isPaid,
        reviewerId,
        comments
      );

      const response: ApiResponse = {
        success: true,
        message: `Leave request updated to ${isPaid ? 'paid' : 'unpaid'} successfully`,
        data: leaveRequest
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
   * Bulk update leave requests
   */
  static async bulkUpdateLeaveRequests(req: Request, res: Response): Promise<void> {
    try {
      const { requestIds, status, comments } = req.body;
      const reviewerId = (req as any).user?.id;

      if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
        const response: ApiResponse = {
          success: false,
          message: 'Request IDs array is required',
          error: 'Missing or invalid request IDs'
        };
        res.status(400).json(response);
        return;
      }

      if (!status || !['approved', 'rejected'].includes(status)) {
        const response: ApiResponse = {
          success: false,
          message: 'Valid status is required (approved or rejected)',
          error: 'Invalid status value'
        };
        res.status(400).json(response);
        return;
      }

      if (!reviewerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Reviewer ID is required',
          error: 'Missing reviewer information'
        };
        res.status(400).json(response);
        return;
      }

      const result = await LeaveRequestService.bulkUpdateLeaveRequests(
        requestIds,
        status,
        reviewerId,
        comments
      );

      const response: ApiResponse = {
        success: true,
        message: `Bulk update completed: ${result.updated} updated, ${result.failed} failed`,
        data: result
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in bulkUpdateLeaveRequests:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to bulk update leave requests',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(400).json(response);
    }
  }

  /**
   * Get leave request statistics
   */
  static async getLeaveRequestStats(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const dateRange = startDate && endDate ? {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      } : undefined;

      const stats = await LeaveRequestService.getLeaveRequestStats(dateRange);

      const response: ApiResponse = {
        success: true,
        message: 'Leave request statistics retrieved successfully',
        data: stats
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getLeaveRequestStats:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve leave request statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get leave types list
   */
  static async getLeaveTypes(req: Request, res: Response): Promise<void> {
    try {
      const leaveTypes = await LeaveRequestService.getLeaveTypes();

      const response: ApiResponse = {
        success: true,
        message: 'Leave types retrieved successfully',
        data: leaveTypes
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getLeaveTypes:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve leave types',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get recent leave requests
   */
  static async getRecentLeaveRequests(req: Request, res: Response): Promise<void> {
    try {
      const { limit = '5' } = req.query;
      const limitNum = parseInt(limit as string, 10);

      const leaveRequests = await LeaveRequestService.getRecentLeaveRequests(limitNum);

      const response: ApiResponse = {
        success: true,
        message: 'Recent leave requests retrieved successfully',
        data: leaveRequests
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getRecentLeaveRequests:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve recent leave requests',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get pending leave requests count
   */
  static async getPendingCount(req: Request, res: Response): Promise<void> {
    try {
      const stats = await LeaveRequestService.getLeaveRequestStats();
      const pendingCount = stats.pending;

      const response: ApiResponse = {
        success: true,
        message: 'Pending count retrieved successfully',
        data: { pendingCount }
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
}
