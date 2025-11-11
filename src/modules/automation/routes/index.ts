import { Router } from 'express';
import { AutomationController } from '../controllers/automationController';
import { authenticateToken } from '../../../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Automation CRUD
router.post('/', AutomationController.createAutomation);
router.get('/', AutomationController.getAutomations);
router.get('/:id', AutomationController.getAutomationById);
router.put('/:id', AutomationController.updateAutomation);
router.delete('/:id', AutomationController.deleteAutomation);

// Automation actions
router.patch('/:id/toggle', AutomationController.toggleAutomation);
router.post('/:id/test', AutomationController.testAutomation);

export default router;

