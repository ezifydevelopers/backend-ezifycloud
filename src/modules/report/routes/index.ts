import { Router } from 'express';
import { authenticateToken } from '../../../middleware/auth';
import { ReportController } from '../controllers/reportController';

const router = Router();

router.use(authenticateToken);

// Report CRUD
router.post('/', ReportController.createReport);
router.get('/workspace/:workspaceId', ReportController.getWorkspaceReports);
router.get('/:id', ReportController.getReportById);
router.put('/:id', ReportController.updateReport);
router.delete('/:id', ReportController.deleteReport);

// Report generation
router.post('/generate', ReportController.generateReport);

// Report export
router.get('/:reportId/export/:format', ReportController.exportReport);

export default router;

