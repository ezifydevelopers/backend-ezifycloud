import { Router } from 'express';
import { authenticateToken } from '../../../middleware/auth';
import { AnalyticsController } from '../controllers/analyticsController';

const router = Router();

router.use(authenticateToken);

// Analytics endpoints
router.get('/metrics', AnalyticsController.getKeyMetrics);
router.get('/trends', AnalyticsController.getTrends);
router.get('/', AnalyticsController.getAnalytics);

export default router;

