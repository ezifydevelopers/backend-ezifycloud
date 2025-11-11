import Joi from 'joi';
import { WorkspaceRole } from '@prisma/client';

const permissionSetSchema = Joi.object({
  read: Joi.boolean().required(),
  write: Joi.boolean().required(),
  delete: Joi.boolean().required(),
  manage: Joi.boolean().optional(),
});

export const updateBoardPermissionsSchema = Joi.object({
  permissions: Joi.object().pattern(
    Joi.string(),
    permissionSetSchema
  ).required(),
});

export const updateColumnPermissionsSchema = Joi.object({
  permissions: Joi.object({
    read: Joi.alternatives().try(
      Joi.boolean(),
      Joi.object().pattern(Joi.string(), Joi.boolean())
    ).optional(),
    write: Joi.alternatives().try(
      Joi.boolean(),
      Joi.object().pattern(Joi.string(), Joi.boolean())
    ).optional(),
    delete: Joi.alternatives().try(
      Joi.boolean(),
      Joi.object().pattern(Joi.string(), Joi.boolean())
    ).optional(),
  }).required(),
});

export const permissionAssignmentSchema = Joi.object({
  userId: Joi.string().uuid().optional(),
  role: Joi.string().valid(...Object.values(WorkspaceRole)).optional(),
  permissions: permissionSetSchema.required(),
}).or('userId', 'role'); // Must have either userId or role

