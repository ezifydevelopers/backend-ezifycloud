import { Router } from 'express';
import { authenticateToken } from '../../../middleware/auth';
import { DashboardController } from '../controllers/dashboardController';

const router = Router();

router.use(authenticateToken);

// Dashboard CRUD
router.post('/', DashboardController.createDashboard);
router.get('/workspace/:workspaceId', DashboardController.getWorkspaceDashboards);
router.get('/:id', DashboardController.getDashboardById);
router.put('/:id', DashboardController.updateDashboard);
router.delete('/:id', DashboardController.deleteDashboard);

// Sharing
router.post('/:id/share', DashboardController.shareDashboard);

// Metrics
router.get('/board/:boardId/metrics', DashboardController.getBoardMetrics);

// Widget data
router.post('/widgets/calculate', DashboardController.calculateWidgetData);

export default router;

