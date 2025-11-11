import prisma from '../../../lib/prisma';

/**
 * Dashboard metrics calculation - functional approach
 */
export interface MetricsResult {
  totalItems: number;
  totalValue: number;
  averageValue: number;
  itemsByStatus: Record<string, number>;
  itemsByDate: Array<{ date: string; count: number; value: number }>;
  topItems: Array<{ id: string; name: string; value: number }>;
}

export const calculateBoardMetrics = async (
  boardId: string,
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    status?: string[];
  }
): Promise<MetricsResult> => {
  const where: any = {
    boardId,
    deletedAt: null,
  };

  if (filters?.dateFrom || filters?.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) {
      where.createdAt.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.createdAt.lte = new Date(filters.dateTo);
    }
  }

  const items = await prisma.item.findMany({
    where,
    include: {
      cells: {
        include: {
          column: true,
        },
      },
    },
  });

  const totalItems = items.length;
  
  // Calculate values from NUMBER/CURRENCY columns
  let totalValue = 0;
  const valueColumn = items[0]?.cells.find(
    c => c.column.type === 'NUMBER' || c.column.type === 'CURRENCY'
  )?.column;

  if (valueColumn) {
    items.forEach(item => {
      const cell = item.cells.find(c => c.columnId === valueColumn.id);
      if (cell?.value) {
        const numValue = typeof cell.value === 'number' 
          ? cell.value 
          : parseFloat(String(cell.value)) || 0;
        totalValue += numValue;
      }
    });
  }

  // Group by status
  const itemsByStatus: Record<string, number> = {};
  items.forEach(item => {
    const status = item.status || 'No Status';
    itemsByStatus[status] = (itemsByStatus[status] || 0) + 1;
  });

  // Group by date
  const itemsByDateMap: Record<string, { count: number; value: number }> = {};
  items.forEach(item => {
    const dateKey = new Date(item.createdAt).toISOString().split('T')[0];
    if (!itemsByDateMap[dateKey]) {
      itemsByDateMap[dateKey] = { count: 0, value: 0 };
    }
    itemsByDateMap[dateKey].count++;
    
    if (valueColumn) {
      const cell = item.cells.find(c => c.columnId === valueColumn.id);
      if (cell?.value) {
        const numValue = typeof cell.value === 'number'
          ? cell.value
          : parseFloat(String(cell.value)) || 0;
        itemsByDateMap[dateKey].value += numValue;
      }
    }
  });

  const itemsByDate = Object.entries(itemsByDateMap)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top items by value
  const topItems = items
    .map(item => {
      const cell = valueColumn 
        ? item.cells.find(c => c.columnId === valueColumn.id)
        : null;
      const value = cell?.value && typeof cell.value === 'number'
        ? cell.value
        : cell?.value
        ? parseFloat(String(cell.value)) || 0
        : 0;
      return {
        id: item.id,
        name: item.name,
        value,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return {
    totalItems,
    totalValue,
    averageValue: totalItems > 0 ? totalValue / totalItems : 0,
    itemsByStatus,
    itemsByDate,
    topItems,
  };
};

export const calculateWorkspaceMetrics = async (
  workspaceId: string,
  filters?: {
    dateFrom?: string;
    dateTo?: string;
  }
) => {
  const boards = await prisma.board.findMany({
    where: {
      workspaceId,
      deletedAt: null,
    },
  });

  const boardMetrics = await Promise.all(
    boards.map(board => calculateBoardMetrics(board.id, filters))
  );

  // Aggregate across all boards
  return {
    totalBoards: boards.length,
    totalItems: boardMetrics.reduce((sum, m) => sum + m.totalItems, 0),
    totalValue: boardMetrics.reduce((sum, m) => sum + m.totalValue, 0),
    averageValue: boardMetrics.length > 0
      ? boardMetrics.reduce((sum, m) => sum + m.averageValue, 0) / boardMetrics.length
      : 0,
    itemsByStatus: boardMetrics.reduce((acc, m) => {
      Object.entries(m.itemsByStatus).forEach(([status, count]) => {
        acc[status] = (acc[status] || 0) + count;
      });
      return acc;
    }, {} as Record<string, number>),
  };
};

