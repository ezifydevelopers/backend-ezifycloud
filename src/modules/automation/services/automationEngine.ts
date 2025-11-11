// Automation Engine - Evaluates triggers and executes automations
import prisma from '../../../lib/prisma';
import { AutomationService } from './automationService';
import { AutomationTrigger, AutomationCondition } from '../types';

export interface AutomationContext {
  itemId: string;
  boardId: string;
  userId: string;
  eventType: 'item_created' | 'item_updated' | 'item_status_changed' | 'item_deleted' | 'item_moved' | 'date_check' | 'approval_submitted' | 'approval_approved' | 'approval_rejected' | 'approval_level_completed';
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  changedFields?: Record<string, { oldValue: unknown; newValue: unknown }>;
  approvalData?: {
    approvalId?: string;
    level?: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';
    approverId?: string;
    comments?: string;
  };
}

export class AutomationEngine {
  /**
   * Check date triggers for all items (called by scheduled job)
   */
  static async checkDateTriggers(): Promise<void> {
    try {
      // Get all active automations with date triggers
      const automations = await prisma.automation.findMany({
        where: {
          isActive: true,
        },
      });

      const dateTriggerTypes = ['date_approaching', 'date_passed', 'date_equals_today', 'date_in_range'];
      const dateAutomations = automations.filter(a => {
        const trigger = a.trigger as unknown as AutomationTrigger;
        return dateTriggerTypes.includes(trigger.type);
      });

      if (dateAutomations.length === 0) {
        return; // No date triggers to check
      }

      // Group automations by boardId
      const boardAutomations = new Map<string, typeof dateAutomations>();
      for (const automation of dateAutomations) {
        const boardId = automation.boardId;
        if (!boardAutomations.has(boardId)) {
          boardAutomations.set(boardId, []);
        }
        boardAutomations.get(boardId)!.push(automation);
      }

      // Process each board
      for (const [boardId, boardAuto] of boardAutomations.entries()) {
        // Get all items for this board (non-deleted)
        const items = await prisma.item.findMany({
          where: {
            boardId,
            deletedAt: null,
          },
          include: {
            cells: {
              include: {
                column: true,
              },
            },
          },
        });

        // Process each item
        for (const item of items) {
          const itemData: Record<string, unknown> = {
            id: item.id,
            name: item.name,
            status: item.status,
          };
          item.cells.forEach(cell => {
            itemData[cell.columnId] = cell.value;
            itemData[cell.column.name.toLowerCase()] = cell.value;
          });

          // Check each automation for this item
          for (const automation of boardAuto) {
            try {
              const trigger = automation.trigger as unknown as AutomationTrigger;
              
              // Evaluate trigger
              if (this.evaluateTrigger(trigger, {
                itemId: item.id,
                boardId,
                userId: item.createdBy, // Use item creator as userId
                eventType: 'date_check',
                newData: itemData,
              })) {
                // Evaluate conditions if any
                if (automation.conditions && Object.keys(automation.conditions as Record<string, unknown>).length > 0) {
                  const conditions = automation.conditions as unknown as AutomationCondition;
                  if (!this.evaluateConditions(conditions, {
                    itemId: item.id,
                    boardId,
                    userId: item.createdBy,
                    eventType: 'date_check',
                    newData: itemData,
                  })) {
                    continue; // Conditions not met
                  }
                }

                // Execute automation
                await AutomationService.executeAutomation(automation.id, item.id, {
                  itemId: item.id,
                  boardId,
                  userId: item.createdBy,
                  eventType: 'date_check',
                  newData: itemData,
                  automationId: automation.id,
                });
              }
            } catch (error) {
              console.error(`Error checking date trigger for automation ${automation.id} on item ${item.id}:`, error);
              // Continue with other automations
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking date triggers:', error);
      // Don't throw - scheduled job failures shouldn't crash the system
    }
  }

  /**
   * Process automation triggers for an item event
   */
  static async processItemEvent(context: AutomationContext): Promise<void> {
    try {
      // Get all active automations for this board
      const automations = await prisma.automation.findMany({
        where: {
          boardId: context.boardId,
          isActive: true,
        },
      });

      // Evaluate each automation
      for (const automation of automations) {
        try {
          const trigger = automation.trigger as unknown as AutomationTrigger;
          
          // Check if trigger matches the event
          if (this.evaluateTrigger(trigger, context)) {
            // Evaluate conditions if any
            if (automation.conditions && Object.keys(automation.conditions as Record<string, unknown>).length > 0) {
              const conditions = automation.conditions as unknown as AutomationCondition;
              if (!this.evaluateConditions(conditions, context)) {
                continue; // Conditions not met, skip this automation
              }
            }

            // Execute automation
            await AutomationService.executeAutomation(automation.id, context.itemId, {
              ...context,
              automationId: automation.id,
            });
          }
        } catch (error) {
          console.error(`Error processing automation ${automation.id}:`, error);
          // Continue with other automations even if one fails
        }
      }
    } catch (error) {
      console.error('Error in automation engine:', error);
      // Don't throw - automation failures shouldn't break item operations
    }
  }

  /**
   * Evaluate if a trigger matches the current event
   */
  private static evaluateTrigger(trigger: AutomationTrigger, context: AutomationContext): boolean {
    // Item triggers
    switch (trigger.type) {
      case 'item_created':
        return context.eventType === 'item_created';

      case 'item_updated':
        return context.eventType === 'item_updated';

      case 'item_status_changed':
        if (context.eventType !== 'item_status_changed') return false;
        // Optionally check if status matches config value
        if (trigger.config?.value) {
          return context.newData?.status === trigger.config.value;
        }
        return true;

      case 'item_deleted':
        return context.eventType === 'item_deleted';

      case 'item_moved':
        return context.eventType === 'item_moved';

      // Field triggers
      case 'field_changed':
        if (context.eventType !== 'item_updated') return false;
        if (!trigger.config?.columnId) return false;
        // Check if the specified field changed
        return context.changedFields?.hasOwnProperty(trigger.config.columnId) || false;

      case 'field_equals':
        if (!trigger.config?.columnId || trigger.config?.value === undefined) return false;
        if (context.eventType !== 'item_created' && context.eventType !== 'item_updated' && context.eventType !== 'item_status_changed') return false;
        return this.compareFieldValue(context.newData, trigger.config.columnId, trigger.config.value, trigger.config.operator || 'equals');

      case 'field_greater_than':
        if (!trigger.config?.columnId || trigger.config?.value === undefined) return false;
        if (context.eventType !== 'item_created' && context.eventType !== 'item_updated' && context.eventType !== 'item_status_changed') return false;
        return this.compareFieldValue(context.newData, trigger.config.columnId, trigger.config.value, 'greater_than');

      case 'field_less_than':
        if (!trigger.config?.columnId || trigger.config?.value === undefined) return false;
        if (context.eventType !== 'item_created' && context.eventType !== 'item_updated' && context.eventType !== 'item_status_changed') return false;
        return this.compareFieldValue(context.newData, trigger.config.columnId, trigger.config.value, 'less_than');

      case 'field_contains':
        if (!trigger.config?.columnId || trigger.config?.value === undefined) return false;
        if (context.eventType !== 'item_created' && context.eventType !== 'item_updated' && context.eventType !== 'item_status_changed') return false;
        return this.compareFieldValue(context.newData, trigger.config.columnId, trigger.config.value, 'contains');

      case 'field_is_empty':
        if (!trigger.config?.columnId) return false;
        if (context.eventType !== 'item_created' && context.eventType !== 'item_updated' && context.eventType !== 'item_status_changed') return false;
        return this.compareFieldValue(context.newData, trigger.config.columnId, null, 'is_empty');

      case 'field_is_not_empty':
        if (!trigger.config?.columnId) return false;
        if (context.eventType !== 'item_created' && context.eventType !== 'item_updated' && context.eventType !== 'item_status_changed') return false;
        return this.compareFieldValue(context.newData, trigger.config.columnId, null, 'is_not_empty');

      // Date triggers - work on item_created, item_updated, and date_check events
      case 'date_approaching':
        if (!trigger.config?.columnId) return false;
        if (context.eventType !== 'item_created' && context.eventType !== 'item_updated' && context.eventType !== 'date_check') return false;
        return this.evaluateDateTrigger(context.newData, trigger.config.columnId, 'approaching', trigger.config.daysBefore);

      case 'date_passed':
        if (!trigger.config?.columnId) return false;
        if (context.eventType !== 'item_created' && context.eventType !== 'item_updated' && context.eventType !== 'date_check') return false;
        return this.evaluateDateTrigger(context.newData, trigger.config.columnId, 'passed');

      case 'date_equals_today':
        if (!trigger.config?.columnId) return false;
        if (context.eventType !== 'item_created' && context.eventType !== 'item_updated' && context.eventType !== 'date_check') return false;
        return this.evaluateDateTrigger(context.newData, trigger.config.columnId, 'equals_today');

      case 'date_in_range':
        if (!trigger.config?.columnId || !trigger.config?.startDate || !trigger.config?.endDate) return false;
        if (context.eventType !== 'item_created' && context.eventType !== 'item_updated' && context.eventType !== 'date_check') return false;
        return this.evaluateDateTrigger(context.newData, trigger.config.columnId, 'in_range', undefined, trigger.config.startDate, trigger.config.endDate);

      // Approval triggers
      case 'approval_submitted':
        if (context.eventType !== 'approval_submitted') return false;
        // Optionally filter by level
        if (trigger.config?.level && context.approvalData?.level !== trigger.config.level) return false;
        return true;

      case 'approval_approved':
        if (context.eventType !== 'approval_approved') return false;
        // Optionally filter by level
        if (trigger.config?.level && context.approvalData?.level !== trigger.config.level) return false;
        return true;

      case 'approval_rejected':
        if (context.eventType !== 'approval_rejected') return false;
        // Optionally filter by level
        if (trigger.config?.level && context.approvalData?.level !== trigger.config.level) return false;
        return true;

      case 'approval_level_completed':
        if (context.eventType !== 'approval_level_completed') return false;
        // Optionally filter by level
        if (trigger.config?.level && context.approvalData?.level !== trigger.config.level) return false;
        return true;

      default:
        return false;
    }
  }

  /**
   * Evaluate date triggers
   */
  private static evaluateDateTrigger(
    data: Record<string, unknown> | undefined,
    columnId: string,
    triggerType: 'approaching' | 'passed' | 'equals_today' | 'in_range',
    daysBefore?: number,
    startDate?: string,
    endDate?: string
  ): boolean {
    if (!data || !data[columnId]) return false;

    const dateValue = data[columnId];
    let date: Date | null = null;

    // Parse date value (could be string, Date object, or timestamp)
    if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else if (typeof dateValue === 'number') {
      date = new Date(dateValue);
    } else {
      return false; // Invalid date format
    }

    if (!date || isNaN(date.getTime())) {
      return false; // Invalid date
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    switch (triggerType) {
      case 'approaching':
        if (daysBefore === undefined) daysBefore = 3; // Default to 3 days
        const daysUntil = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        // Trigger if date is between today and daysBefore days from now
        return daysUntil >= 0 && daysUntil <= daysBefore;

      case 'passed':
        // Trigger if date is in the past
        return targetDate.getTime() < today.getTime();

      case 'equals_today':
        // Trigger if date is today
        return targetDate.getTime() === today.getTime();

      case 'in_range':
        if (!startDate || !endDate) return false;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
        // Trigger if date is within the range (inclusive)
        return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();

      default:
        return false;
    }
  }

  /**
   * Compare field value with operator
   */
  private static compareFieldValue(
    data: Record<string, unknown> | undefined,
    columnId: string,
    expectedValue: unknown,
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty'
  ): boolean {
    if (!data) return false;

    const fieldValue = data[columnId];
    
    switch (operator) {
      case 'equals':
        return JSON.stringify(fieldValue) === JSON.stringify(expectedValue);
      
      case 'not_equals':
        return JSON.stringify(fieldValue) !== JSON.stringify(expectedValue);
      
      case 'contains':
        if (typeof fieldValue === 'string' && typeof expectedValue === 'string') {
          return fieldValue.toLowerCase().includes(expectedValue.toLowerCase());
        }
        if (Array.isArray(fieldValue)) {
          return fieldValue.some(v => JSON.stringify(v) === JSON.stringify(expectedValue));
        }
        return false;
      
      case 'greater_than':
        const numValue = typeof fieldValue === 'number' ? fieldValue : parseFloat(String(fieldValue || 0));
        const numExpected = typeof expectedValue === 'number' ? expectedValue : parseFloat(String(expectedValue || 0));
        return !isNaN(numValue) && !isNaN(numExpected) && numValue > numExpected;
      
      case 'less_than':
        const numValue2 = typeof fieldValue === 'number' ? fieldValue : parseFloat(String(fieldValue || 0));
        const numExpected2 = typeof expectedValue === 'number' ? expectedValue : parseFloat(String(expectedValue || 0));
        return !isNaN(numValue2) && !isNaN(numExpected2) && numValue2 < numExpected2;
      
      case 'is_empty':
        return fieldValue === null || fieldValue === undefined || fieldValue === '' || 
               (Array.isArray(fieldValue) && fieldValue.length === 0);
      
      case 'is_not_empty':
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== '' && 
               (!Array.isArray(fieldValue) || fieldValue.length > 0);
      
      default:
        return false;
    }
  }

  /**
   * Evaluate automation conditions
   */
  private static evaluateConditions(conditions: AutomationCondition, context: AutomationContext): boolean {
    if (!conditions.conditions || conditions.conditions.length === 0) {
      return true; // No conditions means always true
    }

    const results = conditions.conditions.map(cond => {
      if (!cond.field || cond.operator === undefined) return true;

      const fieldValue = context.newData?.[cond.field];
      const operator = cond.operator;
      const expectedValue = cond.value;

      switch (operator) {
        case 'equals':
          return JSON.stringify(fieldValue) === JSON.stringify(expectedValue);
        
        case 'not_equals':
          return JSON.stringify(fieldValue) !== JSON.stringify(expectedValue);
        
        case 'contains':
          if (typeof fieldValue === 'string' && typeof expectedValue === 'string') {
            return fieldValue.toLowerCase().includes(expectedValue.toLowerCase());
          }
          return false;
        
        case 'greater_than':
          const numValue = typeof fieldValue === 'number' ? fieldValue : parseFloat(String(fieldValue || 0));
          const numExpected = typeof expectedValue === 'number' ? expectedValue : parseFloat(String(expectedValue || 0));
          return !isNaN(numValue) && !isNaN(numExpected) && numValue > numExpected;
        
        case 'less_than':
          const numValue2 = typeof fieldValue === 'number' ? fieldValue : parseFloat(String(fieldValue || 0));
          const numExpected2 = typeof expectedValue === 'number' ? expectedValue : parseFloat(String(expectedValue || 0));
          return !isNaN(numValue2) && !isNaN(numExpected2) && numValue2 < numExpected2;
        
        case 'is_empty':
          return fieldValue === null || fieldValue === undefined || fieldValue === '' || 
                 (Array.isArray(fieldValue) && fieldValue.length === 0);
        
        case 'is_not_empty':
          return fieldValue !== null && fieldValue !== undefined && fieldValue !== '' && 
                 (!Array.isArray(fieldValue) || fieldValue.length > 0);
        
        default:
          return true;
      }
    });

    // Apply AND/OR logic
    return conditions.type === 'and' 
      ? results.every(r => r)
      : results.some(r => r);
  }
}

