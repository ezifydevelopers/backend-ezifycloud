import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboardService';
import { ApiResponse } from '../../../types';

export class DashboardController {
  /**
   * Get admin dashboard statistics
   */
  static async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, department } = req.query;

      const dateRange = startDate && endDate ? {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      } : undefined;

      const stats = await DashboardService.getDashboardStats(dateRange);

      const response: ApiResponse = {
        success: true,
        message: 'Dashboard statistics retrieved successfully',
        data: stats
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve dashboard statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get quick stats for dashboard cards
   */
  static async getQuickStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await DashboardService.getQuickStats();

      const response: ApiResponse = {
        success: true,
        message: 'Quick statistics retrieved successfully',
        data: stats
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

  /**
   * Get department statistics
   */
  static async getDepartmentStats(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const dateRange = startDate && endDate ? {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      } : {
        startDate: new Date(new Date().getFullYear(), 0, 1),
        endDate: new Date()
      };

      const stats = await DashboardService.getDashboardStats(dateRange);

      const response: ApiResponse = {
        success: true,
        message: 'Department statistics retrieved successfully',
        data: stats.departmentStats
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getDepartmentStats:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve department statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get recent activities
   */
  static async getRecentActivities(req: Request, res: Response): Promise<void> {
    try {
      const { limit = '10' } = req.query;
      const limitNum = parseInt(limit as string, 10);

      const stats = await DashboardService.getDashboardStats();
      const activities = stats.recentActivities.slice(0, limitNum);

      const response: ApiResponse = {
        success: true,
        message: 'Recent activities retrieved successfully',
        data: activities
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getRecentActivities:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve recent activities',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get monthly leave trend
   */
  static async getMonthlyLeaveTrend(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const dateRange = startDate && endDate ? {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      } : {
        startDate: new Date(new Date().getFullYear(), 0, 1),
        endDate: new Date()
      };

      const stats = await DashboardService.getDashboardStats(dateRange);

      const response: ApiResponse = {
        success: true,
        message: 'Monthly leave trend retrieved successfully',
        data: stats.monthlyLeaveTrend
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getMonthlyLeaveTrend:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve monthly leave trend',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get system overview
   */
  static async getSystemOverview(req: Request, res: Response): Promise<void> {
    try {
      const stats = await DashboardService.getDashboardStats();

      const overview = {
        employees: {
          total: stats.totalEmployees,
          active: stats.activeEmployees,
          inactive: stats.totalEmployees - stats.activeEmployees
        },
        leaveRequests: {
          total: stats.pendingLeaveRequests + stats.approvedLeaveRequests + stats.rejectedLeaveRequests,
          pending: stats.pendingLeaveRequests,
          approved: stats.approvedLeaveRequests,
          rejected: stats.rejectedLeaveRequests
        },
        leaveDays: {
          total: stats.totalLeaveDays,
          used: stats.usedLeaveDays,
          remaining: stats.totalLeaveDays - stats.usedLeaveDays
        },
        upcomingHolidays: stats.upcomingHolidays
      };

      const response: ApiResponse = {
        success: true,
        message: 'System overview retrieved successfully',
        data: overview
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getSystemOverview:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve system overview',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }
}
