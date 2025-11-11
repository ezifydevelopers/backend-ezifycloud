import Joi from 'joi';

export const createCommentSchema = Joi.object({
  itemId: Joi.string().uuid().required(),
  content: Joi.string().min(1).max(5000).required(),
  mentions: Joi.array().items(Joi.string().uuid()).optional(),
  isPrivate: Joi.boolean().optional().default(false),
  parentId: Joi.string().uuid().allow(null).optional(),
});

export const updateCommentSchema = Joi.object({
  content: Joi.string().min(1).max(5000).optional(),
  mentions: Joi.array().items(Joi.string().uuid()).optional(),
  isPrivate: Joi.boolean().optional(),
});

export const commentIdParamSchema = Joi.object({
  commentId: Joi.string().uuid().required(),
});

export const commentQuerySchema = Joi.object({
  itemId: Joi.string().uuid().optional(),
  userId: Joi.string().uuid().optional(),
  parentId: Joi.string().uuid().allow(null, 'null', '').optional(),
  includeDeleted: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

