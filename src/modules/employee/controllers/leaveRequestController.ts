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
      const employeeId = (req as any).user?.id;
      const formData: LeaveRequestFormData = req.body;

      console.log('🔍 LeaveRequestController: Received data:', {
        employeeId,
        formData,
        body: req.body,
        user: (req as any).user
      });

      // Debug: Log validation details
      console.log('🔍 LeaveRequestController: Validation details:', {
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        isHalfDay: formData.isHalfDay,
        halfDayPeriod: formData.halfDayPeriod,
        emergencyContact: formData.emergencyContact,
        workHandover: formData.workHandover,
        attachments: formData.attachments
      });

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const leaveRequest = await LeaveRequestService.createLeaveRequest(employeeId, formData);

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
      const employeeId = (req as any).user?.id;
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

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const result = await LeaveRequestService.getLeaveRequests(employeeId, filters);

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
      const employeeId = (req as any).user?.id;
      const { id } = req.params;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
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

      const leaveRequest = await LeaveRequestService.getLeaveRequestById(employeeId, id);

      if (!leaveRequest) {
        const response: ApiResponse = {
          success: false,
          message: 'Leave request not found',
          error: 'Leave request with the given ID does not exist or does not belong to you'
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
      const employeeId = (req as any).user?.id;
      const { id } = req.params;
      const updateData = req.body;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
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

      const leaveRequest = await LeaveRequestService.updateLeaveRequest(employeeId, id, updateData);

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

      res.status(400).json(response);
    }
  }

  /**
   * Cancel leave request
   */
  static async cancelLeaveRequest(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;
      const { id } = req.params;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
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

      const success = await LeaveRequestService.cancelLeaveRequest(employeeId, id);

      if (!success) {
        const response: ApiResponse = {
          success: false,
          message: 'Failed to cancel leave request',
          error: 'Leave request could not be cancelled'
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Leave request cancelled successfully',
        data: { cancelled: true }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in cancelLeaveRequest:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to cancel leave request',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(400).json(response);
    }
  }

  /**
   * Get leave history
   */
  static async getLeaveHistory(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;
      const filters: LeaveHistoryFilters = {
        year: req.query.year ? parseInt(req.query.year as string) : undefined,
        leaveType: req.query.leaveType as string,
        status: req.query.status as 'pending' | 'approved' | 'rejected' | 'all',
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
      };

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const result = await LeaveRequestService.getLeaveHistory(employeeId, filters);

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
   * Get leave history summary
   */
  static async getLeaveHistorySummary(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;
      const { year } = req.query;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const filters: LeaveHistoryFilters = {
        year: year ? parseInt(year as string) : undefined,
        page: 1,
        limit: 1 // We only need the summary
      };

      const result = await LeaveRequestService.getLeaveHistory(employeeId, filters);

      const response: ApiResponse = {
        success: true,
        message: 'Leave history summary retrieved successfully',
        data: result.summary
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getLeaveHistorySummary:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve leave history summary',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }
}
