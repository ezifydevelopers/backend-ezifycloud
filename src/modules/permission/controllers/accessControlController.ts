import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { RowLevelSecurityService, RowFilterOptions } from '../services/rowLevelSecurityService';
import { ColumnVisibilityService } from '../services/columnVisibilityService';

export class AccessControlController {
  /**
   * Get filtered items with row-level security
   */
  static async getFilteredItems(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { boardId } = req.params;
      const {
        page,
        limit,
        search,
        status,
        filterBy,
        departmentId,
        customFilters,
      } = req.query;

      const result = await RowLevelSecurityService.getFilteredItems(boardId, userId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string | undefined,
        status: status as string | undefined,
        filterBy: filterBy as RowFilterOptions['filterBy'],
        departmentId: departmentId as string | undefined,
        customFilters: customFilters ? JSON.parse(customFilters as string) : undefined,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error getting filtered items:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get filtered items',
      });
    }
  }

  /**
   * Get assigned items for user
   */
  static async getAssignedItems(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { boardId } = req.params;
      const { page, limit } = req.query;

      const result = await RowLevelSecurityService.getAssignedItems(boardId, userId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error getting assigned items:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get assigned items',
      });
    }
  }

  /**
   * Get visible columns for user
   */
  static async getVisibleColumns(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { boardId } = req.params;
      const { itemId } = req.query; // Optional item context for conditional visibility

      const columns = await ColumnVisibilityService.getColumnsWithVisibility(
        boardId,
        userId,
        itemId as string | undefined
      );

      return res.json({
        success: true,
        data: columns,
      });
    } catch (error) {
      console.error('Error getting visible columns:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get visible columns',
      });
    }
  }

  /**
   * Check if user can view a specific column
   */
  static async canViewColumn(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { columnId } = req.params;
      const { itemId } = req.query; // Optional item context

      const canView = await ColumnVisibilityService.canViewColumn(
        columnId,
        userId,
        itemId as string | undefined
      );

      return res.json({
        success: true,
        data: { canView },
      });
    } catch (error) {
      console.error('Error checking column visibility:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to check column visibility',
      });
    }
  }
}

