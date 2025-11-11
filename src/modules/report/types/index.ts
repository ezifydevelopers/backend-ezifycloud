import { ReportType } from '@prisma/client';

export interface ReportConfig {
  columns?: string[];
  filters?: {
    dateRange?: { from: string; to: string };
    status?: string[];
    workspaceId?: string;
    boardId?: string;
    [key: string]: unknown;
  };
  grouping?: {
    by: string;
    aggregations?: Array<{ column: string; function: 'sum' | 'count' | 'average' | 'min' | 'max' }>;
  };
  sorting?: Array<{ column: string; direction: 'asc' | 'desc' }>;
  format?: {
    dateFormat?: string;
    numberFormat?: string;
    currency?: string;
    showHeaders?: boolean;
    showSummary?: boolean;
    pageSize?: number;
    orientation?: 'portrait' | 'landscape';
  };
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  cron?: string;
  emailRecipients?: string[];
  format?: 'pdf' | 'excel' | 'csv';
}

export interface CreateReportInput {
  workspaceId?: string;
  boardId?: string;
  name: string;
  type: ReportType;
  config: ReportConfig;
  schedule?: ReportSchedule;
  isActive?: boolean;
}

export interface UpdateReportInput {
  name?: string;
  config?: ReportConfig;
  schedule?: ReportSchedule;
  isActive?: boolean;
}

export interface ReportResult {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  summary?: {
    totals: Record<string, number>;
    counts: Record<string, number>;
  };
  metadata: {
    generatedAt: string;
    filters: Record<string, unknown>;
    totalRows: number;
  };
}

