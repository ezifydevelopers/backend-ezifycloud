import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { ViewService } from '../services/viewService';
import { ViewType } from '@prisma/client';

export class ViewController {
  /**
   * Get all views for a board
   * GET /api/boards/:boardId/views
   */
  static async getBoardViews(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { boardId } = req.params;
      const views = await ViewService.getBoardViews(boardId, userId);

      return res.json({
        success: true,
        data: views,
      });
    } catch (error) {
      console.error('Error fetching views:', error);
      const statusCode = (error as any)?.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch views',
      });
    }
  }

  /**
   * Get a view by ID
   * GET /api/boards/views/:id
   */
  static async getViewById(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { id } = req.params;
      const view = await ViewService.getViewById(id, userId);

      return res.json({
        success: true,
        data: view,
      });
    } catch (error) {
      console.error('Error fetching view:', error);
      const statusCode = (error as any)?.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch view',
      });
    }
  }

  /**
   * Create a new view
   * POST /api/boards/:boardId/views
   */
  static async createView(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { boardId } = req.params;
      const { name, type, settings, isDefault, description, isShared } = req.body;

      if (!name || !type) {
        return res.status(400).json({
          success: false,
          message: 'Name and type are required',
        });
      }

      const view = await ViewService.createView(
        {
          boardId,
          name,
          type: type as ViewType,
          settings,
          isDefault,
          description,
          isShared,
        },
        userId
      );

      return res.status(201).json({
        success: true,
        data: view,
      });
    } catch (error) {
      console.error('Error creating view:', error);
      const statusCode = (error as any)?.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create view',
      });
    }
  }

  /**
   * Update a view
   * PUT /api/boards/views/:id
   */
  static async updateView(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { id } = req.params;
      const { name, settings, isDefault, description, isShared } = req.body;

      const view = await ViewService.updateView(
        id,
        {
          name,
          settings,
          isDefault,
          description,
          isShared,
        },
        userId
      );

      return res.json({
        success: true,
        data: view,
      });
    } catch (error) {
      console.error('Error updating view:', error);
      const statusCode = (error as any)?.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update view',
      });
    }
  }

  /**
   * Delete a view
   * DELETE /api/boards/views/:id
   */
  static async deleteView(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { id } = req.params;
      await ViewService.deleteView(id, userId);

      return res.json({
        success: true,
        message: 'View deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting view:', error);
      const statusCode = (error as any)?.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete view',
      });
    }
  }

  /**
   * Set a view as default
   * POST /api/boards/views/:id/set-default
   */
  static async setDefaultView(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { id } = req.params;
      const view = await ViewService.setDefaultView(id, userId);

      return res.json({
        success: true,
        data: view,
      });
    } catch (error) {
      console.error('Error setting default view:', error);
      const statusCode = (error as any)?.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to set default view',
      });
    }
  }
}

