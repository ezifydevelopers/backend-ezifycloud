/**
 * Report Service - Re-exports all report operations
 */
export * from './reportCrudService';
export * from './reportGenerationService';
export * from './reportSchedulerService';
export * from './emailService';
export * from './exportService';

// Legacy class-based wrapper
import * as ReportCrudService from './reportCrudService';
import * as ReportGenerationService from './reportGenerationService';
import * as ReportSchedulerService from './reportSchedulerService';
import * as EmailService from './emailService';
import * as ExportService from './exportService';

export class ReportService {
  static createReport = ReportCrudService.createReport;
  static getReportById = ReportCrudService.getReportById;
  static getWorkspaceReports = ReportCrudService.getWorkspaceReports;
  static updateReport = ReportCrudService.updateReport;
  static deleteReport = ReportCrudService.deleteReport;

  static generateReport = ReportGenerationService.generateReport;
  static scheduleReport = ReportSchedulerService.scheduleReport;
  static unscheduleReport = ReportSchedulerService.unscheduleReport;
  static initializeScheduledReports = ReportSchedulerService.initializeScheduledReports;
  
  static sendReportEmail = EmailService.sendReportEmail;
  static exportReportToPDF = ExportService.exportReportToPDF;
  static exportReportToExcel = ExportService.exportReportToExcel;
  static exportReportToCSV = ExportService.exportReportToCSV;
}

