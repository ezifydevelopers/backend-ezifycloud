import Joi from 'joi';
import { WorkspaceRole } from '@prisma/client';

export const createWorkspaceSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional().allow('', null).default(null),
  logo: Joi.alternatives().try(
    Joi.string().uri(),
    Joi.string().allow('', null),
    Joi.valid(null, '')
  ).optional().default(null),
  settings: Joi.object().optional(),
}).unknown(true); // Allow unknown fields and strip them

export const updateWorkspaceSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional().allow('', null),
  logo: Joi.alternatives().try(
    Joi.string().uri(),
    Joi.string().allow('', null)
  ).optional(),
  settings: Joi.object().optional(),
});

export const inviteMemberSchema = Joi.object({
  email: Joi.string().email().required(),
  role: Joi.string()
    .valid(...Object.values(WorkspaceRole))
    .optional(),
});

export const updateMemberRoleSchema = Joi.object({
  role: Joi.string()
    .valid(...Object.values(WorkspaceRole))
    .required(),
});

export const workspaceQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().optional(),
  role: Joi.string()
    .valid(...Object.values(WorkspaceRole))
    .optional(),
});

