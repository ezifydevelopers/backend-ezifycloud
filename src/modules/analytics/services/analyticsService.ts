import prisma from '../../../lib/prisma';
import { KeyMetrics, Trends, AnalyticsResult, AnalyticsFilters } from '../types';

/**
 * Analytics Service
 * Provides comprehensive analytics for invoices, approvals, and payments
 */
export class AnalyticsService {
  /**
   * Get key metrics
   */
  static async getKeyMetrics(filters?: AnalyticsFilters): Promise<KeyMetrics> {
    const where: any = { deletedAt: null };
    
    if (filters?.boardId) {
      where.boardId = filters.boardId;
    } else if (filters?.workspaceId) {
      where.board = { workspaceId: filters.workspaceId, deletedAt: null };
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    // Get all items
    const items = await prisma.item.findMany({
      where,
      include: {
        cells: {
          include: {
            column: true,
          },
        },
        approvals: {
          include: {
            approver: true,
          },
        },
        board: true,
      },
    });

    // Find amount column
    const amountColumn = items[0]?.cells.find(
      c => c.column.type === 'CURRENCY' || c.column.type === 'NUMBER'
    )?.column;

    // Calculate total invoices and total amount
    let totalInvoices = items.length;
    let totalAmount = 0;
    let paidAmount = 0;
    let overdueCount = 0;

    items.forEach(item => {
      // Calculate amount
      if (amountColumn) {
        const amountCell = item.cells.find(c => c.columnId === amountColumn.id);
        if (amountCell?.value) {
          const amount = typeof amountCell.value === 'number'
            ? amountCell.value
            : parseFloat(String(amountCell.value)) || 0;
          totalAmount += amount;

          // Check if paid (status-based or payment column)
          const status = item.status?.toLowerCase() || '';
          if (status.includes('paid') || status === 'paid') {
            paidAmount += amount;
          }
        }
      }

      // Check if overdue (look for due date column)
      const dueDateColumn = item.cells.find(
        c => c.column.type === 'DATE' && c.column.name.toLowerCase().includes('due')
      );
      if (dueDateColumn?.value) {
        const dueDate = new Date(String(dueDateColumn.value));
        if (dueDate < new Date() && item.status?.toLowerCase() !== 'paid') {
          overdueCount++;
        }
      }
    });

    // Calculate pending approvals count
    const pendingApprovals = await prisma.approval.count({
      where: {
        status: 'pending',
        item: filters?.boardId ? { boardId: filters.boardId } : undefined,
      },
    });

    // Calculate average approval time
    const approvalWhere: any = {
      status: { in: ['approved', 'rejected'] },
    };

    if (filters?.boardId) {
      approvalWhere.item = { boardId: filters.boardId };
    } else if (filters?.workspaceId) {
      approvalWhere.item = { board: { workspaceId: filters.workspaceId } };
    }

    if (filters?.dateFrom || filters?.dateTo) {
      approvalWhere.createdAt = {};
      if (filters.dateFrom) approvalWhere.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) approvalWhere.createdAt.lte = new Date(filters.dateTo);
    }

    const completedApprovals = await prisma.approval.findMany({
      where: approvalWhere,
      include: {
        item: {
          include: {
            approvals: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    let totalApprovalTime = 0;
    let approvalCount = 0;

    completedApprovals.forEach(approval => {
      const itemApprovals = approval.item.approvals;
      if (itemApprovals.length > 1) {
        const firstApproval = itemApprovals[0];
        const lastApproval = itemApprovals[itemApprovals.length - 1];
        if (firstApproval && lastApproval && lastApproval.status !== 'pending') {
          const timeDiff = lastApproval.createdAt.getTime() - firstApproval.createdAt.getTime();
          if (timeDiff > 0) {
            totalApprovalTime += timeDiff;
            approvalCount++;
          }
        }
      }
    });

    const averageApprovalTime = approvalCount > 0
      ? totalApprovalTime / approvalCount / (1000 * 60 * 60) // Convert to hours
      : 0;

    // Calculate payment rate
    const paymentRate = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

    return {
      totalInvoices,
      totalAmount,
      pendingApprovalsCount: pendingApprovals,
      overdueInvoicesCount: overdueCount,
      averageApprovalTime: Math.round(averageApprovalTime * 100) / 100, // Round to 2 decimals
      paymentRate: Math.round(paymentRate * 100) / 100,
    };
  }

  /**
   * Get trends data
   */
  static async getTrends(filters?: AnalyticsFilters): Promise<Trends> {
    const where: any = { deletedAt: null };
    
    if (filters?.boardId) {
      where.boardId = filters.boardId;
    } else if (filters?.workspaceId) {
      where.board = { workspaceId: filters.workspaceId, deletedAt: null };
    }

    const startDate = filters?.dateFrom ? new Date(filters.dateFrom) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Default: last 90 days
    const endDate = filters?.dateTo ? new Date(filters.dateTo) : new Date();

    where.createdAt = {
      gte: startDate,
      lte: endDate,
    };

    const items = await prisma.item.findMany({
      where,
      include: {
        cells: {
          include: {
            column: true,
          },
        },
        approvals: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Find amount column
    const amountColumn = items[0]?.cells.find(
      c => c.column.type === 'CURRENCY' || c.column.type === 'NUMBER'
    )?.column;

    // Group by date (daily)
    const dailyData = new Map<string, { count: number; amount: number; approvalTime: number; approvalCount: number; paidAmount: number }>();

    items.forEach(item => {
      const dateKey = new Date(item.createdAt).toISOString().split('T')[0];
      
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, { count: 0, amount: 0, approvalTime: 0, approvalCount: 0, paidAmount: 0 });
      }

      const dayData = dailyData.get(dateKey)!;
      dayData.count++;

      // Calculate amount
      if (amountColumn) {
        const amountCell = item.cells.find(c => c.columnId === amountColumn.id);
        if (amountCell?.value) {
          const amount = typeof amountCell.value === 'number'
            ? amountCell.value
            : parseFloat(String(amountCell.value)) || 0;
          dayData.amount += amount;

          // Check if paid
          const status = item.status?.toLowerCase() || '';
          if (status.includes('paid') || status === 'paid') {
            dayData.paidAmount += amount;
          }
        }
      }

      // Calculate approval time for this item
      const itemApprovals = item.approvals.filter(a => a.status !== 'pending');
      if (itemApprovals.length > 0) {
        const firstApproval = item.approvals[0];
        const lastApproval = itemApprovals[itemApprovals.length - 1];
        if (firstApproval && lastApproval) {
          const timeDiff = lastApproval.createdAt.getTime() - firstApproval.createdAt.getTime();
          dayData.approvalTime += timeDiff;
          dayData.approvalCount++;
        }
      }
    });

    // Convert to arrays and fill missing dates
    const invoiceVolume: Array<{ date: string; value: number }> = [];
    const amountTrends: Array<{ date: string; value: number }> = [];
    const approvalTimeTrends: Array<{ date: string; value: number }> = [];
    const paymentTrends: Array<{ date: string; value: number }> = [];

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayData = dailyData.get(dateKey) || { count: 0, amount: 0, approvalTime: 0, approvalCount: 0, paidAmount: 0 };

      invoiceVolume.push({
        date: dateKey,
        value: dayData.count,
      });

      amountTrends.push({
        date: dateKey,
        value: dayData.amount,
      });

      const avgApprovalTime = dayData.approvalCount > 0
        ? dayData.approvalTime / dayData.approvalCount / (1000 * 60 * 60) // Convert to hours
        : 0;
      approvalTimeTrends.push({
        date: dateKey,
        value: Math.round(avgApprovalTime * 100) / 100,
      });

      const paymentRate = dayData.amount > 0
        ? (dayData.paidAmount / dayData.amount) * 100
        : 0;
      paymentTrends.push({
        date: dateKey,
        value: Math.round(paymentRate * 100) / 100,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      invoiceVolume,
      amountTrends,
      approvalTimeTrends,
      paymentTrends,
    };
  }

  /**
   * Get complete analytics (metrics + trends)
   */
  static async getAnalytics(filters?: AnalyticsFilters): Promise<AnalyticsResult> {
    const [keyMetrics, trends] = await Promise.all([
      this.getKeyMetrics(filters),
      this.getTrends(filters),
    ]);

    return {
      keyMetrics,
      trends,
      period: {
        startDate: filters?.dateFrom || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: filters?.dateTo || new Date().toISOString(),
      },
    };
  }
}

