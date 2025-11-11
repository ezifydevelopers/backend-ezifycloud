import { Router } from 'express';
import { AIController } from '../controllers/aiController';
import { authenticateToken } from '../../../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// AI endpoints
router.post('/generate-text', AIController.generateText);
router.post('/smart-search', AIController.smartSearch);
router.post('/predict', AIController.generatePrediction);
router.post('/insights', AIController.generateInsights);
router.post('/auto-tagging', AIController.autoTagging);
router.post('/suggest-formulas', AIController.suggestFormulas);
router.post('/email-draft', AIController.generateEmailDraft);

export default router;

