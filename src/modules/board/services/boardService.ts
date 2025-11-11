import prisma from '../../../lib/prisma';
import { BoardType, ColumnType, WorkspaceRole, Prisma } from '@prisma/client';
import {
  CreateBoardInput,
  UpdateBoardInput,
  CreateColumnInput,
  UpdateColumnInput,
  CreateItemInput,
  UpdateItemInput,
} from '../types';

export class BoardService {
  /**
   * Check if user has access to workspace
   */
  private static async checkWorkspaceAccess(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceRole | null> {
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
      },
      select: {
        role: true,
      },
    });
    if (member?.role) return member.role;
    // If not a member, allow platform admins to view/edit based on global role
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === 'admin') return WorkspaceRole.admin;
    return null;
  }

  /**
   * Check if user can edit board (admin, owner, or finance roles)
   */
  private static canEditBoard(role: WorkspaceRole | null): boolean {
    if (!role) return false;
    return role === WorkspaceRole.owner || 
           role === WorkspaceRole.admin || 
           role === WorkspaceRole.finance || 
           role === WorkspaceRole.member;
  }

  /**
   * Check if user can view board
   */
  private static canViewBoard(role: WorkspaceRole | null): boolean {
    return role !== null;
  }

  /**
   * Create a new board
   */
  static async createBoard(
    userId: string,
    data: CreateBoardInput
  ): Promise<any> {
    // Check workspace access
    const role = await this.checkWorkspaceAccess(data.workspaceId, userId);
    if (!this.canEditBoard(role)) {
      throw new Error('You do not have permission to create boards in this workspace');
    }

    const board = await prisma.board.create({
      data: {
        workspaceId: data.workspaceId,
        name: data.name,
        type: data.type,
        description: data.description,
        color: data.color,
        icon: data.icon,
        permissions: (data.permissions || {}) as Prisma.InputJsonValue,
        settings: (data.settings || {}) as Prisma.InputJsonValue,
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        columns: true,
        _count: {
          select: {
            items: true,
            columns: true,
          },
        },
      },
    });

    return board;
  }

  /**
   * Get board by ID with permission check
   */
  static async getBoardById(
    boardId: string,
    userId: string
  ): Promise<any> {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            columns: true,
          },
        },
      },
    });

    if (!board) {
      throw new Error('Board not found');
    }

    // Check workspace access
    const role = await this.checkWorkspaceAccess(board.workspaceId, userId);
    if (!this.canViewBoard(role)) {
      throw new Error('You do not have access to this board');
    }

    // Get columns
    const columns = await prisma.column.findMany({
      where: {
        boardId,
        isHidden: false,
      },
      orderBy: {
        position: 'asc',
      },
    });

    // Get items count
    const itemsCount = await prisma.item.count({
      where: {
        boardId,
        deletedAt: null,
      },
    });

    // Get views
    const views = await prisma.view.findMany({
      where: { boardId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    return {
      ...board,
      columns,
      _count: {
        columns: board._count.columns,
        items: itemsCount,
      },
      views,
    };
  }

  /**
   * Get all boards for a workspace
   */
  static async getWorkspaceBoards(
    workspaceId: string,
    userId: string,
    options?: { page?: number; limit?: number; search?: string; type?: BoardType; isArchived?: boolean; sortBy?: 'name' | 'updatedAt' | 'createdAt'; sortOrder?: 'asc' | 'desc' }
  ): Promise<{ boards: any[]; total: number; page: number; limit: number }> {
    try {
      // Check workspace access
      const role = await this.checkWorkspaceAccess(workspaceId, userId);
      if (!this.canViewBoard(role)) {
        throw new Error('You do not have access to this workspace');
      }

      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {
        workspaceId,
        deletedAt: null,
      };

      if (options?.isArchived !== undefined) {
        where.isArchived = options.isArchived;
      } else {
        where.isArchived = false; // Default to non-archived
      }

      if (options?.search) {
        where.OR = [
          { name: { contains: options.search, mode: 'insensitive' } },
          { description: { contains: options.search, mode: 'insensitive' } },
        ];
      }

      if (options?.type) {
        where.type = options.type;
      }

      // Build orderBy clause safely
      let orderBy: any = { updatedAt: 'desc' }; // Default
      if (options?.sortBy) {
        const sortField = options.sortBy;
        const sortDirection = options.sortOrder || 'desc';
        // Validate sort field to prevent injection
        if (['name', 'updatedAt', 'createdAt'].includes(sortField)) {
          orderBy = { [sortField]: sortDirection };
        }
      }

      // Try to fetch boards with error handling
      let boards: any[];
      let total: number;
      
      try {
        [boards, total] = await Promise.all([
          prisma.board.findMany({
            where,
            skip,
            take: limit,
            include: {
              _count: {
                select: {
                  items: true,
                  columns: true,
                },
              },
            },
            orderBy,
          }),
          prisma.board.count({ where }),
        ]);
      } catch (dbError) {
        console.error('Database query error:', dbError);
        // If _count fails, try without it
        console.log('Retrying without _count...');
        [boards, total] = await Promise.all([
          prisma.board.findMany({
            where,
            skip,
            take: limit,
            orderBy,
          }),
          prisma.board.count({ where }),
        ]);
        // Manually add counts
        boards = await Promise.all(
          boards.map(async (board) => ({
            ...board,
            _count: {
              items: await prisma.item.count({ where: { boardId: board.id } }),
              columns: await prisma.column.count({ where: { boardId: board.id } }),
            },
          }))
        );
      }

      return {
        boards,
        total,
        page,
        limit,
      };
    } catch (error) {
      console.error('Error in getWorkspaceBoards:', error);
      console.error('WorkspaceId:', workspaceId);
      console.error('UserId:', userId);
      console.error('Options:', options);
      throw error;
    }
  }

  /**
   * Update board
   */
  static async updateBoard(
    boardId: string,
    userId: string,
    data: UpdateBoardInput
  ): Promise<any> {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new Error('Board not found');
    }

    // Check workspace access
    const role = await this.checkWorkspaceAccess(board.workspaceId, userId);
    if (!this.canEditBoard(role)) {
      throw new Error('You do not have permission to update this board');
    }

    const updatedBoard = await prisma.board.update({
      where: { id: boardId },
      data: {
        name: data.name,
        description: data.description,
        color: data.color,
        icon: data.icon,
        isPublic: data.isPublic,
        isArchived: data.isArchived,
        permissions: data.permissions ? (data.permissions as Prisma.InputJsonValue) : undefined,
        settings: data.settings ? (data.settings as Prisma.InputJsonValue) : undefined,
      },
      include: {
        _count: {
          select: {
            items: true,
            columns: true,
          },
        },
      },
    });

    return updatedBoard;
  }

  /**
   * Delete board (soft delete)
   */
  static async deleteBoard(boardId: string, userId: string): Promise<void> {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new Error('Board not found');
    }

    // Check workspace access (admin/owner only for delete)
    const role = await this.checkWorkspaceAccess(board.workspaceId, userId);
    if (!role || (role !== WorkspaceRole.owner && role !== WorkspaceRole.admin)) {
      throw new Error('Only workspace admin or owner can delete boards');
    }

    await prisma.board.update({
      where: { id: boardId },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Create column
   */
  static async createColumn(
    boardId: string,
    userId: string,
    data: CreateColumnInput
  ): Promise<any> {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new Error('Board not found');
    }

    // Check workspace access
    const role = await this.checkWorkspaceAccess(board.workspaceId, userId);
    if (!this.canEditBoard(role)) {
      throw new Error('You do not have permission to create columns');
    }

    // Check if column name already exists
    const existing = await prisma.column.findUnique({
      where: {
        boardId_name: {
          boardId,
          name: data.name,
        },
      },
    });

    if (existing) {
      throw new Error(`Column "${data.name}" already exists in this board`);
    }

    // Get max position if not provided
    let position = data.position;
    if (position === undefined) {
      const maxPosition = await prisma.column.findFirst({
        where: { boardId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      position = (maxPosition?.position || -1) + 1;
    }

    const column = await prisma.column.create({
      data: {
        boardId,
        name: data.name,
        type: data.type,
        position,
        width: data.width,
        required: data.required || false,
        defaultValue: data.defaultValue as any,
        settings: (data.settings || {}) as Prisma.InputJsonValue,
        permissions: (data.permissions || {}) as Prisma.InputJsonValue,
      },
    });

    return column;
  }

  /**
   * Update column
   */
  static async updateColumn(
    columnId: string,
    userId: string,
    data: UpdateColumnInput
  ): Promise<any> {
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: {
        board: true,
      },
    });

    if (!column) {
      throw new Error('Column not found');
    }

    // Check workspace access
    const role = await this.checkWorkspaceAccess(column.board.workspaceId, userId);
    if (!this.canEditBoard(role)) {
      throw new Error('You do not have permission to update columns');
    }

    // If name is being changed, check for conflicts
    if (data.name && data.name !== column.name) {
      const existing = await prisma.column.findUnique({
        where: {
          boardId_name: {
            boardId: column.boardId,
            name: data.name,
          },
        },
      });

      if (existing) {
        throw new Error(`Column "${data.name}" already exists in this board`);
      }
    }

    const updatedColumn = await prisma.column.update({
      where: { id: columnId },
      data: {
        name: data.name,
        type: data.type,
        position: data.position,
        width: data.width,
        required: data.required,
        defaultValue: data.defaultValue as any,
        settings: data.settings ? (data.settings as Prisma.InputJsonValue) : undefined,
        permissions: data.permissions ? (data.permissions as Prisma.InputJsonValue) : undefined,
        isHidden: data.isHidden,
      },
    });

    return updatedColumn;
  }

  /**
   * Delete column
   */
  static async deleteColumn(columnId: string, userId: string): Promise<void> {
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: {
        board: true,
      },
    });

    if (!column) {
      throw new Error('Column not found');
    }

    // Check workspace access
    const role = await this.checkWorkspaceAccess(column.board.workspaceId, userId);
    if (!this.canEditBoard(role)) {
      throw new Error('You do not have permission to delete columns');
    }

    await prisma.column.delete({
      where: { id: columnId },
    });
  }

  /**
   * Get board columns
   */
  static async getBoardColumns(
    boardId: string,
    userId: string
  ): Promise<any[]> {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new Error('Board not found');
    }

    // Check workspace access
    const role = await this.checkWorkspaceAccess(board.workspaceId, userId);
    if (!this.canViewBoard(role)) {
      throw new Error('You do not have access to this board');
    }

    const columns = await prisma.column.findMany({
      where: { boardId },
      orderBy: {
        position: 'asc',
      },
    });

    return columns;
  }

  /**
   * Create item (invoice/row)
   */
  static async createItem(
    boardId: string,
    userId: string,
    data: CreateItemInput
  ): Promise<any> {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new Error('Board not found');
    }

    // Check workspace access
    const role = await this.checkWorkspaceAccess(board.workspaceId, userId);
    if (!this.canEditBoard(role)) {
      throw new Error('You do not have permission to create items');
    }

    // Get required columns and validate
    const requiredColumns = await prisma.column.findMany({
      where: {
        boardId,
        required: true,
        isHidden: false,
      },
    });

    // Create item
    const item = await prisma.item.create({
      data: {
        boardId,
        name: data.name,
        status: data.status,
        createdBy: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        itemId: item.id,
        userId,
        action: 'created',
        details: {
          name: item.name,
          status: item.status,
        } as any,
      },
    });

    // Broadcast item created event
    try {
      const { EventBroadcastService } = await import('../../websocket/services/eventBroadcastService');
      EventBroadcastService.broadcastItemCreated({
        item: {
          id: item.id,
          name: item.name,
          boardId,
          status: item.status || undefined,
          createdBy: userId,
          createdAt: item.createdAt.toISOString(),
        },
        boardId,
        workspaceId: board.workspaceId,
      });
    } catch (error) {
      console.error('Error broadcasting item created event:', error);
      // Don't fail item creation if broadcast fails
    }

    // Trigger automations
    try {
      const { AutomationEngine } = await import('../../automation/services/automationEngine');
      
      // Get item with cells for automation context
      const itemWithCells = await prisma.item.findUnique({
        where: { id: item.id },
        include: {
          cells: {
            include: { column: true },
          },
        },
      });

      if (itemWithCells) {
        const itemData: Record<string, unknown> = {
          id: itemWithCells.id,
          name: itemWithCells.name,
          status: itemWithCells.status,
        };
        itemWithCells.cells.forEach(cell => {
          itemData[cell.columnId] = cell.value;
          itemData[cell.column.name.toLowerCase()] = cell.value;
        });

        await AutomationEngine.processItemEvent({
          itemId: item.id,
          boardId,
          userId,
          eventType: 'item_created',
          newData: itemData,
        });
      }
    } catch (error) {
      console.error('Error processing automations for item creation:', error);
      // Don't fail item creation if automation fails
    }

    // Get AUTO_NUMBER columns to generate sequential numbers
    const autoNumberColumns = await prisma.column.findMany({
      where: {
        boardId,
        type: 'AUTO_NUMBER',
        isHidden: false,
      },
    });

    // Generate auto-numbers for each AUTO_NUMBER column
    const autoNumberCells = await Promise.all(
      autoNumberColumns.map(async (column) => {
        // Use enhanced invoice numbering service if settings are present
        const settings = column.settings as any;
        if (settings?.format || settings?.prefix || settings?.suffix) {
          // Import invoice number service
          const { generateInvoiceNumber } = await import('./invoiceNumberService');
          const formattedNumber = await generateInvoiceNumber(column.id);
          
          return {
            itemId: item.id,
            columnId: column.id,
            value: formattedNumber as any,
          };
        }

        // Fallback to simple sequential numbering
        // Find the highest existing auto-number value for this column
        // Only count cells from non-deleted items
        const existingCells = await prisma.cell.findMany({
          where: {
            columnId: column.id,
            item: {
              deletedAt: null, // Only count non-deleted items
            },
          },
        });

        // Extract numeric values and find max
        let maxNumber = 0;
        existingCells.forEach((cell) => {
          const cellValue = typeof cell.value === 'number' ? cell.value : 
                          typeof cell.value === 'string' ? parseInt(String(cell.value), 10) : 0;
          if (!isNaN(cellValue) && cellValue > maxNumber) {
            maxNumber = cellValue;
          }
        });

        // Generate next sequential number
        const nextNumber = maxNumber + 1;

        return {
          itemId: item.id,
          columnId: column.id,
          value: nextNumber as any,
        };
      })
    );

    // Combine provided cells with auto-generated cells
    const allCellsData: Array<{ itemId: string; columnId: string; value: any }> = [];

    // Add user-provided cells (skip AUTO_NUMBER columns)
    if (data.cells && Object.keys(data.cells).length > 0) {
      const autoNumberColumnIds = new Set(autoNumberColumns.map(col => col.id));
      Object.entries(data.cells).forEach(([columnId, value]) => {
        // Skip AUTO_NUMBER columns as they're auto-generated
        if (!autoNumberColumnIds.has(columnId)) {
          allCellsData.push({
            itemId: item.id,
            columnId,
            value: value as any,
          });
        }
      });
    }

    // Add auto-generated cells
    allCellsData.push(...autoNumberCells);

    // Create all cells
    if (allCellsData.length > 0) {
      await prisma.cell.createMany({
        data: allCellsData,
      });
    }

    // Create activity log
    await prisma.activity.create({
      data: {
        itemId: item.id,
        userId,
        action: 'created',
        details: { name: data.name },
      },
    });

    // Get created item with cells
    const itemWithCells = await prisma.item.findUnique({
      where: { id: item.id },
      include: {
        cells: {
          include: {
            column: true,
          },
        },
      },
    });

    return itemWithCells;
  }

  /**
   * Get board items with row-level security
   */
  static async getBoardItems(
    boardId: string,
    userId: string,
    options?: { 
      page?: number; 
      limit?: number; 
      search?: string; 
      status?: string; 
      sortBy?: string; 
      sortOrder?: 'asc' | 'desc';
      filterBy?: 'all' | 'assigned' | 'created' | 'department' | 'custom';
      departmentId?: string;
      customFilters?: {
        columnId?: string;
        operator?: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
        value?: unknown;
      }[];
    }
  ): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new Error('Board not found');
    }

    // Check workspace access
    const role = await this.checkWorkspaceAccess(board.workspaceId, userId);
    if (!this.canViewBoard(role)) {
      throw new Error('You do not have access to this board');
    }

    // Use row-level security service for filtering
    const { RowLevelSecurityService } = await import('../../permission/services/rowLevelSecurityService');
    const result = await RowLevelSecurityService.getFilteredItems(boardId, userId, {
      page: options?.page,
      limit: options?.limit,
      search: options?.search,
      status: options?.status,
      filterBy: options?.filterBy,
      departmentId: options?.departmentId,
      customFilters: options?.customFilters,
    });

    // Apply sorting
    if (options?.sortBy) {
      result.items.sort((a, b) => {
        const sortBy = options.sortBy!;
        // Safe property access with type assertion
        const aVal = (a as Record<string, unknown>)[sortBy];
        const bVal = (b as Record<string, unknown>)[sortBy];
        const order = options.sortOrder || 'desc';
        
        // Handle null/undefined values
        if (aVal === bVal) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        
        // Convert to comparable values
        const aCompare = typeof aVal === 'string' ? aVal.toLowerCase() : aVal;
        const bCompare = typeof bVal === 'string' ? bVal.toLowerCase() : bVal;
        
        if (aCompare === bCompare) return 0;
        if (order === 'asc') {
          return aCompare < bCompare ? -1 : 1;
        }
        return aCompare > bCompare ? -1 : 1;
      });
    }

    return result;
  }

  /**
   * Update item
   */
  static async updateItem(
    itemId: string,
    userId: string,
    data: UpdateItemInput
  ): Promise<any> {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        board: true,
      },
    });

    if (!item) {
      throw new Error('Item not found');
    }

    // Check workspace access
    const role = await this.checkWorkspaceAccess(item.board.workspaceId, userId);
    if (!this.canEditBoard(role)) {
      throw new Error('You do not have permission to update this item');
    }

    // Track changes for activity logging
    const oldStatus = item.status;
    const oldName = item.name;

    // Update item
    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: {
        name: data.name,
        status: data.status,
      },
    });

    // Log status change if different
    if (data.status && data.status !== oldStatus) {
      await prisma.activity.create({
        data: {
          itemId,
          userId,
          action: 'status_changed',
          fieldName: 'status',
          oldValue: oldStatus as any,
          newValue: data.status as any,
          details: {
            oldStatus,
            newStatus: data.status,
          } as any,
        },
      });

      // Broadcast status changed event
      try {
        const { EventBroadcastService } = await import('../../websocket/services/eventBroadcastService');
        EventBroadcastService.broadcastStatusChanged({
          itemId,
          oldStatus: oldStatus || '',
          newStatus: data.status,
          boardId: item.board.id,
          workspaceId: item.board.workspaceId,
        });
      } catch (error) {
        console.error('Error broadcasting status changed event:', error);
      }
    }

    // Log name change if different
    if (data.name && data.name !== oldName) {
      await prisma.activity.create({
        data: {
          itemId,
          userId,
          action: 'field_updated',
          fieldName: 'name',
          oldValue: oldName as any,
          newValue: data.name as any,
        },
      });
    }

    // Get existing cells to track changes (needed for both updates and automation)
    const existingCells = await prisma.cell.findMany({
      where: { itemId },
      include: { column: true },
    });
    const existingCellsMap = new Map(existingCells.map(c => [c.columnId, c]));

    // Update cells if provided
    if (data.cells && Object.keys(data.cells).length > 0) {

      const updatePromises = Object.entries(data.cells).map(async ([columnId, value]) => {
        const existingCell = existingCellsMap.get(columnId);
        const oldValue = existingCell?.value;
        const column = existingCells.find(c => c.columnId === columnId)?.column;

        // Only log if value actually changed (or is being set for the first time)
        const hasChanged = oldValue === undefined 
          ? (value !== null && value !== undefined && (Array.isArray(value) ? value.length > 0 : true))
          : JSON.stringify(oldValue) !== JSON.stringify(value);
        
        if (hasChanged) {
          // Handle PEOPLE column assignments separately
          if (column?.type === 'PEOPLE') {
            const oldUserIds = oldValue === undefined 
              ? [] 
              : Array.isArray(oldValue) 
                ? oldValue.map(id => String(id)) 
                : oldValue 
                  ? [String(oldValue)] 
                  : [];
            const newUserIds = Array.isArray(value) ? value.map(id => String(id)) : value ? [String(value)] : [];
            
            // Find newly assigned users
            const newlyAssigned = newUserIds.filter(id => !oldUserIds.includes(id));
            // Find unassigned users
            const unassigned = oldUserIds.filter(id => !newUserIds.includes(id));

            // Determine action type
            let action = 'field_updated';
            if (oldValue === undefined && newUserIds.length > 0) {
              // First assignment
              action = 'assigned';
            } else if (newlyAssigned.length > 0 && unassigned.length === 0) {
              action = 'assigned';
            } else if (unassigned.length > 0 && newlyAssigned.length === 0) {
              action = 'unassigned';
            } else if (newlyAssigned.length > 0 || unassigned.length > 0) {
              action = 'assignment_updated';
            }

            // Log assignment activity
            await prisma.activity.create({
              data: {
                itemId,
                userId,
                action,
                fieldName: column?.name || columnId,
                oldValue: oldValue as any,
                newValue: value as any,
                details: {
                  columnId,
                  columnName: column?.name,
                  newlyAssigned,
                  unassigned,
                } as any,
              },
            });

            // Send notifications to newly assigned users
            if (newlyAssigned.length > 0) {
              try {
                const { NotificationService } = await import('../../../modules/notification/services/notificationService');
                const item = await prisma.item.findUnique({
                  where: { id: itemId },
                  include: {
                    board: {
                      select: {
                        id: true,
                        name: true,
                        workspaceId: true,
                      },
                    },
                  },
                });

                if (item) {
                  const assigner = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { id: true, name: true },
                  });

                  for (const assignedUserId of newlyAssigned) {
                    // Don't notify the assigner if they assigned themselves
                    if (assignedUserId === userId) continue;

                    try {
                      await NotificationService.createNotification({
                        userId: assignedUserId,
                        type: 'assignment' as any,
                        title: 'You have been assigned to an item',
                        message: `${assigner?.name || 'Someone'} assigned you to "${item.name}"`,
                        link: `/boards/${item.board.id}/items/${item.id}`,
                        metadata: {
                          itemId: item.id,
                          itemName: item.name,
                          boardId: item.board.id,
                          workspaceId: item.board.workspaceId,
                          assignerId: userId,
                          assignerName: assigner?.name,
                        },
                      });
                    } catch (error) {
                      console.error(`Error creating assignment notification for user ${assignedUserId}:`, error);
                      // Don't fail the update if notification fails
                    }
                  }
                }
              } catch (error) {
                console.error('Error importing NotificationService:', error);
                // Continue without notifications if service unavailable
              }
            }
          } else {
            // Regular field update
            await prisma.activity.create({
              data: {
                itemId,
                userId,
                action: 'field_updated',
                fieldName: column?.name || columnId,
                oldValue: oldValue as any,
                newValue: value as any,
                details: {
                  columnId,
                  columnName: column?.name,
                } as any,
              },
            });
          }
        }

        return prisma.cell.upsert({
          where: {
            itemId_columnId: {
              itemId,
              columnId,
            },
          },
          update: {
            value: value as any,
            version: { increment: 1 },
          },
          create: {
            itemId,
            columnId,
            value: value as any,
          },
        });
      });

      await Promise.all(updatePromises);
    }

    // Get updated item with cells
    const itemWithCells = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        cells: {
          include: {
            column: true,
          },
        },
      },
    });

    // Trigger automations
    try {
      const { AutomationEngine } = await import('../../automation/services/automationEngine');
      
      if (itemWithCells) {
        const newData: Record<string, unknown> = {
          id: itemWithCells.id,
          name: itemWithCells.name,
          status: itemWithCells.status,
        };
        const oldData: Record<string, unknown> = {
          id: item.id,
          name: item.name,
          status: oldStatus || item.status,
        };
        const changedFields: Record<string, { oldValue: unknown; newValue: unknown }> = {};

        // Build data from cells
        itemWithCells.cells.forEach(cell => {
          newData[cell.columnId] = cell.value;
          newData[cell.column.name.toLowerCase()] = cell.value;
        });

        // Track changed fields
        if (data.status && data.status !== oldStatus) {
          changedFields['status'] = { oldValue: oldStatus, newValue: data.status };
        }
        if (data.name && data.name !== oldName) {
          changedFields['name'] = { oldValue: oldName, newValue: data.name };
        }
        if (data.cells) {
          Object.entries(data.cells).forEach(([columnId, newValue]) => {
            const existingCell = existingCellsMap.get(columnId);
            const oldValue = existingCell?.value;
            if (oldValue !== undefined && JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
              changedFields[columnId] = { oldValue, newValue };
            }
          });
        }

        // Determine event type
        let eventType: 'item_updated' | 'item_status_changed' = 'item_updated';
        if (data.status && data.status !== oldStatus) {
          eventType = 'item_status_changed';
        }

        await AutomationEngine.processItemEvent({
          itemId: item.id,
          boardId: item.board.id,
          userId,
          eventType,
          oldData,
          newData,
          changedFields,
        });
      }
    } catch (error) {
      console.error('Error processing automations for item update:', error);
      // Don't fail item update if automation fails
    }

    // Broadcast item updated event
    try {
      const { EventBroadcastService } = await import('../../websocket/services/eventBroadcastService');
      const changes: Record<string, { old: unknown; new: unknown }> = {};
      if (data.name && data.name !== oldName) {
        changes.name = { old: oldName, new: data.name };
      }
      if (data.status && data.status !== oldStatus) {
        changes.status = { old: oldStatus, new: data.status };
      }
      
      EventBroadcastService.broadcastItemUpdated({
        item: {
          id: itemId,
          name: data.name,
          status: data.status,
          updatedAt: updatedItem.updatedAt.toISOString(),
        },
        changes,
        boardId: item.board.id,
        workspaceId: item.board.workspaceId,
      });
    } catch (error) {
      console.error('Error broadcasting item updated event:', error);
    }

    return itemWithCells;
  }

  /**
   * Delete item (soft delete)
   */
  static async deleteItem(itemId: string, userId: string): Promise<void> {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        board: true,
      },
    });

    if (!item) {
      throw new Error('Item not found');
    }

    // Check workspace access
    const role = await this.checkWorkspaceAccess(item.board.workspaceId, userId);
    if (!this.canEditBoard(role)) {
      throw new Error('You do not have permission to delete this item');
    }

    // Get item data before deletion for automation context
    const itemWithCells = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        cells: {
          include: { column: true },
        },
      },
    });

    const itemData: Record<string, unknown> = {
      id: item.id,
      name: item.name,
      status: item.status,
    };
    if (itemWithCells) {
      itemWithCells.cells.forEach(cell => {
        itemData[cell.columnId] = cell.value;
        itemData[cell.column.name.toLowerCase()] = cell.value;
      });
    }

    await prisma.item.update({
      where: { id: itemId },
      data: {
        deletedAt: new Date(),
      },
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        itemId,
        userId,
        action: 'deleted',
      },
    });

    // Broadcast item deleted event
    try {
      const { EventBroadcastService } = await import('../../websocket/services/eventBroadcastService');
      EventBroadcastService.broadcastItemDeleted({
        itemId,
        boardId: item.board.id,
        workspaceId: item.board.workspaceId,
      });
    } catch (error) {
      console.error('Error broadcasting item deleted event:', error);
    }

    // Trigger automations
    try {
      const { AutomationEngine } = await import('../../automation/services/automationEngine');
      
      await AutomationEngine.processItemEvent({
        itemId: item.id,
        boardId: item.board.id,
        userId,
        eventType: 'item_deleted',
        oldData: itemData,
      });
    } catch (error) {
      console.error('Error processing automations for item deletion:', error);
      // Don't fail item deletion if automation fails
    }
  }

  /**
   * Get item activities
   */
  static async getItemActivities(
    itemId: string,
    userId: string,
    options?: { page?: number; limit?: number }
  ): Promise<{ activities: any[]; total: number }> {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { board: true },
    });

    if (!item) {
      throw new Error('Item not found');
    }

    // Check workspace access
    const role = await this.checkWorkspaceAccess(item.board.workspaceId, userId);
    if (!this.canViewBoard(role)) {
      throw new Error('You do not have access to this item');
    }

    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where: { itemId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePicture: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.activity.count({ where: { itemId } }),
    ]);

    return { activities, total };
  }
}

