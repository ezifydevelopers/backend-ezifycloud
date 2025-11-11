import { ViewType } from '@prisma/client';

export type WidgetType = 
  | 'kpi_card'
  | 'bar_chart'
  | 'line_chart'
  | 'pie_chart'
  | 'area_chart'
  | 'gauge_chart'
  | 'summary_table'
  | 'trend_line'
  | 'status_distribution';

export interface WidgetConfig {
  type: WidgetType;
  title: string;
  dataSource: {
    type: 'board' | 'workspace' | 'custom';
    boardId?: string;
    columnId?: string;
    aggregation?: 'sum' | 'count' | 'average' | 'min' | 'max';
  };
  filters?: {
    dateRange?: { from: string; to: string };
    status?: string[];
    [key: string]: unknown;
  };
  position: { x: number; y: number; w: number; h: number };
  settings?: Record<string, unknown>;
}

export interface DashboardFilters {
  dateRange?: { from: string; to: string };
  status?: string[];
  workspaceId?: string;
  boardId?: string;
  [key: string]: unknown;
}

export interface Dashboard {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  widgets: WidgetConfig[];
  filters?: DashboardFilters;
  layout?: {
    columns?: number;
    rowHeight?: number;
    [key: string]: unknown;
  };
  isPublic: boolean;
  sharedWith?: string[]; // User IDs or role names
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDashboardInput {
  workspaceId: string;
  name: string;
  description?: string;
  widgets?: WidgetConfig[];
  filters?: DashboardFilters;
  layout?: Record<string, unknown>;
  isPublic?: boolean;
  sharedWith?: string[];
}

export interface UpdateDashboardInput {
  name?: string;
  description?: string;
  widgets?: WidgetConfig[];
  filters?: DashboardFilters;
  layout?: Record<string, unknown>;
  isPublic?: boolean;
  sharedWith?: string[];
}

export interface DashboardMetrics {
  totalItems: number;
  totalValue: number;
  averageValue: number;
  itemsByStatus: Record<string, number>;
  itemsByDate: Array<{ date: string; count: number; value: number }>;
  topItems: Array<{ id: string; name: string; value: number }>;
}

export type MetricsResult = DashboardMetrics;

