import { Router } from 'express';
import Joi from 'joi';
import { authenticateToken } from '../../../middleware/auth';
import { WorkspaceController } from '../controllers/workspaceController';
import { validateRequest, validateParams, validateQuery } from '../../../utils/validation';
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  workspaceQuerySchema,
} from '../schemas';

const router = Router();

// All workspace routes require authentication
router.use(authenticateToken);

// Workspace CRUD routes
router.post(
  '/',
  validateRequest(createWorkspaceSchema),
  WorkspaceController.createWorkspace
);

router.get(
  '/',
  validateQuery(workspaceQuerySchema),
  WorkspaceController.getUserWorkspaces
);

router.get(
  '/:id',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  WorkspaceController.getWorkspaceById
);

router.put(
  '/:id',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  validateRequest(updateWorkspaceSchema),
  WorkspaceController.updateWorkspace
);

router.delete(
  '/:id',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  WorkspaceController.deleteWorkspace
);

// Member management routes
router.get(
  '/:id/members',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  WorkspaceController.getWorkspaceMembers
);

router.post(
  '/:id/members/invite',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  validateRequest(inviteMemberSchema),
  WorkspaceController.inviteMember
);

router.put(
  '/:id/members/:memberId/role',
  validateParams(Joi.object({
    id: Joi.string().uuid().required(),
    memberId: Joi.string().uuid().required(),
  })),
  validateRequest(updateMemberRoleSchema),
  WorkspaceController.updateMemberRole
);

router.delete(
  '/:id/members/:memberId',
  validateParams(Joi.object({
    id: Joi.string().uuid().required(),
    memberId: Joi.string().uuid().required(),
  })),
  WorkspaceController.removeMember
);

// Transfer ownership
router.post(
  '/:id/members/transfer-ownership',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  validateRequest(Joi.object({ newOwnerUserId: Joi.string().uuid().required() })),
  WorkspaceController.transferOwnership
);

// Invitation routes
router.post(
  '/invitations/:token/accept',
  validateParams(Joi.object({ token: Joi.string().required() })),
  WorkspaceController.acceptInvitation
);

// List invitations
router.get(
  '/:id/invitations',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  WorkspaceController.listInvitations
);

// Resend invitation
router.post(
  '/:id/invitations/:inviteId/resend',
  validateParams(Joi.object({ id: Joi.string().uuid().required(), inviteId: Joi.string().uuid().required() })),
  WorkspaceController.resendInvitation
);

// Cancel invitation
router.delete(
  '/:id/invitations/:inviteId',
  validateParams(Joi.object({ id: Joi.string().uuid().required(), inviteId: Joi.string().uuid().required() })),
  WorkspaceController.cancelInvitation
);

export default router;

