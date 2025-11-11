/**
 * Dashboard Service - Re-exports all dashboard operations
 */
export * from './dashboardCrudService';
export * from './metricsService';
export * from './widgetService';

// Legacy class-based wrapper for backward compatibility
import * as DashboardCrudService from './dashboardCrudService';
import * as MetricsService from './metricsService';
import * as WidgetService from './widgetService';

export class DashboardService {
  static createDashboard = DashboardCrudService.createDashboard;
  static getDashboardById = DashboardCrudService.getDashboardById;
  static getWorkspaceDashboards = DashboardCrudService.getWorkspaceDashboards;
  static updateDashboard = DashboardCrudService.updateDashboard;
  static deleteDashboard = DashboardCrudService.deleteDashboard;

  static calculateBoardMetrics = MetricsService.calculateBoardMetrics;
  static calculateWorkspaceMetrics = MetricsService.calculateWorkspaceMetrics;

  static calculateWidgetData = WidgetService.calculateWidgetData;
}

