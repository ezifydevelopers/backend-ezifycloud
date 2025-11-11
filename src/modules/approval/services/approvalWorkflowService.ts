// Approval workflow service - Manages workflow configuration and rule evaluation

import prisma from '../../../lib/prisma';
import { ApprovalLevel, ApprovalStatus } from '@prisma/client';
import { Item } from '@prisma/client';
import {
  ApprovalWorkflowConfig,
  ApprovalLevelConfig,
  ApprovalRule,
  ApprovalCondition,
  ApprovalAction,
  ApprovalWorkflowEvaluation,
} from '../types/workflow';

export class ApprovalWorkflowService {
  /**
   * Get workflow configuration for a board
   */
  static async getWorkflowConfig(boardId: string): Promise<ApprovalWorkflowConfig | null> {
    // In a full implementation, this would fetch from a WorkflowConfig table
    // For now, return default configuration stored in board settings or a separate table
    
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        workspace: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!board) return null;

    // Get default workflow config from board settings or create default
    const settings = (board.settings as any) || {};
    if (settings.approvalWorkflow) {
      return settings.approvalWorkflow as ApprovalWorkflowConfig;
    }

    // Return default workflow configuration
    return this.getDefaultWorkflowConfig(boardId);
  }

  /**
   * Get default workflow configuration
   */
  static getDefaultWorkflowConfig(boardId: string): ApprovalWorkflowConfig {
    return {
      id: `workflow-${boardId}`,
      boardId,
      name: 'Default Approval Workflow',
      description: 'Standard 3-level approval process',
      levels: [
        {
          level: ApprovalLevel.LEVEL_1,
          name: 'Level 1 - Sir Salman',
          approvers: [], // Will be populated from workspace
          isOptional: false,
          isParallel: false,
        },
        {
          level: ApprovalLevel.LEVEL_2,
          name: 'Level 2 - Radhika',
          approvers: [],
          isOptional: false,
          isParallel: false,
        },
        {
          level: ApprovalLevel.LEVEL_3,
          name: 'Level 3 - Finance Team',
          approvers: [],
          isOptional: false,
          isParallel: true, // Multiple finance team members
          requiredApprovals: 1, // At least one finance member must approve
        },
      ],
      rules: [
        {
          id: 'rule-amount-10k',
          name: 'Amount > $10,000 requires Level 1',
          type: 'amount',
          condition: {
            operator: 'greater_than',
            field: 'total', // Assuming there's a total column
            value: 10000,
          },
          action: {
            type: 'require_level',
            level: ApprovalLevel.LEVEL_1,
          },
          priority: 100,
          enabled: true,
        },
      ],
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Save workflow configuration
   */
  static async saveWorkflowConfig(config: ApprovalWorkflowConfig): Promise<ApprovalWorkflowConfig> {
    // Save to board settings or a separate WorkflowConfig table
    await prisma.board.update({
      where: { id: config.boardId },
      data: {
        settings: {
          ...((await prisma.board.findUnique({ where: { id: config.boardId } }))?.settings as any || {}),
          approvalWorkflow: config,
        },
      },
    });

    return config;
  }

  /**
   * Evaluate workflow rules for an item
   */
  static async evaluateWorkflow(item: Item, boardId: string): Promise<ApprovalWorkflowEvaluation> {
    const workflow = await this.getWorkflowConfig(boardId);
    if (!workflow) {
      return {
        requiredLevels: [],
        skippedLevels: [],
        autoApproved: false,
        assignedApprovers: {} as Record<ApprovalLevel, string[]>,
        routingRules: [],
      };
    }

    // Get item cells to evaluate conditions
    const cells = await prisma.cell.findMany({
      where: { itemId: item.id },
      include: { column: true },
    });

    const itemData: Record<string, unknown> = {
      id: item.id,
      name: item.name,
      status: item.status,
    };

    cells.forEach(cell => {
      const columnName = cell.column.name.toLowerCase();
      const value = cell.value;
      itemData[columnName] = value;
      itemData[cell.columnId] = value;
    });

    // Evaluate rules
    const routingRules: ApprovalRule[] = [];
    const requiredLevels: ApprovalLevel[] = [];
    const skippedLevels: ApprovalLevel[] = [];
    let autoApproved = false;
    const assignedApprovers: Record<ApprovalLevel, string[]> = {
      [ApprovalLevel.LEVEL_1]: [],
      [ApprovalLevel.LEVEL_2]: [],
      [ApprovalLevel.LEVEL_3]: [],
    };

    // Sort rules by priority (higher first)
    const sortedRules = [...workflow.rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (!rule.enabled) continue;

      const matches = this.evaluateCondition(rule.condition, itemData);
      if (matches) {
        routingRules.push(rule);

        switch (rule.action.type) {
          case 'require_level':
            if (rule.action.level && !requiredLevels.includes(rule.action.level)) {
              requiredLevels.push(rule.action.level);
            }
            break;

          case 'skip_level':
            if (rule.action.skipToLevel) {
              // Skip all levels before skipToLevel
              const levels = [ApprovalLevel.LEVEL_1, ApprovalLevel.LEVEL_2, ApprovalLevel.LEVEL_3];
              const skipIndex = levels.indexOf(rule.action.skipToLevel);
              for (let i = 0; i < skipIndex; i++) {
                if (!skippedLevels.includes(levels[i])) {
                  skippedLevels.push(levels[i]);
                }
              }
            }
            break;

          case 'auto_approve':
            autoApproved = true;
            break;

          case 'assign_approver':
            if (rule.action.level && rule.action.approverIds) {
              assignedApprovers[rule.action.level].push(...rule.action.approverIds);
            }
            break;
        }
      }
    }

    // Populate approvers from level configs
    workflow.levels.forEach(levelConfig => {
      if (skippedLevels.includes(levelConfig.level)) return;
      
      if (assignedApprovers[levelConfig.level].length === 0) {
        assignedApprovers[levelConfig.level] = [...levelConfig.approvers];
      }
    });

    return {
      requiredLevels,
      skippedLevels,
      autoApproved,
      assignedApprovers,
      routingRules,
    };
  }

  /**
   * Evaluate a condition against item data
   */
  static evaluateCondition(condition: ApprovalCondition, itemData: Record<string, unknown>): boolean {
    const { operator, field, value, conditions } = condition;

    switch (operator) {
      case 'equals':
        if (!field) return false;
        return String(itemData[field] || '') === String(value || '');

      case 'greater_than':
        if (!field) return false;
        const itemValue = Number(itemData[field] || 0);
        const compareValue = Number(value || 0);
        return itemValue > compareValue;

      case 'less_than':
        if (!field) return false;
        return Number(itemData[field] || 0) < Number(value || 0);

      case 'contains':
        if (!field) return false;
        return String(itemData[field] || '').toLowerCase().includes(String(value || '').toLowerCase());

      case 'in':
        if (!field) return false;
        const values = Array.isArray(value) ? value : [value];
        return values.includes(itemData[field]);

      case 'and':
        if (!conditions) return true;
        return conditions.every(c => this.evaluateCondition(c, itemData));

      case 'or':
        if (!conditions) return false;
        return conditions.some(c => this.evaluateCondition(c, itemData));

      default:
        return false;
    }
  }

  /**
   * Determine which approval levels are required for an item
   */
  static async getRequiredLevels(item: Item, boardId: string): Promise<ApprovalLevel[]> {
    const evaluation = await this.evaluateWorkflow(item, boardId);
    
    if (evaluation.autoApproved) {
      return [];
    }

    const workflow = await this.getWorkflowConfig(boardId);
    if (!workflow) return [];

    const allLevels = [ApprovalLevel.LEVEL_1, ApprovalLevel.LEVEL_2, ApprovalLevel.LEVEL_3];
    const required: ApprovalLevel[] = [];

    // Add explicitly required levels from rules
    evaluation.requiredLevels.forEach(level => {
      if (!required.includes(level)) {
        required.push(level);
      }
    });

    // Add default levels that aren't skipped or optional
    allLevels.forEach(level => {
      if (evaluation.skippedLevels.includes(level)) return;
      
      const levelConfig = workflow.levels.find(l => l.level === level);
      if (levelConfig && !levelConfig.isOptional && !required.includes(level)) {
        required.push(level);
      }
    });

    return required.sort((a, b) => {
      const order = { [ApprovalLevel.LEVEL_1]: 1, [ApprovalLevel.LEVEL_2]: 2, [ApprovalLevel.LEVEL_3]: 3 };
      return order[a] - order[b];
    });
  }

  /**
   * Create approval requests based on workflow evaluation
   */
  static async createApprovalRequests(item: Item, boardId: string, userId: string): Promise<void> {
    const evaluation = await this.evaluateWorkflow(item, boardId);

    if (evaluation.autoApproved) {
      // Mark all levels as auto-approved
      const levels = [ApprovalLevel.LEVEL_1, ApprovalLevel.LEVEL_2, ApprovalLevel.LEVEL_3];
      for (const level of levels) {
        await prisma.approval.create({
          data: {
            itemId: item.id,
            level,
            status: ApprovalStatus.approved,
            approverId: userId,
            approvedAt: new Date(),
            comments: 'Auto-approved based on workflow rules',
          },
        });
      }
      return;
    }

    const requiredLevels = await this.getRequiredLevels(item, boardId);

    for (const level of requiredLevels) {
      const approvers = evaluation.assignedApprovers[level] || [];

      if (approvers.length === 0) {
        // Create without specific approver (will be assigned later)
        await prisma.approval.create({
          data: {
            itemId: item.id,
            level,
            status: ApprovalStatus.pending,
          },
        });
      } else {
        // Create approval for each approver (parallel) or just first (sequential)
        const levelConfig = (await this.getWorkflowConfig(boardId))?.levels.find(l => l.level === level);
        const isParallel = levelConfig?.isParallel ?? false;

        if (isParallel) {
          // Create one approval per approver
          for (const approverId of approvers) {
            await prisma.approval.create({
              data: {
                itemId: item.id,
                level,
                status: ApprovalStatus.pending,
                approverId,
              },
            });
          }
        } else {
          // Create one approval for first approver (sequential)
          await prisma.approval.create({
            data: {
              itemId: item.id,
              level,
              status: ApprovalStatus.pending,
              approverId: approvers[0],
            },
          });
        }
      }
    }
  }

  /**
   * Check and handle escalations (time-based)
   */
  static async checkEscalations(): Promise<void> {
    const pendingApprovals = await prisma.approval.findMany({
      where: {
        status: ApprovalStatus.pending,
      },
      include: {
        item: {
          include: {
            board: true,
          },
        },
      },
    });

    for (const approval of pendingApprovals) {
      const workflow = await this.getWorkflowConfig(approval.item.boardId);
      if (!workflow) continue;

      const levelConfig = workflow.levels.find(l => l.level === approval.level);
      if (!levelConfig || !levelConfig.timeoutHours) continue;

      const hoursSinceCreation = (Date.now() - approval.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation >= levelConfig.timeoutHours) {
        // Escalate: notify escalation user or take action
        if (levelConfig.escalationUserId) {
          // TODO: Send notification to escalation user
          console.log(`Escalating approval ${approval.id} to user ${levelConfig.escalationUserId}`);
        }
      }
    }
  }
}

