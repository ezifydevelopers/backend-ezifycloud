import prisma from '../../../lib/prisma';
import { ReportConfig, ReportResult } from '../types';
import { ReportType } from '@prisma/client';

/**
 * Report generation - functional approach
 */
export const generateReport = async (
  boardId: string | null,
  workspaceId: string | null,
  type: ReportType,
  config: ReportConfig
): Promise<ReportResult> => {
  switch (type) {
    case 'invoice_summary':
      return await generateInvoiceSummaryReport(boardId, workspaceId, config);
    
    case 'approval_status':
      return await generateApprovalStatusReport(boardId, workspaceId, config);
    
    case 'payment_status':
      return await generatePaymentStatusReport(boardId, workspaceId, config);
    
    case 'aging':
      return await generateAgingReport(boardId, workspaceId, config);
    
    case 'custom':
      return await generateCustomReport(boardId, workspaceId, config);
    
    default:
      throw new Error(`Unknown report type: ${type}`);
  }
};

const generateInvoiceSummaryReport = async (
  boardId: string | null,
  workspaceId: string | null,
  config: ReportConfig
): Promise<ReportResult> => {
  const where: any = { deletedAt: null };

  if (boardId) {
    where.boardId = boardId;
  } else if (workspaceId) {
    where.board = { workspaceId, deletedAt: null };
  }

  if (config.filters?.dateRange) {
    where.createdAt = {
      gte: new Date(config.filters.dateRange.from),
      lte: new Date(config.filters.dateRange.to),
    };
  }

  const items = await prisma.item.findMany({
    where,
    include: {
      board: { select: { name: true } },
      cells: {
        include: {
          column: true,
        },
      },
      creator: {
        select: { name: true, email: true },
      },
    },
  });

  const columns = config.columns || ['name', 'board', 'status', 'createdAt', 'creator'];
  const rows = items.map(item => {
    const row: Record<string, unknown> = {
      id: item.id,
      name: item.name,
      board: item.board.name,
      status: item.status || 'No Status',
      createdAt: item.createdAt.toISOString(),
      creator: item.creator.name,
    };

    // Add cell values
    item.cells.forEach(cell => {
      const columnName = cell.column.name;
      if (columns.includes(columnName) || !config.columns) {
        row[columnName] = cell.value;
      }
    });

    return row;
  });

  // Apply sorting
  let sortedRows = rows;
  if (config.sorting && config.sorting.length > 0) {
    sortedRows = [...rows].sort((a, b) => {
      for (const sort of config.sorting!) {
        const aVal = a[sort.column];
        const bVal = b[sort.column];
        
        // Handle null/undefined values
        if (aVal === null || aVal === undefined) {
          if (bVal === null || bVal === undefined) continue;
          return 1; // null values go to end
        }
        if (bVal === null || bVal === undefined) {
          return -1; // null values go to end
        }
        
        if (aVal === bVal) continue;
        
        // Type-safe comparison
        let comparison = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal < bVal ? -1 : 1;
        } else if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.toLowerCase() < bVal.toLowerCase() ? -1 : 1;
        } else if (aVal instanceof Date && bVal instanceof Date) {
          comparison = aVal.getTime() < bVal.getTime() ? -1 : 1;
        } else {
          // Fallback: convert to string and compare
          const aStr = String(aVal).toLowerCase();
          const bStr = String(bVal).toLowerCase();
          comparison = aStr < bStr ? -1 : 1;
        }
        
        return sort.direction === 'asc' ? comparison : -comparison;
      }
      return 0;
    });
  }

  // Apply grouping if specified
  let finalRows = sortedRows;
  let groupedSummary: Record<string, unknown> = {};
  
  if (config.grouping?.by) {
    const grouped = new Map<string, typeof rows>();
    sortedRows.forEach(row => {
      const groupKey = String(row[config.grouping!.by] || 'Other');
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey)!.push(row);
    });

    // If aggregations are specified, create summary rows
    if (config.grouping.aggregations && config.grouping.aggregations.length > 0) {
      finalRows = [];
      grouped.forEach((groupRows, groupKey) => {
        // Add group header
        finalRows.push({ [config.grouping!.by]: groupKey, _isGroupHeader: true } as any);
        
        // Add group rows
        finalRows.push(...groupRows);
        
        // Calculate aggregations for group
        const groupAggregations: Record<string, number> = {};
        config.grouping!.aggregations!.forEach(agg => {
          const values = groupRows
            .map(r => {
              const val = r[agg.column];
              return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
            })
            .filter(v => !isNaN(v));
          
          switch (agg.function) {
            case 'sum':
              groupAggregations[agg.column] = values.reduce((a, b) => a + b, 0);
              break;
            case 'count':
              groupAggregations[agg.column] = values.length;
              break;
            case 'average':
              groupAggregations[agg.column] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
              break;
            case 'min':
              groupAggregations[agg.column] = values.length > 0 ? Math.min(...values) : 0;
              break;
            case 'max':
              groupAggregations[agg.column] = values.length > 0 ? Math.max(...values) : 0;
              break;
          }
        });
        
        // Add group summary row
        if (Object.keys(groupAggregations).length > 0) {
          finalRows.push({ ...groupAggregations, _isGroupSummary: true } as any);
        }
      });
      groupedSummary = { grouped: true };
    } else {
      // No aggregations, just group rows
      finalRows = [];
      grouped.forEach((groupRows) => {
        finalRows.push(...groupRows);
      });
    }
  }

  // Calculate summary
  const totals: Record<string, number> = {};
  sortedRows.forEach(row => {
    columns.forEach(col => {
      const value = row[col];
      if (typeof value === 'number') {
        totals[col] = (totals[col] || 0) + value;
      } else {
        const numValue = parseFloat(String(value)) || 0;
        if (!isNaN(numValue)) {
          totals[col] = (totals[col] || 0) + numValue;
        }
      }
    });
  });

  return {
    columns,
    rows: finalRows,
    summary: {
      totals,
      counts: {
        total: sortedRows.length,
      },
      ...groupedSummary,
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      filters: config.filters || {},
      totalRows: finalRows.length,
    },
  };
};

