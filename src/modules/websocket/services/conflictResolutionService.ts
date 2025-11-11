// Conflict resolution service for handling concurrent edits

import prisma from '../../../lib/prisma';

export interface CellEdit {
  itemId: string;
  cellId: string;
  columnId: string;
  userId: string;
  value: unknown;
  timestamp: Date;
}

export interface ConflictResolution {
  resolved: boolean;
  value: unknown;
  strategy: 'last_write_wins' | 'merge' | 'manual';
  conflict?: {
    currentValue: unknown;
    incomingValue: unknown;
    currentUserId: string;
    incomingUserId: string;
  };
}

export class ConflictResolutionService {
  /**
   * Resolve conflict when multiple users edit the same cell
   */
  static async resolveCellConflict(
    itemId: string,
    cellId: string,
    columnId: string,
    incomingEdit: CellEdit
  ): Promise<ConflictResolution> {
    // Get current cell value from database
    const cell = await prisma.cell.findUnique({
      where: { id: cellId },
      include: {
        item: true,
      },
    });

    if (!cell) {
      // Cell doesn't exist, allow edit
      return {
        resolved: true,
        value: incomingEdit.value,
        strategy: 'last_write_wins',
      };
    }

    // Get last update timestamp
    const lastUpdate = cell.updatedAt;
    const incomingTimestamp = incomingEdit.timestamp;

    // If incoming edit is older than last update, reject it
    if (incomingTimestamp < lastUpdate) {
      return {
        resolved: false,
        value: cell.value,
        strategy: 'last_write_wins',
        conflict: {
          currentValue: cell.value,
          incomingValue: incomingEdit.value,
          currentUserId: '', // Would need to track who made the last edit
          incomingUserId: incomingEdit.userId,
        },
      };
    }

    // Check if values are the same (no conflict)
    if (JSON.stringify(cell.value) === JSON.stringify(incomingEdit.value)) {
      return {
        resolved: true,
        value: incomingEdit.value,
        strategy: 'last_write_wins',
      };
    }

    // Check column type for merge strategy
    const column = await prisma.column.findUnique({
      where: { id: columnId },
    });

    if (!column) {
      return {
        resolved: false,
        value: cell.value,
        strategy: 'last_write_wins',
      };
    }

    // For certain column types, we can merge
    if (this.canMerge(column.type, cell.value, incomingEdit.value)) {
      const merged = this.mergeValues(column.type, cell.value, incomingEdit.value);
      return {
        resolved: true,
        value: merged,
        strategy: 'merge',
      };
    }

    // Default: last write wins
    return {
      resolved: true,
      value: incomingEdit.value,
      strategy: 'last_write_wins',
    };
  }

  /**
   * Check if values can be merged for a column type
   */
  private static canMerge(columnType: string, currentValue: unknown, incomingValue: unknown): boolean {
    switch (columnType) {
      case 'PEOPLE':
        // Can merge arrays of user IDs
        if (Array.isArray(currentValue) && Array.isArray(incomingValue)) {
          return true;
        }
        return false;

      case 'TAGS':
        // Can merge arrays of tags
        if (Array.isArray(currentValue) && Array.isArray(incomingValue)) {
          return true;
        }
        return false;

      case 'NUMBER':
        // For numbers, we might want to sum or average
        return false; // For now, don't merge numbers

      default:
        return false;
    }
  }

  /**
   * Merge two values based on column type
   */
  private static mergeValues(columnType: string, currentValue: unknown, incomingValue: unknown): unknown {
    switch (columnType) {
      case 'PEOPLE':
      case 'TAGS':
        if (Array.isArray(currentValue) && Array.isArray(incomingValue)) {
          // Merge arrays, removing duplicates
          const merged = [...new Set([...currentValue, ...incomingValue])];
          return merged;
        }
        return incomingValue;

      default:
        return incomingValue;
    }
  }

  /**
   * Check if an edit would cause a conflict
   */
  static async checkConflict(
    itemId: string,
    cellId: string,
    incomingEdit: CellEdit
  ): Promise<boolean> {
    const cell = await prisma.cell.findUnique({
      where: { id: cellId },
    });

    if (!cell) {
      return false; // No conflict if cell doesn't exist
    }

    // Check if cell was updated after the incoming edit timestamp
    return cell.updatedAt > incomingEdit.timestamp;
  }
}

