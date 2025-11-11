import { Request, Response } from 'express';
import { BoardService } from '../services/boardService';
import { ApiResponse } from '@/types';

export class BoardController {
  /**
   * Create a new board
   */
  static async createBoard(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const board = await BoardService.createBoard(userId, req.body);

      const response: ApiResponse = {
        success: true,
        message: 'Board created successfully',
        data: board,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating board:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to create board',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get board by ID
   */
  static async getBoardById(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const board = await BoardService.getBoardById(id, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Board retrieved successfully',
        data: board,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching board:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to fetch board',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(404).json(response);
    }
  }

  /**
   * Get workspace boards
   */
  static async getWorkspaceBoards(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { workspaceId } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;
      const type = req.query.type as string | undefined;
      const isArchived = req.query.isArchived === 'true' ? true : req.query.isArchived === 'false' ? false : undefined;

      const sortBy = (req.query.sortBy as 'name' | 'updatedAt' | 'createdAt') || undefined;
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || undefined;

      const result = await BoardService.getWorkspaceBoards(workspaceId, userId, {
        page,
        limit,
        search,
        type: type as any,
        isArchived,
        sortBy,
        sortOrder,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Boards retrieved successfully',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching boards:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Extract detailed error message
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        // Check if it's a Prisma error
        if ((error as any).code) {
          errorMessage = `Database error (${(error as any).code}): ${error.message}`;
        }
      }
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to fetch boards',
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          } : undefined,
        }),
      };
      res.status(500).json(response);
    }
  }

  /**
   * Update board
   */
  static async updateBoard(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const board = await BoardService.updateBoard(id, userId, req.body);

      const response: ApiResponse = {
        success: true,
        message: 'Board updated successfully',
        data: board,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error updating board:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update board',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Delete board
   */
  static async deleteBoard(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      await BoardService.deleteBoard(id, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Board deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error deleting board:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to delete board',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get board columns
   */
  static async getBoardColumns(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const columns = await BoardService.getBoardColumns(id, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Columns retrieved successfully',
        data: columns,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching columns:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to fetch columns',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(404).json(response);
    }
  }

  /**
   * Create column
   */
  static async createColumn(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { boardId } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const column = await BoardService.createColumn(boardId, userId, req.body);

      const response: ApiResponse = {
        success: true,
        message: 'Column created successfully',
        data: column,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating column:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to create column',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Update column
   */
  static async updateColumn(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const column = await BoardService.updateColumn(id, userId, req.body);

      const response: ApiResponse = {
        success: true,
        message: 'Column updated successfully',
        data: column,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error updating column:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update column',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Delete column
   */
  static async deleteColumn(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      await BoardService.deleteColumn(id, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Column deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error deleting column:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to delete column',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get board items
   */
  static async getBoardItems(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { boardId } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;
      const sortBy = req.query.sortBy as string | undefined;
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

      const result = await BoardService.getBoardItems(boardId, userId, {
        page,
        limit,
        search,
        status,
        sortBy,
        sortOrder,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Items retrieved successfully',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching items:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to fetch items',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(500).json(response);
    }
  }

  /**
   * Create item
   */
  static async createItem(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { boardId } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const item = await BoardService.createItem(boardId, userId, req.body);

      const response: ApiResponse = {
        success: true,
        message: 'Item created successfully',
        data: item,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating item:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to create item',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Update item
   */
  static async updateItem(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const item = await BoardService.updateItem(id, userId, req.body);

      const response: ApiResponse = {
        success: true,
        message: 'Item updated successfully',
        data: item,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error updating item:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update item',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get item activities
   */
  static async getItemActivities(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await BoardService.getItemActivities(id, userId, { page, limit });

      const response: ApiResponse = {
        success: true,
        message: 'Activities retrieved successfully',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching item activities:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to fetch activities',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Delete item
   */
  static async deleteItem(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      await BoardService.deleteItem(id, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Item deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error deleting item:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to delete item',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Reset invoice number counter for a column
   */
  static async resetInvoiceCounter(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;
      const { resetTo } = req.body;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const { resetInvoiceCounter: resetCounter } = await import('../services/invoiceNumberService');
      await resetCounter(id, resetTo);

      const response: ApiResponse = {
        success: true,
        message: 'Invoice counter reset successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error resetting invoice counter:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to reset invoice counter',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Preview next invoice number (without generating)
   */
  static async previewInvoiceNumber(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      // We'll generate a preview by getting the current settings and showing what the next number would be
      // without actually updating the counter
      const prisma = (await import('../../../lib/prisma')).default;
      
      const column = await prisma.column.findUnique({
        where: { id },
      });

      if (!column || column.type !== 'AUTO_NUMBER') {
        const response: ApiResponse = {
          success: false,
          message: 'Column is not an AUTO_NUMBER type',
          error: 'Invalid column type',
        };
        res.status(400).json(response);
        return;
      }

      const settings = (column.settings as any) || {};
      const {
        format = '{number}',
        prefix = '',
        suffix = '',
        startNumber = 1,
        numberPadding = 0,
        lastCounter = 0,
      } = settings;

      // Calculate next number
      const nextNumber = Math.max(startNumber, lastCounter + 1);
      const paddedNumber = numberPadding > 0
        ? String(nextNumber).padStart(numberPadding, '0')
        : String(nextNumber);

      const now = new Date();
      const preview = format
        .replace(/{prefix}/g, prefix || '')
        .replace(/{number}/g, paddedNumber)
        .replace(/{suffix}/g, suffix || '')
        .replace(/{date:YYYY}/g, now.getFullYear().toString())
        .replace(/{date:MM}/g, String(now.getMonth() + 1).padStart(2, '0'))
        .replace(/{date:DD}/g, String(now.getDate()).padStart(2, '0'))
        .replace(/{date:YY}/g, String(now.getFullYear()).slice(-2));

      const response: ApiResponse = {
        success: true,
        message: 'Preview generated successfully',
        data: { preview },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error previewing invoice number:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to preview invoice number',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }
}

