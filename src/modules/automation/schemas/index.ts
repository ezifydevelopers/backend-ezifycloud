import Joi from 'joi';

export const automationTriggerSchema = Joi.object({
  type: Joi.string().valid(
    'item_created',
    'item_updated',
    'item_status_changed',
    'item_deleted',
    'field_changed',
    'field_equals',
    'field_greater_than',
    'field_less_than',
    'date_approaching',
    'date_passed',
    'approval_submitted',
    'approval_approved',
    'approval_rejected'
  ).required(),
  config: Joi.object({
    columnId: Joi.string().optional(),
    field: Joi.string().optional(),
    operator: Joi.string().valid('equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty').optional(),
    value: Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean(), Joi.array()).optional(),
    daysBefore: Joi.number().integer().min(0).optional(),
    level: Joi.string().valid('LEVEL_1', 'LEVEL_2', 'LEVEL_3').optional(),
  }).optional(),
});

export const automationActionSchema = Joi.object({
  type: Joi.string().valid(
    'change_status',
    'update_field',
    'assign_user',
    'send_notification',
    'send_email',
    'create_item',
    'call_webhook'
  ).required(),
  config: Joi.object({
    status: Joi.string().optional(),
    columnId: Joi.string().optional(),
    field: Joi.string().optional(),
    value: Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean(), Joi.array()).optional(),
    userIds: Joi.array().items(Joi.string()).optional(),
    email: Joi.string().email().optional(),
    subject: Joi.string().optional(),
    message: Joi.string().optional(),
    webhookUrl: Joi.string().uri().optional(),
    webhookMethod: Joi.string().valid('GET', 'POST', 'PUT', 'DELETE').optional(),
    webhookHeaders: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
    webhookBody: Joi.object().optional(),
    targetBoardId: Joi.string().optional(),
  }).optional(),
});

export const automationConditionSchema = Joi.object({
  type: Joi.string().valid('and', 'or').required(),
  conditions: Joi.array().items(
    Joi.object({
      field: Joi.string().optional(),
      operator: Joi.string().optional(),
      value: Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean()).optional(),
    })
  ).min(1).optional(),
});

export const createAutomationSchema = Joi.object({
  boardId: Joi.string().uuid().required(),
  name: Joi.string().min(1).max(200).required(),
  trigger: automationTriggerSchema.required(),
  actions: Joi.array().items(automationActionSchema).min(1).required(),
  conditions: automationConditionSchema.optional(),
  isActive: Joi.boolean().optional().default(true),
});

export const updateAutomationSchema = Joi.object({
  name: Joi.string().min(1).max(200).optional(),
  trigger: automationTriggerSchema.optional(),
  actions: Joi.array().items(automationActionSchema).min(1).optional(),
  conditions: automationConditionSchema.optional(),
  isActive: Joi.boolean().optional(),
});

export const automationFiltersSchema = Joi.object({
  boardId: Joi.string().uuid().optional(),
  isActive: Joi.boolean().optional(),
  search: Joi.string().max(200).optional(),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
});

