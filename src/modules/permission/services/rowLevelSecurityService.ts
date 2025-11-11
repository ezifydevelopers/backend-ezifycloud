import prisma from '../../../lib/prisma';
import { Prisma } from '@prisma/client';
import { PermissionService } from './permissionService';

export interface RowFilterOptions {
  filterBy?: 'all' | 'assigned' | 'created' | 'department' | 'custom';
  departmentId?: string;
  customFilters?: {
    columnId?: string;
    operator?: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
    value?: unknown;
  }[];
}

/**
 * Row-Level Security Service
 * Filters items based on user permissions and filters
 */
export class RowLevelSecurityService {
  /**
   * Filter items by user access and row-level security rules
   */
  static async filterItems(
    boardId: string,
    userId: string,
    options?: RowFilterOptions
  ): Promise<Prisma.ItemWhereInput> {
    // Base filter - always check board access
    const baseFilter: Prisma.ItemWhereInput = {
      boardId,
      deletedAt: null,
    };

    // Check if user has board read access
    const canReadBoard = await PermissionService.hasPermission(
      { userId, boardId },
      'read',
      'board'
    );

    if (!canReadBoard) {
      // No access - return filter that matches nothing
      return { id: 'no-access' } as Prisma.ItemWhereInput;
    }

    // Get user's workspace member info
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        workspace: {
          include: {
            members: { where: { userId } },
          },
        },
      },
    });

    if (!board) {
      return { id: 'no-access' } as Prisma.ItemWhereInput;
    }

    const workspaceMember = board.workspace.members[0];
    if (!workspaceMember) {
      // Check if user is a platform admin (even if not a workspace member)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (user?.role === 'admin') {
        // Platform admins have full access - return base filter
        return baseFilter;
      }
      return { id: 'no-access' } as Prisma.ItemWhereInput;
    }

    // Apply row-level filters based on options
    const filterOption = options?.filterBy || 'all';

    if (filterOption === 'all') {
      // All items user has access to (based on permission service)
      return baseFilter;
    }

    if (filterOption === 'assigned') {
      // Only items assigned to user
      // Find PEOPLE columns first
      const peopleColumns = await prisma.column.findMany({
        where: {
          boardId,
          type: 'PEOPLE',
        },
        select: { id: true },
      });

      if (peopleColumns.length === 0) {
        // No people columns, return empty result
        return { id: 'no-assigned-items' } as Prisma.ItemWhereInput;
      }

      return {
        ...baseFilter,
        cells: {
          some: {
            columnId: { in: peopleColumns.map(col => col.id) },
            OR: [
              { value: userId as any },
              { value: { array_contains: [userId] } as any },
            ],
          },
        },
      };
    }

    if (filterOption === 'created') {
      // Only items created by user
      return {
        ...baseFilter,
        createdBy: userId,
      };
    }

    if (filterOption === 'department') {
      // Filter by department
      if (!options?.departmentId) {
        return baseFilter;
      }

      // Get user's department
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { department: true },
      });

      if (!user?.department) {
        return baseFilter;
      }

      // Find department column and filter by it
      const departmentColumn = await prisma.column.findFirst({
        where: {
          boardId,
          name: { contains: 'department', mode: 'insensitive' },
        },
      });

      if (departmentColumn) {
        return {
          ...baseFilter,
          cells: {
            some: {
              columnId: departmentColumn.id,
              value: {
                string_contains: user.department,
                mode: 'insensitive',
              } as any,
            },
          },
        };
      }

      return baseFilter;
    }

    if (filterOption === 'custom') {
      // Apply custom filters
      if (!options?.customFilters || options.customFilters.length === 0) {
        return baseFilter;
      }

      const customConditions: Prisma.ItemWhereInput[] = [];

      for (const customFilter of options.customFilters) {
        if (!customFilter.columnId || customFilter.value === undefined) {
          continue;
        }

        const condition: Prisma.ItemWhereInput = {
          cells: {
            some: {
              columnId: customFilter.columnId,
              ...this.buildCellCondition(customFilter.operator || 'equals', customFilter.value),
            },
          },
        };

        customConditions.push(condition);
      }

      if (customConditions.length === 0) {
        return baseFilter;
      }

      // Combine with AND logic
      return {
        ...baseFilter,
        AND: customConditions,
      };
    }

    return baseFilter;
  }

  /**
   * Build cell condition based on operator
   */
  private static buildCellCondition(operator: string, value: unknown): Partial<Prisma.CellWhereInput> {
    switch (operator) {
      case 'equals':
        return { value: { equals: value } as any };
      case 'contains':
        if (typeof value === 'string') {
          return { value: { string_contains: value } as any };
        }
        if (Array.isArray(value)) {
          return { value: { array_contains: value } as any };
        }
        return { value: { equals: value } as any };
      case 'greater_than':
        return { value: { gt: value } as any };
      case 'less_than':
        return { value: { lt: value } as any };
      case 'in':
        if (Array.isArray(value)) {
          return { value: { in: value } as any };
        }
        return { value: { equals: value } as any };
      default:
        return { value: { equals: value } as any };
    }
  }

  /**
   * Get items with row-level security applied
   */
  static async getFilteredItems(
    boardId: string,
    userId: string,
    options?: RowFilterOptions & {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    }
  ) {
    const where = await this.filterItems(boardId, userId, options);

    // Add search filter if provided
    if (options?.search) {
      where.name = {
        contains: options.search,
        mode: 'insensitive',
      };
    }

    // Add status filter if provided
    if (options?.status) {
      where.status = options.status;
    }

    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        skip,
        take: limit,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
            },
          },
          cells: {
            include: {
              column: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.item.count({ where }),
    ]);

    // Further filter by item-level permissions
    const accessibleItems = await PermissionService.filterItemsByAccess(
      userId,
      boardId,
      items.map(item => ({ id: item.id, createdBy: item.createdBy }))
    );

    const filteredItems = items.filter(item => accessibleItems.includes(item.id));

    return {
      items: filteredItems,
      total: accessibleItems.length,
      page,
      limit,
    };
  }

  /**
   * Check if user can view a specific item (row)
   */
  static async canViewItem(itemId: string, userId: string): Promise<boolean> {
    return await PermissionService.hasPermission(
      { userId, itemId },
      'read',
      'item'
    );
  }

  /**
   * Get assigned items for user
   */
  static async getAssignedItems(
    boardId: string,
    userId: string,
    options?: { page?: number; limit?: number }
  ) {
    return this.getFilteredItems(boardId, userId, {
      filterBy: 'assigned',
      ...options,
    });
  }

  /**
   * Get items created by user
   */
  static async getCreatedItems(
    boardId: string,
    userId: string,
    options?: { page?: number; limit?: number }
  ) {
    return this.getFilteredItems(boardId, userId, {
      filterBy: 'created',
      ...options,
    });
  }

  /**
   * Get items filtered by department
   */
  static async getDepartmentItems(
    boardId: string,
    userId: string,
    departmentId?: string,
    options?: { page?: number; limit?: number }
  ) {
    return this.getFilteredItems(boardId, userId, {
      filterBy: 'department',
      departmentId,
      ...options,
    });
  }
}

