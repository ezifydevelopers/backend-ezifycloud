import { Router } from 'express';
import { authenticateToken } from '../../../middleware/auth';
import { AuditController } from '../controllers/auditController';

const router = Router();

// All audit routes require authentication
router.use(authenticateToken);

// Get audit logs with filters
router.get('/', AuditController.getAuditLogs);

// Get audit logs for a specific resource
router.get('/resource/:resourceType/:resourceId', AuditController.getResourceAuditLogs);

// Get audit logs for a specific target
router.get('/target/:targetType/:targetId', AuditController.getTargetAuditLogs);

// Export audit logs
router.get('/export', AuditController.exportAuditLogs);

export default router;
