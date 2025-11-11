// Due date reminder service - Check and send reminders for overdue invoices

import prisma from '../../../lib/prisma';

export interface DueDateReminder {
  id: string;
  itemId: string;
  userId: string;
  reminderDays: number[]; // Days before due date to send reminder
  lastReminderSent?: Date;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DueDateReminderConfig {
  itemId: string;
  userId: string;
  reminderDays: number[];
  enabled: boolean;
}

export class DueDateReminderService {
  /**
   * Get reminders for a user
   */
  static async getUserReminders(userId: string, workspaceId?: string) {
    // In a full implementation, this would query a DueDateReminder model
    // For now, we'll calculate from items directly
    
    // Get items with due dates in user's workspaces
    const items = await prisma.item.findMany({
      where: {
        deletedAt: null,
        board: workspaceId ? {
          workspaceId,
          workspace: {
            members: {
              some: { userId },
            },
          },
        } : {
          workspace: {
            members: {
              some: { userId },
            },
          },
        },
      },
      include: {
        board: {
          include: {
            columns: true,
          },
        },
        cells: true,
      },
    });

    // Find due date columns
    const itemsWithDueDates = items
      .map(item => {
        const dueDateColumn = item.board.columns.find(c => {
          const settings = c.settings as any;
          const name = c.name.toLowerCase();
          return settings?.isDueDate || name.includes('due date') || name.includes('duedate');
        });

        if (!dueDateColumn) return null;

        const dueDateCell = item.cells.find(c => c.columnId === dueDateColumn.id);
        if (!dueDateCell || !dueDateCell.value) return null;

        const dueDateStr = String(dueDateCell.value);
        const dueDate = new Date(dueDateStr);
        if (isNaN(dueDate.getTime())) return null;

        return {
          item,
          dueDateColumn,
          dueDate,
          dueDateStr,
        };
      })
      .filter(Boolean) as Array<{
      item: typeof items[0];
      dueDateColumn: typeof items[0]['board']['columns'][0];
      dueDate: Date;
      dueDateStr: string;
    }>;

    return itemsWithDueDates;
  }

  /**
   * Check for invoices that need reminders
   */
  static async checkReminders(userId: string, reminderDays: number[] = [1, 3, 7]) {
    const itemsWithDueDates = await this.getUserReminders(userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reminders: Array<{
      itemId: string;
      itemName: string;
      dueDate: Date;
      daysUntil: number;
      reminderDay: number;
    }> = [];

    itemsWithDueDates.forEach(({ item, dueDate }) => {
      const due = new Date(dueDate);
      due.setHours(0, 0, 0, 0);

      if (due < today) {
        // Overdue
        reminders.push({
          itemId: item.id,
          itemName: item.name,
          dueDate: due,
          daysUntil: Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)),
          reminderDay: -1, // Overdue
        });
      } else {
        // Check if reminder should be sent
        const daysUntil = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        reminderDays.forEach(day => {
          if (daysUntil === day) {
            reminders.push({
              itemId: item.id,
              itemName: item.name,
              dueDate: due,
              daysUntil,
              reminderDay: day,
            });
          }
        });
      }
    });

    return reminders;
  }

  /**
   * Create or update reminder configuration
   */
  static async saveReminderConfig(config: DueDateReminderConfig) {
    // In a full implementation, this would save to a DueDateReminder table
    // For now, we'll store in user preferences or a separate table
    // This is a placeholder - actual implementation would use a database table
    
    return {
      id: `reminder-${config.itemId}-${config.userId}`,
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

