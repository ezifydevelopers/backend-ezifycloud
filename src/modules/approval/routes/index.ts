import { Router } from 'express';
import { authenticateToken } from '../../../middleware/auth';
import { validateRequest, validateParams } from '../../../utils/validation';
import approvalController from '../controllers/approvalController';
import { WorkflowController } from '../controllers/workflowController';
import approvalHistoryController from '../controllers/approvalHistoryController';
import { ApprovalNotificationController } from '../controllers/approvalNotificationController';
import { ApprovedItemsController } from '../controllers/approvedItemsController';
import {
  createApprovalSchema,
  updateApprovalSchema,
  approvalIdParamSchema,
  approvalQuerySchema,
} from '../schemas';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Request approval for an item (creates all required levels)
router.post(
  '/item/:itemId/request',
  (req, res) => approvalController.requestApproval(req as any, res)
);

// Get approvals for an item
router.get(
  '/item/:itemId',
  (req, res) => approvalController.getItemApprovals(req as any, res)
);

// Get my pending approvals
router.get(
  '/pending',
  (req, res) => approvalController.getMyPendingApprovals(req as any, res)
);

// Workflow configuration routes (must come before /:approvalId to avoid route conflicts)
router.get('/boards/:boardId/workflow', (req, res) => WorkflowController.getWorkflow(req as any, res));
router.post('/boards/:boardId/workflow', (req, res) => WorkflowController.saveWorkflow(req as any, res));
router.post('/boards/:boardId/items/:itemId/evaluate-workflow', (req, res) => WorkflowController.evaluateWorkflow(req as any, res));

// Create single approval
router.post(
  '/',
  validateRequest(createApprovalSchema),
  (req, res) => approvalController.createApproval(req as any, res)
);

// Get approval by ID (must come after specific routes)
router.get(
  '/:approvalId',
  validateParams(approvalIdParamSchema),
  (req, res) => approvalController.getApprovalById(req as any, res)
);

// Update approval (approve/reject)
router.put(
  '/:approvalId',
  validateParams(approvalIdParamSchema),
  validateRequest(updateApprovalSchema),
  (req, res) => approvalController.updateApproval(req as any, res)
);

// Delete approval
router.delete(
  '/:approvalId',
  validateParams(approvalIdParamSchema),
  (req, res) => approvalController.deleteApproval(req as any, res)
);

// Approval history routes
router.get('/items/:itemId/history', (req, res) => approvalHistoryController.getApprovalHistory(req as any, res));
router.get('/items/:itemId/history/export', (req, res) => approvalHistoryController.exportApprovalHistory(req as any, res));

// Approval notification routes (reminders and deadlines)
router.post('/reminders/send', (req, res) => ApprovalNotificationController.sendReminders(req as any, res));
router.post('/deadlines/check', (req, res) => ApprovalNotificationController.checkDeadlines(req as any, res));

// Approved items routes
router.get('/approved-items', (req, res) => ApprovedItemsController.getApprovedItems(req as any, res));
router.post('/items/:itemId/move', (req, res) => ApprovedItemsController.moveItemToBoard(req as any, res));
router.post('/items/:itemId/archive', (req, res) => ApprovedItemsController.archiveItem(req as any, res));
router.post('/items/:itemId/restore', (req, res) => ApprovedItemsController.restoreItem(req as any, res));

export default router;

