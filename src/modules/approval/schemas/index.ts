import Joi from 'joi';

export const createApprovalSchema = Joi.object({
  itemId: Joi.string().uuid().required(),
  level: Joi.string().valid('LEVEL_1', 'LEVEL_2', 'LEVEL_3').required(),
  approverId: Joi.string().uuid().optional(),
});

export const updateApprovalSchema = Joi.object({
  status: Joi.string().valid('pending', 'approved', 'rejected').required(),
  comments: Joi.string().max(1000).optional(),
  approverId: Joi.string().uuid().optional(),
});

export const approvalIdParamSchema = Joi.object({
  approvalId: Joi.string().uuid().required(),
});

export const approvalQuerySchema = Joi.object({
  itemId: Joi.string().uuid().optional(),
  level: Joi.string().valid('LEVEL_1', 'LEVEL_2', 'LEVEL_3').optional(),
  status: Joi.string().valid('pending', 'approved', 'rejected').optional(),
  approverId: Joi.string().uuid().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

