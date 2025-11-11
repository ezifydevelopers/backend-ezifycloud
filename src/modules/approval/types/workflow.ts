// Approval workflow configuration types

import { ApprovalLevel } from '@prisma/client';

export interface ApprovalWorkflowConfig {
  id: string;
  boardId: string;
  name: string;
  description?: string;
  levels: ApprovalLevelConfig[];
  rules: ApprovalRule[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalLevelConfig {
  level: ApprovalLevel;
  name: string; // e.g., "Level 1 - Sir Salman", "Level 2 - Radhika"
  approvers: string[]; // User IDs
  isOptional: boolean;
  isParallel: boolean; // If true, all approvers must approve (parallel). If false, any can approve (sequential)
  requiredApprovals?: number; // For parallel: how many must approve. For sequential: usually 1
  timeoutHours?: number; // Escalation timeout in hours
  escalationUserId?: string; // User to notify/escalate to
}

export interface ApprovalRule {
  id: string;
  name: string;
  type: 'amount' | 'status' | 'custom';
  condition: ApprovalCondition;
  action: ApprovalAction;
  priority: number; // Higher priority rules evaluated first
  enabled: boolean;
}

export interface ApprovalCondition {
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'and' | 'or';
  field?: string; // Column ID or field name
  value?: unknown;
  conditions?: ApprovalCondition[]; // For 'and'/'or' operators
}

export interface ApprovalAction {
  type: 'require_level' | 'skip_level' | 'auto_approve' | 'assign_approver';
  level?: ApprovalLevel;
  skipToLevel?: ApprovalLevel;
  approverIds?: string[];
  message?: string;
}

export interface ApprovalWorkflowEvaluation {
  requiredLevels: ApprovalLevel[];
  skippedLevels: ApprovalLevel[];
  autoApproved: boolean;
  assignedApprovers: Record<ApprovalLevel, string[]>;
  routingRules: ApprovalRule[];
}

