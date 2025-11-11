// Approval History Service - Get complete approval history for an item

import prisma from '../../../lib/prisma';
import { ApprovalLevel, ApprovalStatus } from '@prisma/client';

export interface ApprovalHistoryEntry {
  id: string;
  level: ApprovalLevel;
  status: ApprovalStatus;
  comments?: string;
  approver?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  approvedAt?: Date;
  updatedAt: Date;
  timeTaken?: number; // in hours
}

export interface ApprovalHistory {
  itemId: string;
  itemName: string;
  entries: ApprovalHistoryEntry[];
  totalTime?: number; // total time across all levels in hours
}

export class ApprovalHistoryService {
  /**
   * Get complete approval history for an item
   */
  static async getApprovalHistory(itemId: string): Promise<ApprovalHistory> {
    // Get item details
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!item) {
      throw new Error('Item not found');
    }

    // Get all approvals for this item, ordered by creation date
    const approvals = await prisma.approval.findMany({
      where: { itemId },
      include: {
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Calculate time taken for each approval
    const entries: ApprovalHistoryEntry[] = approvals.map((approval) => {
      let timeTaken: number | undefined;

      if (approval.approvedAt) {
        // Time from creation to approval
        const diffMs = approval.approvedAt.getTime() - approval.createdAt.getTime();
        timeTaken = diffMs / (1000 * 60 * 60); // Convert to hours
      } else if (approval.status === ApprovalStatus.pending) {
        // Time from creation to now (still pending)
        const diffMs = new Date().getTime() - approval.createdAt.getTime();
        timeTaken = diffMs / (1000 * 60 * 60);
      }

      return {
        id: approval.id,
        level: approval.level,
        status: approval.status,
        comments: approval.comments || undefined,
        approver: approval.approver || undefined,
        createdAt: approval.createdAt,
        approvedAt: approval.approvedAt || undefined,
        updatedAt: approval.updatedAt,
        timeTaken,
      };
    });

    // Calculate total time (sum of completed approvals)
    const totalTime = entries
      .filter((e) => e.approvedAt) // Only count completed
      .reduce((sum, e) => sum + (e.timeTaken || 0), 0);

    return {
      itemId: item.id,
      itemName: item.name,
      entries,
      totalTime: totalTime > 0 ? totalTime : undefined,
    };
  }

  /**
   * Export approval history as CSV
   */
  static async exportAsCSV(itemId: string): Promise<string> {
    const history = await this.getApprovalHistory(itemId);

    const headers = [
      'Level',
      'Status',
      'Approver',
      'Approver Email',
      'Created At',
      'Approved/Updated At',
      'Time Taken (Hours)',
      'Comments',
    ];

    const rows = history.entries.map((entry) => [
      entry.level,
      entry.status,
      entry.approver?.name || 'N/A',
      entry.approver?.email || 'N/A',
      entry.createdAt.toISOString(),
      entry.approvedAt?.toISOString() || entry.updatedAt.toISOString(),
      entry.timeTaken?.toFixed(2) || 'N/A',
      entry.comments || '',
    ]);

    // Combine headers and rows
    const csvLines = [headers.join(',')];
    rows.forEach((row) => {
      // Escape commas and quotes in CSV
      const escapedRow = row.map((cell) => {
        const str = String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvLines.push(escapedRow.join(','));
    });

    // Add summary
    if (history.totalTime) {
      csvLines.push('');
      csvLines.push(`Total Time: ${history.totalTime.toFixed(2)} hours`);
    }

    return csvLines.join('\n');
  }
}

