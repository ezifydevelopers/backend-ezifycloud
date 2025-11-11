import { Router } from 'express';
import Joi from 'joi';
import { authenticateToken } from '../../../middleware/auth';
import { BoardController } from '../controllers/boardController';
import { validateRequest, validateParams, validateQuery } from '../../../utils/validation';
import {
  createBoardSchema,
  updateBoardSchema,
  createColumnSchema,
  updateColumnSchema,
  createItemSchema,
  updateItemSchema,
  boardQuerySchema,
  itemQuerySchema,
  createViewSchema,
  updateViewSchema,
} from '../schemas';
import { ViewController } from '../controllers/viewController';

const router = Router();

// All board routes require authentication
router.use(authenticateToken);

// Board CRUD routes
router.post(
  '/',
  validateRequest(createBoardSchema),
  BoardController.createBoard
);

router.get(
  '/workspace/:workspaceId',
  validateParams(Joi.object({ workspaceId: Joi.string().uuid().required() })),
  validateQuery(boardQuerySchema),
  BoardController.getWorkspaceBoards
);

// Column routes (must come before /:id to avoid route conflicts)
router.get(
  '/:id/columns',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  BoardController.getBoardColumns
);

router.post(
  '/:boardId/columns',
  validateParams(Joi.object({ boardId: Joi.string().uuid().required() })),
  validateRequest(createColumnSchema),
  BoardController.createColumn
);

router.put(
  '/columns/:id',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  validateRequest(updateColumnSchema),
  BoardController.updateColumn
);

router.delete(
  '/columns/:id',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  BoardController.deleteColumn
);

// Invoice numbering routes
router.post(
  '/columns/:id/reset-counter',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  BoardController.resetInvoiceCounter
);

router.get(
  '/columns/:id/preview-number',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  BoardController.previewInvoiceNumber
);

// Item routes (must come before /:id to avoid route conflicts)
router.get(
  '/:boardId/items',
  validateParams(Joi.object({ boardId: Joi.string().uuid().required() })),
  validateQuery(itemQuerySchema),
  BoardController.getBoardItems
);

router.post(
  '/:boardId/items',
  validateParams(Joi.object({ boardId: Joi.string().uuid().required() })),
  validateRequest(createItemSchema),
  BoardController.createItem
);

// Board CRUD routes (must come after specific routes)
router.get(
  '/:id',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  BoardController.getBoardById
);

router.put(
  '/:id',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  validateRequest(updateBoardSchema),
  BoardController.updateBoard
);

router.delete(
  '/:id',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  BoardController.deleteBoard
);

router.put(
  '/items/:id',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  validateRequest(updateItemSchema),
  BoardController.updateItem
);

router.get(
  '/items/:id/activities',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  BoardController.getItemActivities
);

router.delete(
  '/items/:id',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  BoardController.deleteItem
);

// View routes (must come before /:id to avoid route conflicts)
router.get(
  '/:boardId/views',
  validateParams(Joi.object({ boardId: Joi.string().uuid().required() })),
  ViewController.getBoardViews
);

router.post(
  '/:boardId/views',
  validateParams(Joi.object({ boardId: Joi.string().uuid().required() })),
  validateRequest(createViewSchema),
  ViewController.createView
);

router.get(
  '/views/:id',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  ViewController.getViewById
);

router.put(
  '/views/:id',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  validateRequest(updateViewSchema),
  ViewController.updateView
);

router.delete(
  '/views/:id',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  ViewController.deleteView
);

router.post(
  '/views/:id/set-default',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  ViewController.setDefaultView
);

export default router;

