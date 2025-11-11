import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { BackupService } from '../services/backupService';
import { requirePermission } from '../../../middleware/permissionMiddleware';

export class BackupController {
  /**
   * Create a database backup
   */
  static async createDatabaseBackup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const backupFile = await BackupService.createDatabaseBackup();
      res.json({
        success: true,
        message: 'Database backup created successfully',
        data: {
          file: backupFile,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Backup creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create database backup',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create a files backup
   */
  static async createFilesBackup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const backupFile = await BackupService.createFilesBackup();
      res.json({
        success: true,
        message: 'Files backup created successfully',
        data: {
          file: backupFile,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Files backup error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create files backup',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create a data export
   */
  static async createDataExport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const exportFile = await BackupService.createDataExport();
      res.json({
        success: true,
        message: 'Data export created successfully',
        data: {
          file: exportFile,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Data export error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create data export',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * List available backups
   */
  static async listBackups(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { type } = req.query;
      const backupType = (type as 'database' | 'files' | 'data') || 'database';
      const backups = await BackupService.listBackups(backupType);
      
      res.json({
        success: true,
        data: {
          backups,
          count: backups.length,
        },
      });
    } catch (error) {
      console.error('List backups error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list backups',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Cleanup old backups
   */
  static async cleanupBackups(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { type, keepCount } = req.query;
      const backupType = (type as 'database' | 'files' | 'data') || 'database';
      const keep = keepCount ? parseInt(keepCount as string, 10) : 10;
      
      await BackupService.cleanupOldBackups(backupType, keep);
      
      res.json({
        success: true,
        message: 'Old backups cleaned up successfully',
      });
    } catch (error) {
      console.error('Cleanup backups error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup backups',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

