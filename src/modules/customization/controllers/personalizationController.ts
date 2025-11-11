import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { PersonalizationService } from '../services/personalizationService';

export class PersonalizationController {
  /**
   * Add favorite board
   */
  static async addFavorite(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { boardId } = req.body;
      if (!boardId) {
        res.status(400).json({ success: false, message: 'Board ID is required' });
        return;
      }

      const favorite = await PersonalizationService.addFavoriteBoard(userId, boardId);
      res.json({ success: true, data: favorite });
    } catch (error) {
      console.error('Error adding favorite:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add favorite',
      });
    }
  }

  /**
   * Remove favorite board
   */
  static async removeFavorite(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { boardId } = req.params;
      await PersonalizationService.removeFavoriteBoard(userId, boardId);
      res.json({ success: true, message: 'Favorite removed' });
    } catch (error) {
      console.error('Error removing favorite:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to remove favorite',
      });
    }
  }

  /**
   * Get favorite boards
   */
  static async getFavorites(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const favorites = await PersonalizationService.getFavoriteBoards(userId);
      res.json({ success: true, data: favorites });
    } catch (error) {
      console.error('Error getting favorites:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get favorites',
      });
    }
  }

  /**
   * Reorder favorites
   */
  static async reorderFavorites(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { boardIds } = req.body;
      if (!Array.isArray(boardIds)) {
        res.status(400).json({ success: false, message: 'boardIds must be an array' });
        return;
      }

      await PersonalizationService.reorderFavorites(userId, boardIds);
      res.json({ success: true, message: 'Favorites reordered' });
    } catch (error) {
      console.error('Error reordering favorites:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reorder favorites',
      });
    }
  }

  /**
   * Track board access
   */
  static async trackAccess(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { boardId } = req.body;
      if (!boardId) {
        res.status(400).json({ success: false, message: 'Board ID is required' });
        return;
      }

      await PersonalizationService.trackBoardAccess(userId, boardId);
      res.json({ success: true, message: 'Access tracked' });
    } catch (error) {
      console.error('Error tracking access:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to track access',
      });
    }
  }

  /**
   * Get recent boards
   */
  static async getRecentBoards(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const recent = await PersonalizationService.getRecentBoards(userId, limit);
      res.json({ success: true, data: recent });
    } catch (error) {
      console.error('Error getting recent boards:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get recent boards',
      });
    }
  }

  /**
   * Create custom view
   */
  static async createCustomView(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { boardId, name, viewType, config, description } = req.body;
      if (!boardId || !name || !viewType) {
        res.status(400).json({ success: false, message: 'Missing required fields' });
        return;
      }

      const view = await PersonalizationService.createCustomView(
        userId,
        boardId,
        name,
        viewType,
        config || {},
        description
      );
      res.json({ success: true, data: view });
    } catch (error) {
      console.error('Error creating custom view:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create custom view',
      });
    }
  }

  /**
   * Get custom views
   */
  static async getCustomViews(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { boardId } = req.params;
      const views = await PersonalizationService.getCustomViews(userId, boardId);
      res.json({ success: true, data: views });
    } catch (error) {
      console.error('Error getting custom views:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get custom views',
      });
    }
  }

  /**
   * Update custom view
   */
  static async updateCustomView(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { viewId } = req.params;
      const updates = req.body;
      const view = await PersonalizationService.updateCustomView(viewId, updates);
      res.json({ success: true, data: view });
    } catch (error) {
      console.error('Error updating custom view:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update custom view',
      });
    }
  }

  /**
   * Delete custom view
   */
  static async deleteCustomView(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { viewId } = req.params;
      await PersonalizationService.deleteCustomView(viewId);
      res.json({ success: true, message: 'Custom view deleted' });
    } catch (error) {
      console.error('Error deleting custom view:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete custom view',
      });
    }
  }

  /**
   * Get user preferences
   */
  static async getPreferences(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const preferences = await PersonalizationService.getUserPreferences(userId);
      res.json({ success: true, data: preferences });
    } catch (error) {
      console.error('Error getting preferences:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get preferences',
      });
    }
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const preferences = req.body;
      const updated = await PersonalizationService.updateUserPreferences(userId, preferences);
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Error updating preferences:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update preferences',
      });
    }
  }
}

