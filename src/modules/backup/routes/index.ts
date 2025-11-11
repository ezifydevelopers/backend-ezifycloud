import { Router } from 'express';
import { authenticateToken } from '../../../middleware/auth';
import { BackupController } from '../controllers/backupController';

const router = Router();

// All backup routes require authentication
// Note: In production, add additional admin-only checks
router.use(authenticateToken);

// Create backups
router.post('/database', BackupController.createDatabaseBackup);
router.post('/files', BackupController.createFilesBackup);
router.post('/export', BackupController.createDataExport);

// List and manage backups
router.get('/list', BackupController.listBackups);
router.post('/cleanup', BackupController.cleanupBackups);

export default router;

