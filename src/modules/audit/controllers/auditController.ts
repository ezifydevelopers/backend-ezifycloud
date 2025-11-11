import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { AuditService } from '../services/auditService';
import { AuditLogQueryFilters, AuditLogExportOptions } from '../types';

export class AuditController {
  /**
   * Get audit logs with filters
   */
  static async getAuditLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        userId,
        action,
        targetType,
        targetId,
        resourceType,
        resourceId,
        startDate,
        endDate,
        page,
        limit,
      } = req.query;

      const filters: AuditLogQueryFilters = {
        userId: userId as string,
        action: action as string,
        targetType: targetType as string,
        targetId: targetId as string,
        resourceType: resourceType as string,
        resourceId: resourceId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50,
      };

      const result = await AuditService.getAuditLogs(filters);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch audit logs',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get audit logs for a specific resource
   */
  static async getResourceAuditLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { resourceType, resourceId } = req.params;
      const { page, limit } = req.query;

      const result = await AuditService.getResourceAuditLogs(resourceType, resourceId, {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error fetching resource audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch resource audit logs',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get audit logs for a specific target
   */
  static async getTargetAuditLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { targetType, targetId } = req.params;
      const { page, limit } = req.query;

      const result = await AuditService.getTargetAuditLogs(targetType, targetId, {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error fetching target audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch target audit logs',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Export audit logs
   */
  static async exportAuditLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        format = 'csv',
        userId,
        action,
        targetType,
        targetId,
        resourceType,
        resourceId,
        startDate,
        endDate,
      } = req.query;

      const filters: AuditLogQueryFilters = {
        userId: userId as string,
        action: action as string,
        targetType: targetType as string,
        targetId: targetId as string,
        resourceType: resourceType as string,
        resourceId: resourceId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      // Get all logs (no pagination for export)
      const { logs } = await AuditService.getAuditLogs({
        ...filters,
        page: 1,
        limit: 10000, // Large limit for export
      });

      // Export based on format
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.json`);
        res.json(logs);
        return;
      }

      if (format === 'csv') {
        // Convert to CSV
        const csvHeaders = [
          'ID',
          'User',
          'Action',
          'Target Type',
          'Target ID',
          'Resource Type',
          'Resource ID',
          'IP Address',
          'User Agent',
          'Request Method',
          'Request Path',
          'Status Code',
          'Created At',
        ];

        const csvRows = logs.map((log) => [
          log.id,
          log.userName,
          log.action,
          log.targetType || '',
          log.targetId || '',
          log.resourceType || '',
          log.resourceId || '',
          log.ipAddress || '',
          log.userAgent || '',
          log.requestMethod || '',
          log.requestPath || '',
          log.statusCode || '',
          log.createdAt.toISOString(),
        ]);

        const csv = [csvHeaders, ...csvRows]
          .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
          .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
        res.send(csv);
        return;
      }

      res.status(400).json({
        success: false,
        message: 'Unsupported export format. Use "csv" or "json"',
      });
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export audit logs',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
