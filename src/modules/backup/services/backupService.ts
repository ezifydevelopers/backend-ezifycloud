import prisma from '../../../lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { APP_CONFIG } from '../../../config/app';

/**
 * Backup Service
 * Creates database and file backups
 */
export class BackupService {
  /**
   * Create a full database backup
   */
  static async createDatabaseBackup(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(process.cwd(), 'backups', 'database');
      await mkdir(backupDir, { recursive: true });
      const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

      // Export database using pg_dump (PostgreSQL)
      // Note: This requires pg_dump to be installed on the system
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const dbUrl = APP_CONFIG.DATABASE.URL;
      const url = new URL(dbUrl);
      
      const command = `pg_dump -h ${url.hostname} -p ${url.port || 5432} -U ${url.username} -d ${url.pathname.slice(1)} -F c -f "${backupFile}"`;

      // Set password via PGPASSWORD environment variable
      process.env.PGPASSWORD = url.password || '';

      await execAsync(command);

      // Compress the backup
      const compressedFile = `${backupFile}.gz`;
      await this.compressFile(backupFile, compressedFile);

      return compressedFile;
    } catch (error) {
      console.error('Database backup error:', error);
      throw new Error('Failed to create database backup');
    }
  }

  /**
   * Create a backup of uploaded files
   */
  static async createFilesBackup(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(process.cwd(), 'backups', 'files');
      await mkdir(backupDir, { recursive: true });
      const backupFile = path.join(backupDir, `files-backup-${timestamp}.tar.gz`);

      // For local storage, create a tar archive
      const uploadsDir = APP_CONFIG.UPLOAD.PATH;
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const command = `tar -czf "${backupFile}" -C "${path.dirname(uploadsDir)}" "${path.basename(uploadsDir)}"`;

      await execAsync(command);

      return backupFile;
    } catch (error) {
      console.error('Files backup error:', error);
      throw new Error('Failed to create files backup');
    }
  }

  /**
   * Create a JSON export of critical data
   */
  static async createDataExport(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(process.cwd(), 'backups', 'data');
      await mkdir(backupDir, { recursive: true });
      const backupFile = path.join(backupDir, `data-export-${timestamp}.json`);

      // Export critical data
      const [users, workspaces, boards, items] = await Promise.all([
        prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.workspace.findMany({
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.board.findMany({
          select: {
            id: true,
            workspaceId: true,
            name: true,
            type: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.item.findMany({
          select: {
            id: true,
            boardId: true,
            name: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
          take: 10000, // Limit for export
        }),
      ]);

      const exportData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {
          users,
          workspaces,
          boards,
          items,
        },
      };

      await writeFile(backupFile, JSON.stringify(exportData, null, 2), 'utf8');

      // Compress
      const compressedFile = `${backupFile}.gz`;
      await this.compressFile(backupFile, compressedFile);

      return compressedFile;
    } catch (error) {
      console.error('Data export error:', error);
      throw new Error('Failed to create data export');
    }
  }

  /**
   * Compress a file using gzip
   */
  private static async compressFile(inputFile: string, outputFile: string): Promise<void> {
    const { createReadStream } = await import('fs');
    const input = createReadStream(inputFile);
    const output = createWriteStream(outputFile);
    const gzip = createGzip();

    await pipeline(input, gzip, output);
  }

  /**
   * List available backups
   */
  static async listBackups(type: 'database' | 'files' | 'data'): Promise<string[]> {
    try {
      const backupDir = path.join(process.cwd(), 'backups', type);
      const { readdir } = await import('fs/promises');
      
      try {
        const files = await readdir(backupDir);
        return files
          .filter(file => file.endsWith('.gz') || file.endsWith('.sql') || file.endsWith('.json'))
          .map(file => path.join(backupDir, file))
          .sort()
          .reverse(); // Most recent first
      } catch (error) {
        // Directory doesn't exist
        return [];
      }
    } catch (error) {
      console.error('List backups error:', error);
      return [];
    }
  }

  /**
   * Delete old backups (keep only last N backups)
   */
  static async cleanupOldBackups(type: 'database' | 'files' | 'data', keepCount: number = 10): Promise<void> {
    try {
      const backups = await this.listBackups(type);
      if (backups.length <= keepCount) {
        return;
      }

      const { unlink } = await import('fs/promises');
      const toDelete = backups.slice(keepCount);
      
      await Promise.all(toDelete.map(file => unlink(file)));
    } catch (error) {
      console.error('Cleanup backups error:', error);
    }
  }
}

