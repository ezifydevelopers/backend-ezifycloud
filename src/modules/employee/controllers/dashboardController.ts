import { Request, Response } from 'express';
import { EmployeeDashboardService } from '../services/dashboardService';
import { ApiResponse } from '../types';

export class EmployeeDashboardController {
  /**
   * Get employee dashboard statistics
   */
  static async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;
      const { startDate, endDate } = req.query;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const dateRange = startDate && endDate ? {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      } : undefined;

      const stats = await EmployeeDashboardService.getDashboardStats(employeeId, dateRange);

      const response: ApiResponse = {
        success: true,
        message: 'Employee dashboard statistics retrieved successfully',
        data: stats
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve employee dashboard statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get personal information
   */
  static async getPersonalInfo(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const stats = await EmployeeDashboardService.getDashboardStats(employeeId);
      const personalInfo = stats.personalInfo;

      const response: ApiResponse = {
        success: true,
        message: 'Personal information retrieved successfully',
        data: personalInfo
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getPersonalInfo:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve personal information',
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
      const employeeId = (req as any).user?.id;
      const { startDate, endDate } = req.query;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const dateRange = startDate && endDate ? {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      } : {
        startDate: new Date(new Date().getFullYear(), 0, 1),
        endDate: new Date()
      };

      const stats = await EmployeeDashboardService.getDashboardStats(employeeId, dateRange);
      const leaveBalance = stats.leaveBalance;

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

  /**
   * Get recent leave requests
   */
  static async getRecentLeaveRequests(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;
      const { limit = '5' } = req.query;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const stats = await EmployeeDashboardService.getDashboardStats(employeeId);
      const recentRequests = stats.recentRequests.slice(0, parseInt(limit as string, 10));

      const response: ApiResponse = {
        success: true,
        message: 'Recent leave requests retrieved successfully',
        data: recentRequests
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
   * Get upcoming holidays
   */
  static async getUpcomingHolidays(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;
      const { limit = '5' } = req.query;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const stats = await EmployeeDashboardService.getDashboardStats(employeeId);
      const upcomingHolidays = stats.upcomingHolidays.slice(0, parseInt(limit as string, 10));

      const response: ApiResponse = {
        success: true,
        message: 'Upcoming holidays retrieved successfully',
        data: upcomingHolidays
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getUpcomingHolidays:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve upcoming holidays',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get team information
   */
  static async getTeamInfo(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const stats = await EmployeeDashboardService.getDashboardStats(employeeId);
      const teamInfo = stats.teamInfo;

      const response: ApiResponse = {
        success: true,
        message: 'Team information retrieved successfully',
        data: teamInfo
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getTeamInfo:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve team information',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get performance metrics
   */
  static async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const stats = await EmployeeDashboardService.getDashboardStats(employeeId);
      const performance = stats.performance;

      const response: ApiResponse = {
        success: true,
        message: 'Performance metrics retrieved successfully',
        data: performance
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getPerformanceMetrics:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve performance metrics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get notifications
   */
  static async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;
      const { limit = '10' } = req.query;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const stats = await EmployeeDashboardService.getDashboardStats(employeeId);
      const notifications = stats.notifications.slice(0, parseInt(limit as string, 10));

      const response: ApiResponse = {
        success: true,
        message: 'Notifications retrieved successfully',
        data: notifications
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getNotifications:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve notifications',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get quick stats
   */
  static async getQuickStats(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;
      const { startDate, endDate } = req.query;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const dateRange = startDate && endDate ? {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      } : {
        startDate: new Date(new Date().getFullYear(), 0, 1),
        endDate: new Date()
      };

      const stats = await EmployeeDashboardService.getDashboardStats(employeeId, dateRange);
      const quickStats = stats.quickStats;

      const response: ApiResponse = {
        success: true,
        message: 'Quick statistics retrieved successfully',
        data: quickStats
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getQuickStats:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve quick statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }
}