const generateApprovalStatusReport = async (
  boardId: string | null,
  workspaceId: string | null,
  config: ReportConfig
): Promise<ReportResult> => {
  const where: any = {};

  if (boardId) {
    where.item = { boardId, deletedAt: null };
  } else if (workspaceId) {
    where.item = {
      board: { workspaceId, deletedAt: null },
      deletedAt: null,
    };
  }

  if (config.filters?.status) {
    where.status = { in: config.filters.status as string[] };
  }

  const approvals = await prisma.approval.findMany({
    where,
    include: {
      item: {
        select: { name: true, boardId: true },
        include: {
          board: { select: { name: true } },
        },
      },
      approver: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows = approvals.map(approval => ({
    id: approval.id,
    item: approval.item.name,
    board: approval.item.board.name,
    level: approval.level,
    status: approval.status,
    approver: approval.approver ? approval.approver.name : 'Unassigned',
    createdAt: approval.createdAt.toISOString(),
  }));

  return {
    columns: ['item', 'board', 'level', 'status', 'approver', 'createdAt'],
    rows,
    summary: {
      totals: {},
      counts: {
        pending: approvals.filter(a => a.status === 'pending').length,
        approved: approvals.filter(a => a.status === 'approved').length,
        rejected: approvals.filter(a => a.status === 'rejected').length,
      },
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      filters: config.filters || {},
      totalRows: rows.length,
    },
  };
};

const generatePaymentStatusReport = async (
  boardId: string | null,
  workspaceId: string | null,
  config: ReportConfig
): Promise<ReportResult> => {
  // Similar to invoice summary but filtered by payment status
  return await generateInvoiceSummaryReport(boardId, workspaceId, {
    ...config,
    filters: {
      ...config.filters,
      status: ['Paid', 'Partially Paid', 'Unpaid'],
    },
  });
};

const generateAgingReport = async (
  boardId: string | null,
  workspaceId: string | null,
  config: ReportConfig
): Promise<ReportResult> => {
  const items = await generateInvoiceSummaryReport(boardId, workspaceId, config);

  // Group by age buckets
  const now = new Date();
  const rows = items.rows.map(row => {
    const createdAt = new Date(row.createdAt as string);
    const daysAgo = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    let ageBucket = '';
    if (daysAgo < 30) ageBucket = '0-30 days';
    else if (daysAgo < 60) ageBucket = '31-60 days';
    else if (daysAgo < 90) ageBucket = '61-90 days';
    else ageBucket = '90+ days';

    return {
      ...row,
      age: daysAgo,
      ageBucket,
    };
  });

  return {
    ...items,
    columns: [...items.columns, 'age', 'ageBucket'],
    rows,
  };
};

const generateCustomReport = async (
  boardId: string | null,
  workspaceId: string | null,
  config: ReportConfig
): Promise<ReportResult> => {
  // Custom report with user-defined config
  return await generateInvoiceSummaryReport(boardId, workspaceId, config);
};

