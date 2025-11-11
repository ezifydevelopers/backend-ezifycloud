// Approved Items Controller - API endpoints for approved items

import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { ApprovedItemsService } from '../services/approvedItemsService';

export class ApprovedItemsController {
  /**
   * Get approved items
   * GET /api/approvals/approved-items
   */
  static async getApprovedItems(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const workspaceId = req.query.workspaceId as string | undefined;
      const boardId = req.query.boardId as string | undefined;
      const filter = req.query.filter as 'fully_approved' | 'partially_approved' | 'archived' | 'all' | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string | undefined;

      const result = await ApprovedItemsService.getApprovedItems(userId, {
        workspaceId,
        boardId,
        filter: filter || 'all',
        page,
        limit,
        search,
      });

      return res.json({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error: any) {
      console.error('Error fetching approved items:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch approved items',
        error: error.message,
      });
    }
  }

  /**
   * Move item to different board
   * POST /api/approvals/items/:itemId/move
   */
  static async moveItemToBoard(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { itemId } = req.params;
      const { targetBoardId } = req.body;

      if (!targetBoardId) {
        return res.status(400).json({
          success: false,
          message: 'Target board ID is required',
        });
      }

      await ApprovedItemsService.moveItemToBoard(itemId, targetBoardId, userId);

      return res.json({
        success: true,
        message: 'Item moved successfully',
      });
    } catch (error: any) {
      console.error('Error moving item:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to move item',
        error: error.message,
      });
    }
  }

  /**
   * Archive approved item
   * POST /api/approvals/items/:itemId/archive
   */
  static async archiveItem(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { itemId } = req.params;

      await ApprovedItemsService.archiveItem(itemId, userId);

      return res.json({
        success: true,
        message: 'Item archived successfully',
      });
    } catch (error: any) {
      console.error('Error archiving item:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to archive item',
        error: error.message,
      });
    }
  }

  /**
   * Restore archived item
   * POST /api/approvals/items/:itemId/restore
   */
  static async restoreItem(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { itemId } = req.params;

      await ApprovedItemsService.restoreItem(itemId, userId);

      return res.json({
        success: true,
        message: 'Item restored successfully',
      });
    } catch (error: any) {
      console.error('Error restoring item:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to restore item',
        error: error.message,
      });
    }
  }
}



