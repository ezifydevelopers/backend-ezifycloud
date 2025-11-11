import { Prisma } from '@prisma/client';

export interface AutomationTrigger {
  type: 'item_created' | 'item_updated' | 'item_status_changed' | 'item_deleted' | 'item_moved' | 'field_changed' | 'field_equals' | 'field_greater_than' | 'field_less_than' | 'field_contains' | 'field_is_empty' | 'field_is_not_empty' | 'date_approaching' | 'date_passed' | 'date_equals_today' | 'date_in_range' | 'approval_submitted' | 'approval_approved' | 'approval_rejected' | 'approval_level_completed';
  config?: {
    columnId?: string;
    field?: string;
    operator?: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
    value?: unknown;
    daysBefore?: number; // For date_approaching trigger
    startDate?: string; // For date_in_range trigger
    endDate?: string; // For date_in_range trigger
    level?: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3'; // For approval triggers
  };
}

export interface AutomationAction {
  type: 'change_status' | 'set_status' | 'update_field' | 'clear_field' | 'calculate_formula' | 'copy_field' | 'assign_user' | 'send_notification' | 'send_email' | 'notify_users' | 'notify_assignees' | 'create_item' | 'move_to_board' | 'call_webhook' | 'api_call' | 'create_external_task' | 'update_external_system';
  config?: {
    status?: string; // For change_status/set_status
    columnId?: string; // For field actions
    sourceColumnId?: string; // For copy_field
    field?: string;
    value?: unknown;
    formula?: string; // For calculate_formula
    userIds?: string[]; // For notify_users and assign_user
    email?: string; // For send_email
    emails?: string[]; // For send_email to multiple
    subject?: string; // For send_email
    message?: string; // For send_notification and send_email
    title?: string; // For send_notification
    link?: string; // For send_notification
    notificationType?: string; // For send_notification
    webhookUrl?: string; // For call_webhook
    webhookMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    webhookHeaders?: Record<string, string>;
    webhookBody?: Record<string, unknown>;
    apiUrl?: string; // For api_call
    apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    apiHeaders?: Record<string, string>;
    apiBody?: Record<string, unknown>;
    externalSystem?: string; // For external system actions
    externalTaskData?: Record<string, unknown>; // For create_external_task
    externalUpdateData?: Record<string, unknown>; // For update_external_system
    targetBoardId?: string; // For move_to_board and create_item
    copyCells?: boolean; // For create_item - whether to copy cells from source item
    itemName?: string; // For create_item - custom name for new item
  };
}

export interface AutomationCondition {
  type: 'and' | 'or';
  conditions: Array<{
    field?: string;
    operator?: string;
    value?: unknown;
  }>;
}

export interface CreateAutomationInput {
  boardId: string;
  name: string;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  conditions?: AutomationCondition;
  isActive?: boolean;
}

export interface UpdateAutomationInput {
  name?: string;
  trigger?: AutomationTrigger;
  actions?: AutomationAction[];
  conditions?: AutomationCondition;
  isActive?: boolean;
}

export interface AutomationQueryFilters {
  boardId?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AutomationExecutionLog {
  id: string;
  automationId: string;
  itemId?: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  executedAt: string;
  executionTime?: number;
}

