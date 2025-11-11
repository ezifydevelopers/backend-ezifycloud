import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { CreateReportInput, UpdateReportInput } from '../types';
import { ReportType } from '@prisma/client';
import * as ReportService from '../services/reportCrudService';
import * as ReportGenerationService from '../services/reportGenerationService';
import * as ReportSchedulerService from '../services/reportSchedulerService';
import * as ExportService from '../services/exportService';

/**
 * Report Controller - Thin controller layer
 */
export class ReportController {
  static async createReport(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const report = await ReportService.createReport(userId, req.body);
      return res.status(201).json({ success: true, data: report });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create report',
      });
    }
  }

  static async getReportById(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { id } = req.params;
      const report = await ReportService.getReportById(id, userId);
      return res.json({ success: true, data: report });
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: error instanceof Error ? error.message : 'Report not found',
      });
    }
  }

  static async getWorkspaceReports(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { workspaceId } = req.params;
      const reports = await ReportService.getWorkspaceReports(workspaceId, userId);
      return res.json({ success: true, data: reports });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch reports',
      });
    }
  }

  static async updateReport(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { id } = req.params;
      const report = await ReportService.updateReport(id, userId, req.body);
      return res.json({ success: true, data: report });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update report',
      });
    }
  }

  static async deleteReport(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { id } = req.params;
      await ReportService.deleteReport(id, userId);
      return res.json({ success: true, message: 'Report deleted' });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete report',
      });
    }
  }

  static async generateReport(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { type, boardId, workspaceId, config } = req.body;
      const result = await ReportGenerationService.generateReport(
        boardId,
        workspaceId,
        type as ReportType,
        config
      );

      return res.json({ success: true, data: result });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate report',
      });
    }
  }

  static async exportReport(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { reportId, format = 'csv' } = req.params;
      const report = await ReportService.getReportById(reportId, userId);

      // Generate report data
      const reportData = await ReportGenerationService.generateReport(
        report.boardId || null,
        report.workspaceId || null,
        report.type,
        report.config as any
      );

      // Export based on format
      if (format === 'pdf') {
        const buffer = await ExportService.exportReportToPDF(reportData);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${report.name}.pdf"`);
        return res.send(buffer);
      } else if (format === 'excel' || format === 'xlsx') {
        const buffer = await ExportService.exportReportToExcel(reportData);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${report.name}.xlsx"`);
        return res.send(buffer);
      } else {
        const csv = ExportService.exportReportToCSV(reportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${report.name}.csv"`);
        return res.send(csv);
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to export report',
      });
    }
  }
}

