import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { AnalyticsService } from '../services/analyticsService';
import { AnalyticsFilters } from '../types';

export class AnalyticsController {
  /**
   * Get key metrics
   */
  static async getKeyMetrics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const {
        workspaceId,
        boardId,
        dateFrom,
        dateTo,
        status,
      } = req.query;

      const filters: AnalyticsFilters = {
        workspaceId: workspaceId as string,
        boardId: boardId as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        status: status ? (Array.isArray(status) ? status as string[] : [status as string]) : undefined,
      };

      const metrics = await AnalyticsService.getKeyMetrics(filters);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      console.error('Error fetching key metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch key metrics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get trends
   */
  static async getTrends(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const {
        workspaceId,
        boardId,
        dateFrom,
        dateTo,
        status,
      } = req.query;

      const filters: AnalyticsFilters = {
        workspaceId: workspaceId as string,
        boardId: boardId as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        status: status ? (Array.isArray(status) ? status as string[] : [status as string]) : undefined,
      };

      const trends = await AnalyticsService.getTrends(filters);

      res.json({
        success: true,
        data: trends,
      });
    } catch (error) {
      console.error('Error fetching trends:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch trends',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get complete analytics
   */
  static async getAnalytics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const {
        workspaceId,
        boardId,
        dateFrom,
        dateTo,
        status,
      } = req.query;

      const filters: AnalyticsFilters = {
        workspaceId: workspaceId as string,
        boardId: boardId as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        status: status ? (Array.isArray(status) ? status as string[] : [status as string]) : undefined,
      };

      const analytics = await AnalyticsService.getAnalytics(filters);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

