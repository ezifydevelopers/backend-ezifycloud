import { Router } from 'express';
import { authenticateToken } from '../../../middleware/auth';
import { TemplateController } from '../controllers/templateController';

const router = Router();

router.use(authenticateToken);

// Save board as template
router.post('/boards/:boardId/templates', TemplateController.save);

// List templates (optionally by workspace)
router.get('/templates', TemplateController.list);

// Create board from template
router.post('/templates/:templateId/create-board', TemplateController.createFromTemplate);

export default router;


