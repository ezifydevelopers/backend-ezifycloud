import { Request, Response } from 'express';
import { ManagerDashboardService } from '../services/dashboardService';
import { ApiResponse } from '../../../types';

export class ManagerDashboardController {
  /**
   * Get manager dashboard statistics
   */
  static async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const { startDate, endDate, department } = req.query;

      if (!managerId) {
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

      const stats = await ManagerDashboardService.getDashboardStats(managerId, dateRange);

      const response: ApiResponse = {
        success: true,
        message: 'Manager dashboard statistics retrieved successfully',
        data: stats
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve manager dashboard statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get quick stats for manager dashboard
   */
  static async getQuickStats(req: Request, res: Response): Promise<void> {
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

      const stats = await ManagerDashboardService.getQuickStats(managerId);

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

      const stats = await ManagerDashboardService.getDashboardStats(managerId);
      const performance = stats.teamPerformance;

      const response: ApiResponse = {
        success: true,
        message: 'Team performance metrics retrieved successfully',
        data: performance
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
   * Get upcoming leaves for team
   */
  static async getUpcomingLeaves(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
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

      const stats = await ManagerDashboardService.getDashboardStats(managerId);
      const upcomingLeaves = stats.upcomingLeaves.slice(0, parseInt(limit as string, 10));

      const response: ApiResponse = {
        success: true,
        message: 'Upcoming leaves retrieved successfully',
        data: upcomingLeaves
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getUpcomingLeaves:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve upcoming leaves',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get recent activities for manager
   */
  static async getRecentActivities(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const { limit = '10' } = req.query;

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      const stats = await ManagerDashboardService.getDashboardStats(managerId);
      const activities = stats.recentActivities.slice(0, parseInt(limit as string, 10));

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
   * Get team leave balance summary
   */
  static async getTeamLeaveBalance(req: Request, res: Response): Promise<void> {
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

      const stats = await ManagerDashboardService.getDashboardStats(managerId);
      const leaveBalance = stats.teamLeaveBalance;

      const response: ApiResponse = {
        success: true,
        message: 'Team leave balance retrieved successfully',
        data: leaveBalance
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getTeamLeaveBalance:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve team leave balance',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get department statistics for manager
   */
  static async getDepartmentStats(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const { startDate, endDate } = req.query;

      if (!managerId) {
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
      } : {
        startDate: new Date(new Date().getFullYear(), 0, 1),
        endDate: new Date()
      };

      const stats = await ManagerDashboardService.getDashboardStats(managerId, dateRange);
      const departmentStats = stats.departmentStats;

      const response: ApiResponse = {
        success: true,
        message: 'Department statistics retrieved successfully',
        data: departmentStats
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
   * Get manager profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
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

      const profile = await ManagerDashboardService.getProfile(managerId);

      const response: ApiResponse = {
        success: true,
        message: 'Profile retrieved successfully',
        data: profile
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getProfile:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Update manager profile
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const profileData = req.body;

      if (!managerId) {
        const response: ApiResponse = {
          success: false,
          message: 'Manager ID is required',
          error: 'Missing manager information'
        };
        res.status(400).json(response);
        return;
      }

      const updatedProfile = await ManagerDashboardService.updateProfile(managerId, profileData);

      const response: ApiResponse = {
        success: true,
        message: 'Profile updated successfully',
        data: updatedProfile
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateProfile:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }
}
