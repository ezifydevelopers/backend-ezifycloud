import Joi from 'joi';
import { BoardType, ColumnType, ViewType } from '@prisma/client';

export const createBoardSchema = Joi.object({
  workspaceId: Joi.string().uuid().required(),
  name: Joi.string().min(1).max(100).required(),
  type: Joi.string()
    .valid(...Object.values(BoardType))
    .required(),
  description: Joi.string().max(500).optional().allow('', null),
  color: Joi.string().regex(/^#[0-9A-F]{6}$/i).optional().allow('', null),
  icon: Joi.string().optional().allow('', null),
  permissions: Joi.object().optional(),
  settings: Joi.object().optional(),
});

export const updateBoardSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional().allow('', null),
  color: Joi.string().regex(/^#[0-9A-F]{6}$/i).optional().allow('', null),
  icon: Joi.string().optional().allow('', null),
  isPublic: Joi.boolean().optional(),
  isArchived: Joi.boolean().optional(),
  permissions: Joi.object().optional(),
  settings: Joi.object().optional(),
});

export const createColumnSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  type: Joi.string()
    .valid(...Object.values(ColumnType))
    .required(),
  position: Joi.number().integer().min(0).optional(),
  width: Joi.number().integer().min(50).max(1000).optional(),
  required: Joi.boolean().optional(),
  defaultValue: Joi.alternatives().try(
    Joi.string(),
    Joi.number(),
    Joi.boolean(),
    Joi.object(),
    Joi.array()
  ).optional(),
  settings: Joi.object().optional(),
  permissions: Joi.object().optional(),
});

export const updateColumnSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  type: Joi.string()
    .valid(...Object.values(ColumnType))
    .optional(),
  position: Joi.number().integer().min(0).optional(),
  width: Joi.number().integer().min(50).max(1000).optional(),
  required: Joi.boolean().optional(),
  defaultValue: Joi.alternatives().try(
    Joi.string(),
    Joi.number(),
    Joi.boolean(),
    Joi.object(),
    Joi.array()
  ).optional(),
  settings: Joi.object().optional(),
  permissions: Joi.object().optional(),
  isHidden: Joi.boolean().optional(),
});

export const createItemSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  status: Joi.string().optional(),
  cells: Joi.object().pattern(
    Joi.string().uuid(),
    Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean(), Joi.object(), Joi.array(), Joi.allow(null))
  ).optional(),
});

export const updateItemSchema = Joi.object({
  name: Joi.string().min(1).max(200).optional(),
  status: Joi.string().optional(),
  cells: Joi.object().pattern(
    Joi.string().uuid(),
    Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean(), Joi.object(), Joi.array(), Joi.allow(null))
  ).optional(),
});

export const createViewSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  type: Joi.string()
    .valid(...Object.values(ViewType))
    .required(),
  settings: Joi.object().optional(),
  isDefault: Joi.boolean().optional(),
  description: Joi.string().max(500).optional().allow('', null),
  isShared: Joi.boolean().optional(),
});

export const updateViewSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  type: Joi.string()
    .valid(...Object.values(ViewType))
    .optional(),
  settings: Joi.object().optional(),
  isDefault: Joi.boolean().optional(),
  description: Joi.string().max(500).optional().allow('', null),
  isShared: Joi.boolean().optional(),
});

export const boardQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().optional(),
  type: Joi.string()
    .valid(...Object.values(BoardType))
    .optional(),
  isArchived: Joi.boolean().optional(),
});

export const itemQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().optional(),
  status: Joi.string().optional(),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

