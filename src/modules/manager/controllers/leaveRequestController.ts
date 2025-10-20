import { Request, Response } from 'express';
import { LeaveRequestService } from '../services/leaveRequestService';
import { ApiResponse } from '../../../types';
import { LeaveRequestFormData, LeaveRequestFilters, LeaveHistoryFilters } from '../types';

export class LeaveRequestController {
  /**
   * Create a new leave request
   */
  static async createLeaveRequest(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const formData: LeaveRequestFormData = req.body;

      console.log('🔍 ManagerLeaveRequestController: Received data:', {
        managerId,
        formData,
        body: req.body,
        user: (req as any).user
      });

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      const leaveRequest = await LeaveRequestService.createLeaveRequest(managerId, formData);

      const response: ApiResponse = {
        success: true,
        message: 'Leave request created successfully',
        data: leaveRequest
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error in createLeaveRequest:', error);
      
      // Use the specific error message from the service
      const errorMessage = error instanceof Error ? error.message : 'Failed to create leave request';
      
      const response: ApiResponse = {
        success: false,
        message: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(400).json(response);
    }
  }

  /**
   * Get leave requests with filtering and pagination
   */
  static async getLeaveRequests(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const filters: LeaveRequestFilters = {
        status: req.query.status as 'pending' | 'approved' | 'rejected' | 'all',
        leaveType: req.query.leaveType as string,
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

      const result = await LeaveRequestService.getLeaveRequests(managerId, filters);

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

      const leaveRequest = await LeaveRequestService.getLeaveRequestById(managerId, id);

      if (!leaveRequest) {
        const response: ApiResponse = {
          success: false,
          message: 'Leave request not found',
          error: 'Leave request does not exist or does not belong to this manager'
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
   * Update leave request
   */
  static async updateLeaveRequest(req: Request, res: Response): Promise<void> {
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

      const leaveRequest = await LeaveRequestService.updateLeaveRequest(managerId, id, updateData);

      if (!leaveRequest) {
        const response: ApiResponse = {
          success: false,
          message: 'Leave request not found',
          error: 'Leave request does not exist or does not belong to this manager'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Leave request updated successfully',
        data: leaveRequest
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateLeaveRequest:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update leave request',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Cancel leave request
   */
  static async cancelLeaveRequest(req: Request, res: Response): Promise<void> {
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

      const leaveRequest = await LeaveRequestService.cancelLeaveRequest(managerId, id);

      if (!leaveRequest) {
        const response: ApiResponse = {
          success: false,
          message: 'Leave request not found',
          error: 'Leave request does not exist or does not belong to this manager'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Leave request cancelled successfully',
        data: leaveRequest
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in cancelLeaveRequest:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to cancel leave request',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get leave history with filtering and pagination
   */
  static async getLeaveHistory(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const filters: LeaveHistoryFilters = {
        status: req.query.status as 'pending' | 'approved' | 'rejected' | 'all',
        leaveType: req.query.leaveType as string,
        year: req.query.year ? parseInt(req.query.year as string) : undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: req.query.sortBy as string || 'submittedAt',
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

      const result = await LeaveRequestService.getLeaveHistory(managerId, filters);

      const response: ApiResponse = {
        success: true,
        message: 'Leave history retrieved successfully',
        data: result.leaveHistory,
        pagination: result.pagination
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getLeaveHistory:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve leave history',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get recent leave requests
   */
  static async getRecentRequests(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const limit = parseInt(req.query.limit as string) || 5;

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      const recentRequests = await LeaveRequestService.getRecentRequests(managerId, limit);

      const response: ApiResponse = {
        success: true,
        message: 'Recent leave requests retrieved successfully',
        data: recentRequests
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getRecentRequests:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve recent leave requests',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get leave balance
   */
  static async getLeaveBalance(req: Request, res: Response): Promise<void> {
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

      const leaveBalance = await LeaveRequestService.getLeaveBalance(managerId);

      const response: ApiResponse = {
        success: true,
        message: 'Leave balance retrieved successfully',
        data: leaveBalance
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getLeaveBalance:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve leave balance',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }
}
