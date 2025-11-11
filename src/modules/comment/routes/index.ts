import { Router } from 'express';
import { authenticateToken } from '../../../middleware/auth';
import { validateRequest, validateQuery, validateParams } from '../../../utils/validation';
import commentController from '../controllers/commentController';
import { CommentFileController } from '../controllers/commentFileController';
import {
  createCommentSchema,
  updateCommentSchema,
  commentIdParamSchema,
  commentQuerySchema,
} from '../schemas';
import Joi from 'joi';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Create comment
router.post(
  '/',
  validateRequest(createCommentSchema),
  (req, res) => commentController.createComment(req as any, res)
);

// Get comments for an item
router.get(
  '/item/:itemId',
  validateQuery(commentQuerySchema),
  (req, res) => commentController.getItemComments(req as any, res)
);

// Get comment by ID
router.get(
  '/:commentId',
  validateParams(commentIdParamSchema),
  (req, res) => commentController.getCommentById(req as any, res)
);

// Update comment
router.put(
  '/:commentId',
  validateParams(commentIdParamSchema),
  validateRequest(updateCommentSchema),
  (req, res) => commentController.updateComment(req as any, res)
);

// Delete comment (soft delete)
router.delete(
  '/:commentId',
  validateParams(commentIdParamSchema),
  (req, res) => commentController.deleteComment(req as any, res)
);

// Add reaction
router.post(
  '/:commentId/reactions',
  validateParams(commentIdParamSchema),
  (req, res) => commentController.addReaction(req as any, res)
);

// Pin/unpin comment
router.post(
  '/:commentId/pin',
  validateParams(commentIdParamSchema),
  (req, res) => commentController.pinComment(req as any, res)
);

// Resolve/unresolve comment
router.post(
  '/:commentId/resolve',
  validateParams(commentIdParamSchema),
  (req, res) => commentController.resolveComment(req as any, res)
);

// Comment file routes
router.post(
  '/files/upload',
  CommentFileController.uploadCommentFile
);

router.get(
  '/:commentId/files',
  validateParams(commentIdParamSchema),
  CommentFileController.getCommentFiles
);

router.get(
  '/files/:fileId/download',
  validateParams(Joi.object({ fileId: Joi.string().uuid().required() })),
  CommentFileController.downloadCommentFile
);

router.delete(
  '/files/:fileId',
  validateParams(Joi.object({ fileId: Joi.string().uuid().required() })),
  CommentFileController.deleteCommentFile
);

export default router;

