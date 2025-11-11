import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { CreateDashboardInput, UpdateDashboardInput } from '../types';
import * as DashboardService from '../services/dashboardCrudService';
import * as MetricsService from '../services/metricsService';
import * as WidgetService from '../services/widgetService';

/**
 * Dashboard Controller - Thin controller layer
 */
export class DashboardController {
  static async createDashboard(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const dashboard = await DashboardService.createDashboard(userId, req.body);
      return res.status(201).json({ success: true, data: dashboard });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create dashboard',
      });
    }
  }

  static async getDashboardById(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { id } = req.params;
      const dashboard = await DashboardService.getDashboardById(id, userId);
      return res.json({ success: true, data: dashboard });
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: error instanceof Error ? error.message : 'Dashboard not found',
      });
    }
  }

  static async getWorkspaceDashboards(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { workspaceId } = req.params;
      const dashboards = await DashboardService.getWorkspaceDashboards(workspaceId, userId);
      return res.json({ success: true, data: dashboards });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch dashboards',
      });
    }
  }

  static async updateDashboard(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { id } = req.params;
      const dashboard = await DashboardService.updateDashboard(id, userId, req.body);
      return res.json({ success: true, data: dashboard });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update dashboard',
      });
    }
  }

  static async deleteDashboard(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { id } = req.params;
      await DashboardService.deleteDashboard(id, userId);
      return res.json({ success: true, message: 'Dashboard deleted' });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete dashboard',
      });
    }
  }

  static async shareDashboard(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { id } = req.params;
      const { sharedWith } = req.body;
      
      if (!Array.isArray(sharedWith)) {
        return res.status(400).json({
          success: false,
          message: 'sharedWith must be an array',
        });
      }

      const dashboard = await DashboardService.shareDashboard(id, userId, sharedWith);
      return res.json({ success: true, data: dashboard });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to share dashboard',
      });
    }
  }

  static async getBoardMetrics(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { boardId } = req.params;
      const filters = {
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        status: req.query.status ? (req.query.status as string).split(',') : undefined,
      };

      const metrics = await MetricsService.calculateBoardMetrics(boardId, filters);
      return res.json({ success: true, data: metrics });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to calculate metrics',
      });
    }
  }

  static async calculateWidgetData(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const widget = req.body;
      const data = await WidgetService.calculateWidgetData(widget, userId);
      return res.json({ success: true, data });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to calculate widget data',
      });
    }
  }
}

